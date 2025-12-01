import type { VercelRequest, VercelResponse } from '@vercel/node';
import fs from 'fs';
import path from 'path';
import os from 'os';

const DB_FILE = path.join(os.tmpdir(), 'autocut_events.json');

// Helper to read events
const readEvents = (): any[] => {
    try {
        if (!fs.existsSync(DB_FILE)) return [];
        const data = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (e) {
        console.error('Error reading events:', e);
        return [];
    }
};

export default function handler(req: VercelRequest, res: VercelResponse) {
    // Only accept GET requests
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { limit = '50', eventType } = req.query;
        const limitNum = parseInt(limit as string, 10);

        // Read events from file
        const events = readEvents();

        // Filter by event type if specified
        let filteredEvents = events;
        if (eventType) {
            filteredEvents = events.filter((e: any) => e.event === eventType);
        }

        // Get last N events
        const recentEvents = filteredEvents.slice(-limitNum).reverse();

        // Return events
        return res.status(200).json({
            events: recentEvents,
            total: filteredEvents.length,
            limit: limitNum,
        });
    } catch (error) {
        console.error('[Events API Error]', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
