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

export const fetchWhaleAlerts = async () => {
    const response = await api.get('/whale-alerts');
    return response.data;
};
