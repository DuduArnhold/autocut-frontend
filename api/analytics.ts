import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import os from 'os';

const DB_FILE = path.join(os.tmpdir(), 'autocut_events.json');
const MAX_EVENTS = 1000;

// Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey)
    : null;

// Fallback file storage helpers (for local dev without Supabase)
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

const writeEventsToFile = (events: any[]) => {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(events, null, 2));
    } catch (e) {
        console.error('Error writing events to file:', e);
    }
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Only accept POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const event = req.body;

        // Validate event structure
        if (!event.event || !event.timestamp) {
            return res.status(400).json({ error: 'Invalid event structure' });
        }

        // Log to console (visible in Vercel logs)
        console.log('[Analytics Event]', JSON.stringify(event, null, 2));

        // Try Supabase first, fallback to file storage
        if (supabase) {
            // Use Supabase
            const { data, error } = await supabase
                .from('analytics_events')
                .insert([{
                    event: event.event,
                    payload: event.payload || {},
                    timestamp: event.timestamp,
                    session_id: event.sessionId,
                    user_agent: event.userAgent,
                }])
                .select();

            if (error) {
                console.error('[Supabase Error]', error);
                throw error;
            }

            // Get total count
            const { count } = await supabase
                .from('analytics_events')
                .select('*', { count: 'exact', head: true });

            return res.status(200).json({
                success: true,
                message: 'Event tracked (Supabase)',
                totalEvents: count || 0,
            });
        } else {
            // Fallback to file storage
            const events = readEventsFromFile();
            events.push({
                ...event,
                receivedAt: new Date().toISOString(),
            });

            if (events.length > MAX_EVENTS) {
                events.shift();
            }

            writeEventsToFile(events);

            return res.status(200).json({
                success: true,
                message: 'Event tracked (File)',
                totalEvents: events.length,
            });
        }
    } catch (error) {
        console.error('[Analytics Error]', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
