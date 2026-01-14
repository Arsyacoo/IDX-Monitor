import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:8000/api',
});

export const fetchStocks = async ({ page = 1, limit = 10, search = '' }) => {
    const params = { page, limit };
    if (search) params.search = search;
    const response = await api.get('/stocks', { params });
    return response.data;
};

export const fetchStockHistory = async (ticker) => {
    const response = await api.get(`/stock/${ticker}`);
    return response.data;
};

export const fetchWhaleAlerts = async () => {
    const response = await api.get('/whale-alerts');
    return response.data;
};
