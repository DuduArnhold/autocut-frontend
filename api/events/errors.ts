import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sb, handleError } from '../supabase.ts';

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
        return handleError(res, err);
    }
}
