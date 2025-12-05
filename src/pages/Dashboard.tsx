import { useEffect, useState } from 'react';
import { getSummary, getFunnel, getTimeseries, getErrors } from '../lib/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import dayjs from 'dayjs';

interface Summary {
    exports: number;
    started: number;
    errors: number;
    successRate: number;
    avgDuration: number;
}

interface FunnelStep {
    name: string;
    value: number;
    conversion: number;
}

interface ErrorEvent {
    id: string;
    event: string;
    payload: any;
    timestamp: string;
    session_id: string;
}

export default function Dashboard() {
    const [summary, setSummary] = useState<Summary | null>(null);
    const [funnel, setFunnel] = useState<FunnelStep[]>([]);
    const [timeseries, setTimeseries] = useState<any[]>([]);
    const [errors, setErrors] = useState<ErrorEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState(false);

    useEffect(() => {
        checkAuthAndLoadData();
    }, []);

    async function checkAuthAndLoadData() {
        try {
            setLoading(true);

            // Check authentication first
            const authResponse = await fetch('/api/auth-check', {
                headers: {
                    'Authorization': localStorage.getItem('dashboardAuth') || ''
                }
            });

            if (authResponse.status === 401) {
                // Prompt for credentials
                const username = prompt('Username:');
                const password = prompt('Password:');

                if (!username || !password) {
                    setAuthError(true);
                    setLoading(false);
                    return;
                }

                const authHeader = 'Basic ' + btoa(`${username}:${password}`);

                // Try auth again with credentials
                const retryAuth = await fetch('/api/auth-check', {
                    headers: { 'Authorization': authHeader }
                });

                if (retryAuth.status === 401) {
                    alert('Invalid credentials');
                    setAuthError(true);
                    setLoading(false);
                    return;
                }

                // Save credentials
                localStorage.setItem('dashboardAuth', authHeader);
            }

            // Load dashboard data
            await loadData();
        } catch (error) {
            console.error('Auth error:', error);
            setAuthError(true);
            setLoading(false);
        }
    }

    async function loadData() {
        try {
            // Last 30 days
            const to = dayjs().toISOString();
            const from = dayjs().subtract(30, 'days').toISOString();

            const [summaryRes, funnelRes, timeseriesRes, errorsRes] = await Promise.all([
                getSummary(from, to),
                getFunnel(from, to),
                getTimeseries(from, to),
                getErrors(),
            ]);

            setSummary(summaryRes.data);
            setFunnel(funnelRes.data.funnel.steps || []);
            setTimeseries(timeseriesRes.data.data || []);
            setErrors(errorsRes.data.errors || []);
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        } finally {
            setLoading(false);
        }
    }

    if (authError) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h2>
                    <p className="text-gray-600 mb-4">Invalid credentials</p>
                    <button
                        onClick={() => {
                            localStorage.removeItem('dashboardAuth');
                            setAuthError(false);
                            checkAuthAndLoadData();
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-xl">Loading dashboard...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-3xl font-bold mb-8">Analytics Dashboard</h1>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="text-sm text-gray-600 mb-1">Total Exports</div>
                        <div className="text-3xl font-bold text-green-600">{summary?.exports || 0}</div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="text-sm text-gray-600 mb-1">Export Started</div>
                        <div className="text-3xl font-bold text-blue-600">{summary?.started || 0}</div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="text-sm text-gray-600 mb-1">Errors</div>
                        <div className="text-3xl font-bold text-red-600">{summary?.errors || 0}</div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="text-sm text-gray-600 mb-1">Success Rate</div>
                        <div className="text-3xl font-bold text-purple-600">{summary?.successRate || 0}%</div>
                    </div>
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* Timeline Chart */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-xl font-semibold mb-4">Events Timeline (Last 30 Days)</h2>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={timeseries}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="bucket" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="cnt" fill="#3b82f6" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Funnel */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-xl font-semibold mb-4">Conversion Funnel</h2>
                        <div className="space-y-3">
                            {funnel.map((step, index) => (
                                <div key={step.name} className="relative">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm font-medium capitalize">
                                            {step.name.replace(/_/g, ' ')}
                                        </span>
                                        <span className="text-sm text-gray-600">
                                            {step.value} ({step.conversion}%)
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-8">
                                        <div
                                            className="bg-gradient-to-r from-blue-500 to-purple-600 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                                            style={{ width: `${step.conversion}%` }}
                                        >
                                            {step.conversion}%
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Avg Duration Card */}
                {summary?.avgDuration && summary.avgDuration > 0 && (
                    <div className="bg-white rounded-lg shadow p-6 mb-8">
                        <h2 className="text-xl font-semibold mb-2">Average Export Duration</h2>
                        <div className="text-4xl font-bold text-indigo-600">
                            {(summary.avgDuration / 1000).toFixed(1)}s
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                            {summary.avgDuration.toLocaleString()}ms average processing time
                        </div>
                    </div>
                )}

                {/* Top Errors Table */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-semibold mb-4">Recent Errors ({errors.length})</h2>
                    {errors.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">No errors found! 🎉</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Error</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Session</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {errors.map((error) => (
                                        <tr key={error.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                                {error.event}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600">
                                                {error.payload?.error || error.payload?.message || 'Unknown error'}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600">
                                                {dayjs(error.timestamp).format('MMM D, HH:mm:ss')}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600 font-mono text-xs">
                                                {error.session_id?.substring(0, 12)}...
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
