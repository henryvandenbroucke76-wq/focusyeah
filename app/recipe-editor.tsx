"use client";
import { useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  CircleAlert,
  Clock,
  ImagePlus,
  Lightbulb,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useLanguage, localize, translate } from "@/lib/i18n";
import type { Recipe } from "@/lib/recipes";
import { IngredientInput } from "./ingredient-input";
import { stepIngredients } from "@/lib/recipe-format";

export const UNITS = ["", "g", "kg", "ml", "l", "tsp", "tbsp", "cup", "pinch"];
export const TAGS = [
  "Vegetarian",
  "Vegan",
  "Quick & easy",
  "One pot",
  "Breakfast",
  "Lunch",
  "Dinner",
  "Comfort food",
];

type DraftIngredient = { key: string; qty: string; unit: string; name: string };
type DraftStep = { key: string; title: string; text: string; minutes: string; check: string };
export type RecipeInput = Omit<Recipe, "id" | "author" | "owner" | "published">;

let counter = 0;
const key = () => `k${++counter}`;
const clampText = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");
const vulgar: Record<string, number> = { "¼": 0.25, "½": 0.5, "¾": 0.75, "⅓": 1 / 3, "⅔": 2 / 3 };
// "2", "0,5", "1/2", "1 1/2", "1½" → number; "" → 0 (to taste); anything else → NaN.
export function parseQty(text: string) {
  const t = text.trim().replace(",", ".");
  if (!t) return 0;
  const m = t.match(/^(\d+(?:\.\d+)?)?\s*(?:([¼½¾⅓⅔])|(\d+)\/(\d+))?$/);
  if (!m || (!m[1] && !m[2] && !m[3])) return NaN;
  const whole = m[1] ? Number(m[1]) : 0;
  const part = m[2] ? vulgar[m[2]] : m[3] ? Number(m[3]) / Number(m[4]) : 0;
  const value = whole + part;
  return Number.isFinite(value) && value > 0 ? Math.round(value * 1000) / 1000 : NaN;
}

// Accepts anything recipe-shaped (an existing recipe, an imported file, an AI suggestion)
// and turns it into editable rows. Bad fields are dropped rather than crashing the editor.
function toDraft(source: Partial<Recipe> | null) {
  const ingredients = Array.isArray(source?.ingredients) ? source!.ingredients : [];
  const steps = Array.isArray(source?.steps) ? source!.steps : [];
  return {
    title: clampText(source?.title, 120),
    description: clampText(source?.description, 1000),
    cuisine: clampText(source?.cuisine, 60) || "Your kitchen",
    minutes: String(Number(source?.minutes) > 0 ? Math.round(Number(source?.minutes)) : 30),
    servings: String(Number(source?.servings) > 0 ? Math.round(Number(source?.servings)) : 2),
    tags: Array.isArray(source?.tags) ? source!.tags.filter((t) => TAGS.includes(t)) : [],
    image: typeof source?.image === "string" ? source.image : "",
    ingredients: ingredients
      .filter((i) => i && typeof i.name === "string" && i.name.trim())
      .slice(0, 60)
      .map((i) => ({
        key: key(),
        qty: Number(i.qty) > 0 ? String(i.qty) : "",
        unit: UNITS.includes(i.unit) ? i.unit : "",
        name: i.name.slice(0, 100),
      })),
    steps: steps
      .filter((s) => s && typeof s.text === "string" && s.text.trim())
      .slice(0, 40)
      .map((s) => ({
        key: key(),
        title: clampText(s.title, 120),
        text: s.text.slice(0, 2000),
        minutes: Number(s.minutes) > 0 ? String(Math.round(Number(s.minutes))) : "",
        check: clampText(s.check, 300),
      })),
  };
}

export function RecipeEditor({
  initial,
  busy,
  onSave,
  uploadImage,
}: {
  initial: Partial<Recipe> | null;
  busy: boolean;
  onSave: (recipe: RecipeInput) => void;
  uploadImage: (file: File) => Promise<string | undefined>;
}) {
  const { lang } = useLanguage();
  const [draft, setDraft] = useState(() => toDraft(initial));
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);
  const set = (patch: Partial<typeof draft>) => setDraft((d) => ({ ...d, ...patch }));
  const setIngredient = (k: string, patch: Partial<DraftIngredient>) =>
    set({ ingredients: draft.ingredients.map((i) => (i.key === k ? { ...i, ...patch } : i)) });
  const setStep = (k: string, patch: Partial<DraftStep>) =>
    set({ steps: draft.steps.map((s) => (s.key === k ? { ...s, ...patch } : s)) });
  function moveStep(index: number, by: number) {
    const steps = [...draft.steps];
    const [s] = steps.splice(index, 1);
    steps.splice(index + by, 0, s);
    set({ steps });
  }
  function addStep() {
    set({ steps: [...draft.steps, { key: key(), title: "", text: "", minutes: "", check: "" }] });
  }

  // Build the recipe the way it will be saved, so the "not used in a step" check is exact.
  function build(): RecipeInput {
    return {
      title: draft.title.trim(),
      description: draft.description.trim(),
      cuisine: draft.cuisine.trim() || "Your kitchen",
      tags: draft.tags,
      minutes: Math.round(Number(draft.minutes)),
      servings: Math.round(Number(draft.servings)),
      image: draft.image,
      ingredients: draft.ingredients
        .filter((i) => i.name.trim())
        .map((i) => ({
          name: i.name.trim(),
          qty: parseQty(i.qty) || 0,
          unit: parseQty(i.qty) ? i.unit : "",
        })),
      steps: draft.steps
        .filter((s) => s.text.trim())
        .map((s, n) => ({
          title: s.title.trim() || `${translate("Step", lang)} ${n + 1}`,
          text: s.text.trim(),
          ...(Number(s.minutes) > 0 ? { minutes: Math.round(Number(s.minutes)) } : {}),
          ...(s.check.trim() ? { check: s.check.trim() } : {}),
        })),
    };
  }
  const preview = build();
  const usedIngredients = new Set(
    preview.steps.flatMap((_, n) =>
      stepIngredients({ ...preview, id: "", author: "" }, n, (name) => [translate(name, lang)]),
    ),
  );
  const unused = preview.ingredients.filter((_, n) => !usedIngredients.has(n)).map((i) => i.name);
  const checklist: [boolean, string][] = [
    [!!preview.title, "Give it a name"],
    [preview.ingredients.length > 0, "Add at least one ingredient"],
    [preview.steps.length > 0, "Write at least one step"],
    [preview.ingredients.length > 0 && unused.length === 0, "Use every ingredient in a step"],
  ];

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const recipe = build();
    const badQty = draft.ingredients.find((i) => i.name.trim() && Number.isNaN(parseQty(i.qty)));
    const problem = !recipe.title
      ? "Give your recipe a name."
      : !recipe.ingredients.length
        ? "Add at least one ingredient."
        : badQty
          ? "Check the amounts. Use numbers like 2, 0.5 or 1/2."
          : !recipe.steps.length
            ? "Write at least one cooking step."
            : !(recipe.minutes >= 1 && recipe.minutes <= 1440)
              ? "Set a total time between 1 and 1440 minutes."
              : !(recipe.servings >= 1 && recipe.servings <= 100)
                ? "Set servings between 1 and 100."
                : "";
    setError(problem ? translate(problem, lang) + (badQty ? ` (${badQty.name})` : "") : "");
    if (!problem) onSave(recipe);
  }

  return localize(
    <form className="recipe-editor" onSubmit={submit} noValidate>
      <div className="editor-tip">
        <Lightbulb size={18} />
        <p>
          Great recipes are easy to follow: list everything you need, then write one action per step with the
          time, the heat, and how to tell when it’s done.
        </p>
      </div>

      <section>
        <h3>
          <span className="step-badge">1</span> The basics
        </h3>
        <label className="field">
          Recipe name
          <input
            maxLength={120}
            placeholder="Grandma’s Sunday pasta"
            value={draft.title}
            onChange={(e) => set({ title: e.target.value })}
          />
        </label>
        <label className="field">
          A little about it <small>(optional)</small>
          <textarea
            maxLength={1000}
            rows={2}
            placeholder="What makes this recipe special?"
            value={draft.description}
            onChange={(e) => set({ description: e.target.value })}
          />
        </label>
        <div className="form-three">
          <label className="field">
            Total time (minutes)
            <input
              type="number"
              inputMode="numeric"
              min="1"
              max="1440"
              value={draft.minutes}
              onChange={(e) => set({ minutes: e.target.value })}
            />
          </label>
          <label className="field">
            Servings
            <input
              type="number"
              inputMode="numeric"
              min="1"
              max="100"
              value={draft.servings}
              onChange={(e) => set({ servings: e.target.value })}
            />
          </label>
          <label className="field">
            Cuisine
            <input
              maxLength={60}
              placeholder="Italian"
              value={draft.cuisine}
              onChange={(e) => set({ cuisine: e.target.value })}
            />
          </label>
        </div>
        <div className="tag-picker" role="group" aria-label="Labels">
          {TAGS.map((t) => (
            <button
              type="button"
              key={t}
              className={"chip" + (draft.tags.includes(t) ? " active" : "")}
              aria-pressed={draft.tags.includes(t)}
              onClick={() =>
                set({ tags: draft.tags.includes(t) ? draft.tags.filter((x) => x !== t) : [...draft.tags, t] })
              }
            >
              {t}
            </button>
          ))}
        </div>
        <div className="editor-photo">
          {draft.image ? (
            <img src={draft.image} alt="Recipe photograph" />
          ) : (
            <span className="photo-placeholder">
              <ImagePlus size={26} />
            </span>
          )}
          <input
            hidden
            ref={photoInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              setUploading(true);
              try {
                const url = await uploadImage(file);
                if (url) set({ image: url });
              } finally {
                setUploading(false);
              }
            }}
          />
          <button
            type="button"
            className="btn outline"
            disabled={busy || uploading}
            onClick={() => photoInput.current?.click()}
          >
            <Upload size={16} /> {uploading ? "Uploading…" : draft.image ? "Change photo" : "Add a photo"}
          </button>
          {draft.image && (
            <button type="button" className="text-btn" onClick={() => set({ image: "" })}>
              Remove photo
            </button>
          )}
        </div>
      </section>

      <section>
        <h3>
          <span className="step-badge">2</span> Ingredients
        </h3>
        <p className="small-note">
          Amounts are for the number of servings above. Leave the amount empty for things like “salt, to
          taste”.
        </p>
        {draft.ingredients.length > 0 && (
          <div className="editor-ingredients">
            {draft.ingredients.map((i) => (
              <div className="editor-ingredient" key={i.key}>
                <input
                  className="qty"
                  inputMode="decimal"
                  aria-label={translate("Amount", lang) + " " + i.name}
                  placeholder="Amount"
                  value={i.qty}
                  maxLength={8}
                  onChange={(e) => setIngredient(i.key, { qty: e.target.value })}
                />
                <select
                  aria-label={translate("Unit", lang) + " " + i.name}
                  value={i.unit}
                  onChange={(e) => setIngredient(i.key, { unit: e.target.value })}
                >
                  {UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u ? translate(u, lang) : "–"}
                    </option>
                  ))}
                </select>
                <input
                  aria-label={translate("Ingredient name", lang)}
                  value={i.name}
                  maxLength={100}
                  onChange={(e) => setIngredient(i.key, { name: e.target.value })}
                />
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={"Remove " + i.name}
                  onClick={() => set({ ingredients: draft.ingredients.filter((x) => x.key !== i.key) })}
                >
                  <X size={17} />
                </button>
              </div>
            ))}
          </div>
        )}
        <IngredientInput
          label="Add an ingredient"
          placeholder="Add an ingredient, like tomatoes…"
          exclude={draft.ingredients.map((i) => i.name)}
          onAdd={(name) =>
            draft.ingredients.length < 60 &&
            set({
              ingredients: [
                ...draft.ingredients,
                { key: key(), qty: "", unit: "", name: translate(name, lang) },
              ],
            })
          }
        />
      </section>

      <section>
        <h3>
          <span className="step-badge">3</span> Cooking steps
        </h3>
        <p className="small-note">
          One action per step. Mention the ingredients you use, how long, and how hot. Add a timer if the step
          needs waiting.
        </p>
        <ol className="editor-steps">
          {draft.steps.map((s, n) => (
            <li key={s.key} className="editor-step">
              <div className="editor-step-head">
                <span className="step-badge">{n + 1}</span>
                <input
                  aria-label={translate("Step title", lang) + " " + (n + 1)}
                  placeholder="Short title, like “Roast the vegetables”"
                  maxLength={120}
                  value={s.title}
                  onChange={(e) => setStep(s.key, { title: e.target.value })}
                />
                <button
                  type="button"
                  className="icon-btn"
                  aria-label="Move step up"
                  disabled={n === 0}
                  onClick={() => moveStep(n, -1)}
                >
                  <ArrowUp size={16} />
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label="Move step down"
                  disabled={n === draft.steps.length - 1}
                  onClick={() => moveStep(n, 1)}
                >
                  <ArrowDown size={16} />
                </button>
                <button
                  type="button"
                  className="icon-btn danger"
                  aria-label="Delete step"
                  onClick={() => set({ steps: draft.steps.filter((x) => x.key !== s.key) })}
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <textarea
                aria-label={translate("What to do", lang) + " " + (n + 1)}
                rows={3}
                maxLength={2000}
                placeholder="Spread the vegetables on a tray, drizzle with olive oil and roast at 200°C for 25 minutes."
                value={s.text}
                onChange={(e) => setStep(s.key, { text: e.target.value })}
              />
              <div className="editor-step-extra">
                <label>
                  <Clock size={15} /> Timer
                  <input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    max="600"
                    placeholder="–"
                    value={s.minutes}
                    onChange={(e) => setStep(s.key, { minutes: e.target.value })}
                  />
                  min
                </label>
                <label className="grow">
                  <Check size={15} /> Ready when
                  <input
                    maxLength={300}
                    placeholder="the edges are golden (optional)"
                    value={s.check}
                    onChange={(e) => setStep(s.key, { check: e.target.value })}
                  />
                </label>
              </div>
            </li>
          ))}
        </ol>
        <button type="button" className="btn outline" onClick={addStep} disabled={draft.steps.length >= 40}>
          <Plus size={16} /> Add a step
        </button>
      </section>

      <section className="editor-checklist" aria-live="polite">
        <h3>Before you save</h3>
        <ul>
          {checklist.map(([ok, label]) => (
            <li key={label} className={ok ? "ok" : ""}>
              {ok ? <Check size={16} /> : <CircleAlert size={16} />}
              {label}
            </li>
          ))}
        </ul>
        {unused.length > 0 && (
          <p className="small-note">
            <span>Not mentioned in any step yet:</span> <span data-no-translate>{unused.join(", ")}</span>
          </p>
        )}
      </section>

      {error && (
        <p className="notice error" role="alert" data-no-translate>
          {error}
        </p>
      )}
      <button type="submit" className="btn primary full" disabled={busy || uploading}>
        {busy ? "Saving…" : "Save recipe"} <Check size={17} />
      </button>
    </form>,
    lang,
  );
}
