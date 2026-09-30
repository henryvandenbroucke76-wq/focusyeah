import {createServerClient} from '@supabase/ssr';
import {cookies} from 'next/headers';
import {env} from 'cloudflare:workers';
export function authConfig(){const c=env as unknown as Record<string,string>;return {url:c.SUPABASE_URL,key:c.SUPABASE_PUBLISHABLE_KEY||c.SUPABASE_ANON_KEY,site:c.SITE_URL,google:c.AUTH_GOOGLE_ENABLED==='true',apple:c.AUTH_APPLE_ENABLED==='true'}}
export async function supabase(){const c=authConfig();if(!c.url||!c.key)throw new Error('Account sign-in is being prepared. Please try again later.');const jar=await cookies();return createServerClient(c.url,c.key,{cookies:{getAll(){return jar.getAll()},setAll(values){try{values.forEach(({name,value,options})=>jar.set(name,value,{...options,secure:c.site?.startsWith('https:'),sameSite:'lax',httpOnly:true}))}catch{/* Server components cannot rotate cookies; refresh occurs through the auth endpoint. */}}}})}
export async function appUser(){const c=authConfig();if(!c.url||!c.key)return null;try{const {data:{user}}=await (await supabase()).auth.getUser();return user?{userId:'sb:'+user.id,email:user.email||'',fullName:user.user_metadata?.name||user.user_metadata?.full_name||''}:null}catch{return null}}
