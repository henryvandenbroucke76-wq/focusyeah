import {requestAI} from '@/lib/ai-request';
import {config,identity,checkOrigin,failure,db} from '@/lib/server';
import {scanFoodPhoto,MAX_IMAGE_BYTES} from '@/lib/claude-vision';

const noStore={'Cache-Control':'no-store'};

// Fridge photo → ingredient list, recognised by Claude.
async function scanPhoto(b:any,owner:string,c:Record<string,any>){
  if(!c.ANTHROPIC_API_KEY)return Response.json({error:'Photo recognition is not connected yet. You can add ingredients below.',setup:true},{status:503});
  const f=await db().prepare('SELECT * FROM uploads WHERE id=? AND owner=?').bind(b.imageId,owner).first<any>();
  if(!f)throw new Error('Image not found.');
  if(!['image/jpeg','image/png','image/webp'].includes(f.type))throw new Error('Choose a JPG, PNG, or WebP image.');
  const file=await c.BUCKET?.get(b.imageId);if(!file)throw new Error('Photo unavailable. Please upload it again.');
  const bytes=new Uint8Array(await file.arrayBuffer());
  if(bytes.length>MAX_IMAGE_BYTES)throw new Error('This photo is too large to scan. Please choose it again so it can be resized.');
  let bin='';for(let i=0;i<bytes.length;i+=8192)bin+=String.fromCharCode(...bytes.subarray(i,i+8192));
  const out=await scanFoodPhoto({apiKey:c.ANTHROPIC_API_KEY,model:c.CLAUDE_VISION_MODEL,mediaType:f.type,data:btoa(bin),language:b.language});
  if('failure' in out){const {status,...detail}=out.failure;return Response.json(detail,{status,headers:{...noStore,...(detail.retryAfter?{'Retry-After':String(detail.retryAfter)}:{})}});}
  return Response.json(out.result,{headers:noStore});
}

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
    checkOrigin(req);const u=await identity();const c=config();
    const b:any=await req.json();if(JSON.stringify(b).length>30000)throw new Error('Please shorten your request.');
    return typeof b.imageId==='string'&&b.imageId?await scanPhoto(b,u.userId,c):await createRecipe(b,c);
  }catch(e){if(e instanceof Error&&(e.name==='TimeoutError'||e.name==='AbortError'))return Response.json({error:'The request took too long. Please try again.'},{status:504});return failure(e);}
}
