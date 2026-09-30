const quotaCodes=new Set(['insufficient_quota','credit_balance_exhausted','organization_spend_limit_exceeded','project_spend_limit_exceeded','organization_usage_limit_exceeded','billing_hard_limit_reached','usage_limit_exceeded']);
export function describeAIError(status:number,body:any){
 const rawType=body?.error?.type,rawCode=body?.error?.code||rawType;
 const code=typeof rawCode==='string'&&/^[a-z_]{1,80}$/.test(rawCode)?rawCode:'unknown';
 const quota=quotaCodes.has(code)||rawType==='insufficient_quota';
 if(quota)return {code,error:code==='credit_balance_exhausted'?'The OpenAI account has no API credits left. The site owner needs to add credits in OpenAI Billing.':code==='project_spend_limit_exceeded'?'The OpenAI project spending limit has been reached. The site owner needs to review the project limit.':code==='organization_spend_limit_exceeded'?'The OpenAI account spending limit has been reached. The site owner needs to review the account limit.':'OpenAI reports that API credits or quota are unavailable. The site owner needs to check OpenAI Billing and Limits.',retryable:false,status:503};
 if(status===429)return {code,error:'The recipe idea service is busy. Wait a moment and try again.',retryable:code==='rate_limit_exceeded'||code==='slow_down'||rawType==='rate_limit_error',status:429};
 if(status===401)return {code,error:'OpenAI rejected the API key. The site owner needs to check the saved key.',retryable:false,status:503};
 if(status===403||code==='model_not_found')return {code,error:'This OpenAI project cannot access the selected model. The site owner needs to check model access.',retryable:false,status:503};
 if(status>=500)return {code,error:'The recipe idea service is temporarily unavailable. Please try again shortly.',retryable:true,status:503};
 return {code,error:'The recipe idea could not be created. Please try again later.',retryable:false,status:503};
}
export function retryDelay(header:string|null){if(!header)return 2000;const seconds=Number(header);return Number.isFinite(seconds)?Math.max(0,seconds*1000):Math.max(0,Date.parse(header)-Date.now())||2000;}
export async function requestAI(key:string,payload:unknown){
 const signal=AbortSignal.timeout(110000);
 for(let attempt=0;attempt<2;attempt++){
  const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',signal,headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify(payload)});
  if(response.ok)return {response};
  const body:any=await response.json().catch(()=>null);const failure=describeAIError(response.status,body);const delay=retryDelay(response.headers.get('retry-after'));
  console.error('Recipe AI request failed',JSON.stringify({status:response.status,code:failure.code,requestId:response.headers.get('x-request-id')}));
  // Never retry billing/quota failures. Respect long provider delays in the UI.
  if(attempt===0&&failure.retryable&&delay<=8000){await new Promise(resolve=>setTimeout(resolve,delay));continue;}
  return {failure:{...failure,retryAfter:failure.retryable?Math.max(1,Math.ceil(delay/1000)):0}};
 }
 throw new Error('Recipe ideas are unavailable right now.');
}
