import fs from 'fs';
import path from 'path';
import os from 'os';

// File-based storage for local dev persistence
const DB_FILE = path.join(os.tmpdir(), 'autocut_events.json');

// Helper to read events
export const readEvents = (): any[] => {
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
export const writeEvents = (events: any[]) => {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(events, null, 2));
    } catch (e) {
        console.error('Error writing events:', e);
    }
};
