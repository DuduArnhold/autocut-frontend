import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const sb = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
    }
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        // Get last 20 error events
        const { data, error } = await sb
            .from('analytics_events')
            .select('id, event, payload, timestamp, session_id')
            .like('event', '%error%')
            .order('timestamp', { ascending: false })
            .limit(20);

        if (error) throw error;

        return res.status(200).json({ errors: data || [] });
    } catch (err) {
        console.error('[API ERROR]', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
