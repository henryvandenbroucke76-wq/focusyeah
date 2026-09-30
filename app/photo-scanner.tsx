'use client';
import {useEffect,useRef,useState} from 'react';
import {Camera,Upload,LoaderCircle,Check,Plus,X,RotateCcw,ImagePlus,Sparkles,ChefHat} from 'lucide-react';
import {useLanguage,localize,translate} from '@/lib/i18n';
import {matchRecipes,FridgeItem} from '@/lib/recipe-match';
import type {Recipe} from '@/lib/recipes';
import {RecipeMatches} from './recipe-matches';

type Item={id:string,name:string,match:string,quantity:string,confidence:'likely'|'uncertain'|'manual',evidence:string,alternatives:string[],selected:boolean};
type Phase='idle'|'uploading'|'recognizing'|'review'|'saving'|'matches';
export function PhotoScanner({aiReady,recipes,fridge,onSaved,onManual,onOpenRecipe,onGenerate}:{aiReady:boolean,recipes:Recipe[],fridge:FridgeItem[],onSaved:()=>Promise<void>,onManual:()=>void,onOpenRecipe:(r:Recipe)=>void,onGenerate:()=>void}){
  const {lang}=useLanguage();
  const [retryUntil,setRetryUntil]=useState(0),[retrySeconds,setRetrySeconds]=useState(0);
  useEffect(()=>{const update=()=>setRetrySeconds(Math.max(0,Math.ceil((retryUntil-Date.now())/1000)));update();if(!retryUntil)return;const timer=setInterval(update,1000);return()=>clearInterval(timer)},[retryUntil]);
  const [phase,setPhase]=useState<Phase>('idle'),[progress,setProgress]=useState(0),[preview,setPreview]=useState(''),[imageId,setImageId]=useState('');
  const [items,setItems]=useState<Item[]>([]),[summary,setSummary]=useState(''),[advice,setAdvice]=useState(''),[error,setError]=useState(''),[name,setName]=useState(''),[saved,setSaved]=useState<FridgeItem[]>([]);
  const fileInput=useRef<HTMLInputElement>(null),cameraInput=useRef<HTMLInputElement>(null),xhr=useRef<XMLHttpRequest|null>(null),controller=useRef<AbortController|null>(null),localPreview=useRef(''),mounted=useRef(true),operation=useRef(0);
  const [connected,setConnected]=useState(aiReady),[checking,setChecking]=useState(false);
  useEffect(()=>setConnected(aiReady),[aiReady]);
  async function checkConnection(){setChecking(true);setError('');try{const r=await fetch('/api/config',{cache:'no-store'});if(!r.ok)throw new Error();const d:any=await r.json();setConnected(!!d.ai);if(!d.ai)setError('The site owner needs to connect the recognition service. You can still enter ingredients manually.');return !!d.ai}catch{setError('Could not check the connection. Please try again.');return false}finally{setChecking(false)}}
  const active=['uploading','recognizing','saving'].includes(phase);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;operation.current++;xhr.current?.abort();controller.current?.abort();if(localPreview.current)URL.revokeObjectURL(localPreview.current)}},[]);
  async function recognize(id=imageId){
    if(Date.now()<retryUntil)return;
    const ticket=++operation.current;setError('');setPhase('recognizing');
    const abort=new AbortController();controller.current=abort;const timeout=setTimeout(()=>abort.abort(),120000);
    try{
      const r=await fetch('/api/ai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({imageId:id,language:lang}),signal:abort.signal});
      const d:any=await r.json();if(!r.ok){if(d.retryAfter)setRetryUntil(Date.now()+Math.min(3600,Number(d.retryAfter))*1000);throw new Error(d.error||'Could not scan this photo.');}
      if(!mounted.current||ticket!==operation.current)return;
      setItems((Array.isArray(d.ingredients)?d.ingredients:[]).map((i:any)=>({id:crypto.randomUUID(),name:i.name,match:i.matchName||'',quantity:i.quantity||'',confidence:i.confidence,evidence:i.evidence||'',alternatives:i.alternatives||[],selected:i.confidence==='likely'})));
      setSummary(d.summary||'');setAdvice(d.photoAdvice||'');setPhase('review');
    }catch(e:any){if(mounted.current&&ticket===operation.current){setError(e.name==='AbortError'?'The scan took too long. Try again or add ingredients manually.':e.message);setPhase('review')}}finally{clearTimeout(timeout);if(controller.current===abort)controller.current=null}
  }
  async function choose(file?:File){
    if(!file||active)return;
    if(!connected&&!await checkConnection())return;
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>8*1024*1024||!file.size){setError('Choose a JPG, PNG, or WebP image under 8 MB.');return}
    const ticket=++operation.current;
    if(localPreview.current)URL.revokeObjectURL(localPreview.current);
    localPreview.current=URL.createObjectURL(file);setPreview(localPreview.current);setImageId('');setItems([]);setSaved([]);setSummary('');setAdvice('');setError('');setProgress(0);setPhase('uploading');
    try{
      const result:any=await new Promise((resolve,reject)=>{
        const request=new XMLHttpRequest();xhr.current=request;request.open('POST','/api/upload');request.responseType='json';request.timeout=90000;
        request.upload.onprogress=e=>{if(e.lengthComputable&&mounted.current&&ticket===operation.current)setProgress(Math.round(e.loaded/e.total*100))};
        request.onload=()=>request.status>=200&&request.status<300?resolve(request.response):reject(new Error(request.response?.error||'Upload failed. Please try again.'));
        request.onerror=()=>reject(new Error('Upload failed. Check your connection and try again.'));
        request.ontimeout=()=>reject(new Error('Upload took too long. Please try again.'));
        request.onabort=()=>reject(new Error('Upload cancelled.'));
        const data=new FormData();data.append('file',file);request.send(data);
      });
      if(!mounted.current||ticket!==operation.current)return;
      if(!result?.id)throw new Error('Upload failed. Please try again.');
      setImageId(result.id);setProgress(100);
      await recognize(result.id)
    }catch(e:any){if(mounted.current&&ticket===operation.current){setError(e.message);setPhase('idle')}}finally{xhr.current=null}
  }
  function cancel(){operation.current++;xhr.current?.abort();controller.current?.abort();setPhase(imageId?'review':'idle');setError('')}
  function change(id:string,patch:Partial<Item>){setItems(all=>all.map(i=>i.id===id?{...i,...patch}:i))}
  function add(){if(!name.trim())return;const clean=name.trim();if(items.some(i=>i.name.toLocaleLowerCase()===clean.toLocaleLowerCase())){setError('That ingredient is already in your list.');return}setItems(all=>[...all,{id:crypto.randomUUID(),name:clean,match:'',quantity:'',confidence:'manual',evidence:'',alternatives:[],selected:true}]);setName('');setError('');setPhase('review')}
  const selected=items.filter(i=>i.selected&&i.name.trim());
  // Recipes are matched against what is already in the fridge plus what this scan found.
  const matches=matchRecipes(recipes,[...fridge,...(phase==='matches'?saved:selected.map(i=>({name:i.name,match:i.match})))]);
  async function save(){
    if(!selected.length||active)return;setPhase('saving');setError('');
    const seen=new Set<string>();const ingredients=selected.filter(i=>{const key=i.name.trim().toLocaleLowerCase();if(seen.has(key))return false;seen.add(key);return true}).map(i=>({id:i.id,name:i.name.trim(),match:i.match.trim(),quantity:i.quantity.trim()}));
    try{const r=await fetch('/api/kitchen',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'addIngredients',ingredients})});const d:any=await r.json();if(!r.ok)throw new Error(d.error||'Could not save ingredients.');if(!mounted.current)return;setSaved(ingredients.map(i=>({name:i.name,match:i.match})));setPhase('matches');await onSaved();}catch(e:any){if(mounted.current){setError(e.message);setPhase('review')}}
  }
  return localize(<div className="photo-workflow" aria-busy={active}>
    <input hidden ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{const f=e.target.files?.[0];e.target.value='';choose(f)}}/>
    <input hidden ref={cameraInput} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={e=>{const f=e.target.files?.[0];e.target.value='';choose(f)}}/>
    {!connected&&<div className="scan-connection" role="status"><h3>Photo recognition needs a connection.</h3><p>The site owner needs to connect the recognition service. You can still enter ingredients manually.</p><button className="btn outline" disabled={checking} onClick={checkConnection}>{checking?<LoaderCircle className="loading-ring" size={16}/>:<RotateCcw size={16}/>} Check connection</button></div>}
    {!preview&&connected?<div className="scan-options compact"><button disabled={active} onClick={()=>cameraInput.current?.click()}><Camera size={25}/><h3>Take a photo</h3></button><button disabled={active} onClick={()=>fileInput.current?.click()}><Upload size={25}/><h3>Upload a photo</h3><p>JPG, PNG or WebP · 8 MB max</p></button></div>:preview?<div className="scan-image-stage"><img src={preview} alt="Your uploaded fridge photo"/>{active&&<div className="scan-processing" role="status" aria-live="polite"><LoaderCircle className="loading-ring" size={38}/><strong>{phase==='uploading'?(progress===100?'Saving your photo…':'Uploading your photo…'):phase==='saving'?'Saving ingredients…':'Looking for ingredients…'}</strong>{phase==='uploading'&&<><progress value={progress} max={100} aria-label={translate('Photo upload progress',lang)}/><span>{progress}%</span></>}<small>{phase==='recognizing'?'Checking visible foods and possible matches.':'Please keep this window open.'}</small>{phase!=='saving'&&<button className="text-btn" onClick={cancel}>Cancel</button>}</div>}{!active&&<button className="change-photo" onClick={()=>fileInput.current?.click()}><ImagePlus size={16}/> Change photo</button>}</div>:null}
    {error&&<p className="scan-message" role="alert">{error}</p>}
    {phase==='matches'&&<section className="scan-matches" aria-live="polite">
      <div className="review-heading"><h3>Recipes you can make</h3><span>{matches.length} <span>found</span></span></div>
      <p className="small-note">Your ingredients are in your fridge. These recipes use what you have.</p>
      <RecipeMatches matches={matches} onOpen={onOpenRecipe}/>
      <button className="btn primary full" onClick={onGenerate}><Sparkles size={17}/> Create a recipe with my ingredients</button>
      <button className="text-btn centered" onClick={onManual}>Open my fridge</button>
      <p className="scan-footnote">Always check ingredients and allergies before cooking.</p>
    </section>}
    {!active&&phase!=='matches'&&<>
      {phase==='review'&&<section className="ingredient-review"><div className="review-heading"><h3>Review your ingredients</h3><span>{items.length} <span>found</span></span></div>{summary&&<p data-no-translate className="scan-summary">{summary}</p>}{advice&&<p data-no-translate className="scan-advice">{advice}</p>}
      {items.length>0?<><p className="small-note">Keep what looks right. Edit or remove anything else.</p><div className="detected-list">{items.map(i=><div className={'detected-item '+(i.selected?'included':'')} key={i.id}>
        <label className="ingredient-select"><input type="checkbox" checked={i.selected} onChange={e=>change(i.id,{selected:e.target.checked})}/><span className="sr-only">{translate('Include',lang)} {i.name}</span></label>
        <div className="detected-content"><div className="detected-fields"><input value={i.name} aria-label="Ingredient name" maxLength={100} onChange={e=>change(i.id,{name:e.target.value,match:''})}/><input value={i.quantity} placeholder="Amount (optional)" aria-label="Quantity" maxLength={80} onChange={e=>change(i.id,{quantity:e.target.value})}/></div>
          <span className={'confidence '+i.confidence}>{i.confidence==='likely'?'Likely match':i.confidence==='uncertain'?'Needs your check':'Added by you'}</span>
          {(i.evidence||i.alternatives.length>0)&&<details className="match-details"><summary>Why this match?</summary><p data-no-translate>{i.evidence}</p>{i.alternatives.length>0&&<div className="alternative-options"><span>Could also be:</span>{i.alternatives.map(a=><button data-no-translate type="button" key={a} onClick={()=>change(i.id,{name:a,match:'',confidence:'manual',selected:true})}>{a}</button>)}</div>}</details>}
        </div><button className="icon-btn" aria-label={'Remove '+i.name} onClick={()=>setItems(all=>all.filter(x=>x.id!==i.id))}><X size={17}/></button>
      </div>)}</div></>:<p className="small-note">No ingredients yet. Try a clearer photo or add them below.</p>}</section>}
      <form className="manual-scan-add" onSubmit={e=>{e.preventDefault();add()}}><input aria-label="Add missing ingredient" value={name} onChange={e=>setName(e.target.value)} maxLength={100} placeholder="Add a missing ingredient…"/><button className="icon-btn" aria-label="Add ingredient" disabled={!name.trim()||items.length>=60}><Plus size={22}/></button></form>
      {selected.length>0&&<p className="match-teaser"><ChefHat size={16}/>{matches.length?<><span data-no-translate>{matches.length}</span> <span>{matches.length===1?'recipe matches':'recipes match'}</span></>:<span>No recipe matches yet</span>}</p>}
      {items.length>0&&<button className="btn primary full" onClick={save} disabled={!selected.length}><Check size={17}/> Add to my fridge &amp; find recipes <span className="count-bubble">{selected.length}</span></button>}
      {imageId&&connected&&<button className="text-btn centered" disabled={retrySeconds>0} onClick={()=>recognize()}><RotateCcw size={15}/> Scan again {retrySeconds>0&&<span>({retrySeconds}s)</span>}</button>}
      {!items.length&&<button className="text-btn centered" onClick={onManual}>Open my fridge</button>}
      {items.length>0&&<p className="scan-footnote">Matches are suggestions, not guarantees. Check freshness and allergies yourself.</p>}
    </>}
  </div>,lang);
}
