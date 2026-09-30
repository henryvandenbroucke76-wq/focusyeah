import { db, identity, checkOrigin, failure, str, config } from "@/lib/server";
import { recipes as seeds } from "@/lib/recipes";
export async function GET() {
  try {
    const u = await identity();
    const d = db();
    const [p, rs, es, comments, counts] = await Promise.all([
      d.prepare("SELECT * FROM profiles WHERE id=?").bind(u.userId).first<any>(),
      d
        .prepare("SELECT * FROM recipes WHERE owner=? OR published=1 ORDER BY created DESC")
        .bind(u.userId)
        .all<any>(),
      d.prepare("SELECT * FROM entries WHERE owner=? ORDER BY created DESC").bind(u.userId).all<any>(),
      d
        .prepare(
          "SELECT * FROM reviews WHERE recipe IN (SELECT id FROM recipes WHERE owner=? OR published=1) OR recipe NOT IN (SELECT id FROM recipes) ORDER BY created DESC LIMIT 200",
        )
        .bind(u.userId)
        .all<any>(),
      d
        .prepare(
          "SELECT kind,id,COUNT(*) as count FROM entries WHERE kind IN ('like','view') GROUP BY kind,id",
        )
        .all<any>(),
    ]);
    return Response.json({
      user: {
        id: u.userId,
        name: p?.name || u.fullName || "Home cook",
        email: u.email,
        plan: p?.plan || "free",
      },
      preferences: p ? JSON.parse(p.preferences) : null,
      recipes: rs.results.map((r) => ({
        ...JSON.parse(r.data),
        id: r.id,
        owner: r.owner,
        published: !!r.published,
      })),
      entries: es.results.map((e) => ({ ...e, data: JSON.parse(e.data) })),
      reviews: comments.results,
      counts: counts.results,
    });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const u = await identity();
    const d = db();
    const b: any = await req.json();
    if (JSON.stringify(b).length > 150000) throw new Error("Request too large.");
    const now = Date.now();
    const kind = b.kind;
    const id = typeof b.id === "string" ? b.id.slice(0, 100) : crypto.randomUUID();
    if (b.action === "profile") {
      const prefs = b.preferences;
      if (!prefs || JSON.stringify(prefs).length > 10000) throw new Error("Invalid preferences");
      await d
        .prepare(
          "INSERT INTO profiles(id,name,preferences) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,preferences=excluded.preferences",
        )
        .bind(u.userId, str(b.name, 80), JSON.stringify(prefs))
        .run();
    } else if (b.action === "addIngredients") {
      if (!Array.isArray(b.ingredients) || !b.ingredients.length || b.ingredients.length > 60)
        throw new Error("Choose 1–60 ingredients.");
      const seen = new Set<string>();
      const statements = b.ingredients.map((item: any) => {
        const itemId = str(item.id, 100);
        if (seen.has(itemId)) throw new Error("Duplicate ingredient.");
        seen.add(itemId);
        const name = str(item.name, 100);
        const quantity = typeof item.quantity === "string" ? item.quantity.trim().slice(0, 80) : "";
        return d
          .prepare(
            "INSERT INTO entries(owner,kind,id,data,created) VALUES(?,'fridge',?,?,?) ON CONFLICT(owner,kind,id) DO UPDATE SET data=excluded.data",
          )
          .bind(u.userId, itemId, JSON.stringify({ name, quantity, soon: false }), now);
      });
      await d.batch(statements);
    } else if (b.action === "recipe") {
      const input = b.recipe || {};
      const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
      // Keep only the fields a recipe has, so nothing else can be stored or spoofed.
      const r = {
        title: str(input.title, 120),
        description: text(input.description, 1000),
        cuisine: text(input.cuisine, 60) || "Your kitchen",
        tags: Array.isArray(input.tags)
          ? input.tags.filter((t: unknown) => typeof t === "string" && t.length <= 30).slice(0, 8)
          : [],
        minutes: Number(input.minutes),
        servings: Number(input.servings),
        image: typeof input.image === "string" ? input.image : "",
        ingredients: Array.isArray(input.ingredients)
          ? input.ingredients.map((i: any) => ({
              name: str(i?.name, 100),
              qty: Number(i?.qty),
              unit: text(i?.unit, 12),
            }))
          : [],
        steps: Array.isArray(input.steps)
          ? input.steps.map((s: any) => ({
              title: str(s?.title, 120),
              text: str(s?.text, 2000),
              ...(Number(s?.minutes) > 0 && Number(s?.minutes) <= 600
                ? { minutes: Math.round(Number(s.minutes)) }
                : {}),
              ...(text(s?.check, 300) ? { check: text(s.check, 300) } : {}),
            }))
          : [],
      };
      if (
        !Array.isArray(r.ingredients) ||
        !r.ingredients.length ||
        r.ingredients.length > 60 ||
        !Array.isArray(r.steps) ||
        !r.steps.length ||
        r.steps.length > 40
      )
        throw new Error("Add ingredients and cooking steps.");
      for (const i of r.ingredients)
        if (!Number.isFinite(i.qty) || i.qty < 0 || i.qty > 100000)
          throw new Error("Check ingredient amounts.");
      if (
        !Number.isFinite(r.minutes) ||
        r.minutes < 1 ||
        r.minutes > 1440 ||
        !Number.isFinite(r.servings) ||
        r.servings < 1 ||
        r.servings > 100
      )
        throw new Error("Check cooking time and servings.");
      if (r.image && !/^\/images\/|^\/api\/upload\?id=/.test(r.image))
        throw new Error("Use an uploaded recipe image.");
      if (r.image?.startsWith("/api/upload?id=")) {
        const own = await d
          .prepare("SELECT owner FROM uploads WHERE id=?")
          .bind(r.image.slice(15))
          .first<any>();
        if (!own || own.owner !== u.userId) throw new Error("Use your own uploaded image.");
      }
      const old = await d.prepare("SELECT owner FROM recipes WHERE id=?").bind(id).first<any>();
      if (old && old.owner !== u.userId) throw new Error("This recipe belongs to another cook.");
      await d
        .prepare(
          "INSERT INTO recipes(id,owner,data,published,created) VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data",
        )
        .bind(id, u.userId, JSON.stringify({ ...r, id, author: str(b.author || "Home cook", 80) }), 0, now)
        .run();
    } else if (b.action === "publish") {
      const result = await d
        .prepare("UPDATE recipes SET published=? WHERE id=? AND owner=?")
        .bind(b.published ? 1 : 0, id, u.userId)
        .run();
      if (!result.meta.changes) throw new Error("Recipe not found.");
    } else if (b.action === "deleteRecipe") {
      await d.prepare("DELETE FROM recipes WHERE id=? AND owner=?").bind(id, u.userId).run();
    } else if (b.action === "review") {
      const exists =
        seeds.some((r) => r.id === b.recipe) ||
        (await d
          .prepare("SELECT id FROM recipes WHERE id=? AND (published=1 OR owner=?)")
          .bind(b.recipe, u.userId)
          .first());
      if (!exists) throw new Error("Recipe not found");
      const rating = Number(b.rating);
      if (!Number.isInteger(rating) || rating < 1 || rating > 5)
        throw new Error("Choose a rating from 1 to 5.");
      await d
        .prepare("INSERT INTO reviews VALUES(?,?,?,?,?,?,?)")
        .bind(id, u.userId, str(b.recipe), str(b.name, 80), str(b.body, 1500), rating, now)
        .run();
    } else if (b.action === "entry") {
      if (!["favorite", "like", "view", "follow", "fridge", "planner", "history", "shopping"].includes(kind))
        throw new Error("Unknown action.");
      if (JSON.stringify(b.data).length > 20000) throw new Error("Entry too large.");
      if (b.remove)
        await d
          .prepare("DELETE FROM entries WHERE owner=? AND kind=? AND id=?")
          .bind(u.userId, kind, id)
          .run();
      else
        await d
          .prepare(
            "INSERT INTO entries(owner,kind,id,data,created) VALUES(?,?,?,?,?) ON CONFLICT(owner,kind,id) DO UPDATE SET data=excluded.data,created=excluded.created",
          )
          .bind(u.userId, kind, id, JSON.stringify(b.data || {}), now)
          .run();
    } else if (b.action === "startCooking") {
      const today = new Date().toISOString().slice(0, 10);
      const p = await d.prepare("SELECT plan FROM profiles WHERE id=?").bind(u.userId).first<any>();
      const recipeId = str(b.recipe, 100);
      if (
        !seeds.some((r) => r.id === recipeId) &&
        !(await d
          .prepare("SELECT id FROM recipes WHERE id=? AND (published=1 OR owner=?)")
          .bind(recipeId, u.userId)
          .first())
      )
        throw new Error("Recipe not found");
      const cookingId = today + ":" + recipeId;
      // The one-session-a-day limit only applies once paid plans are switched on.
      if (config().BILLING_ENABLED === "true" && p?.plan !== "plus") {
        const result = await d
          .prepare(
            "INSERT INTO entries(owner,kind,id,data,created) VALUES(?,'dailyCook',?,?,?) ON CONFLICT(owner,kind,id) DO NOTHING",
          )
          .bind(u.userId, today, JSON.stringify({ recipe: b.recipe }), now)
          .run();
        if (!result.meta.changes) {
          const existing = await d
            .prepare("SELECT data FROM entries WHERE owner=? AND kind='dailyCook' AND id=?")
            .bind(u.userId, today)
            .first<any>();
          if (JSON.parse(existing.data).recipe !== b.recipe)
            return Response.json(
              {
                error:
                  "Your free cooking session is used for today. You can reopen that recipe, or cook another tomorrow.",
                limit: true,
              },
              { status: 429 },
            );
        }
      }
      return Response.json({ ok: true, id: cookingId });
    } else throw new Error("Unknown action.");
    return Response.json({ ok: true, id });
  } catch (e) {
    return failure(e);
  }
}
