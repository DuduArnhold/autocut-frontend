import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
    const authHeader = req.headers.authorization;

    // Get credentials from environment variables
    const username = process.env.DASHBOARD_USERNAME || 'admin';
    const password = process.env.DASHBOARD_PASSWORD || 'change-me-in-vercel';

    const expectedAuth = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');

    if (authHeader !== expectedAuth) {
        res.setHeader('WWW-Authenticate', 'Basic realm="Analytics Dashboard"');
        return res.status(401).json({ error: 'Authentication required' });
    }

    return res.status(200).json({ authenticated: true });
}
