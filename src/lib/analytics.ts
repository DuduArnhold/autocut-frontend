/**
 * Lightweight analytics tracking for AutoCut
 * Sends events to serverless endpoint without breaking the app
 */

interface AnalyticsPayload {
    [key: string]: any;
}

interface AnalyticsEvent {
    event: string;
    payload: AnalyticsPayload;
    timestamp: string;
    sessionId: string;
    userAgent: string;
    metadata?: {
        url: string;
        referrer: string;
        screen_width: number;
        screen_height: number;
        language: string;
    };
}

// Generate or retrieve session ID (Persistent)
const getSessionId = (): string => {
    let sessionId = localStorage.getItem('analytics_session_id');
    if (!sessionId) {
        sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('analytics_session_id', sessionId);
    }
    return sessionId;
};

export function initAnalytics() {
    // Track app initialization
    track('app_loaded', {
        url: window.location.href,
        referrer: document.referrer,
    });
}

/**
 * Track an analytics event
 * @param event - Event name (e.g., 'export_started', 'export_success')
 * @param payload - Additional event data
 */
export async function track(event: string, payload: AnalyticsPayload = {}): Promise<void> {
    try {
        const analyticsEvent: AnalyticsEvent = {
            event,
            payload,
            timestamp: new Date().toISOString(),
            sessionId: getSessionId(),
            userAgent: navigator.userAgent,
            metadata: {
                url: window.location.href,
                referrer: document.referrer,
                screen_width: window.screen.width,
                screen_height: window.screen.height,
                language: navigator.language
            }
        };

        // Send to analytics endpoint
        const response = await fetch('/api/analytics', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(analyticsEvent),
        });

        // Retry once if failed
        if (!response.ok) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            await fetch('/api/analytics', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(analyticsEvent),
            });
        }
    } catch (error) {
        // Silent fail - don't break the app if analytics fails
        console.debug('Analytics tracking failed:', error);
    }
}
