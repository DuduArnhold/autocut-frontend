import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sb, handleError } from '../../src/lib/supabase';

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
                .gte('timestamp', from || '1970-01-01')
                .lte('timestamp', to || new Date().toISOString());

            results[step] = count || 0;
        }

        // Calculate conversion rates
        const steps = STEPS.map((step, index) => {
            const value = results[step] || 0;
            const prevValue = index > 0 ? results[STEPS[index - 1]] || 1 : value;
            const conversion = prevValue === 0 ? 0 : Math.round((value / prevValue) * 100);

            return {
                name: step,
                value,
                conversion: index === 0 ? 100 : conversion,
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
        return handleError(res, err);
    }
}
