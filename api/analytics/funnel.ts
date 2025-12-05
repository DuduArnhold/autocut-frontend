import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Supabase client (using SERVICE_ROLE_KEY for admin access in serverless functions)
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey)
    : null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    if (!supabase) {
        return res.status(500).json({ error: 'Supabase not configured' });
    }

    try {
        const { from, to } = req.query;

        // Default to last 30 days if not specified
        const endDate = to ? new Date(String(to)) : new Date();
        const startDate = from ? new Date(String(from)) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        // Fetch all events in range
        // Note: For high volume, we would use a more optimized SQL query or materialized view
        // But for now, fetching raw events and aggregating in memory is fine for this scale
        const { data: events, error } = await supabase
            .from('analytics_events')
            .select('session_id, event, timestamp')
            .gte('timestamp', startDate.toISOString())
            .lte('timestamp', endDate.toISOString())
            .order('timestamp', { ascending: true });

        if (error) throw error;

        // Group by session
        const sessions = new Map<string, Set<string>>();

        events?.forEach(event => {
            if (!sessions.has(event.session_id)) {
                sessions.set(event.session_id, new Set());
            }
            sessions.get(event.session_id)?.add(event.event);
        });

        // Calculate Funnel Steps
        let totalSessions = 0;
        let loadedSessions = 0;
        let startedSessions = 0;
        let successSessions = 0;

        sessions.forEach((eventsSet) => {
            totalSessions++;

            // Step 1: App Loaded (or any event implies loaded)
            if (eventsSet.has('app_loaded') || eventsSet.size > 0) {
                loadedSessions++;
            }

            // Step 2: Started Export
            if (eventsSet.has('export_started')) {
                startedSessions++;
            }

            // Step 3: Success
            if (eventsSet.has('export_success')) {
                successSessions++;
            }
        });

        // Calculate Rates
        const conversionStart = loadedSessions > 0 ? Math.round((startedSessions / loadedSessions) * 100) : 0;
        const conversionSuccess = startedSessions > 0 ? Math.round((successSessions / startedSessions) * 100) : 0;
        const overallConversion = loadedSessions > 0 ? Math.round((successSessions / loadedSessions) * 100) : 0;

        // Drop-offs
        const dropOffStart = loadedSessions - startedSessions;
        const dropOffSuccess = startedSessions - successSessions;

        return res.status(200).json({
            meta: {
                from: startDate.toISOString(),
                to: endDate.toISOString(),
                total_sessions: totalSessions
            },
            funnel: {
                steps: [
                    {
                        id: 'loaded',
                        label: 'App Loaded',
                        count: loadedSessions,
                        conversion_rate: 100, // Baseline
                        drop_off_count: 0
                    },
                    {
                        id: 'started',
                        label: 'Started Export',
                        count: startedSessions,
                        conversion_rate: conversionStart,
                        drop_off_count: dropOffStart
                    },
                    {
                        id: 'success',
                        label: 'Export Success',
                        count: successSessions,
                        conversion_rate: conversionSuccess,
                        drop_off_count: dropOffSuccess
                    }
                ],
                overall_conversion: overallConversion
            }
        });

    } catch (error: any) {
        console.error('[Funnel API Error]', error);
        return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
}
