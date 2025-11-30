// src/lib/analytics.ts
// Analytics REMOVED - breaks COEP isolation required for SharedArrayBuffer/FFmpeg
// TODO: Re-implement with self-hosted solution or proxy reverse

export function initAnalytics() {
    // No-op - analytics disabled for COEP compatibility
}

export function track(event: string, props?: Record<string, any>) {
    // No-op - analytics disabled for COEP compatibility
    if (location.hostname === "localhost") {
        console.log(`[Analytics] Event (disabled): ${event}`, props);
    }
}
