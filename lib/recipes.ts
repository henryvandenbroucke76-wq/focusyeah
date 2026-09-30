export type Ingredient = { name: string; qty: number; unit: string };
// In step text, {n} stands for ingredient n with its amount, e.g. "Rinse {0}" → "Rinse 150 g quinoa".
// `check` tells the cook how to know the step is done.
export type Step = { title: string; text: string; minutes?: number; check?: string };
export type Recipe = {
  id: string;
  title: string;
  description: string;
  cuisine: string;
  tags: string[];
  minutes: number;
  servings: number;
  image: string;
  ingredients: Ingredient[];
  steps: Step[];
  author: string;
  owner?: string;
  published?: boolean;
  likes?: number;
  views?: number;
};

const kitchen = "Miseora kitchen";

// Starter recipes. Every ingredient is used in a step, amounts are for `servings`
// and scale automatically, and each timed step says how to tell it is done.
export const recipes: Recipe[] = [
  {
    id: "lemon-bowl",
    title: "Roasted vegetable & quinoa bowl",
    description:
      "Colourful roasted vegetables, fluffy quinoa, and a fresh squeeze of lime. A little sunshine, whatever the weather.",
    cuisine: "Mediterranean",
    tags: ["Vegan", "Vegetarian", "Lunch"],
    minutes: 40,
    servings: 2,
    image: "/images/generated/quinoa-bowl.webp",
    author: kitchen,
    ingredients: [
      { name: "quinoa", qty: 150, unit: "g" },
      { name: "water", qty: 300, unit: "ml" },
      { name: "courgette", qty: 1, unit: "" },
      { name: "carrots", qty: 2, unit: "" },
      { name: "red pepper", qty: 1, unit: "" },
      { name: "broccoli", qty: 150, unit: "g" },
      { name: "Brussels sprouts", qty: 150, unit: "g" },
      { name: "olive oil", qty: 2, unit: "tbsp" },
      { name: "lime", qty: 1, unit: "" },
      { name: "salt and black pepper", qty: 0, unit: "" },
    ],
    steps: [
      {
        title: "Heat the oven",
        text: "Heat the oven to 200°C (180°C fan, 390°F). Line a large baking tray with baking paper.",
      },
      {
        title: "Chop the vegetables",
        text: "Peel {3} and cut them into 1 cm rounds. Cut {2} into 1 cm rounds. Remove the seeds from {4} and cut it into 2 cm strips. Cut {5} into small florets and halve {6}.",
      },
      {
        title: "Roast the vegetables",
        text: "Spread the vegetables over the tray in one layer. Drizzle with {7}, season with {9} and toss with your hands. Roast for 25 minutes, turning everything once halfway.",
        minutes: 25,
        check: "The edges are browned and a knife slides easily into the carrots.",
      },
      {
        title: "Cook the quinoa",
        text: "While the vegetables roast, rinse {0} in a sieve under cold water. Put it in a saucepan with {1} and a pinch of salt. Bring to the boil, put the lid on and simmer on low heat for 15 minutes.",
        minutes: 15,
        check: "The water is absorbed and you can see little white spirals around each grain.",
      },
      {
        title: "Rest the quinoa",
        text: "Take the pan off the heat and leave it covered for 5 minutes, then fluff the quinoa with a fork.",
        minutes: 5,
      },
      {
        title: "Serve",
        text: "Divide the quinoa between the bowls and top with the roasted vegetables. Cut {8} into wedges and squeeze over. Taste and add a little more salt if needed.",
      },
    ],
  },
  {
    id: "tomato-pasta",
    title: "Roasted tomato & basil pasta",
    description:
      "Sweet tomatoes, silky sauce, and a generous handful of fresh basil. Your new weeknight favourite.",
    cuisine: "Italian",
    tags: ["Vegetarian", "Dinner", "Comfort food"],
    minutes: 30,
    servings: 2,
    image: "/images/generated/tomato-pasta.webp",
    author: kitchen,
    ingredients: [
      { name: "penne", qty: 200, unit: "g" },
      { name: "cherry tomatoes", qty: 350, unit: "g" },
      { name: "garlic cloves", qty: 3, unit: "" },
      { name: "olive oil", qty: 2, unit: "tbsp" },
      { name: "basil", qty: 15, unit: "g" },
      { name: "parmesan", qty: 30, unit: "g" },
      { name: "salt and black pepper", qty: 0, unit: "" },
    ],
    steps: [
      {
        title: "Heat the oven",
        text: "Heat the oven to 200°C (180°C fan, 390°F).",
      },
      {
        title: "Roast the tomatoes",
        text: "Put {1} in a small oven dish. Peel {2}, press each one flat with the side of a knife and add them. Pour over {3}, season with {6} and stir. Roast for 20 minutes.",
        minutes: 20,
        check: "The tomatoes have burst and are soft and juicy.",
      },
      {
        title: "Boil the pasta",
        text: "Meanwhile, bring a large pot of water to the boil and add 1 teaspoon of salt. Add {0} and cook for the time on the packet (usually 10–12 minutes), stirring now and then.",
        minutes: 11,
        check: "The pasta is soft but still has a little bite in the middle.",
      },
      {
        title: "Save some pasta water",
        text: "Scoop out one mug of the cooking water, then drain the pasta in a colander.",
      },
      {
        title: "Make the sauce",
        text: "Mash the roasted tomatoes and garlic in the dish with a fork. Tip in the pasta and a splash of the pasta water and stir until everything is coated in a glossy sauce. Add more water if it looks dry.",
      },
      {
        title: "Finish and serve",
        text: "Tear {4} into the pasta and stir. Divide between plates and grate {5} over the top.",
      },
    ],
  },
  {
    id: "chickpea-curry",
    title: "Cozy coconut chickpea curry",
    description:
      "A gently spiced, Indian-inspired one-pot dinner with coconut milk and chickpeas. Made for scooping.",
    cuisine: "Indian-inspired",
    tags: ["Vegan", "One pot", "Dinner"],
    minutes: 30,
    servings: 2,
    image: "/images/generated/chickpea-curry.webp",
    author: kitchen,
    ingredients: [
      { name: "rice", qty: 150, unit: "g" },
      { name: "water", qty: 300, unit: "ml" },
      { name: "onion", qty: 1, unit: "" },
      { name: "garlic cloves", qty: 2, unit: "" },
      { name: "olive oil", qty: 1, unit: "tbsp" },
      { name: "curry powder", qty: 2, unit: "tsp" },
      { name: "chopped tomatoes", qty: 200, unit: "g" },
      { name: "cooked chickpeas", qty: 240, unit: "g" },
      { name: "coconut milk", qty: 200, unit: "ml" },
      { name: "baby spinach", qty: 60, unit: "g" },
      { name: "fresh coriander", qty: 5, unit: "g" },
      { name: "salt", qty: 0, unit: "" },
    ],
    steps: [
      {
        title: "Start the rice",
        text: "Rinse {0} in a sieve until the water runs clear. Put it in a saucepan with {1} and a pinch of salt. Bring to the boil, put the lid on and cook on the lowest heat for 12 minutes. Turn off the heat and keep the lid on.",
        minutes: 12,
        check: "All the water is absorbed and the rice is tender.",
      },
      {
        title: "Soften the onion",
        text: "Meanwhile, peel and finely chop {2} and {3}. Warm {4} in a large frying pan over medium heat. Cook the onion for 5 minutes, stirring, then add the garlic and cook for 1 more minute.",
        minutes: 6,
        check: "The onion is soft and see-through, not brown.",
      },
      {
        title: "Toast the spice",
        text: "Stir in {5} and cook for 30 seconds.",
        check: "The spices smell fragrant. Don't let them burn.",
      },
      {
        title: "Simmer the curry",
        text: "Drain and rinse {7}. Add them to the pan with {6} and {8}. Bring to a gentle bubble and simmer without a lid for 10 minutes, stirring now and then.",
        minutes: 10,
        check: "The sauce has thickened and coats the chickpeas.",
      },
      {
        title: "Add the spinach",
        text: "Stir in {9} and cook for 1 minute. Taste and season with {11}.",
        check: "The spinach has wilted into the sauce.",
      },
      {
        title: "Serve",
        text: "Fluff the rice with a fork and divide between bowls. Spoon the curry next to it and scatter over {10}.",
      },
    ],
  },
  {
    id: "white-bean-salad",
    title: "Lemon white bean salad",
    description: "A bright, no-cook lunch with crunchy vegetables.",
    cuisine: "Mediterranean",
    tags: ["Vegan", "Lunch", "Quick & easy"],
    minutes: 15,
    servings: 2,
    image: "/images/generated/white-bean-salad.webp",
    author: kitchen,
    ingredients: [
      { name: "cooked white beans", qty: 240, unit: "g" },
      { name: "cherry tomatoes", qty: 200, unit: "g" },
      { name: "cucumber", qty: 0.5, unit: "" },
      { name: "red onion", qty: 0.5, unit: "" },
      { name: "flat-leaf parsley", qty: 10, unit: "g" },
      { name: "lemon", qty: 1, unit: "" },
      { name: "olive oil", qty: 2, unit: "tbsp" },
      { name: "salt and black pepper", qty: 0, unit: "" },
    ],
    steps: [
      {
        title: "Rinse the beans",
        text: "Tip {0} into a sieve, rinse under cold water and shake dry. Put them in a large bowl.",
      },
      {
        title: "Chop the vegetables",
        text: "Halve {1}. Cut {2} into small cubes. Peel {3} and slice it very thinly. Finely chop {4}. Add everything to the bowl.",
      },
      {
        title: "Make the dressing",
        text: "Squeeze the juice of {5} into a small bowl and remove any pips. Whisk in {6} and season with {7}.",
      },
      {
        title: "Toss and rest",
        text: "Pour the dressing over the salad and toss gently. Leave for 5 minutes so the beans soak up the flavour. Taste and add more salt or lemon if needed.",
        minutes: 5,
      },
    ],
  },
  {
    id: "peanut-noodles",
    title: "Creamy peanut noodles",
    description:
      "A quick noodle bowl with a simple peanut sauce. Contains peanuts, soy, and wheat unless suitable alternatives are used.",
    cuisine: "Asian",
    tags: ["Vegan", "Dinner", "Quick & easy"],
    minutes: 15,
    servings: 2,
    image: "/images/generated/peanut-noodles.webp",
    author: kitchen,
    ingredients: [
      { name: "noodles", qty: 180, unit: "g" },
      { name: "carrot", qty: 1, unit: "" },
      { name: "cucumber", qty: 0.5, unit: "" },
      { name: "peanut butter", qty: 3, unit: "tbsp" },
      { name: "soy sauce", qty: 1, unit: "tbsp" },
      { name: "lime", qty: 1, unit: "" },
      { name: "roasted peanuts", qty: 20, unit: "g" },
      { name: "fresh coriander", qty: 5, unit: "g" },
    ],
    steps: [
      {
        title: "Boil the water",
        text: "Bring a pot of water to the boil for the noodles.",
      },
      {
        title: "Cut the vegetables",
        text: "Peel {1} and cut it into thin matchsticks. Cut {2} into thin matchsticks too.",
      },
      {
        title: "Cook the noodles",
        text: "Add {0} to the boiling water and cook for the time on the packet (usually 4–5 minutes). Scoop out one mug of the cooking water, then drain.",
        minutes: 5,
        check: "The noodles are soft all the way through.",
      },
      {
        title: "Mix the sauce",
        text: "In a large bowl, stir {3} and {4} with 3 tablespoons of the hot noodle water until smooth. Squeeze in the juice of {5}.",
        check: "The sauce is smooth and pourable, like thick cream.",
      },
      {
        title: "Toss everything",
        text: "Add the noodles, carrot and cucumber to the sauce and toss until coated. Add a splash more noodle water if it looks thick.",
      },
      {
        title: "Serve",
        text: "Divide between bowls. Roughly chop {6} and scatter over with {7}.",
      },
    ],
  },
  {
    id: "tomato-couscous",
    title: "Tomato & chickpea couscous",
    description: "A colourful lunch that takes just one bowl and a kettle.",
    cuisine: "Mediterranean",
    tags: ["Vegan", "Lunch", "Quick & easy"],
    minutes: 15,
    servings: 2,
    image: "/images/generated/tomato-couscous.webp",
    author: kitchen,
    ingredients: [
      { name: "couscous", qty: 150, unit: "g" },
      { name: "boiling water", qty: 180, unit: "ml" },
      { name: "tomato paste", qty: 1, unit: "tbsp" },
      { name: "cooked chickpeas", qty: 240, unit: "g" },
      { name: "tomatoes", qty: 2, unit: "" },
      { name: "flat-leaf parsley", qty: 10, unit: "g" },
      { name: "olive oil", qty: 1, unit: "tbsp" },
      { name: "lemon", qty: 0.5, unit: "" },
      { name: "salt and black pepper", qty: 0, unit: "" },
    ],
    steps: [
      {
        title: "Soak the couscous",
        text: "Put {0} in a heatproof bowl. Stir {2} and a pinch of salt into {1} until dissolved, then pour it over the couscous. Cover with a plate and leave for 5 minutes.",
        minutes: 5,
        check: "The couscous has soaked up all the water.",
      },
      {
        title: "Prepare the toppings",
        text: "Meanwhile, drain and rinse {3}. Cut {4} into small cubes and chop {5}.",
      },
      {
        title: "Fluff and mix",
        text: "Fluff the couscous with a fork to separate the grains. Stir in the chickpeas, tomatoes, parsley and {6}. Squeeze over the juice of {7}, season with {8} and serve warm or cold.",
      },
    ],
  },
  {
    id: "bean-quesadilla",
    title: "Crispy bean quesadillas",
    description: "Golden tortillas with a warm bean and cheese filling.",
    cuisine: "Mexican",
    tags: ["Vegetarian", "Dinner", "Quick & easy"],
    minutes: 20,
    servings: 2,
    image: "/images/generated/bean-quesadilla.webp",
    author: kitchen,
    ingredients: [
      { name: "small tortillas", qty: 4, unit: "" },
      { name: "cooked kidney beans", qty: 240, unit: "g" },
      { name: "tomato salsa", qty: 3, unit: "tbsp" },
      { name: "ground cumin", qty: 1, unit: "tsp" },
      { name: "grated cheese", qty: 80, unit: "g" },
      { name: "olive oil", qty: 2, unit: "tsp" },
      { name: "salt", qty: 0, unit: "" },
    ],
    steps: [
      {
        title: "Make the filling",
        text: "Drain and rinse {1}. Put them in a bowl and mash roughly with a fork, leaving some whole. Stir in {2}, {3} and {6}.",
      },
      {
        title: "Fill the tortillas",
        text: "Lay out {0}. Spread the bean mixture over one half of each tortilla, sprinkle {4} on top and fold the other half over. Press down gently.",
      },
      {
        title: "Cook until golden",
        text: "Heat a frying pan over medium heat and brush it with a little of {5}. Cook two quesadillas at a time for 2–3 minutes per side, pressing with a spatula. Repeat with the rest.",
        minutes: 3,
        check: "Both sides are golden brown and the cheese has melted.",
      },
      {
        title: "Slice and serve",
        text: "Move to a board and leave for 1 minute, because the filling is very hot. Cut each one into three triangles.",
      },
    ],
  },
  {
    id: "banana-oats",
    title: "Warm banana porridge",
    description: "A cosy breakfast made with four everyday ingredients.",
    cuisine: "Breakfast",
    tags: ["Vegetarian", "Quick & easy"],
    minutes: 10,
    servings: 2,
    image: "/images/generated/banana-oats.webp",
    author: kitchen,
    ingredients: [
      { name: "rolled oats", qty: 100, unit: "g" },
      { name: "milk", qty: 400, unit: "ml" },
      { name: "bananas", qty: 2, unit: "" },
      { name: "cinnamon", qty: 0.5, unit: "tsp" },
    ],
    steps: [
      {
        title: "Prepare the bananas",
        text: "Peel {2}. Mash half of them with a fork and cut the rest into slices.",
      },
      {
        title: "Simmer the oats",
        text: "Put {0}, {1} and the mashed banana in a saucepan. Bring to a gentle simmer over medium-low heat and cook for 5 minutes, stirring often so it doesn't stick.",
        minutes: 5,
        check: "The oats are soft and the porridge is thick and creamy. Add a splash of milk if it gets too thick.",
      },
      {
        title: "Serve",
        text: "Spoon into bowls, top with the banana slices and dust with {3}. Leave for a minute to cool slightly.",
      },
    ],
  },
];
