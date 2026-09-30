'use client';
import {useEffect,useRef,useState} from 'react';
import {Pause,Play,RotateCcw} from 'lucide-react';
import {useLanguage,localize} from '@/lib/i18n';

function paintScene(el:HTMLElement,p:number){
  const clamp=(v:number)=>Math.max(0,Math.min(1,v));
  el.style.setProperty('--cook-progress',String(p));
  el.querySelectorAll<HTMLElement>('[data-ingredient]').forEach((item,i)=>{
    const t=clamp((p-.04-i*.065)/.42);const eased=1-Math.pow(1-t,3);
    const starts=[[-170,-230],[160,-260],[-210,-100],[160,-130],[-80,-280],[220,-200],[-230,-180],[80,-300]],ends=[[-24,-28],[49,-18],[-39,39],[28,48],[10,-65],[-65,-12],[62,39],[-12,5]];
    item.style.transform=`translate(${starts[i][0]+(ends[i][0]-starts[i][0])*eased}%,${starts[i][1]+(ends[i][1]-starts[i][1])*eased}%) rotate(${(1-eased)*(i%2?60:-60)}deg) scale(${(i>3?.62:1)-.22*eased})`;
  });
}
function CookingScene(){return <div className="pan-scene" aria-hidden="true"><div className="pan-glow"/><img className="pan-image" src="/images/generated/cooking-pan.webp" alt=""/><div className="pan-ingredients">{[0,1,2,3,4,5,6,7].map(i=><span key={i} data-ingredient={i} className={'food-sprite food-'+i%4}/>)}</div><div className="pan-steam"><i/><i/><i/></div></div>}
export function CookingMini({progress}:{progress:number}){
  const scene=useRef<HTMLDivElement>(null);
  useEffect(()=>{if(scene.current)paintScene(scene.current,progress)},[progress]);
  return <div ref={scene} className="mini-cooking" aria-hidden="true"><CookingScene/></div>
}
export function CookingBackdrop(){
  const scene=useRef<HTMLDivElement>(null),[paused,setPaused]=useState(false);const {lang}=useLanguage();
  useEffect(()=>{const media=matchMedia('(prefers-reduced-motion: reduce)');let saved=false;try{saved=localStorage.getItem('simmerfolk-motion')==='off'}catch{}setPaused(saved||media.matches);const change=()=>setPaused(media.matches);media.addEventListener('change',change);return()=>media.removeEventListener('change',change)},[]);
  useEffect(()=>{document.documentElement.dataset.motion=paused?'off':'on';if(!scene.current)return;let frame=0;const update=()=>{frame=0;const extent=Math.max(1,document.documentElement.scrollHeight-innerHeight);paintScene(scene.current!,paused?.8:Math.min(1,scrollY/Math.min(extent,innerHeight*1.8)))};const schedule=()=>{if(!frame)frame=requestAnimationFrame(update)};update();window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule);return()=>{cancelAnimationFrame(frame);window.removeEventListener('scroll',schedule);window.removeEventListener('resize',schedule)}},[paused]);
  return localize(<><div className="kitchen-backdrop" aria-hidden="true"><div className="backdrop-grain"/><div ref={scene} className="backdrop-pan"><CookingScene/></div></div><button className="motion-toggle" aria-pressed={paused} onClick={()=>{setPaused(!paused);try{localStorage.setItem('simmerfolk-motion',paused?'on':'off')}catch{}}}>{paused?<Play size={14}/>:<Pause size={14}/>} {paused?'Enable motion':'Pause motion'}</button></>,lang)
}
export function CookingStory({onCook}:{onCook:()=>void}){
  const section=useRef<HTMLElement>(null),scene=useRef<HTMLDivElement>(null);const [stage,setStage]=useState<number|null>(null),[tossing,setTossing]=useState(false);const tossTimer=useRef<ReturnType<typeof setTimeout>|null>(null);const shown=useRef(0);const {lang}=useLanguage();
  useEffect(()=>()=>{if(tossTimer.current)clearTimeout(tossTimer.current)},[]);
  useEffect(()=>{let frame=0,target=0;const animate=()=>{frame=0;if(!scene.current)return;const paused=document.documentElement.dataset.motion==='off';shown.current=paused?.8:shown.current+(target-shown.current)*.14;if(Math.abs(target-shown.current)<.001)shown.current=target;paintScene(scene.current,shown.current);if(!paused&&Math.abs(target-shown.current)>.001)frame=requestAnimationFrame(animate)};
  const update=()=>{if(!section.current)return;const r=section.current.getBoundingClientRect();target=stage===null?Math.max(0,Math.min(1,(innerHeight*.9-r.top)/(innerHeight*.55+r.height*.4))):stage/2;if(!frame)frame=requestAnimationFrame(animate)};
  const observer=new MutationObserver(update);observer.observe(document.documentElement,{attributes:true,attributeFilter:['data-motion']});update();window.addEventListener('scroll',update,{passive:true});window.addEventListener('resize',update);return()=>{cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('scroll',update);window.removeEventListener('resize',update)}},[stage]);
  function toss(){if(tossing)return;setStage(2);if(document.documentElement.dataset.motion==='off')return;setTossing(true);tossTimer.current=setTimeout(()=>setTossing(false),1150)}

  return localize(<section ref={section} className={'cooking-story pan-story '+(tossing?'is-tossing':'')}><div className="story-copy"><h2>A little kitchen magic.</h2><p>Fresh ingredients. Your next favourite meal.</p><div className="story-steps">{['Prep','Toss','Simmer'].map((s,i)=><button key={s} aria-pressed={stage===i} className={stage===i?'active':''} onClick={()=>setStage(i)}>{s}</button>)}</div>{stage!==null&&<button className="text-btn" onClick={()=>setStage(null)}>Follow my scroll</button>}<button className="toss-button" onClick={toss} disabled={tossing}><RotateCcw size={17}/> Toss the pan</button><button className="btn primary" onClick={onCook}>Try the chickpea curry</button></div><div ref={scene} className="story-pan" role="img" aria-label="Vegetables dropping into a pan as you scroll"><CookingScene/></div></section>,lang)
}
