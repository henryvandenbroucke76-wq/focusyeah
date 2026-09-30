import {requestAI} from '@/lib/ai-request';
import {config,identity,checkOrigin,failure,db} from '@/lib/server';
import {foodScanSchema,validateFoodScan,recognitionInstructions} from '@/lib/food-recognition';

export async function POST(req:Request){
  try{
    checkOrigin(req);const u=await identity();const c=config();
    if(!c.OPENAI_API_KEY)return Response.json({error:'Photo recognition is not connected yet. You can add ingredients below.',setup:true},{status:503});
    const b:any=await req.json();if(JSON.stringify(b).length>30000)throw new Error('Please shorten your request.');
    const isScan=typeof b.imageId==='string'&&!!b.imageId;
    const model=isScan?(c.OPENAI_VISION_MODEL||'gpt-6-astra'):(c.OPENAI_MODEL||'gpt-4.1-mini');
    const content:any[]=[];
    if(isScan){
      const f=await db().prepare('SELECT * FROM uploads WHERE id=? AND owner=?').bind(b.imageId,u.userId).first<any>();
      if(!f)throw new Error('Image not found.');
      const file=await c.BUCKET?.get(b.imageId);if(!file)throw new Error('Photo unavailable. Please upload it again.');
      const bytes=new Uint8Array(await file.arrayBuffer());if(bytes.length>8*1024*1024)throw new Error('Choose a photo under 8 MB.');
      let bin='';for(let i=0;i<bytes.length;i+=8192)bin+=String.fromCharCode(...bytes.subarray(i,i+8192));
      content.push({type:'input_text',text:'List the foods visible in this photo. Carefully check for omissions and unsupported identifications before returning the structured result.'},{type:'input_image',image_url:`data:${f.type};base64,${btoa(bin)}`,detail:'high'});
    }else content.push({type:'input_text',text:JSON.stringify(b)});
    const instructions=isScan?recognitionInstructions(b.language):'Create or remix a practical recipe using the provided confirmed ingredients and preferences. Respect dietary exclusions. Never claim allergy safety. Do not suggest weight loss or calories. Provide clear beginner steps with temperatures, quantities and equipment. Return JSON {title,description,cuisine,tags:[],minutes:number,servings:number,ingredients:[{name,qty:number,unit}],steps:[{title,text,minutes?:number}]}. No markdown. No invented finished dish image.';
    const resultAI=await requestAI(c.OPENAI_API_KEY,{model,instructions,store:false,input:[{role:'user',content}],
      ...(isScan&&/^gpt-[56]/.test(model)?{reasoning:{effort:'high'}}:{}),
      text:{format:isScan?{type:'json_schema',name:'food_photo_review',strict:true,schema:foodScanSchema}:{type:'json_object'}},
      max_output_tokens:isScan?12000:4000});
    if(resultAI.failure){const {status,...detail}=resultAI.failure;return Response.json(detail,{status,headers:{'Cache-Control':'no-store',...(detail.retryAfter?{'Retry-After':String(detail.retryAfter)}:{})}});}
    const response=resultAI.response!;
    const out:any=await response.json();
    if(out.status&&out.status!=='completed')throw new Error('The scan could not finish. Try again with a clearer photo.');
    const text=out.output?.flatMap((x:any)=>x.content||[]).filter((x:any)=>x.type==='output_text').map((x:any)=>x.text).join('');
    if(!text)throw new Error('No ingredients could be read. Try another photo or add them manually.');
    let result;try{const parsed=JSON.parse(text);result=isScan?validateFoodScan(parsed):parsed;}catch{throw new Error('The scan result was incomplete. Please try again.');}
    return Response.json(result,{headers:{'Cache-Control':'no-store'}});
  }catch(e){if(e instanceof Error&&(e.name==='TimeoutError'||e.name==='AbortError'))return Response.json({error:'The scan took too long. Your photo is still here; try again.'},{status:504});return failure(e);}
}
