"use client";
import { useState, useEffect, useRef } from "react";
import {
  Soup,
  Plus,
  ArrowUpRight,
  ArrowRight,
  Search,
  Clock,
  Flame,
  Leaf,
  Bookmark,
  Heart,
  Users,
  ChefHat,
  Sun,
  Moon,
  X,
  Check,
  Upload,
  ChevronRight,
  SlidersHorizontal,
  Sparkles,
  Globe,
  LogOut,
  Trash2,
  PenLine,
  Play,
  ShoppingBasket,
  BookOpen,
  ShieldCheck,
  Eye,
  Menu,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { Toaster } from "@/components/ui/sonner";
import { toast as rawToast } from "sonner";
import { LanguageProvider, useLanguage, localize, translate, LanguagePicker } from "@/lib/i18n";
import { AuthPanel } from "./auth-panel";
import { CookingStory, CookingBackdrop } from "./cooking-story";
import { KitchenOnboarding } from "./kitchen-onboarding";
import {
  defaultPreferences,
  readPreferences,
  rankForKitchen,
  KitchenPreferences,
} from "@/lib/kitchen-preferences";
import { LaunchGuide, PublicInfo } from "./launch-guide";
import { recipes as originals, Recipe } from "@/lib/recipes";
import { matchRecipes, sameIngredient } from "@/lib/recipe-match";
import { RecipeMatches } from "./recipe-matches";
import { IngredientInput } from "./ingredient-input";
import { IngredientPicker } from "./ingredient-picker";
import { RecipeEditor, type RecipeInput } from "./recipe-editor";
import { CookingMode } from "./cooking-mode";
import { ingredientLine, stepParts, type Units } from "@/lib/recipe-format";
import { sameName } from "@/lib/ingredients";

function readGuestPreferences() {
  try {
    return JSON.parse(localStorage.getItem("simmerfolk-guest-preferences") || "null");
  } catch {
    return null;
  }
}
type Entry = { id: string; kind: string; data: any; created: number };
function newId() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (n) => n.toString(16).padStart(2, "0")).join(
    "",
  );
}
const defaultPrefs = defaultPreferences;
function Choose({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  label: string;
}) {
  const { lang } = useLanguage();
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="pick" aria-label={translate(label, lang)}>
        <SelectValue>{translate(value, lang)}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {translate(o, lang)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
function Logo() {
  return (
    <span className="logo">
      <img className="logo-light" src="/images/miseora-logo.png" alt="Miseora" width={978} height={291} />
      <img
        className="logo-dark"
        src="/images/miseora-logo-dark.png"
        alt=""
        aria-hidden="true"
        width={978}
        height={291}
      />
    </span>
  );
}
export default function Kitchen({ signedIn }: { signedIn: boolean }) {
  return (
    <LanguageProvider>
      <KitchenApp signedIn={signedIn} />
    </LanguageProvider>
  );
}
function KitchenApp({ signedIn }: { signedIn: boolean }) {
  const { lang } = useLanguage();
  const toast = {
    success: (m: string) => rawToast.success(translate(m, lang)),
    error: (m: string) => rawToast.error(translate(m, lang)),
    info: (m: string) => rawToast.info(translate(m, lang)),
  };
  const [settings, setSettings] = useState<any>({ auth: false, ai: false, billing: false }),
    [communityTab, setCommunityTab] = useState("public");
  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then(setSettings)
      .catch(() => {});
  }, []);

  const [route, setRoute] = useState("home"),
    [dark, setDark] = useState(false),
    [mobile, setMobile] = useState(false),
    [modal, setModal] = useState(""),
    [busy, setBusy] = useState(false),
    [loaded, setLoaded] = useState(false),
    [error, setError] = useState("");
  const [user, setUser] = useState<any>({ name: "Home cook", plan: "free" }),
    [prefs, setPrefs] = useState<any>(defaultPrefs),
    [onboarded, setOnboarded] = useState(false);
  const [mine, setMine] = useState<Recipe[]>([]),
    [entries, setEntries] = useState<Entry[]>([]),
    [reviews, setReviews] = useState<any[]>([]),
    [counts, setCounts] = useState<any[]>([]);
  const [query, setQuery] = useState(""),
    [category, setCategory] = useState("All recipes"),
    [timeFilter, setTimeFilter] = useState("Any time"),
    [collection, setCollection] = useState("saved");
  const [selected, setSelected] = useState<Recipe | null>(null),
    [cooking, setCooking] = useState(false),
    [checked, setChecked] = useState<string[]>([]),
    [servings, setServings] = useState(2),
    [reviewsOpen, setReviewsOpen] = useState(false);
  const [remix, setRemix] = useState(""),
    [base, setBase] = useState<Recipe | null>(null);
  const [editorSource, setEditorSource] = useState<Partial<Recipe> | null>(null),
    [editorKey, setEditorKey] = useState(0),
    [editId, setEditId] = useState(""),
    [deleteId, setDeleteId] = useState(""),
    [rating, setRating] = useState("5"),
    [comment, setComment] = useState(""),
    [plannerDay, setPlannerDay] = useState("Monday"),
    [admin, setAdmin] = useState<any>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const all = [...originals, ...mine];
  const units: Units = prefs.units === "imperial" ? "imperial" : "metric";
  const fridge = entries.filter((e) => e.kind === "fridge");
  const byKind = (kind: string) => entries.filter((e) => e.kind === kind);
  const has = (kind: string, id: string) => entries.some((e) => e.kind === kind && e.id === id);
  const count = (kind: string, id: string) => counts.find((c) => c.kind === kind && c.id === id)?.count || 0;
  async function api(body: any, url = "/api/kitchen") {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const d: any = await r.json();
    if (!r.ok) throw new Error(d.error || "Something went wrong. Please try again.");
    return d;
  }
  async function load() {
    try {
      const r = await fetch("/api/kitchen");
      const d: any = await r.json();
      if (!r.ok) throw new Error(d.error);
      setUser(d.user);
      setPrefs(readPreferences(d.preferences || readGuestPreferences()));
      setOnboarded(d.preferences?.onboardingVersion === 2);
      setMine(d.recipes);
      setEntries(d.entries);
      setReviews(d.reviews);
      setCounts(d.counts);
      setError("");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoaded(true);
    }
  }
  useEffect(() => {
    const p = location.pathname.split("/")[1] || "home";
    setRoute(p);
    const theme = localStorage.getItem("simmerfolk-theme") === "dark";
    setDark(theme);
    document.documentElement.classList.toggle("dark", theme);
    if (signedIn) load();
    else {
      const guest = readGuestPreferences();
      setPrefs(readPreferences(guest));
      setOnboarded(guest?.onboardingVersion === 2);
      setLoaded(true);
      fetch("/api/community")
        .then((r) => r.json())
        .then((d: any) => {
          setMine(d.recipes || []);
          setCounts(d.counts || []);
          setReviews(d.reviews || []);
        })
        .catch(() => {});
    }
    const pop = () => setRoute(location.pathname.split("/")[1] || "home");
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, []);
  useEffect(() => {
    const context = (document as any).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    Promise.resolve(
      context.registerTool(
        {
          name: "search_recipes",
          description: "Search the recipe collection and show matching recipe cards.",
          inputSchema: {
            type: "object",
            properties: { query: { type: "string", maxLength: 100 } },
            required: ["query"],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: true },
          execute: async (input: any) => {
            if (typeof input.query !== "string" || input.query.length > 100) throw new Error("Invalid query");
            if (!signedIn) throw new Error("Sign in required");
            setQuery(input.query);
            setRoute("discover");
            history.pushState({}, "", "/discover");
            return {
              matches: all
                .filter((r) =>
                  (r.title + " " + r.ingredients.map((i) => i.name).join(" "))
                    .toLowerCase()
                    .includes(input.query.toLowerCase()),
                )
                .map((r) => ({ id: r.id, title: r.title })),
            };
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => {});
    return () => lifecycle.abort();
  }, [mine, signedIn]);
  const welcomeAttempted = useRef(false);

  const welcomeKey = "simmerfolk-welcome-v2-" + (signedIn ? user.id || "loading" : "guest");
  function dismissWelcome() {
    try {
      localStorage.setItem(welcomeKey, "dismissed");
    } catch {}
    setModal("");
  }
  useEffect(() => {
    if (!loaded || (signedIn && !user.id) || welcomeAttempted.current) return;
    if (!["home", "discover", "community"].includes(route)) return;
    welcomeAttempted.current = true;
    let dismissed = false;
    try {
      dismissed = !!localStorage.getItem(welcomeKey);
    } catch {}
    if (!onboarded && !dismissed && !modal) setModal("onboarding");
  }, [loaded, user.id, onboarded, route, modal, welcomeKey]);
  async function completeWelcome(next: KitchenPreferences) {
    setBusy(true);
    try {
      if (signedIn) await api({ action: "profile", name: user.name, preferences: next });
      else {
        try {
          localStorage.setItem("simmerfolk-guest-preferences", JSON.stringify(next));
        } catch {
          throw new Error("Preferences could not be saved");
        }
      }
      setPrefs(next);
      setOnboarded(true);
      dismissWelcome();
      go("home");
      toast.success("Your kitchen is ready.");
    } finally {
      setBusy(false);
    }
  }
  function theme() {
    setDark(!dark);
    document.documentElement.classList.toggle("dark", !dark);
    localStorage.setItem("simmerfolk-theme", !dark ? "dark" : "light");
  }
  function go(r: string) {
    setRoute(r);
    setMobile(false);
    history.pushState({}, "", r === "home" ? "/" : "/" + r);
    window.scrollTo({ top: 0, behavior: "smooth" });
    setQuery("");
  }
  function guard(fn: () => void) {
    if (!signedIn) {
      setModal("login");
      return;
    }
    fn();
  }
  async function action(body: any, message?: string) {
    if (!signedIn) {
      setModal("login");
      return false;
    }
    try {
      await api(body);
      await load();
      if (message) toast.success(message);
      return true;
    } catch (e: any) {
      toast.error(e.message);
      return false;
    }
  }
  function toggle(kind: string, id: string, data: any = {}) {
    action(
      { action: "entry", kind, id, data, remove: has(kind, id) },
      has(kind, id) ? "Removed" : "Saved to your kitchen",
    );
  }
  function openRecipe(r: Recipe) {
    setSelected(r);
    setServings(onboarded ? prefs.servings : r.servings);
    setCooking(false);
    setReviewsOpen(false);
    setChecked([]);
    setModal("recipe");
    if (signedIn) api({ action: "entry", kind: "view", id: r.id, data: {} }).catch(() => {});
  }
  async function addIngredient(name: string) {
    if (fridge.some((e) => sameName(e.data.name, name))) {
      toast.info("That ingredient is already in your fridge.");
      return;
    }
    await action(
      { action: "entry", kind: "fridge", id: newId(), data: { name, quantity: "", soon: false } },
      "Ingredient added",
    );
  }
  async function addIngredients(names: string[]) {
    const fresh = names.filter((n) => !fridge.some((e) => sameName(e.data.name, n)));
    if (!fresh.length) return setModal("");
    setBusy(true);
    try {
      await api({
        action: "addIngredients",
        ingredients: fresh.map((name) => ({ id: newId(), name, quantity: "" })),
      });
      await load();
      setModal("");
      toast.success(fresh.length === 1 ? "Ingredient added" : "Ingredients added");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function uploadImage(file: File) {
    try {
      const form = new FormData();
      form.append("file", file);
      const r = await fetch("/api/upload", { method: "POST", body: form });
      const d: any = await r.json();
      if (!r.ok) throw new Error(d.error);
      return d.url as string;
    } catch (e: any) {
      toast.error(e.message || "Upload failed. Please try again.");
    }
  }
  async function generate() {
    setBusy(true);
    try {
      const r = await api(
        { ingredients: fridge.map((e) => e.data), preferences: prefs, request: remix, recipe: base },
        "/api/ai",
      );
      edit({ ...r, image: "" }, true);
      toast.success("Recipe draft ready. Review ingredients and cooking steps before saving.");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }
  // Open the editor: empty, for one of my recipes (owned), or pre-filled from an import/idea (new copy).
  function edit(r?: Partial<Recipe> | null, asNew = false) {
    setEditId(!asNew && r?.id && r.owner === user.id ? r.id : "");
    setEditorSource(r || null);
    setEditorKey((k) => k + 1);
    setModal("editor");
  }
  function createFromFridge() {
    edit(
      { ingredients: fridge.map((e) => ({ name: translate(e.data.name, lang), qty: 0, unit: "" })) },
      true,
    );
  }
  async function saveRecipe(recipe: RecipeInput) {
    setBusy(true);
    try {
      await api({ action: "recipe", id: editId || newId(), recipe, author: user.name });
      await load();
      setModal("");
      setCollection("created");
      go("recipes");
      toast.success("Recipe saved. Publish it when you are ready.");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function startCooking() {
    if (!selected) return;
    if (signedIn) {
      try {
        await api({ action: "startCooking", recipe: selected.id });
      } catch (e: any) {
        toast.error(e.message);
        return;
      }
    }
    setCooking(true);
  }
  async function finishCooking() {
    if (!selected || !signedIn) return false;
    try {
      await api({
        action: "entry",
        kind: "history",
        id: newId(),
        data: { recipe: selected.id, title: selected.title },
      });
      await load();
      return true;
    } catch {
      return false;
    }
  }
  const filtered = all.filter(
    (r) =>
      (
        translate(r.title, lang) +
        " " +
        r.title +
        " " +
        translate(r.cuisine, lang) +
        " " +
        r.ingredients.map((i) => translate(i.name, lang)).join(" ")
      )
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (category === "All recipes" ||
        (category === "Quick & easy" && r.minutes <= 20) ||
        r.tags.includes(category) ||
        r.cuisine === category) &&
      (timeFilter === "Any time" || r.minutes <= Number(timeFilter.split(" ")[1])),
  );
  function cards(list: Recipe[]) {
    return list.length ? (
      <div className="recipe-grid">
        {list.map((r, i) => (
          <article className="recipe-card" key={r.id} style={{ animationDelay: i * 70 + "ms" }}>
            <div className="card-photo">
              <button className="photo-open" aria-label={"Open " + r.title} onClick={() => openRecipe(r)}>
                {r.image ? (
                  <img src={r.image} alt={r.title} loading="lazy" />
                ) : (
                  <span className="no-photo">
                    <Soup size={54} />
                    From your kitchen
                  </span>
                )}
              </button>
              <span className="photo-tag">{r.tags[0] || r.cuisine}</span>
              <button
                className={"save-btn " + (has("favorite", r.id) ? "saved" : "")}
                aria-label={(has("favorite", r.id) ? "Unsave " : "Save ") + r.title}
                onClick={() => toggle("favorite", r.id)}
              >
                <Bookmark size={18} fill={has("favorite", r.id) ? "currentColor" : "none"} />
              </button>
            </div>
            <div className="card-meta">
              <span>{r.cuisine}</span>
              <span>
                <Clock size={13} />
                {r.minutes} min
              </span>
            </div>
            <button className="card-title" onClick={() => openRecipe(r)}>
              {r.title}
            </button>
            <div className="card-bottom">
              <span>{r.author}</span>
              <span>
                <Heart size={13} />
                {count("like", r.id)} <span className="meta-separator">·</span>
                <Eye size={14} />
                {count("view", r.id)}
              </span>
            </div>
          </article>
        ))}
      </div>
    ) : (
      <div className="empty">
        <BookOpen />
        <h3>{query ? "Nothing on the menu just yet." : "A little room for inspiration."}</h3>
        <p>
          {query
            ? "Try another ingredient or clear your filters."
            : "Save a recipe you love or create one of your own."}
        </p>
        <button
          className="btn primary"
          onClick={() => {
            setQuery("");
            setCategory("All recipes");
            setTimeFilter("Any time");
            go("discover");
          }}
        >
          Explore recipes <ArrowRight size={16} />
        </button>
      </div>
    );
  }
  function header(eyebrow: string, title: string, sub: string, extra?: React.ReactNode) {
    return (
      <div className="page-heading">
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          <p>{sub}</p>
        </div>
        {extra}
      </div>
    );
  }
  const isInfo = ["about", "contact", "faq", "privacy", "terms", "setup"].includes(route);
  const protectedRoute = ![
    "discover",
    "community",
    "reset-password",
    "home",
    "about",
    "contact",
    "faq",
    "privacy",
    "terms",
    "setup",
    "login",
    "signup",
  ].includes(route);
  return localize(
    <>
      <CookingBackdrop />
      <Toaster richColors position="bottom-right" />
      <header className="topbar">
        <div className="nav-wrap">
          <button className="brand-button" onClick={() => go("home")} aria-label="Miseora home">
            <Logo />
          </button>
          <nav className={mobile ? "main-nav open" : "main-nav"}>
            {[
              ["home", "Your kitchen"],
              ["discover", "Discover"],
              ["fridge", "My fridge"],
              ["recipes", "My recipes"],
              ["community", "Community"],
              ["planner", "Meal planner"],
            ].map(([r, label]) => (
              <button key={r} className={route === r ? "active" : ""} onClick={() => go(r)}>
                {label}
                {route === r && <span />}
              </button>
            ))}
          </nav>
          <div className="nav-actions">
            <LanguagePicker />
            <button
              className="icon-btn"
              aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
              onClick={theme}
            >
              {dark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button className="btn primary nav-scan" onClick={() => guard(() => edit())}>
              <PenLine size={17} /> Create a recipe
            </button>
            {signedIn ? (
              <button className="avatar" aria-label="Your profile" onClick={() => go("profile")}>
                {user.name.charAt(0).toUpperCase()}
              </button>
            ) : (
              <button className="btn outline nav-login" onClick={() => setModal("login")}>
                <Users size={16} /> Log in
              </button>
            )}
            <button
              className="icon-btn menu-btn"
              aria-label="Open navigation"
              onClick={() => setMobile(!mobile)}
            >
              <Menu />
            </button>
          </div>
        </div>
      </header>
      <main className="main-shell">
        {error && signedIn && (
          <div className="notice error">
            {error}
            <button onClick={load}>Retry</button>
          </div>
        )}
        {protectedRoute && !signedIn ? (
          <section className="sign-in-page">
            <span className="logo-mark large">
              <Soup size={36} />
            </span>
            <span className="eyebrow">A KITCHEN OF YOUR OWN</span>
            <h1>Good food starts here.</h1>
            <p>Sign in to save recipes, plan your week, and make the most of what’s in your fridge.</p>
            <button className="btn primary" onClick={() => setModal("login")}>
              Sign in to your kitchen <ArrowRight size={18} />
            </button>
            <button className="text-btn" onClick={() => setModal("signup")}>
              New here? Create an account
            </button>
          </section>
        ) : (
          <>
            {route === "home" && (
              <>
                <section className="hero">
                  <div className="hero-copy">
                    <h1>
                      Cook something good.
                      <br />
                      <em>Step by step.</em>
                    </h1>
                    <p>
                      Follow easy recipe tutorials, cook with what you have, and create recipes of your own.
                    </p>
                    <div className="hero-buttons">
                      <button className="btn primary" onClick={() => go("discover")}>
                        <BookOpen size={18} /> Find a recipe
                      </button>
                      <button className="btn outline" onClick={() => guard(() => edit())}>
                        <PenLine size={18} /> Create a recipe
                      </button>
                    </div>
                  </div>
                  <div className="hero-image">
                    <img
                      src="/images/generated/quinoa-bowl.webp"
                      alt="Colorful quinoa and roasted vegetable bowl with fresh lime"
                    />
                    <div className="hero-photo-shade" />
                    <div className="floating-recipe">
                      <button onClick={() => openRecipe(originals[0])}>
                        <h3>A bowl full of sunshine.</h3>
                        <ArrowUpRight size={24} />
                      </button>
                      <span>
                        <Clock size={14} /> {originals[0].minutes} minutes
                      </span>
                    </div>
                  </div>
                </section>
                <section className="how-it-works" aria-label="How it works">
                  <button onClick={() => guard(() => go("fridge"))}>
                    <span className="step-badge">1</span>
                    <strong>Add your ingredients</strong>
                    <small>Type them or pick from the list. We show what you can make.</small>
                  </button>
                  <button onClick={() => go("discover")}>
                    <span className="step-badge">2</span>
                    <strong>Pick a recipe</strong>
                    <small>Every recipe shows what you need and how long it takes.</small>
                  </button>
                  <button onClick={() => openRecipe(originals[2])}>
                    <span className="step-badge">3</span>
                    <strong>Cook step by step</strong>
                    <small>One step at a time, with amounts, timers and “ready when” checks.</small>
                  </button>
                </section>
                <div className="kitchen-preferences-link">
                  <button className="text-btn" onClick={() => setModal("onboarding")}>
                    <SlidersHorizontal size={16} />
                    {onboarded ? "Your cooking preferences" : "Personalise my kitchen"}
                  </button>
                  {onboarded && (
                    <span>
                      {prefs.time} min · {prefs.diet}
                    </span>
                  )}
                </div>
                <section className="home-recipes">
                  <div className="section-head">
                    <div>
                      <h2>{onboarded ? "Picked for your kitchen." : "Something delicious."}</h2>
                    </div>
                    <button className="text-btn" onClick={() => go("discover")}>
                      Explore all recipes <ArrowRight size={17} />
                    </button>
                  </div>
                  <div className="category-row">
                    {["All recipes", "Quick & easy", "Vegetarian", "Comfort food", "One pot"].map((c, i) => (
                      <button
                        key={c}
                        className={category === c ? "chip active" : "chip"}
                        onClick={() => setCategory(c)}
                      >
                        {i === 0 ? (
                          <Soup size={15} />
                        ) : i === 1 ? (
                          <Clock size={15} />
                        ) : i === 2 ? (
                          <Leaf size={15} />
                        ) : i === 3 ? (
                          <Heart size={15} />
                        ) : (
                          <Flame size={15} />
                        )}{" "}
                        {c}
                      </button>
                    ))}
                  </div>
                  {cards((onboarded ? rankForKitchen(filtered, prefs) : filtered).slice(0, 8))}
                </section>
                <CookingStory onCook={() => openRecipe(originals[2])} />
                <section className="community-invite">
                  <div>
                    <h2>Made to share.</h2>
                    <p>Recipes from other home cooks.</p>
                  </div>
                  <button className="btn outline" onClick={() => go("community")}>
                    Explore community
                  </button>
                </section>
              </>
            )}
            {route === "discover" && (
              <>
                {header(
                  "FIND YOUR NEXT FAVOURITE",
                  "What sounds good?",
                  "Everyday favourites, new flavours, and something for every kind of cook.",
                )}
                <div className="search-toolbar">
                  <label className="search">
                    <Search size={19} />
                    <input
                      aria-label="Search recipes"
                      placeholder="Search recipes, ingredients, or cuisines…"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                    {query && (
                      <button aria-label="Clear search" onClick={() => setQuery("")}>
                        <X size={16} />
                      </button>
                    )}
                  </label>
                  <Choose
                    label="Cooking time"
                    value={timeFilter}
                    onChange={setTimeFilter}
                    options={["Any time", "Under 20 min", "Under 30 min", "Under 60 min"]}
                  />
                </div>
                <div className="category-row">
                  {[
                    "All recipes",
                    "Vegetarian",
                    "Vegan",
                    "Italian",
                    "Indian-inspired",
                    "Mediterranean",
                    "One pot",
                  ].map((c) => (
                    <button
                      key={c}
                      className={"chip " + (category === c ? "active" : "")}
                      onClick={() => setCategory(c)}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                <div className="results-label">{filtered.length} recipes to make your own</div>
                {cards(filtered)}
              </>
            )}
            {route === "recipes" && (
              <>
                {header(
                  "YOUR PERSONAL COOKBOOK",
                  "Keep the good ones.",
                  "The recipes you love, the meals you’ve made, and the ideas you’re making your own.",
                  <button className="btn primary" onClick={() => edit()}>
                    <Plus size={17} /> Create recipe
                  </button>,
                )}
                <div className="search-toolbar">
                  <Tabs value={collection} onValueChange={setCollection}>
                    <TabsList>
                      <TabsTrigger value="saved">Saved recipes</TabsTrigger>
                      <TabsTrigger value="created">My creations</TabsTrigger>
                      <TabsTrigger value="history">Cooking history</TabsTrigger>
                    </TabsList>
                  </Tabs>
                  <button className="text-btn" onClick={() => importRef.current?.click()}>
                    <Upload size={16} /> Import recipe JSON
                  </button>
                  <input
                    hidden
                    ref={importRef}
                    type="file"
                    accept="application/json,.json"
                    onChange={async (e) => {
                      try {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        if (f.size > 100000) throw new Error("Choose a recipe file under 100 KB.");
                        const r = JSON.parse(await f.text());
                        if (!r.title || !Array.isArray(r.ingredients) || !Array.isArray(r.steps))
                          throw new Error("This file needs a title, ingredients array, and steps array.");
                        edit({ ...r, id: "", image: "" });
                      } catch (e: any) {
                        toast.error(e.message);
                      }
                    }}
                  />
                </div>
                {collection === "history" ? (
                  <div className="history-list">
                    {byKind("history").length ? (
                      byKind("history").map((e) => (
                        <button
                          className="history-item"
                          key={e.id}
                          onClick={() => {
                            const r = all.find((r) => r.id === e.data.recipe);
                            if (r) openRecipe(r);
                          }}
                        >
                          <span className="quick-icon green">
                            <Check />
                          </span>
                          <span>
                            <strong>{e.data.title}</strong>
                            <small>
                              Cooked on{" "}
                              {new Date(e.created).toLocaleDateString(
                                { en: "en-GB", nl: "nl-BE", fr: "fr-BE", es: "es-ES" }[lang],
                              )}
                            </small>
                          </span>
                          <ChevronRight />
                        </button>
                      ))
                    ) : (
                      <div className="empty">
                        <ChefHat />
                        <h3>Your kitchen story starts here.</h3>
                        <p>Finish a guided cooking session to see it in your history.</p>
                      </div>
                    )}
                  </div>
                ) : (
                  cards(
                    collection === "saved"
                      ? all.filter((r) => has("favorite", r.id))
                      : mine.filter((r) => r.owner === user.id),
                  )
                )}
              </>
            )}
            {route === "fridge" && (
              <>
                {header(
                  "MAKE THE MOST OF WHAT YOU HAVE",
                  "Your fridge, full of potential.",
                  "Add what you have. We’ll show the recipes you can make with it.",
                )}
                <div className="fridge-layout">
                  <div>
                    <div className="ingredient-add">
                      <IngredientInput
                        onAdd={addIngredient}
                        exclude={fridge.map((e) => e.data.name)}
                        placeholder="Type an ingredient, like tomatoes…"
                      />
                      <button className="btn outline" onClick={() => setModal("pantry")}>
                        <ShoppingBasket size={17} /> Browse all ingredients
                      </button>
                    </div>
                    <p className="small-note">
                      Press Enter to add. Pick a suggestion with the arrow keys or a tap.
                    </p>
                    {fridge.length ? (
                      <div className="fridge-list">
                        {fridge.map((e) => (
                          <div className="fridge-item" key={e.id}>
                            <span className="ingredient-icon">
                              <Leaf size={22} />
                            </span>
                            <div>
                              <strong>{e.data.name}</strong>
                              <input
                                className="fridge-amount"
                                aria-label={"Amount of " + e.data.name}
                                placeholder="Amount (optional)"
                                maxLength={40}
                                defaultValue={e.data.quantity}
                                onBlur={(ev) => {
                                  const quantity = ev.target.value.trim();
                                  if (quantity !== (e.data.quantity || ""))
                                    action({
                                      action: "entry",
                                      kind: "fridge",
                                      id: e.id,
                                      data: { ...e.data, quantity },
                                    });
                                }}
                                onKeyDown={(ev) =>
                                  ev.key === "Enter" && (ev.target as HTMLInputElement).blur()
                                }
                              />
                            </div>
                            <button
                              className={"chip " + (e.data.soon ? "soon" : "")}
                              onClick={() =>
                                action({
                                  action: "entry",
                                  kind: "fridge",
                                  id: e.id,
                                  data: { ...e.data, soon: !e.data.soon },
                                })
                              }
                            >
                              {e.data.soon ? "Use soon" : "Mark use soon"}
                            </button>
                            <button
                              className="icon-btn"
                              aria-label={"Remove " + e.data.name}
                              onClick={() =>
                                action({ action: "entry", kind: "fridge", id: e.id, remove: true })
                              }
                            >
                              <X size={17} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="empty">
                        <ShoppingBasket />
                        <h3>What have you got?</h3>
                        <p>Type an ingredient above, or browse the full list and tap what you have.</p>
                      </div>
                    )}
                  </div>
                  <aside className="fridge-aside">
                    <PenLine size={30} />
                    <h3>Make it your own.</h3>
                    <p>Turn what you have into a recipe of your own, with your steps and your amounts.</p>
                    <button className="btn primary" onClick={createFromFridge}>
                      Create a recipe with these <ArrowRight size={17} />
                    </button>
                    {settings.ai && (
                      <button
                        className="btn outline"
                        onClick={() => {
                          setBase(null);
                          setModal("generate");
                        }}
                      >
                        <Sparkles size={16} /> Get a recipe idea
                      </button>
                    )}
                    <small>Always check ingredients and allergies before cooking.</small>
                  </aside>
                </div>
                {fridge.length > 0 && (
                  <section className="fridge-matches">
                    <div className="section-heading">
                      <h2>Recipes you can make</h2>
                      <p>Sorted by how much of each recipe is already in your fridge.</p>
                    </div>
                    <RecipeMatches
                      matches={matchRecipes(
                        all,
                        fridge.map((e) => e.data),
                      )}
                      onOpen={openRecipe}
                      limit={12}
                    />
                  </section>
                )}
              </>
            )}
            {route === "community" && (
              <>
                {header(
                  "A SEAT AT THE TABLE",
                  "From one kitchen to another.",
                  "Recipes from real people. Yours could be someone’s new favourite.",
                  <button className="btn primary" onClick={() => guard(() => edit())}>
                    <Plus size={17} /> Share a recipe
                  </button>,
                )}
                <Tabs value={communityTab} onValueChange={setCommunityTab}>
                  <TabsList>
                    <TabsTrigger value="public">Community recipes</TabsTrigger>
                    <TabsTrigger value="kitchen">From the Miseora kitchen</TabsTrigger>
                  </TabsList>
                </Tabs>
                <div className="notice">
                  Community recipes are posted by signed-in cooks. Kitchen recipes are our starter collection.
                </div>
                {communityTab === "public" ? (
                  mine.some((r) => r.published) ? (
                    cards(mine.filter((r) => r.published))
                  ) : (
                    <div className="empty">
                      <Users />
                      <h3>Be the first to share something delicious.</h3>
                      <p>Publish a recipe from My recipes to bring it to this table.</p>
                      <button className="btn primary" onClick={() => setCommunityTab("kitchen")}>
                        Explore kitchen recipes
                      </button>
                    </div>
                  )
                ) : (
                  cards(originals)
                )}
              </>
            )}
            {route === "planner" && (
              <>
                {header(
                  "A LITTLE PLANNING, A LOT LESS GUESSING",
                  "Your week, made delicious.",
                  "Choose a meal for each day. We’ll gather the ingredients in one place.",
                  <button className="btn outline" onClick={() => setModal("shopping")}>
                    <ShoppingBasket size={17} /> Shopping list
                  </button>,
                )}
                <div className="week-grid">
                  {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(
                    (day, i) => {
                      const e = byKind("planner").find((e) => e.id === day);
                      const r = all.find((r) => r.id === e?.data.recipe);
                      return (
                        <div className="day-card" key={day}>
                          <div className="day-title">
                            <strong>{day}</strong>
                            <span>{String(i + 1).padStart(2, "0")}</span>
                          </div>
                          {r ? (
                            <>
                              <button className="day-photo" onClick={() => openRecipe(r)}>
                                {r.image ? <img src={r.image} alt={r.title} /> : <Soup />}
                              </button>
                              <h3>{r.title}</h3>
                              <span className="muted">
                                <Clock size={13} /> {r.minutes} min
                              </span>
                              <button
                                className="text-btn"
                                onClick={() =>
                                  action({ action: "entry", kind: "planner", id: day, remove: true })
                                }
                              >
                                Remove
                              </button>
                            </>
                          ) : (
                            <button
                              className="add-meal"
                              onClick={() => {
                                setPlannerDay(day);
                                setModal("plan");
                              }}
                            >
                              <Plus />
                              <span>Add a meal</span>
                            </button>
                          )}
                        </div>
                      );
                    },
                  )}
                </div>
                <div className="notice">
                  <Leaf size={18} /> Cook once, enjoy twice: plan leftovers for a busy day.
                </div>
              </>
            )}
            {route === "profile" && (
              <>
                {header(
                  "YOUR KITCHEN, YOUR WAY",
                  "A little more you.",
                  "Personalise your recipes and make yourself at home.",
                )}
                <div className="profile-grid">
                  <section className="panel">
                    <div className="profile-intro">
                      <span className="avatar large">{user.name.charAt(0)}</span>
                      <div>
                        <h3>{user.name}</h3>
                        <small>{user.email}</small>
                      </div>
                      <span className="chip">{user.plan === "plus" ? "Plus" : "Free plan"}</span>
                    </div>
                    <div className="stats">
                      <div>
                        <strong>{byKind("history").length}</strong>
                        <span>Meals cooked</span>
                      </div>
                      <div>
                        <strong>{byKind("favorite").length}</strong>
                        <span>Recipes saved</span>
                      </div>
                      <div>
                        <strong>{mine.filter((r) => r.owner === user.id).length}</strong>
                        <span>Your creations</span>
                      </div>
                    </div>
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        await action(
                          { action: "profile", name: user.name, preferences: prefs },
                          "Your preferences are saved",
                        );
                      }}
                    >
                      <label className="field">
                        Your name
                        <input
                          value={user.name}
                          onChange={(e) => setUser({ ...user, name: e.target.value })}
                          required
                          maxLength={80}
                        />
                      </label>
                      <div className="form-two">
                        <label className="field">
                          How you like to eat
                          <Choose
                            label="Dietary preference"
                            value={prefs.diet}
                            onChange={(diet) => setPrefs({ ...prefs, diet })}
                            options={[
                              "Anything",
                              "Vegetarian",
                              "Vegan",
                              "Pescatarian",
                              "Gluten-free",
                              "Dairy-free",
                            ]}
                          />
                        </label>
                        <label className="field">
                          Time in the kitchen
                          <Choose
                            label="Cooking time preference"
                            value={prefs.time}
                            onChange={(time) => setPrefs({ ...prefs, time })}
                            options={["15", "30", "45", "60", "90"]}
                          />
                        </label>
                      </div>
                      <label className="field">
                        Allergies & ingredients to avoid
                        <input
                          placeholder="e.g. peanuts, sesame"
                          value={prefs.allergens}
                          onChange={(e) => setPrefs({ ...prefs, allergens: e.target.value })}
                        />
                      </label>
                      <div className="form-two">
                        <label className="field">
                          Recipe language
                          <Choose
                            label="Recipe language"
                            value={prefs.language}
                            onChange={(language) => setPrefs({ ...prefs, language })}
                            options={["English", "Nederlands", "Français", "Español"]}
                          />
                        </label>
                        <label className="field">
                          Measurements
                          <Choose
                            label="Measurement system"
                            value={prefs.units}
                            onChange={(units) => setPrefs({ ...prefs, units })}
                            options={["metric", "imperial"]}
                          />
                        </label>
                      </div>
                      <label className="field">
                        Site language
                        <LanguagePicker />
                      </label>
                      <button className="btn primary full" type="submit">
                        Save preferences <Check size={17} />
                      </button>
                    </form>
                  </section>
                  <aside>
                    {settings.billing && (
                      <div className="plus-card">
                        <span className="eyebrow">MISEORA PLUS</span>
                        <h2>
                          More room
                          <br />
                          to get creative.
                        </h2>
                        <p>Free includes one guided recipe a day. Plus opens up more cooking sessions.</p>
                        <button className="btn dark-btn" onClick={() => setModal("plus")}>
                          Explore Plus <ArrowUpRight size={17} />
                        </button>
                      </div>
                    )}
                    <div className="panel account-links">
                      <button
                        onClick={() => {
                          setModal("onboarding");
                        }}
                      >
                        <SlidersHorizontal size={17} /> Kitchen onboarding <ChevronRight size={17} />
                      </button>
                      <button onClick={() => go("admin")}>
                        <ShieldCheck size={17} /> Owner dashboard <ChevronRight size={17} />
                      </button>
                      <button
                        onClick={async () => {
                          await api({ action: "logout" }, "/api/auth");
                          location.assign("/");
                        }}
                      >
                        <LogOut size={17} /> Sign out
                      </button>
                      {settings.billing && (
                        <button
                          onClick={async () => {
                            try {
                              const d = await api({ action: "portal" }, "/api/billing");
                              location.assign(d.url);
                            } catch (e: any) {
                              toast.error(e.message);
                            }
                          }}
                        >
                          Manage subscription
                        </button>
                      )}
                    </div>
                  </aside>
                </div>
              </>
            )}
            {route === "admin" && (
              <>
                {header(
                  "OWNER ONLY",
                  "Behind the kitchen door.",
                  "Manage published recipes and reviews. Access is checked on the server.",
                )}
                <button
                  className="btn primary"
                  onClick={async () => {
                    try {
                      const r = await fetch("/api/admin");
                      const d: any = await r.json();
                      if (!r.ok) throw new Error(d.error);
                      setAdmin(d);
                    } catch (e: any) {
                      toast.error(e.message);
                    }
                  }}
                >
                  Open owner dashboard <ShieldCheck size={17} />
                </button>
                {admin ? (
                  <div className="panel">
                    <h3>
                      {admin.users.length} cooks · {admin.recipes.length} recipes
                    </h3>
                    {admin.recipes.map((r: any) => (
                      <div className="fridge-item" key={r.id}>
                        <strong>{JSON.parse(r.data).title}</strong>
                        <span>{r.published ? "Published" : "Private"}</span>
                        <button
                          className="btn outline"
                          onClick={async () => {
                            try {
                              await api({ action: "unpublish", id: r.id }, "/api/admin");
                              setAdmin({
                                ...admin,
                                recipes: admin.recipes.map((x: any) =>
                                  x.id === r.id ? { ...x, published: 0 } : x,
                                ),
                              });
                              toast.success("Unpublished");
                            } catch (e: any) {
                              toast.error(e.message);
                            }
                          }}
                        >
                          Unpublish
                        </button>
                      </div>
                    ))}
                    {admin.reviews.map((r: any) => (
                      <div className="fridge-item" key={r.id}>
                        <p>{r.body}</p>
                        <button
                          className="text-btn"
                          onClick={async () => {
                            try {
                              await api({ action: "removeReview", id: r.id }, "/api/admin");
                              setAdmin({
                                ...admin,
                                reviews: admin.reviews.filter((x: any) => x.id !== r.id),
                              });
                              toast.success("Review removed");
                            } catch (e: any) {
                              toast.error(e.message);
                            }
                          }}
                        >
                          Remove review
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="notice">
                    Your owner account must be assigned before this dashboard can be opened.{" "}
                    <button onClick={() => go("setup")}>View setup guide</button>
                  </div>
                )}
              </>
            )}
            {(route === "login" || route === "signup") && (
              <section className="sign-in-page">
                <Logo />
                <h1>Your kitchen is waiting.</h1>
                <p>Sign in or create a free account to save recipes and your fridge.</p>
                <button className="btn primary" onClick={() => setModal(route)}>
                  Continue
                </button>
              </section>
            )}
            {route === "reset-password" && (
              <section className="sign-in-page">
                <h1>Choose a new password</h1>
                <AuthPanel
                  reset
                  settings={settings}
                  onMode={() => {}}
                  onDone={() => location.assign("/profile")}
                />
              </section>
            )}
            {isInfo &&
              (route === "setup" ? (
                <LaunchGuide settings={settings} userId={user.id} />
              ) : (
                <PublicInfo route={route} go={go} supportEmail={settings.supportEmail} />
              ))}
          </>
        )}
      </main>
      <footer>
        <div className="footer-top">
          <button className="brand-button" onClick={() => go("home")}>
            <Logo />
          </button>
          <p>A little inspiration. A lot of good food.</p>
          <button className="text-btn" onClick={() => setModal("language")}>
            <Globe size={15} /> {{ en: "English", nl: "Nederlands", fr: "Français", es: "Español" }[lang]}{" "}
            <ChevronRight size={14} />
          </button>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Miseora</span>
          <nav>
            {["About", "Contact", "FAQ", "Privacy", "Terms"].map((s) => (
              <button key={s} onClick={() => go(s.toLowerCase())}>
                {s === "Privacy" ? "Privacy policy" : s}
              </button>
            ))}
          </nav>
          <span className="made-with">
            Made for the joy of cooking <Heart size={13} />
          </span>
        </div>
      </footer>
      <Dialog
        open={!!modal}
        onOpenChange={(v) => {
          if (!v) {
            if (modal === "onboarding" && busy) return;
            if (modal === "onboarding") dismissWelcome();
            else setModal("");
            setCooking(false);
          }
        }}
      >
        <DialogContent
          showCloseButton={!(modal === "onboarding" && busy)}
          className={
            "kitchen-dialog " +
            (modal === "onboarding"
              ? "welcome-dialog"
              : ["recipe", "editor", "shopping", "pantry"].includes(modal)
                ? "wide-dialog"
                : "")
          }
        >
          <DialogTitle className={modal === "onboarding" ? "sr-only" : "dialog-title"}>
            {{
              language: "Choose your language",
              pantry: "What do you have?",
              generate: "Let’s make something yours.",
              editor: editId ? "Make it even better." : "Create a recipe.",
              onboarding: "Make yourself at home.",
              login: "Welcome back.",
              signup: "Your kitchen starts here.",
              plus: "A little more possibility.",
              shopping: "Your shopping list.",
              plan: "What’s for " + plannerDay + "?",
              recipe: selected?.title,
            }[modal] || "Your kitchen"}
          </DialogTitle>
          <DialogDescription className={modal === "onboarding" ? "sr-only" : "dialog-description"}>
            {{
              pantry: "Tap everything you have, then add it all in one go.",
              generate: "Start with your ingredients and tell us what you’re in the mood for.",
              editor: "Three parts: the basics, what you need, and how to make it.",
              onboarding: "A few small details. Recipes that feel a little more like you.",
              login: "Sign in to save, cook, and share. No guest access.",
              signup: "Create your personal space for everything delicious.",
              plus: "Choose a plan that fits your time in the kitchen.",
              shopping: "Ingredients from your planned meals. Check your cupboard before you shop.",
              plan: "Pick a recipe for your weekly plan.",
              recipe: cooking ? "" : selected?.description,
            }[modal] || ""}
          </DialogDescription>
          {modal === "language" && <LanguagePicker expanded />}
          {(modal === "login" || modal === "signup") && (
            <AuthPanel
              signup={modal === "signup"}
              settings={settings}
              onDone={() => location.reload()}
              onMode={() => setModal(modal === "login" ? "signup" : "login")}
            />
          )}
          {modal === "pantry" && (
            <IngredientPicker have={fridge.map((e) => e.data.name)} busy={busy} onAdd={addIngredients} />
          )}
          {modal === "generate" && (
            <div>
              <div className="ingredient-chips">
                {fridge.length ? (
                  fridge.map((e) => (
                    <span className="chip" key={e.id}>
                      <Leaf size={14} />
                      {e.data.name}
                    </span>
                  ))
                ) : (
                  <p>No ingredients yet. You can describe them below.</p>
                )}
              </div>
              {base && <div className="notice">Remixing: {base.title}</div>}
              <label className="field">
                What are you in the mood for?
                <textarea
                  value={remix}
                  onChange={(e) => setRemix(e.target.value)}
                  placeholder="Something quick with tomatoes and pasta, or a dairy-free version of my favourite curry…"
                  rows={4}
                  maxLength={2000}
                />
              </label>
              <div className="notice">
                <Sparkles size={17} /> Confirm ingredients and check dietary requirements before cooking.
              </div>
              <button className="btn primary full" disabled={busy} onClick={generate}>
                {busy ? "Creating your recipe…" : "Create a recipe"} <Sparkles size={17} />
              </button>
            </div>
          )}
          {modal === "editor" && (
            <RecipeEditor
              key={editorKey}
              initial={editorSource}
              busy={busy}
              onSave={saveRecipe}
              uploadImage={uploadImage}
            />
          )}
          {modal === "recipe" && selected && (
            <div className="recipe-detail">
              {!cooking ? (
                <>
                  <div className="detail-top">
                    {selected.image && (
                      <img className="detail-image" src={selected.image} alt={selected.title} />
                    )}
                    <div className="detail-facts">
                      <span>
                        <Clock size={17} />
                        {selected.minutes} minutes
                      </span>
                      <span>
                        <ChefHat size={17} />
                        {selected.cuisine}
                      </span>
                      <span>
                        <Users size={17} />
                        <button
                          aria-label="Fewer servings"
                          onClick={() => setServings(Math.max(1, servings - 1))}
                        >
                          −
                        </button>
                        {servings} servings
                        <button aria-label="More servings" onClick={() => setServings(servings + 1)}>
                          +
                        </button>
                      </span>
                    </div>
                  </div>
                  <div className="detail-actions">
                    <button className="btn primary" onClick={startCooking}>
                      <Play size={16} /> Let’s cook
                    </button>
                    <button className="btn outline" onClick={() => toggle("favorite", selected.id)}>
                      <Bookmark size={16} />
                      {has("favorite", selected.id) ? "Saved" : "Save"}
                    </button>
                    <button className="btn outline" onClick={() => toggle("like", selected.id)}>
                      <Heart size={16} fill={has("like", selected.id) ? "currentColor" : "none"} />
                      {count("like", selected.id)}
                    </button>
                    {settings.ai && (
                      <button
                        className="btn outline"
                        onClick={() => {
                          guard(() => {
                            setBase(selected);
                            setModal("generate");
                          });
                        }}
                      >
                        <Sparkles size={16} /> Remix
                      </button>
                    )}
                  </div>
                  <div className="detail-columns">
                    <section>
                      <h3>What you’ll need</h3>
                      <p className="small-note">Tap each item as you get it ready.</p>
                      {selected.ingredients.map((i, n) => {
                        const line = ingredientLine(i, servings / selected.servings, units, lang);
                        return (
                          <label className="check-row" key={n}>
                            <Checkbox
                              checked={checked.includes(i.name)}
                              onCheckedChange={(v) =>
                                setChecked(v ? [...checked, i.name] : checked.filter((x) => x !== i.name))
                              }
                            />
                            <span className={checked.includes(i.name) ? "crossed" : ""} data-no-translate>
                              {line}
                            </span>
                          </label>
                        );
                      })}
                    </section>
                    <section>
                      <h3>How to make it</h3>
                      <p className="small-note">
                        {selected.steps.length} steps. Press “Let’s cook” to go through them one at a time.
                      </p>
                      <ol className="step-overview">
                        {selected.steps.map((st, i) => (
                          <li className="small-step" key={i}>
                            <span>{i + 1}</span>
                            <div>
                              <strong>
                                {st.title}
                                {st.minutes ? (
                                  <small className="step-time">
                                    <Clock size={12} /> {st.minutes} min
                                  </small>
                                ) : null}
                              </strong>
                              <p data-no-translate>
                                {stepParts(st.text, lang).map((part, n) =>
                                  typeof part === "string"
                                    ? part
                                    : selected.ingredients[part.ingredient] && (
                                        <b key={n}>
                                          {ingredientLine(
                                            selected.ingredients[part.ingredient],
                                            servings / selected.servings,
                                            units,
                                            lang,
                                          )}
                                        </b>
                                      ),
                                )}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ol>
                    </section>
                  </div>
                  <div className="author-row">
                    <span className="avatar">{selected.author.charAt(0)}</span>
                    <div>
                      <strong>{selected.author}</strong>
                      <small>
                        {selected.owner ? "Community cook" : "Kitchen recipe · illustrative photo"}
                      </small>
                    </div>
                    {selected.owner && selected.owner !== user.id && (
                      <button className="btn outline" onClick={() => toggle("follow", selected.owner!)}>
                        {has("follow", selected.owner) ? "Following" : "Follow"}
                      </button>
                    )}
                  </div>
                  {signedIn && selected.owner && selected.owner === user.id && (
                    <div className="detail-actions">
                      <button className="btn outline" onClick={() => edit(selected)}>
                        <PenLine size={15} /> Edit
                      </button>
                      <button
                        className="btn primary"
                        onClick={async () => {
                          const published = !mine.find((r) => r.id === selected.id)?.published;
                          if (
                            await action(
                              { action: "publish", id: selected.id, published },
                              published ? "Published to the community" : "Recipe made private",
                            )
                          )
                            setSelected({ ...selected, published });
                        }}
                      >
                        {mine.find((r) => r.id === selected.id)?.published
                          ? "Make private"
                          : "Publish recipe"}
                      </button>
                      <button
                        className="icon-btn danger"
                        aria-label="Delete recipe"
                        onClick={() => setDeleteId(selected.id)}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  )}
                  <section className="reviews">
                    <details
                      className="recipe-more"
                      open={reviewsOpen}
                      onToggle={(e) => setReviewsOpen((e.target as HTMLDetailsElement).open)}
                    >
                      <summary>Reviews & tips</summary>
                      {reviews
                        .filter((r) => r.recipe === selected.id)
                        .map((r) => (
                          <div className="review" key={r.id}>
                            <strong>{r.name}</strong>
                            <span className="stars">{"★".repeat(r.rating)}</span>
                            <p>{r.body}</p>
                          </div>
                        ))}
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          if (
                            await action(
                              {
                                action: "review",
                                recipe: selected.id,
                                name: user.name,
                                rating: Number(rating),
                                body: comment,
                              },
                              "Review added",
                            )
                          )
                            setComment("");
                        }}
                      >
                        <label className="field">
                          How did it go?
                          <textarea
                            rows={2}
                            required
                            maxLength={1500}
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Share a helpful tip or your favourite part…"
                          />
                        </label>
                        <div className="review-actions">
                          <Choose
                            label="Rating"
                            value={rating}
                            onChange={setRating}
                            options={["5", "4", "3", "2", "1"]}
                          />
                          <span>out of 5 stars</span>
                          <button className="btn primary" type="submit">
                            Post review
                          </button>
                        </div>
                      </form>
                    </details>
                  </section>
                </>
              ) : (
                <CookingMode
                  recipe={selected}
                  scale={servings / selected.servings}
                  units={units}
                  signedIn={signedIn}
                  onExit={() => setCooking(false)}
                  onFinish={finishCooking}
                  onReview={() => {
                    setCooking(false);
                    setReviewsOpen(true);
                  }}
                />
              )}
            </div>
          )}
          {modal === "onboarding" && (
            <KitchenOnboarding
              initial={prefs}
              signedIn={signedIn}
              onComplete={completeWelcome}
              onDismiss={dismissWelcome}
            />
          )}
          {modal === "plan" && (
            <div className="plan-options">
              {all.map((r) => (
                <button
                  key={r.id}
                  onClick={async () => {
                    if (
                      await action(
                        { action: "entry", kind: "planner", id: plannerDay, data: { recipe: r.id } },
                        "Meal added to " + plannerDay,
                      )
                    )
                      setModal("");
                  }}
                >
                  {r.image && <img src={r.image} alt="" />}
                  <span>
                    <strong>{r.title}</strong>
                    <small>{r.minutes} minutes</small>
                  </span>
                  <Plus size={18} />
                </button>
              ))}
            </div>
          )}
          {modal === "shopping" && (
            <div>
              {byKind("planner").length ? (
                byKind("planner").map((e) => {
                  const r = all.find((r) => r.id === e.data.recipe);
                  return (
                    r && (
                      <section className="shopping-section" key={e.id}>
                        <h3>
                          {e.id} · {r.title}
                        </h3>
                        {r.ingredients.map((i, n) => (
                          <label className="check-row" key={n}>
                            <Checkbox
                              checked={has("shopping", e.id + ":" + r.id + ":" + n)}
                              onCheckedChange={() => toggle("shopping", e.id + ":" + r.id + ":" + n)}
                            />
                            <span data-no-translate>{ingredientLine(i, 1, units, lang)}</span>
                            {fridge.some((f) => sameIngredient(i.name, f.data.name)) && (
                              <small>In your fridge</small>
                            )}
                          </label>
                        ))}
                      </section>
                    )
                  );
                })
              ) : (
                <div className="empty">
                  <ShoppingBasket />
                  <h3>Your list is waiting for a plan.</h3>
                  <p>Add a meal to your weekly planner first.</p>
                </div>
              )}
            </div>
          )}
          {modal === "plus" && (
            <div className="plan-comparison">
              <div>
                <span className="eyebrow">FREE</span>
                <h2>Everyday</h2>
                <p>
                  One guided cooking session per day. Save favourites, create recipes, and plan your week.
                </p>
                <span className="chip">Your current plan</span>
              </div>
              <div>
                <span className="eyebrow">PLUS</span>
                <h2>More possibility</h2>
                <p>More guided cooking sessions and more room to experiment.</p>
                <small>{settings.plusLabel || "Pricing available soon"}</small>
                <button
                  className="btn primary full"
                  onClick={async () => {
                    try {
                      const d = await api({}, "/api/billing");
                      location.assign(d.url);
                    } catch (e: any) {
                      toast.info(e.message);
                    }
                  }}
                >
                  Explore Plus
                </button>
              </div>
              <p className="small-note">
                {settings.billing
                  ? "Checkout shows the price and renewal terms before you pay."
                  : "Plus is not available yet. No payment has been taken."}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(v) => {
          if (!v) setDeleteId("");
        }}
      >
        <AlertDialogContent>
          <AlertDialogTitle>Delete this recipe?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes your recipe from your collection and the community. This cannot be undone.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep recipe</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (await action({ action: "deleteRecipe", id: deleteId }, "Recipe deleted")) {
                  setModal("");
                  setDeleteId("");
                }
              }}
            >
              Delete recipe
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>,
    lang,
  );
}
