import {config} from '@/lib/server';
import {authConfig} from '@/lib/supabase';
export async function GET(){const c=config(),a=authConfig();return Response.json({auth:!!(a.url&&a.key&&a.site),google:a.google,apple:a.apple,billing:!!(c.STRIPE_SECRET_KEY&&c.STRIPE_PRICE_ID&&c.STRIPE_WEBHOOK_SECRET&&c.BILLING_ENABLED==='true'),ai:!!c.OPENAI_API_KEY,plusLabel:c.PLUS_PRICE_LABEL||'',supportEmail:c.SUPPORT_EMAIL||''},{headers:{'Cache-Control':'no-store'}})}
