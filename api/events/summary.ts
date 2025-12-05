import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sb, handleError } from '../supabase.ts';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { from, to } = req.query;

    try {
        // Total exports (export_success)
        const { count: exportsCount } = await sb
            .from('analytics_events')
            .select('id', { count: 'exact', head: true })
            .eq('event', 'export_success')
            .gte('timestamp', from || '1970-01-01')
            .lte('timestamp', to || new Date().toISOString());

        // Total started (export_started)
        const { count: startedCount } = await sb
            .from('analytics_events')
            .select('id', { count: 'exact', head: true })
            .eq('event', 'export_started')
            .gte('timestamp', from || '1970-01-01')
            .lte('timestamp', to || new Date().toISOString());

        // Total errors
        const { count: errorsCount } = await sb
            .from('analytics_events')
            .select('id', { count: 'exact', head: true })
            .in('event', ['export_failed', 'ffmpeg_worker_error', 'ffmpeg_init_error'])
            .gte('timestamp', from || '1970-01-01')
            .lte('timestamp', to || new Date().toISOString());

        // Average duration (from payload.duration_ms)
        const { data: durationData } = await sb
            .from('analytics_events')
            .select('payload')
            .eq('event', 'export_success')
            .gte('timestamp', from || '1970-01-01')
            .lte('timestamp', to || new Date().toISOString())
            .not('payload->duration_ms', 'is', null);

        let avgDuration = 0;
        if (durationData && durationData.length > 0) {
            const durations = durationData
                .map((d: any) => parseInt(d.payload?.duration_ms))
                .filter((d: number) => !isNaN(d));

            if (durations.length > 0) {
                avgDuration = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
            }
        }

        const totalStarted = startedCount || 0;
        const totalSuccess = exportsCount || 0;
        const successRate = totalStarted === 0 ? 0 : Math.round((totalSuccess / totalStarted) * 100);

        return res.status(200).json({
            exports: totalSuccess,
            started: totalStarted,
            errors: errorsCount || 0,
            successRate,
            avgDuration,
        });
    } catch (err) {
        return handleError(res, err);
    }
}
