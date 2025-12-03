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

            const response = await fetch(`/api/analytics/summary?${params.toString()}`);
            if (!response.ok) throw new Error('Failed to fetch analytics summary');

            const summary: AnalyticsSummary = await response.json();
            setData(summary);
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

    const successRate = data?.funnel.started_export
        ? Math.round((data.funnel.success / data.funnel.started_export) * 100)
        : 0;

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

                    <Button variant="outline" size="sm" onClick={fetchSummary}>
                        Refresh
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Exports</CardTitle>
                        <Download className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {data?.last_24h.exports}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Completed in selected range
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
                        <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {successRate}%
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Start Export → Success conversion
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
                                        interval={data?.meta.granularity === 'hour' ? 3 : 0}
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
                        <CardTitle>Conversion Funnel</CardTitle>
                        <CardDescription>User journey in selected range</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6 py-4">
                            {/* Step 1: Loaded */}
                            <div className="relative">
                                <div className="bg-slate-100 p-4 rounded-lg border border-slate-200 flex justify-between items-center z-10 relative">
                                    <span className="font-medium">App Loaded</span>
                                    <span className="font-bold">{data?.funnel.loaded}</span>
                                </div>
                                <div className="absolute left-1/2 -bottom-4 w-0.5 h-4 bg-slate-300 -translate-x-1/2"></div>
                            </div>

                            {/* Step 2: Started Export */}
                            <div className="relative">
                                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex justify-between items-center z-10 relative">
                                    <span className="font-medium text-blue-900">Started Export</span>
                                    <span className="font-bold text-blue-900">{data?.funnel.started_export}</span>
                                </div>
                                <div className="absolute left-1/2 -bottom-4 w-0.5 h-4 bg-slate-300 -translate-x-1/2"></div>
                                {/* Conversion Rate Badge */}
                                <div className="absolute right-0 -top-3 translate-x-2 bg-slate-800 text-white text-[10px] px-2 py-0.5 rounded-full">
                                    {data?.funnel.loaded ? Math.round((data.funnel.started_export / data.funnel.loaded) * 100) : 0}%
                                </div>
                            </div>

                            {/* Step 3: Success */}
                            <div className="relative">
                                <div className="bg-green-50 p-4 rounded-lg border border-green-100 flex justify-between items-center z-10 relative shadow-sm">
                                    <span className="font-medium text-green-900">Export Success</span>
                                    <span className="font-bold text-green-900">{data?.funnel.success}</span>
                                </div>
                                {/* Conversion Rate Badge */}
                                <div className="absolute right-0 -top-3 translate-x-2 bg-slate-800 text-white text-[10px] px-2 py-0.5 rounded-full">
                                    {data?.funnel.started_export ? Math.round((data.funnel.success / data.funnel.started_export) * 100) : 0}%
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
