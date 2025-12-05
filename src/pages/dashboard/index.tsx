import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Download, AlertTriangle, CheckCircle, Calendar as CalendarIcon } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar'; // Assuming shadcn Calendar exists, if not I'll use native date input fallback or check if it exists
import { format, subDays } from 'date-fns';

// Fallback if Calendar component doesn't exist in the project yet, 
// but based on package.json `react-day-picker` is there, so `Calendar` likely exists in `components/ui/calendar.tsx`.
// I will assume it exists. If not, I'll need to create it or use native inputs.
// Checking file list... `components/ui` has many files. I'll assume standard shadcn setup.

interface AnalyticsSummary {
    total_events: number;
    total_exports: number;
    total_errors: number;
    vertical_toggles: number;
    last_24h: {
        events: number;
        exports: number;
        errors: number;
    };
    funnel: {
        loaded: number;
        started_export: number;
        success: number;
    };
    chart_data: {
        name: string;
        events: number;
    }[];
    meta: {
        granularity: 'hour' | 'day';
    }
}

type DateRangePreset = '24h' | '7d' | '30d' | 'custom';

export default function Dashboard() {
    const [data, setData] = useState<AnalyticsSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [autoRefresh, setAutoRefresh] = useState(true);

    // Date Filter State
    const [rangePreset, setRangePreset] = useState<DateRangePreset>('24h');
    const [customDate, setCustomDate] = useState<{ from: Date | undefined; to: Date | undefined }>({
        from: subDays(new Date(), 7),
        to: new Date(),
    });

    // Funnel State
    const [funnelData, setFunnelData] = useState<any>(null);

    const fetchSummary = async () => {
        try {
            setLoading(true);

            // Calculate dates based on preset
            const now = new Date();
            let from = new Date();
            let to = now;

            if (rangePreset === '24h') {
                from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            } else if (rangePreset === '7d') {
                from = subDays(now, 7);
            } else if (rangePreset === '30d') {
                from = subDays(now, 30);
            } else if (rangePreset === 'custom') {
                if (customDate.from) from = customDate.from;
                if (customDate.to) to = customDate.to;
            }

            const params = new URLSearchParams({
                from: from.toISOString(),
                to: to.toISOString()
            });

            // Parallel fetch: Summary + Funnel
            const [summaryRes, funnelRes] = await Promise.all([
                fetch(`/api/analytics/summary?${params.toString()}`),
                fetch(`/api/analytics/funnel?${params.toString()}`)
            ]);

            if (!summaryRes.ok || !funnelRes.ok) throw new Error('Failed to fetch analytics');

            const summary: AnalyticsSummary = await summaryRes.json();
            const funnel = await funnelRes.json();

            setData(summary);
            setFunnelData(funnel);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSummary();
    }, [rangePreset, customDate]); // Refetch when filter changes

    useEffect(() => {
        if (!autoRefresh) return;
        const interval = setInterval(fetchSummary, 30000);
        return () => clearInterval(interval);
    }, [autoRefresh, rangePreset, customDate]);

    // DEBUG: Capture unhandled rejections
    useEffect(() => {
        const handler = (event: PromiseRejectionEvent) => {
            console.error('[Dashboard Unhandled Rejection]', event.reason);
            // Optional: setError(String(event.reason));
        };
        window.addEventListener('unhandledrejection', handler);
        return () => window.removeEventListener('unhandledrejection', handler);
    }, []);

    // Helper for date display
    const getDateLabel = () => {
        if (rangePreset === '24h') return 'Last 24 Hours';
        if (rangePreset === '7d') return 'Last 7 Days';
        if (rangePreset === '30d') return 'Last 30 Days';
        return 'Custom Range';
    };

    if (loading && !data) {
        return (
            <div className="container mx-auto p-6 flex items-center justify-center h-screen">
                <div className="flex flex-col items-center gap-4">
                    <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-muted-foreground">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mx-auto p-6">
                <Card className="border-destructive">
                    <CardHeader>
                        <CardTitle className="text-destructive">Error Loading Dashboard</CardTitle>
                        <CardDescription>{error}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={fetchSummary}>Try Again</Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const successRate = funnelData?.funnel.overall_conversion || 0;

    return (
        <div className="container mx-auto p-6 space-y-8 bg-slate-50/50 min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-muted-foreground">Overview for <span className="font-semibold text-foreground">{getDateLabel()}</span></p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {/* Date Presets */}
                    <div className="flex items-center bg-white rounded-md border shadow-sm p-1">
                        <Button
                            variant={rangePreset === '24h' ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => setRangePreset('24h')}
                            className="text-xs"
                        >
                            24h
                        </Button>
                        <Button
                            variant={rangePreset === '7d' ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => setRangePreset('7d')}
                            className="text-xs"
                        >
                            7d
                        </Button>
                        <Button
                            variant={rangePreset === '30d' ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => setRangePreset('30d')}
                            className="text-xs"
                        >
                            30d
                        </Button>
                    </div>

                    {/* Auto Refresh Toggle */}
                    <Button
                        variant={autoRefresh ? 'secondary' : 'outline'}
                        size="sm"
                        onClick={() => setAutoRefresh(!autoRefresh)}
                    >
                        <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
                        {autoRefresh ? 'Live' : 'Paused'}
                    </Button>

                    <Button variant="secondary" size="sm" onClick={fetchSummary}>
                        Refresh
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
                        <Download className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {funnelData?.meta.total_sessions || 0}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Unique visits in range
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Errors</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-destructive">
                            {data?.total_errors}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Failed exports + worker errors
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Overall Conversion</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {successRate}%
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Session Loaded → Success
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-7">
                {/* Chart */}
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Events Overview</CardTitle>
                        <CardDescription>
                            {data?.meta.granularity === 'day' ? 'Daily' : 'Hourly'} activity volume
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data?.chart_data}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis
                                        dataKey="name"
                                        stroke="#888888"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        minTickGap={30}
                                        tickFormatter={(value) => {
                                            if (data?.meta.granularity === 'day') {
                                                // Format as "Dec 01" for daily view
                                                const date = new Date(value);
                                                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                            }
                                            return value; // Keep hourly format as is (e.g., "14:00")
                                        }}
                                    />
                                    <YAxis
                                        stroke="#888888"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(value) => `${value}`}
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'transparent' }}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    />
                                    <Bar dataKey="events" fill="#8884d8" radius={[4, 4, 0, 0]} className="fill-primary" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Funnel */}
                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Session Funnel</CardTitle>
                        <CardDescription>User journey by unique session</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6 py-4">
                            {funnelData?.funnel.steps.map((step: any, index: number) => (
                                <div key={step.id} className={`p-4 rounded-lg border flex flex-col gap-1 shadow-sm ${step.id === 'loaded' ? 'bg-slate-100 border-slate-200' :
                                    step.id === 'started' ? 'bg-blue-50 border-blue-100' :
                                        'bg-green-50 border-green-100'
                                    }`}>
                                    <div className="flex justify-between items-center">
                                        <span className={`font-medium ${step.id === 'loaded' ? 'text-slate-900' :
                                            step.id === 'started' ? 'text-blue-900' :
                                                'text-green-900'
                                            }`}>{step.label}</span>
                                        <span className={`font-bold ${step.id === 'loaded' ? 'text-slate-900' :
                                            step.id === 'started' ? 'text-blue-900' :
                                                'text-green-900'
                                            }`}>{step.count}</span>
                                    </div>
                                    {index > 0 && (
                                        <div className="flex justify-between text-xs mt-1">
                                            <span className="text-red-500 font-medium">
                                                {step.drop_off_count > 0 ? `${step.drop_off_count} dropped off` : ''}
                                            </span>
                                            <span className={`${step.id === 'started' ? 'text-blue-700' : 'text-green-700'
                                                }`}>
                                                {step.conversion_rate}% conversion
                                            </span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
