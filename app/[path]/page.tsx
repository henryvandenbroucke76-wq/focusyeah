import Kitchen from '../kitchen';
import {getChatGPTUser} from '../chatgpt-auth';
import {appUser,authConfig} from '@/lib/supabase';
export const dynamic='force-dynamic';
export default async function Page(){const c=authConfig();const user=c.url&&c.key?await appUser():await getChatGPTUser();return <Kitchen signedIn={!!user}/>;}
