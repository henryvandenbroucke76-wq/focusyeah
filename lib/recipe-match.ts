import type {Recipe} from '@/lib/recipes';

export type FridgeItem={name:string,match?:string};
export type RecipeMatch={recipe:Recipe,have:string[],missing:string[],basics:string[],score:number};

// Everyday basics most kitchens already have. They never count as missing.
const basics=['water','salt','black pepper','salt and black pepper','salt and pepper','oil','olive oil','vegetable oil','sunflower oil'];
// Descriptive words that do not change which ingredient is meant.
const fillers=new Set(['cooked','fresh','raw','chopped','diced','sliced','grated','ground','dried','canned','tinned','frozen','ripe','small','large','medium','boiling','cold','warm','rolled','whole','cloves','clove','of','a','some','can','jar','pack','packet','bunch','handful','leaves','leaf','organic','plain','free','range','extra','virgin']);
// Compound names whose first word changes the ingredient (coconut milk is not milk).
const compounds=['coconut milk','peanut butter','soy sauce','almond milk','oat milk','soy milk','spring onion','sweet potato','sweet pepper','ice cream','cream cheese','sour cream','bell pepper','chili pepper','chilli pepper','sesame oil','fish sauce','tomato paste','tomato puree','curry powder','baking powder','white bean','kidney bean','black bean','green bean'];

function singular(word:string){
  if(word.length<=3)return word;
  if(word.endsWith('ies'))return word.slice(0,-3)+'y';
  if(/(tomato|potato|mango|avocado)es$/.test(word))return word.slice(0,-2);
  if(/(ch|sh|ss|x)es$/.test(word))return word.slice(0,-2);
  if(word.endsWith('s')&&!word.endsWith('ss')&&!/(couscous|hummus|asparagus|citrus|bus)$/.test(word))return word.slice(0,-1);
  return word;
}
export function normalizeIngredient(value:string){
  const words=value.toLocaleLowerCase('en').normalize('NFKD').replace(/[̀-ͯ]/g,'').replace(/\(.*?\)/g,' ').replace(/[^a-z\s-]/g,' ').replace(/-/g,' ').split(/\s+/).filter(Boolean).map(singular);
  const kept=words.filter(w=>!fillers.has(w));
  return (kept.length?kept:words).join(' ');
}
function compoundOf(name:string){return compounds.find(c=>(' '+name+' ').includes(' '+c+' '))||''}
// True when a fridge ingredient can stand in for a recipe ingredient,
// e.g. "tomatoes" covers "cherry tomatoes" and "chickpeas" covers "cooked chickpeas".
export function sameIngredient(recipeName:string,fridgeName:string){
  const a=normalizeIngredient(recipeName),b=normalizeIngredient(fridgeName);
  if(!a||!b)return false;if(a===b)return true;
  if(compoundOf(a)!==compoundOf(b))return false;
  const aw=a.split(' '),bw=b.split(' ');
  if(aw[aw.length-1]!==bw[bw.length-1])return false;
  const [short,long]=aw.length<=bw.length?[aw,bw]:[bw,aw];
  return short.every(w=>long.includes(w));
}
function isBasic(name:string){const n=normalizeIngredient(name);return basics.some(b=>normalizeIngredient(b)===n)}

export function matchRecipes(recipes:Recipe[],fridge:FridgeItem[]):RecipeMatch[]{
  const names=fridge.flatMap(f=>[f.name,f.match||'']).filter(n=>n.trim());
  if(!names.length)return [];
  const seen=new Set<string>();
  return recipes.filter(r=>{if(seen.has(r.id))return false;seen.add(r.id);return r.ingredients?.length}).map(recipe=>{
    const have:string[]=[],missing:string[]=[],basic:string[]=[];
    for(const i of recipe.ingredients){
      if(names.some(n=>sameIngredient(i.name,n)))have.push(i.name);
      else if(isBasic(i.name))basic.push(i.name);
      else missing.push(i.name);
    }
    const needed=have.length+missing.length;
    return {recipe,have,missing,basics:basic,score:needed?have.length/needed:0};
  }).filter(m=>m.have.length>0).sort((x,y)=>y.score-x.score||x.missing.length-y.missing.length||y.have.length-x.have.length||x.recipe.minutes-y.recipe.minutes);
}
