/**
 * Nutrition guide content — general education about what different foods tend
 * to do. Not medical advice, not a diagnosis, and never a promise about weight.
 */

export interface GuideFood {
  name: string;
  /** Rough per typical serving. */
  calories: number;
  protein: number;
  note: string;
}

export interface GuideGroup {
  key: string;
  title: string;
  blurb: string;
  helps: string[];
  foods: GuideFood[];
}

export const GUIDE_GROUPS: GuideGroup[] = [
  {
    key: "protein",
    title: "Protein",
    blurb: "The most filling macronutrient. Protein slows how fast a meal leaves your stomach, which is why meals built around it tend to hold you longer.",
    helps: [
      "Keeps you full between meals",
      "Helps protect muscle while losing weight",
      "Steadies appetite later in the day",
    ],
    foods: [
      { name: "Greek yogurt, plain (1 cup)", calories: 140, protein: 20, note: "Also brings calcium and live cultures." },
      { name: "Chicken breast (4 oz)", calories: 187, protein: 35, note: "Lean, versatile, easy to batch cook." },
      { name: "Eggs (2 large)", calories: 143, protein: 12, note: "Cheap, quick, filling breakfast base." },
      { name: "Salmon (4 oz)", calories: 233, protein: 25, note: "Protein plus omega-3 fats." },
      { name: "Cottage cheese (1 cup)", calories: 163, protein: 28, note: "High protein for the calories." },
      { name: "Lentils, cooked (1 cup)", calories: 230, protein: 18, note: "Protein and fiber together." },
      { name: "Tofu, firm (4 oz)", calories: 94, protein: 10, note: "Takes on whatever you season it with." },
    ],
  },
  {
    key: "fiber",
    title: "Fiber & whole grains",
    blurb: "Fiber adds bulk without many calories and slows how quickly sugars hit your bloodstream, which smooths the energy dips that lead to snacking.",
    helps: ["Fullness on fewer calories", "Steadier blood sugar", "Regular digestion"],
    foods: [
      { name: "Black beans (1 cup)", calories: 227, protein: 15, note: "About 15g fiber." },
      { name: "Oats, dry (1/2 cup)", calories: 150, protein: 5, note: "Soluble fiber that keeps you full." },
      { name: "Raspberries (1 cup)", calories: 64, protein: 1.5, note: "Eight grams of fiber, low calorie." },
      { name: "Chia seeds (2 tbsp)", calories: 138, protein: 5, note: "Thickens into pudding; add fluids." },
      { name: "Quinoa, cooked (1 cup)", calories: 222, protein: 8, note: "Whole grain with complete protein." },
    ],
  },
  {
    key: "produce",
    title: "Vegetables & fruit",
    blurb: "High water and fiber, low calorie density. Filling half your plate with produce lowers the calories in a meal without shrinking the meal.",
    helps: ["Volume for very few calories", "Vitamins and minerals", "Hydration from food"],
    foods: [
      { name: "Broccoli (1 cup)", calories: 31, protein: 2.5, note: "Roast it for something you'll actually finish." },
      { name: "Spinach (2 cups raw)", calories: 14, protein: 2, note: "Wilts into almost anything." },
      { name: "Bell pepper (1 medium)", calories: 31, protein: 1, note: "Crunchy, sweet, more vitamin C than an orange." },
      { name: "Apple (1 medium)", calories: 95, protein: 0.5, note: "Fiber and chew — slows a snack down." },
      { name: "Berries (1 cup)", calories: 60, protein: 1, note: "Lowest-sugar fruit choice." },
    ],
  },
  {
    key: "fats",
    title: "Healthy fats",
    blurb: "Fat makes food satisfying and helps you absorb some vitamins. It's calorie-dense, so portions matter more than avoidance.",
    helps: ["Satisfaction, so meals feel complete", "Vitamin absorption", "Steady energy"],
    foods: [
      { name: "Avocado (1/2)", calories: 120, protein: 1.5, note: "Fiber plus monounsaturated fat." },
      { name: "Olive oil (1 tbsp)", calories: 119, protein: 0, note: "Measure it — it adds up fast." },
      { name: "Almonds (1 oz)", calories: 164, protein: 6, note: "A small handful is a portion." },
      { name: "Walnuts (1 oz)", calories: 185, protein: 4, note: "Plant omega-3s." },
    ],
  },
  {
    key: "fermented",
    title: "Fermented & gut-friendly",
    blurb: "Fermented foods bring live cultures. Many people notice easier digestion when they show up regularly, though everyone responds differently.",
    helps: ["Digestion comfort", "Variety in the gut", "Often high protein too"],
    foods: [
      { name: "Kefir (1 cup)", calories: 110, protein: 11, note: "Drinkable, gentle on many stomachs." },
      { name: "Sauerkraut (1/2 cup)", calories: 14, protein: 1, note: "Choose refrigerated for live cultures." },
      { name: "Kimchi (1/2 cup)", calories: 20, protein: 1, note: "Spicy, adds flavor for almost no calories." },
      { name: "Miso (1 tbsp)", calories: 34, protein: 2, note: "Stir into soup off the heat." },
    ],
  },
  {
    key: "hydration",
    title: "Hydration",
    blurb: "Thirst is easy to read as hunger. Steady fluids also matter more when appetite is suppressed and you're eating less overall.",
    helps: ["Fewer false hunger signals", "Digestion and regularity", "Energy and headache relief"],
    foods: [
      { name: "Water (16 oz)", calories: 0, protein: 0, note: "A glass before meals slows eating down." },
      { name: "Broth (1 cup)", calories: 15, protein: 2, note: "Fluids plus sodium on low-appetite days." },
      { name: "Cucumber (1 cup)", calories: 16, protein: 0.7, note: "Almost entirely water." },
      { name: "Herbal tea", calories: 0, protein: 0, note: "Counts toward fluids, warm and calming." },
    ],
  },
];

export interface GuideNote {
  title: string;
  body: string;
  points: string[];
}

export const GUIDE_NOTES: GuideNote[] = [
  {
    title: "Eating while on a GLP-1",
    body: "Appetite is often much smaller, so the order you eat in matters more than the amount.",
    points: [
      "Protein first, then vegetables, then starch.",
      "Smaller portions more often beats three large meals.",
      "Fluids and electrolytes throughout the day, sipped rather than gulped.",
      "Add fiber slowly — a fast jump can feel worse, not better.",
      "Rich, greasy, or very sweet foods often sit heaviest.",
    ],
  },
  {
    title: "How food supports weight change",
    body: "Weight change comes down to overall energy balance over time. Food choices make that balance easier or harder to hold.",
    points: [
      "Protein and fiber increase fullness per calorie.",
      "Water-rich foods let portions stay large while calories fall.",
      "Liquid calories pass through without registering as a meal.",
      "Regular meals prevent the over-hungry evenings that undo a day.",
      "Consistency across weeks matters more than any single day.",
    ],
  },
  {
    title: "Eating with your cycle",
    body: "Many people notice appetite, cravings, and energy shift across the month. Nourishing to the phase can smooth it out.",
    points: [
      "Menstrual: iron-rich foods, warm meals, extra rest.",
      "Follicular: energy usually climbs — lean protein and fresh produce.",
      "Ovulatory: fiber and antioxidants while appetite is steady.",
      "Luteal: magnesium, complex carbs, and steady meals for cravings and mood.",
    ],
  },
];

export const GUIDE_DISCLAIMER =
  "General nutrition information, not medical advice. It does not diagnose anything, change any medication, or promise a result. Talk with your own care team about what fits you.";
