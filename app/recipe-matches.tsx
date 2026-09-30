'use client';
import {Clock,Soup,Check,ArrowRight} from 'lucide-react';
import {useLanguage,localize} from '@/lib/i18n';
import type {Recipe} from '@/lib/recipes';
import type {RecipeMatch} from '@/lib/recipe-match';

export function RecipeMatches({matches,onOpen,limit=6}:{matches:RecipeMatch[],onOpen:(r:Recipe)=>void,limit?:number}){
  const {lang}=useLanguage();
  if(!matches.length)return localize(<p className="small-note match-empty">No recipes match these ingredients yet. Add a few more, or create a recipe from what you have.</p>,lang);
  return localize(<div className="match-list">{matches.slice(0,limit).map(m=>{
    const needed=m.have.length+m.missing.length;
    return <button type="button" className="match-card" key={m.recipe.id} onClick={()=>onOpen(m.recipe)} aria-label={'Open '+m.recipe.title}>
      {m.recipe.image?<img src={m.recipe.image} alt="" loading="lazy"/>:<span className="match-photo"><Soup size={26}/></span>}
      <span className="match-body">
        <strong>{m.recipe.title}</strong>
        <span className="match-meta"><span><Clock size={13}/>{m.recipe.minutes} min</span>{m.missing.length===0?<span className="match-ready"><Check size={13}/>Ready to cook</span>:<span className="match-count"><span data-no-translate>{m.have.length}/{needed}</span> <span>ingredients</span></span>}</span>
        <span className="match-bar" aria-hidden="true"><span style={{width:Math.round(m.score*100)+'%'}}/></span>
        {m.missing.length>0&&<span className="match-missing"><span>Still needed:</span> {m.missing.map((n,i)=><span key={n}>{n}{i<m.missing.length-1?', ':''}</span>)}</span>}
      </span>
      <ArrowRight className="match-arrow" size={18}/>
    </button>})}</div>,lang);
}
