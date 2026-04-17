import axios from 'axios';

const api = axios.create({
    baseURL: 'https://localhost:7258/api', // Адрес вашего бэкенда
});

// Перехватчик для добавления JWT токена в каждый запрос
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;