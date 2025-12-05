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

const STEPS = ['app_loaded', 'file_selected', 'export_started', 'export_success'];

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { from, to } = req.query;

    try {
        const results: Record<string, number> = {};

        // Get counts for each step
        for (const step of STEPS) {
            const { count } = await sb
                .from('analytics_events')
                .select('id', { count: 'exact', head: true })
                .eq('event', step)
            return res.status(200).json({
                meta: { from, to },
                funnel: {
                    steps,
                    overall_conversion: overallConversion,
                },
            });
        } catch (err) {
            console.error('[API ERROR]', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }
