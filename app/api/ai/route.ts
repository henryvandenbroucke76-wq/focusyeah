import {requestAI} from '@/lib/ai-request';
import {config,identity,checkOrigin,failure} from '@/lib/server';

const noStore={'Cache-Control':'no-store'};

// Confirmed ingredients + preferences → a new recipe idea.
async function createRecipe(b:any,c:Record<string,any>){
  if(!c.OPENAI_API_KEY)return Response.json({error:'Recipe ideas are not connected yet.',setup:true},{status:503});
  const instructions='Create or remix a practical recipe using the provided confirmed ingredients and preferences. Respect dietary exclusions. Never claim allergy safety. Do not suggest weight loss or calories. Provide clear beginner steps with temperatures, quantities and equipment. Return JSON {title,description,cuisine,tags:[],minutes:number,servings:number,ingredients:[{name,qty:number,unit}],steps:[{title,text,minutes?:number}]}. No markdown. No invented finished dish image.';
  const resultAI=await requestAI(c.OPENAI_API_KEY,{model:c.OPENAI_MODEL||'gpt-4.1-mini',instructions,store:false,input:[{role:'user',content:[{type:'input_text',text:JSON.stringify(b)}]}],text:{format:{type:'json_object'}},max_output_tokens:4000});
  if(resultAI.failure){const {status,...detail}=resultAI.failure;return Response.json(detail,{status,headers:{...noStore,...(detail.retryAfter?{'Retry-After':String(detail.retryAfter)}:{})}});}
  const out:any=await resultAI.response!.json();
  if(out.status&&out.status!=='completed')throw new Error('The recipe could not finish. Please try again.');
  const text=out.output?.flatMap((x:any)=>x.content||[]).filter((x:any)=>x.type==='output_text').map((x:any)=>x.text).join('');
  if(!text)throw new Error('No recipe came back. Please try again.');
  let result;try{result=JSON.parse(text)}catch{throw new Error('The recipe was incomplete. Please try again.');}
  return Response.json(result,{headers:noStore});
}

export async function POST(req:Request){
  try{
    checkOrigin(req);await identity();const c=config();
    const b:any=await req.json();if(JSON.stringify(b).length>30000)throw new Error('Please shorten your request.');
    return await createRecipe(b,c);
  }catch(e){if(e instanceof Error&&(e.name==='TimeoutError'||e.name==='AbortError'))return Response.json({error:'The request took too long. Please try again.'},{status:504});return failure(e);}
}
