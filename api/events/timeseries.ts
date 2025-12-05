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
    const { from, to } = req.query;

    try {
        // Call the SQL function we created
        const { data, error } = await sb.rpc('events_timeseries', {
            p_from: from || '1970-01-01',
            p_to: to || new Date().toISOString(),
        });

        if (error) throw error;

        return res.status(200).json({ data });
    } catch (err) {
        console.error('[API ERROR]', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
