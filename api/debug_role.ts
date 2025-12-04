import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    let role = 'unknown';
    let iss = 'unknown';

    if (key) {
        try {
            // Simple JWT decode without external libs
            const parts = key.split('.');
            if (parts.length === 3) {
                const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
                role = payload.role;
                iss = payload.iss;
            }
        } catch (e) {
            role = 'error_decoding';
        }
    }

    return res.status(200).json({
        status: 'debug_info',
        key_configured: !!key,
        key_length: key.length,
        jwt_role: role, // Should be 'service_role'
        jwt_issuer: iss,
        env_check: {
            has_anon: !!process.env.SUPABASE_ANON_KEY,
            has_service: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
            are_keys_different: process.env.SUPABASE_ANON_KEY !== process.env.SUPABASE_SERVICE_ROLE_KEY
        }
    });
}
