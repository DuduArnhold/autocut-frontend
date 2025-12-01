import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw } from 'lucide-react';

interface AnalyticsEvent {
    event: string;
    payload: any;
    timestamp: string;
    sessionId: string;
    userAgent: string;
    receivedAt: string;
}

interface EventsResponse {
    events: AnalyticsEvent[];
    total: number;
    limit: number;
}

export default function Dashboard() {
    const [events, setEvents] = useState<AnalyticsEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [eventFilter, setEventFilter] = useState<string>('all');
    const [autoRefresh, setAutoRefresh] = useState(true);

    const fetchEvents = async () => {
        try {
            setLoading(true);
            const url = eventFilter === 'all'
                ? '/api/events?limit=100'
                : `/api/events?limit=100&eventType=${eventFilter}`;

            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to fetch events');

            const data: EventsResponse = await response.json();
            setEvents(data.events);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEvents();
    }, [eventFilter]);

    useEffect(() => {
        if (!autoRefresh) return;

        const interval = setInterval(fetchEvents, 5000);
        return () => clearInterval(interval);
    }, [autoRefresh, eventFilter]);

    const eventTypes = Array.from(new Set(events.map(e => e.event)));

    const formatTimestamp = (timestamp: string) => {
        return new Date(timestamp).toLocaleString('pt-BR');
    };

    const getEventBadgeColor = (event: string) => {
        if (event.includes('success')) return 'default';
        if (event.includes('failed') || event.includes('error')) return 'destructive';
        if (event.includes('started')) return 'secondary';
        return 'outline';
    };

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
                    <p className="text-muted-foreground">Monitor user events in real-time</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant={autoRefresh ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setAutoRefresh(!autoRefresh)}
                    >
                        <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
                        {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={fetchEvents}>
                        Refresh Now
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Event Filters</CardTitle>
                    <CardDescription>Filter events by type</CardDescription>
                </CardHeader>
                <CardContent>
                    <Select value={eventFilter} onValueChange={setEventFilter}>
                        <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Select event type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Events</SelectItem>
                            {eventTypes.map(type => (
                                <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Events ({events.length})</CardTitle>
                    <CardDescription>
                        {loading ? 'Loading...' : error ? `Error: ${error}` : 'Recent analytics events'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {events.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No events tracked yet. Start using the app to see events here.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Timestamp</TableHead>
                                        <TableHead>Event</TableHead>
                                        <TableHead>Session ID</TableHead>
                                        <TableHead>Payload</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {events.map((event, idx) => (
                                        <TableRow key={idx}>
                                            <TableCell className="font-mono text-xs">
                                                {formatTimestamp(event.timestamp)}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={getEventBadgeColor(event.event)}>
                                                    {event.event}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-mono text-xs">
                                                {event.sessionId.substring(0, 20)}...
                                            </TableCell>
                                            <TableCell>
                                                <pre className="text-xs max-w-md overflow-auto">
                                                    {JSON.stringify(event.payload, null, 2)}
                                                </pre>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
