import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import os from 'os';

const DB_FILE = path.join(os.tmpdir(), 'autocut_events.json');

// Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey)
    : null;

// Fallback file storage helper (for local dev without Supabase)
const readEventsFromFile = (): any[] => {
    try {
        if (!fs.existsSync(DB_FILE)) return [];
        const data = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (e) {
        console.error('Error reading events from file:', e);
        return [];
    }
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Only accept GET requests
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { limit = '50', eventType } = req.query;
        const limitNum = parseInt(limit as string, 10);

        // Try Supabase first, fallback to file storage
        if (supabase) {
            // Use Supabase
            let query = supabase
                .from('analytics_events')
                .select('*')
                .order('timestamp', { ascending: false })
                .limit(limitNum);

            // Filter by event type if specified
            if (eventType) {
                query = query.eq('event', eventType);
            }

            const { data, error, count } = await query;

            if (error) {
                console.error('[Supabase Error]', error);
                throw error;
            }

            // Transform to match expected format
            const events = (data || []).map((row: any) => ({
                event: row.event,
                payload: row.payload,
                timestamp: row.timestamp,
                sessionId: row.session_id,
                userAgent: row.user_agent,
                receivedAt: row.received_at,
            }));

            return res.status(200).json({
                events,
                total: events.length,
                limit: limitNum,
            });
        } else {
            // Fallback to file storage
            const allEvents = readEventsFromFile();

            let filteredEvents = allEvents;
            if (eventType) {
                filteredEvents = allEvents.filter((e: any) => e.event === eventType);
            }

            const recentEvents = filteredEvents.slice(-limitNum).reverse();

            return res.status(200).json({
                events: recentEvents,
                total: filteredEvents.length,
                limit: limitNum,
            });
        }
    } catch (error) {
        console.error('[Events API Error]', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
