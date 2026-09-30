import Kitchen from '../kitchen';
import {appUser} from '@/lib/supabase';
export const dynamic='force-dynamic';
export default async function Page(){const user=await appUser();return <Kitchen signedIn={!!user}/>;}
