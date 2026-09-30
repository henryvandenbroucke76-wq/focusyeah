// Everyday ingredients, grouped the way a shop or cupboard is. Used for the ingredient
// search suggestions and the "Browse all ingredients" list. Names match the recipe data.
export const ingredientCategories: { name: string; items: string[] }[] = [
  {
    name: "Vegetables",
    items: [
      "asparagus",
      "aubergine",
      "avocado",
      "beetroot",
      "bell pepper",
      "broccoli",
      "Brussels sprouts",
      "butternut squash",
      "cabbage",
      "carrot",
      "carrots",
      "cauliflower",
      "celery",
      "cherry tomatoes",
      "chopped tomatoes",
      "corn",
      "courgette",
      "cucumber",
      "fennel",
      "garlic",
      "garlic cloves",
      "green beans",
      "kale",
      "leek",
      "lettuce",
      "mushrooms",
      "onion",
      "peas",
      "potatoes",
      "radish",
      "red cabbage",
      "red onion",
      "red pepper",
      "rocket",
      "shallot",
      "spinach",
      "baby spinach",
      "spring onion",
      "sweet potato",
      "tomatoes",
      "yellow pepper",
    ],
  },
  {
    name: "Fruit",
    items: [
      "apple",
      "apricots",
      "banana",
      "bananas",
      "blueberries",
      "cherries",
      "grapes",
      "kiwi",
      "lemon",
      "lime",
      "mango",
      "melon",
      "orange",
      "peach",
      "pear",
      "pineapple",
      "plums",
      "raspberries",
      "strawberries",
      "raisins",
    ],
  },
  {
    name: "Herbs & spices",
    items: [
      "basil",
      "bay leaves",
      "black pepper",
      "chilli flakes",
      "cinnamon",
      "fresh coriander",
      "ground coriander",
      "ground cumin",
      "curry powder",
      "dill",
      "garam masala",
      "ginger",
      "ground ginger",
      "mint",
      "nutmeg",
      "oregano",
      "paprika",
      "smoked paprika",
      "flat-leaf parsley",
      "rosemary",
      "salt",
      "thyme",
      "turmeric",
      "vanilla extract",
    ],
  },
  {
    name: "Dairy & eggs",
    items: [
      "butter",
      "cheddar",
      "cream cheese",
      "double cream",
      "eggs",
      "feta",
      "grated cheese",
      "Greek yoghurt",
      "milk",
      "mozzarella",
      "parmesan",
      "plain yoghurt",
      "sour cream",
      "oat milk",
      "soy milk",
    ],
  },
  {
    name: "Meat & fish",
    items: [
      "bacon",
      "beef mince",
      "chicken breast",
      "chicken thighs",
      "chorizo",
      "cod",
      "ham",
      "pork sausages",
      "prawns",
      "salmon",
      "smoked salmon",
      "tuna",
      "turkey",
    ],
  },
  {
    name: "Pasta, rice & grains",
    items: [
      "bread",
      "bulgur",
      "couscous",
      "egg noodles",
      "noodles",
      "penne",
      "pasta",
      "quinoa",
      "rice",
      "basmati rice",
      "rolled oats",
      "small tortillas",
      "spaghetti",
      "tortilla wraps",
      "flour",
    ],
  },
  {
    name: "Beans, nuts & seeds",
    items: [
      "almonds",
      "black beans",
      "cashews",
      "cooked chickpeas",
      "cooked kidney beans",
      "cooked white beans",
      "lentils",
      "red lentils",
      "peanut butter",
      "roasted peanuts",
      "sesame seeds",
      "sunflower seeds",
      "tofu",
      "walnuts",
    ],
  },
  {
    name: "Cupboard & sauces",
    items: [
      "coconut milk",
      "honey",
      "ketchup",
      "maple syrup",
      "mayonnaise",
      "mustard",
      "olive oil",
      "pesto",
      "soy sauce",
      "sugar",
      "sunflower oil",
      "tomato paste",
      "tomato salsa",
      "vegetable stock",
      "vinegar",
      "water",
      "boiling water",
    ],
  },
];

export const allIngredients: string[] = Array.from(new Set(ingredientCategories.flatMap((c) => c.items)));

const fold = (value: string) => value.toLocaleLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").trim();

// Suggestions for a partly typed name: words that start with the text first, then any other match.
// `label` lets callers search the translated name as well as the English one.
export function suggestIngredients(
  text: string,
  {
    exclude = [],
    limit = 8,
    label = (name: string) => name,
  }: {
    exclude?: string[];
    limit?: number;
    label?: (name: string) => string;
  } = {},
): string[] {
  const q = fold(text);
  if (!q) return [];
  const skip = new Set(exclude.map(fold));
  const scored: { name: string; score: number }[] = [];
  for (const name of allIngredients) {
    if (skip.has(fold(name))) continue;
    const texts = [fold(name), fold(label(name))];
    let score = -1;
    for (const t of texts) {
      if (t === q) score = Math.max(score, 3);
      else if (t.startsWith(q)) score = Math.max(score, 2);
      else if (t.split(/[\s-]+/).some((w) => w.startsWith(q))) score = Math.max(score, 1);
      else if (q.length >= 3 && t.includes(q)) score = Math.max(score, 0);
    }
    if (score >= 0) scored.push({ name, score });
  }
  return scored
    .sort((a, b) => b.score - a.score || a.name.length - b.name.length || a.name.localeCompare(b.name))
    .slice(0, limit)
    .map((s) => s.name);
}

export const sameName = (a: string, b: string) => fold(a) === fold(b);
