import {env} from 'cloudflare:workers';
import {appUser} from '@/lib/supabase';
export function db(){if(!env.DB)throw new Error('Your kitchen is temporarily unavailable. Please try again.');return env.DB;}
// Tables from drizzle/0000_exotic_alex_power.sql. Created on first use so a fresh database works without a manual migration step.
const schema=["CREATE TABLE IF NOT EXISTS entries(owner text NOT NULL,kind text NOT NULL,id text NOT NULL,data text NOT NULL,created integer NOT NULL,PRIMARY KEY(owner,kind,id))","CREATE INDEX IF NOT EXISTS entries_kind_id ON entries(kind,id)","CREATE TABLE IF NOT EXISTS profiles(id text PRIMARY KEY NOT NULL,name text NOT NULL,preferences text DEFAULT '{}' NOT NULL,plan text DEFAULT 'free' NOT NULL)","CREATE TABLE IF NOT EXISTS recipes(id text PRIMARY KEY NOT NULL,owner text NOT NULL,data text NOT NULL,published integer DEFAULT 0 NOT NULL,created integer NOT NULL)","CREATE INDEX IF NOT EXISTS recipes_owner ON recipes(owner)","CREATE INDEX IF NOT EXISTS recipes_public ON recipes(published)","CREATE TABLE IF NOT EXISTS reviews(id text PRIMARY KEY NOT NULL,owner text NOT NULL,recipe text NOT NULL,name text NOT NULL,body text NOT NULL,rating integer NOT NULL,created integer NOT NULL)","CREATE INDEX IF NOT EXISTS reviews_recipe ON reviews(recipe)","CREATE TABLE IF NOT EXISTS uploads(id text PRIMARY KEY NOT NULL,owner text NOT NULL,name text NOT NULL,type text NOT NULL,created integer NOT NULL)"];
let schemaReady:Promise<unknown>|null=null;
export async function ready(){const d=db();schemaReady??=d.batch(schema.map(s=>d.prepare(s))).catch(e=>{schemaReady=null;throw e});await schemaReady;}
export function config(){return env as unknown as Record<string,any>}
export async function identity(){const u=await appUser();if(!u)throw new Error('SIGN_IN');await ready();return u;}
export function checkOrigin(r:Request){const o=r.headers.get('origin');if(o&&o!==new URL(r.url).origin)throw new Error('Invalid request origin');}
export function failure(e:unknown){const m=e instanceof Error?e.message:'Please try again.';return Response.json({error:m==='SIGN_IN'?'Please sign in to use your kitchen.':m},{status:m==='SIGN_IN'?401:400});}
export function parse<T>(v:string):T{return JSON.parse(v)}
export function str(v:unknown,max=200){if(typeof v!=='string'||!v.trim()||v.length>max)throw new Error('Please check the information you entered.');return v.trim()}
