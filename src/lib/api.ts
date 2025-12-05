import axios from 'axios';

export const api = axios.create({ baseURL: '/api' });

export const getSummary = (from?: string, to?: string) =>
    api.get('/events/summary', { params: { from, to } });

export const getFunnel = (from?: string, to?: string) =>
    api.get('/events/funnel', { params: { from, to } });

export const getTimeseries = (from?: string, to?: string) =>
    api.get('/events/timeseries', { params: { from, to } });

export const getErrors = () =>
    api.get('/events/errors');
