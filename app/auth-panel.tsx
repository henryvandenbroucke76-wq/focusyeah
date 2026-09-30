'use client';
import {useState} from 'react';
import {Mail,Eye,EyeOff,LoaderCircle,CheckCircle2} from 'lucide-react';
import {useLanguage,localize,translate} from '@/lib/i18n';

type Settings={auth?:boolean,google?:boolean,apple?:boolean};
export function AuthPanel({signup=false,reset=false,settings,onDone,onMode}:{signup?:boolean,reset?:boolean,settings:Settings,onDone:()=>void,onMode:()=>void}){
  const {lang}=useLanguage();
  const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[show,setShow]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[sent,setSent]=useState(false);
  async function send(action:string,provider?:string){
    if(action==='reset'&&!email.trim()){setSent(false);setMessage('Enter your email address first, then choose “Forgot password?”.');return}
    setBusy(true);setMessage('');setSent(false);
    try{
      const r=await fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,email,password,provider})});
      const d:{error?:string,url?:string,confirm?:boolean}=await r.json();
      if(!r.ok)throw new Error(d.error||'Something went wrong. Please try again.');
      if(d.url){location.assign(d.url);return}
      if(d.confirm||action==='reset'){setSent(true);setMessage(action==='reset'?'Check your email for a link to choose a new password.':'Check your email for the confirmation link.');return}
      onDone();
    }catch(e){setMessage(e instanceof Error?e.message:'Something went wrong. Please try again.')}finally{setBusy(false)}
  }
  if(!settings.auth)return localize(<div className="auth-form"><p>Account sign-in is being prepared. The owner can connect Supabase in the launch settings.</p><a className="btn primary full" href="/signin-with-chatgpt?return_to=/" target="_top">Continue with ChatGPT</a><small>Private review access</small></div>,lang);
  const providers=!reset&&(settings.google||settings.apple);
  return localize(<div className="auth-form">
    <img className="auth-logo" src="/images/miseora-icon.png" alt="" aria-hidden="true" width={72} height={72}/>
    {!reset&&<div className="auth-switch" role="tablist">
      <button type="button" role="tab" aria-selected={!signup} className={!signup?'active':''} onClick={()=>{if(signup){setMessage('');onMode()}}}>Sign in</button>
      <button type="button" role="tab" aria-selected={signup} className={signup?'active':''} onClick={()=>{if(!signup){setMessage('');onMode()}}}>Create account</button>
    </div>}
    {providers&&<div className="auth-providers">
      {settings.google&&<button type="button" className="btn outline full" disabled={busy} onClick={()=>send('oauth','google')}>Continue with Google</button>}
      {settings.apple&&<button type="button" className="btn outline full" disabled={busy} onClick={()=>send('oauth','apple')}>Continue with Apple</button>}
      <p className="auth-divider">or use your email</p>
    </div>}
    <form onSubmit={e=>{e.preventDefault();send(reset?'updatePassword':signup?'signup':'login')}}>
      {!reset&&<label className="field">Email<input type="email" autoComplete="email" placeholder="you@example.com" required value={email} onChange={e=>setEmail(e.target.value)}/></label>}
      <label className="field">{reset?'New password':'Password'}
        <span className="password-input"><input type={show?'text':'password'} autoComplete={signup||reset?'new-password':'current-password'} minLength={signup||reset?12:1} maxLength={128} required value={password} onChange={e=>setPassword(e.target.value)}/>
          <button type="button" className="icon-btn" aria-label={translate(show?'Hide password':'Show password',lang)} aria-pressed={show} onClick={()=>setShow(!show)}>{show?<EyeOff size={18}/>:<Eye size={18}/>}</button></span>
        {(signup||reset)&&<small>At least 12 characters</small>}
      </label>
      <button className="btn primary full" disabled={busy}>{busy?<LoaderCircle className="loading-ring" size={16}/>:<Mail size={16}/>}{busy?'Working…':reset?'Save new password':signup?'Create account':'Sign in'}</button>
    </form>
    {!signup&&!reset&&<button type="button" className="text-btn centered" disabled={busy} onClick={()=>send('reset')}>Forgot password?</button>}
    {message&&<p role="status" className={'notice auth-message'+(sent?' success':'')}>{sent&&<CheckCircle2 size={17}/>}{message}</p>}
  </div>,lang);
}
