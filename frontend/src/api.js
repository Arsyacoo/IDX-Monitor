import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
});

export const fetchStocks = async ({ page = 1, limit = 10, search = '' }) => {
    const params = { page, limit };
    if (search) params.search = search;
    const response = await api.get('/stocks', { params });
    return response.data;
};

export const fetchStockHistory = async (ticker, period = '1mo') => {
    const response = await api.get(`/stock/${ticker}`, { params: { period } });
    return response.data;
};

export const refreshStockHistory = async (ticker, period = '1mo') => {
    const response = await api.post(`/stock/${ticker}/refresh`, null, { params: { period } });
    return response.data;
};

export const fetchWhaleAlerts = async () => {
    const response = await api.get('/whale-alerts');
    return response.data;
};

export const fetchMarketSummary = async () => {
    const response = await api.get('/market-summary');
    return response.data;
};

export const fetchHealth = async () => {
    const response = await api.get('/health');
    return response.data;
};

export const fetchProviderDiagnostics = async () => {
    const response = await api.get('/status/providers');
    return response.data;
};

export const fetchNews = async () => {
    const response = await api.get('/news');
    return response.data;
};

export const fetchScannerResults = async (criteria) => {
    const response = await api.get('/scanner', { params: { criteria } });
    return response.data;
};


