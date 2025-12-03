import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
const supabase = supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey)
    : null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Only accept GET requests
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    console.log('[DEBUG] Handler started');
    console.log('[DEBUG] Supabase URL:', supabaseUrl ? 'SET' : 'NOT SET');
    console.log('[DEBUG] Supabase Key:', supabaseKey ? 'SET (length: ' + supabaseKey.length + ')' : 'NOT SET');
    console.log('[DEBUG] Supabase client:', supabase ? 'CREATED' : 'NULL');

    if (!supabase) {
        console.log('[DEBUG] Returning error: Supabase not configured');
        return res.status(500).json({ error: 'Supabase not configured' });
    }

    try {
        // Parse query params for date range
        const { from, to } = req.query;

        const now = new Date();
        // Default to last 24h if not provided
        const toDate = to ? new Date(String(to)) : now;
        const fromDate = from ? new Date(String(from)) : new Date(now.getTime() - 24 * 60 * 60 * 1000);

        // Helper to apply date filter
        const applyFilter = (query: any) => {
            return query
                .gte('timestamp', fromDate.toISOString())
                .lte('timestamp', toDate.toISOString());
        };

        // Run queries in parallel for better performance
        const results = await Promise.all([
            // 1. Total Events (in range)
            applyFilter(supabase.from('analytics_events').select('*', { count: 'exact', head: true })),

            // 2. Total Exports (in range)
            applyFilter(supabase.from('analytics_events').select('*', { count: 'exact', head: true }).eq('event', 'export_success')),

            // 3. Total Errors (in range)
            applyFilter(supabase.from('analytics_events').select('*', { count: 'exact', head: true }).in('event', ['export_failed', 'ffmpeg_worker_error', 'ffmpeg_init_error'])),

            // 4. Vertical Toggles (in range)
            applyFilter(supabase.from('analytics_events').select('*', { count: 'exact', head: true }).eq('event', 'vertical_mode_toggled')),

            // 5. Funnel: Loaded (in range)
            applyFilter(supabase.from('analytics_events').select('*', { count: 'exact', head: true }).eq('event', 'app_loaded')),

            // 6. Funnel: Started Export (in range)
            applyFilter(supabase.from('analytics_events').select('*', { count: 'exact', head: true }).eq('event', 'export_started')),

            // 7. Funnel: Success (in range)
            applyFilter(supabase.from('analytics_events').select('*', { count: 'exact', head: true }).eq('event', 'export_success')),

            // 8. All events in range for chart
            applyFilter(supabase.from('analytics_events').select('timestamp'))
        ]);

        const totalEvents = results[0];
        const totalExports = results[1];
        const totalErrors = results[2];
        const verticalToggles = results[3];
        const funnelLoaded = results[4];
        const funnelStarted = results[5];
        const funnelSuccess = results[6];
        const chartEventsResult = results[7];

        // Helper to check for errors in results
        const checkError = (result: any) => {
            if (result.error) throw result.error;
            return result.count || 0;
        };

        // Determine aggregation granularity
        const diffMs = toDate.getTime() - fromDate.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);
        const isDaily = diffHours > 24;

        // Process chart events
        const chartDataMap = new Map<string, number>();

        // Initialize chart buckets
        if (isDaily) {
            // Daily buckets
            const days = Math.ceil(diffHours / 24);
            for (let i = 0; i <= days; i++) {
                const d = new Date(fromDate.getTime() + i * 24 * 60 * 60 * 1000);
                const key = d.toISOString().split('T')[0]; // YYYY-MM-DD
                chartDataMap.set(key, 0);
            }
        } else {
            // Hourly buckets (0-23)
            // For < 24h range, we usually want to show the specific hours in that range
            // But to keep it simple and consistent with "Last 24h" view, let's just use the hour of the timestamp
            // Or better: create buckets for each hour in the range
            for (let i = 0; i <= Math.ceil(diffHours); i++) {
                const d = new Date(fromDate.getTime() + i * 60 * 60 * 1000);
                // Format: "HH:00"
                const key = `${d.getHours()}:00`;
                // Note: This might overlap if range > 24h but we are in isDaily=false block, which implies <= 24h
                // However, if we cross midnight, "23:00" then "0:00". 
                // If we just use HH:00 as key, it handles crossing midnight fine for a single 24h period.
                if (!chartDataMap.has(key)) {
                    chartDataMap.set(key, 0);
                }
            }
        }

        if (chartEventsResult.data) {
            chartEventsResult.data.forEach((event: any) => {
                const date = new Date(event.timestamp);
                let key;
                if (isDaily) {
                    key = date.toISOString().split('T')[0];
                } else {
                    key = `${date.getHours()}:00`;
                }

                // Only increment if it fits in our generated buckets (or just set it if we missed one)
                if (chartDataMap.has(key)) {
                    chartDataMap.set(key, (chartDataMap.get(key) || 0) + 1);
                } else {
                    // Fallback for edge cases or if we didn't pre-fill perfectly
                    chartDataMap.set(key, 1);
                }
            });
        }

        // Convert map to array
        const chartData = Array.from(chartDataMap.entries()).map(([key, value]) => ({
            name: key, // 'name' is generic for X-axis
            events: value
        }));

        // Sort chart data? Map iteration order is insertion order, and we inserted in time order.
        // But let's be safe if we rely on that.
        // Actually, if we use the pre-fill loop, it is sorted.

        const response = {
            total_events: checkError(totalEvents),
            total_exports: checkError(totalExports),
            total_errors: checkError(totalErrors),
            vertical_toggles: checkError(verticalToggles),
            // "last_24h" is now just "in_range" effectively, but we keep the structure or rename?
            // The frontend expects `last_24h` for the card. 
            // Let's repurpose `last_24h` to mean "Selected Range" in the response to avoid breaking frontend types immediately,
            // or better, update the frontend types.
            // For now, I'll map the range totals to this object so the UI shows them.
            last_24h: {
                events: checkError(totalEvents), // Total in range
                exports: checkError(totalExports), // Total in range
                errors: checkError(totalErrors)    // Total in range
            },
            funnel: {
                loaded: checkError(funnelLoaded),
                started_export: checkError(funnelStarted),
                success: checkError(funnelSuccess)
            },
            chart_data: chartData, // Renamed from hourly_events to be generic
            meta: {
                from: fromDate.toISOString(),
                to: toDate.toISOString(),
                granularity: isDaily ? 'day' : 'hour'
            }
        };

        // Cache control: cache for 60 seconds
        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');

        return res.status(200).json(response);

    } catch (error: any) {
        console.error('[Analytics Summary Error]', error);
        const errorDetails = error?.message || error?.toString() || JSON.stringify(error);
        const debugInfo = {
            error: 'Internal server error',
            details: errorDetails,
            debug: {
                supabaseUrl: supabaseUrl ? 'SET' : 'NOT SET',
                supabaseKey: supabaseKey ? `SET (${supabaseKey.length} chars)` : 'NOT SET',
                clientCreated: supabase ? 'YES' : 'NO',
                errorName: error?.name,
                errorCode: error?.code,
                errorHint: error?.hint
            }
        };
        return res.status(500).json(debugInfo);
    }
}
