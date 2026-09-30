import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '@/app/chatgpt-auth';
import {appUser,authConfig} from '@/lib/supabase';
export function db(){if(!env.DB)throw new Error('Your kitchen is temporarily unavailable. Please try again.');return env.DB;}
export function config(){return env as unknown as Record<string,any>}
export async function identity(){const c=authConfig();const u=c.url&&c.key?await appUser():await getChatGPTUser();if(!u)throw new Error('SIGN_IN');return u;}
export function checkOrigin(r:Request){const o=r.headers.get('origin');if(o&&o!==new URL(r.url).origin)throw new Error('Invalid request origin');}
export function failure(e:unknown){const m=e instanceof Error?e.message:'Please try again.';return Response.json({error:m==='SIGN_IN'?'Please sign in to use your kitchen.':m},{status:m==='SIGN_IN'?401:400});}
export function parse<T>(v:string):T{return JSON.parse(v)}
export function str(v:unknown,max=200){if(typeof v!=='string'||!v.trim()||v.length>max)throw new Error('Please check the information you entered.');return v.trim()}
