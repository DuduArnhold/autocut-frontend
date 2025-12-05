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

        // Get UNIQUE SESSION counts for each step
        for (const step of STEPS) {
            const { data, error } = await sb
                .from('analytics_events')
                .select('session_id')
                .eq('event', step)
                .gte('timestamp', from || '1970-01-01')
                .lte('timestamp', to || new Date().toISOString());

            if (error) throw error;

            // Count unique sessions
            const uniqueSessions = new Set(data?.map(d => d.session_id) || []);
            results[step] = uniqueSessions.size;
        }

        // Calculate conversion rates (always relative to first step)
        const firstStepValue = results[STEPS[0]] || 1;
        const steps = STEPS.map((step, index) => {
            const value = results[step] || 0;
            const conversion = index === 0
                ? 100
                : Math.round((value / firstStepValue) * 100);

            return {
                name: step,
                value,
                conversion,
            };
        });

        const overallConversion = results['app_loaded'] === 0
            ? 0
            : Math.round(((results['export_success'] || 0) / results['app_loaded']) * 100);

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
