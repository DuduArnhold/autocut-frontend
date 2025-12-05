import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sb, handleError } from '../../src/lib/supabase';

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
        return handleError(res, err);
    }
}
