import { createClient } from '@supabase/supabase-js';
import type { VercelResponse } from '@vercel/node';

const url = process.env.SUPABASE_URL || '';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const sb = createClient(url, key, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
    }
});

export function handleError(res: VercelResponse, err: any) {
    console.error('[API ERROR]', err);
    return res.status(500).json({ error: 'Internal server error' });
}
