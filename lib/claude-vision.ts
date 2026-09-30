import Anthropic from '@anthropic-ai/sdk';
import {foodScanSchema,validateFoodScan,recognitionInstructions} from '@/lib/food-recognition';

export const DEFAULT_VISION_MODEL='claude-opus-5-5';
// Claude accepts images up to 5 MB each; the scanner shrinks photos before upload.
export const MAX_IMAGE_BYTES=5*1024*1024;

export type ScanFailure={error:string,code:string,retryAfter:number,status:number};
type ScanResult={result:ReturnType<typeof validateFoodScan>}|{failure:ScanFailure};

function failure(status:number,code:string,error:string,retryAfter=0):{failure:ScanFailure}{return {failure:{status,code,error,retryAfter}}}
function retryAfter(headers:Headers|undefined){const value=headers?.get('retry-after');const seconds=Number(value);return Number.isFinite(seconds)&&seconds>0?Math.ceil(seconds):15}

// Identify the foods in one fridge photo with Claude and return the validated structured result.
export async function scanFoodPhoto({apiKey,model,mediaType,data,language}:{apiKey:string,model?:string,mediaType:'image/jpeg'|'image/png'|'image/webp',data:string,language:string}):Promise<ScanResult>{
  // The SDK retries rate limits, overloads and server errors once, honouring retry-after.
  const client=new Anthropic({apiKey,maxRetries:1,timeout:100_000});
  try{
    const response=await client.beta.messages.create({
      model:model||DEFAULT_VISION_MODEL,
      max_tokens:16000,
      // If a safety check declines the photo, retry it on Anthropic's recommended fallback model.
      betas:['server-side-fallback-2026-07-01'],
      fallbacks:'default',
      output_config:{effort:'high',format:{type:'json_schema',schema:foodScanSchema}},
      system:recognitionInstructions(language),
      messages:[{role:'user',content:[
        {type:'image',source:{type:'base64',media_type:mediaType,data}},
        {type:'text',text:'List the foods visible in this photo. Carefully check for omissions and unsupported identifications before returning the structured result.'},
      ]}],
    });
    if(response.stop_reason==='refusal')return failure(422,'refusal','This photo could not be checked. Try a different photo or add ingredients manually.');
    if(response.stop_reason==='max_tokens')return failure(502,'max_tokens','The scan result was incomplete. Please try again.');
    const text=response.content.flatMap(block=>block.type==='text'?[block.text]:[]).join('');
    if(!text)return failure(502,'empty','No ingredients could be read. Try another photo or add them manually.');
    try{return {result:validateFoodScan(JSON.parse(text))}}catch{return failure(502,'invalid_output','The scan result was incomplete. Please try again.')}
  }catch(e){
    if(e instanceof Anthropic.APIError)console.error('Claude scan failed',JSON.stringify({status:e.status,type:e.type,requestId:e.requestID}));
    if(e instanceof Anthropic.APIConnectionTimeoutError)return failure(504,'timeout','The scan took too long. Your photo is still here; try again.');
    if(e instanceof Anthropic.AuthenticationError)return failure(503,'authentication_error','Claude rejected the API key. The site owner needs to check ANTHROPIC_API_KEY.');
    if(e instanceof Anthropic.PermissionDeniedError||e instanceof Anthropic.NotFoundError)return failure(503,e.type||'model_access','This Claude API key cannot use the selected model. The site owner needs to check model access.');
    if(e instanceof Anthropic.RateLimitError)return failure(429,'rate_limit_error','Claude is busy with too many scans right now. Wait a moment and try again; your photo is still here.',retryAfter(e.headers));
    if(e instanceof Anthropic.APIError&&(e.status===402||e.type==='billing_error'))return failure(503,'billing_error','The Claude account has no API credits left. The site owner needs to add credits in the Claude Console billing settings.');
    if(e instanceof Anthropic.BadRequestError)return failure(400,'invalid_request_error','This photo could not be processed. Try a smaller or different JPG, PNG or WebP photo.');
    if(e instanceof Anthropic.APIError&&(e.status===529||e.type==='overloaded_error'||(e.status??0)>=500))return failure(503,e.type||'api_error','Claude is temporarily unavailable. Your photo is still here; please try again shortly.',retryAfter(e.headers));
    if(e instanceof Anthropic.APIConnectionError)return failure(503,'connection_error','Could not reach Claude. Please try again shortly.');
    return failure(503,'unknown','The recognition request could not be processed. Your photo is still here. Please try again.');
  }
}
