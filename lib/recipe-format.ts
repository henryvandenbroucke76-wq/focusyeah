import type { Ingredient, Recipe } from "@/lib/recipes";
import { translate, type Language } from "@/lib/i18n";

export type Units = "metric" | "imperial";

const fractions: [number, string][] = [
  [0.25, "¼"],
  [0.33, "⅓"],
  [0.5, "½"],
  [0.67, "⅔"],
  [0.75, "¾"],
];

// Friendly numbers for a kitchen: ½ instead of 0.5, 155 g instead of 153.3 g.
function niceNumber(value: number, unit: string) {
  if (unit === "g" || unit === "ml") {
    if (value >= 100) return String(Math.round(value / 5) * 5);
    if (value >= 10) return String(Math.round(value));
    return String(Math.round(value * 10) / 10);
  }
  const whole = Math.floor(value + 0.001);
  const rest = value - whole;
  if (rest < 0.12) return whole ? String(whole) : "¼"; // never round a real amount down to 0
  if (rest > 0.88) return String(whole + 1);
  const [, symbol] = fractions.reduce((best, f) =>
    Math.abs(f[0] - rest) < Math.abs(best[0] - rest) ? f : best,
  );
  return whole ? `${whole}${symbol}` : symbol;
}

// "150 g", "1½ tbsp", "2", or "" for "to taste" ingredients (quantity 0).
export function formatAmount(ingredient: Ingredient, scale: number, units: Units = "metric") {
  if (!ingredient.qty) return "";
  let qty = ingredient.qty * scale;
  let unit = ingredient.unit || "";
  if (units === "imperial" && unit === "g") {
    qty /= 28.3495;
    unit = "oz";
  } else if (units === "imperial" && unit === "ml") {
    qty /= 29.5735;
    unit = "fl oz";
  }
  const number =
    unit === "oz" || unit === "fl oz" ? String(Math.round(qty * 10) / 10) : niceNumber(qty, unit);
  return unit ? `${number} ${unit}` : number;
}

// "150 g quinoa" / "salt and black pepper (to taste)", translated.
export function ingredientLine(ingredient: Ingredient, scale: number, units: Units, lang: Language) {
  const amount = formatAmount(ingredient, scale, units);
  const unitWord = ingredient.unit ? translate(ingredient.unit, lang) : "";
  const name = translate(ingredient.name, lang);
  if (!amount) return `${name} (${translate("to taste", lang)})`;
  return `${unitWord ? amount.replace(ingredient.unit, unitWord) : amount} ${name}`;
}

export type StepPart = string | { ingredient: number };

// Step text may contain {0}, {1}… meaning "ingredient 0 with its amount". The text is translated
// first (the placeholders survive translation), then split so each amount follows the servings.
export function stepParts(text: string, lang: Language): StepPart[] {
  return translate(text, lang)
    .split(/(\{\d+\})/)
    .filter(Boolean)
    .map((part) => {
      const m = part.match(/^\{(\d+)\}$/);
      return m ? { ingredient: Number(m[1]) } : part;
    });
}

const words = (v: string) =>
  v
    .toLocaleLowerCase()
    .split(/[^a-zà-ÿ]+/)
    .filter((w) => w.length > 2)
    .map((w) => w.replace(/(es|s)$/, ""));

const generic = new Set(
  "fresh cooked ground small large red green yellow black white clove leave leaf and the chopped grated rolled baby flat roasted boiling plain"
    .split(" ")
    .map((w) => w.replace(/(es|s)$/, "")),
);

// Which ingredients a step uses: the {n} placeholders, or (for recipes written without them)
// any ingredient whose main word appears in the step.
export function stepIngredients(
  recipe: Recipe,
  stepIndex: number,
  aliases: (name: string) => string[] = () => [],
): number[] {
  const step = recipe.steps[stepIndex];
  if (!step) return [];
  const placeholders = [...step.text.matchAll(/\{(\d+)\}/g)].map((m) => Number(m[1]));
  if (placeholders.length)
    return [...new Set(placeholders)].filter((i) => i >= 0 && i < recipe.ingredients.length);
  const stepWords = new Set(words(step.title + " " + step.text));
  // Match any meaningful word of the name ("garlic cloves" → "garlic"), in English or the cook's language.
  return recipe.ingredients
    .map((ing, i) => ({
      i,
      keys: [ing.name, ...aliases(ing.name)].flatMap((n) => words(n).filter((w) => !generic.has(w))),
    }))
    .filter(({ keys }) => keys.some((k) => stepWords.has(k)))
    .map(({ i }) => i);
}

// Plain-text version of a step (for previews, search and exports).
export function stepPlainText(recipe: Recipe, text: string, scale: number, units: Units, lang: Language) {
  return stepParts(text, lang)
    .map((p) =>
      typeof p === "string"
        ? p
        : recipe.ingredients[p.ingredient]
          ? ingredientLine(recipe.ingredients[p.ingredient], scale, units, lang)
          : "",
    )
    .join("");
}
