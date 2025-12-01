import type { VercelRequest, VercelResponse } from '@vercel/node';
import fs from 'fs';
import path from 'path';
import os from 'os';

const DB_FILE = path.join(os.tmpdir(), 'autocut_events.json');
const MAX_EVENTS = 1000;

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

// Helper to write events
const writeEvents = (events: any[]) => {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(events, null, 2));
    } catch (e) {
        console.error('Error writing events:', e);
    }
};

export default function handler(req: VercelRequest, res: VercelResponse) {
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

        // Read existing events
        const events = readEvents();

        // Add new event
        events.push({
            ...event,
            receivedAt: new Date().toISOString(),
        });

        // Keep only last MAX_EVENTS
        if (events.length > MAX_EVENTS) {
            events.shift();
        }

        // Save back to file
        writeEvents(events);

        // Return success
        return res.status(200).json({
            success: true,
            message: 'Event tracked',
            totalEvents: events.length,
        });
    } catch (error) {
        console.error('[Analytics Error]', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
