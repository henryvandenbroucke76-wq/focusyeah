import type { Recipe } from "./recipes";
export type KitchenPreferences = {
  diet: string;
  time: string;
  language: string;
  units: string;
  cuisines: string[];
  allergens: string;
  equipment: string[];
  servings: number;
  experience: string;
  onboardingVersion?: number;
};
export const defaultPreferences: KitchenPreferences = {
  diet: "Anything",
  time: "30",
  language: "English",
  units: "metric",
  cuisines: [],
  allergens: "",
  equipment: ["Stovetop", "Oven"],
  servings: 2,
  experience: "Getting started",
};
export function readPreferences(value: unknown): KitchenPreferences {
  const p = value && typeof value === "object" ? (value as Partial<KitchenPreferences>) : {};
  return {
    ...defaultPreferences,
    ...p,
    cuisines: Array.isArray(p.cuisines) ? p.cuisines.filter((x) => typeof x === "string").slice(0, 8) : [],
    equipment: Array.isArray(p.equipment)
      ? p.equipment.filter((x) => typeof x === "string").slice(0, 6)
      : defaultPreferences.equipment,
    servings: [1, 2, 3, 4, 5, 6].includes(Number(p.servings)) ? Number(p.servings) : 2,
    time: ["15", "30", "45", "60", "90"].includes(String(p.time)) ? String(p.time) : "30",
    allergens: typeof p.allergens === "string" ? p.allergens.slice(0, 300) : "",
  };
}
const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
const exclusions: Record<string, string[]> = {
  dairy: ["milk", "cheese", "yogurt", "yoghurt", "butter", "cream"],
  gluten: ["pasta", "couscous", "flour", "bread", "tortilla", "soy sauce", "noodle"],
  peanuts: ["peanut", "arachide", "pinda", "cacahuete"],
  nuts: ["peanut", "almond", "cashew", "walnut", "hazelnut", "pistachio"],
  sesame: ["sesame", "tahini"],
  eggs: ["egg"],
  soy: ["soy", "tofu", "edamame"],
};
export function rankForKitchen(recipes: Recipe[], prefs: KitchenPreferences) {
  const score = (r: Recipe) => {
    const cuisine = prefs.cuisines.some(
      (c) => r.cuisine.toLowerCase().includes(c.toLowerCase()) || r.tags.includes(c),
    );
    const diet =
      prefs.diet === "Anything" ||
      r.tags.includes(prefs.diet) ||
      (prefs.diet === "Vegetarian" && r.tags.includes("Vegan"));
    return (r.minutes <= Number(prefs.time) ? 8 : 0) + (diet ? 5 : 0) + (cuisine ? 4 : 0);
  };
  const matches = (r: Recipe) => {
    const food = normalize(r.ingredients.map((i) => i.name).join(" "));
    if (prefs.diet === "Vegan" && !r.tags.includes("Vegan")) return false;
    if (prefs.diet === "Vegetarian" && !r.tags.some((t) => ["Vegan", "Vegetarian"].includes(t))) return false;
    if (prefs.diet === "Pescatarian" && /chicken|beef|pork|bacon|lamb|turkey/.test(food)) return false;
    const avoid = prefs.allergens
      .split(/[,;\n]+/)
      .map((x) => normalize(x.trim()))
      .filter(Boolean);
    if (prefs.diet === "Dairy-free") avoid.push("dairy");
    if (prefs.diet === "Gluten-free") avoid.push("gluten");
    return !avoid.some((a) => (exclusions[a] || [a]).some((term) => food.includes(term)));
  };
  // Uses declared ingredients only; packaging and cross-contact still need checking.
  return recipes.filter(matches).sort((a, b) => score(b) - score(a));
}
