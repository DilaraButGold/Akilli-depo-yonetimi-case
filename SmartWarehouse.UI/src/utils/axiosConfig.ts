import axios from 'axios';

const axiosInstance = axios.create({
    baseURL: 'http://localhost:5041/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// İstek öncesi token ekleme
axiosInstance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Yanıt sonrası işlemler
axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        // 401 Unauthorized -> oturum sonlandır
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            if (!window.location.pathname.includes('/login')) {
                window.location.href = '/';
            }
        }

        // Backend'den dönen hata mesajını standartlaştır
        const errorMessage =
            error.response?.data?.Message ||
            error.response?.data?.message ||
            error.response?.data?.error ||
            error.message ||
            'Bir hata oluştu';

        // Geliştirme ortamında konsola yazdır
        if (import.meta.env.DEV) {
            console.error('API Hatası:', {
                status: error.response?.status,
                url: error.config?.url,
                message: errorMessage,
            });
        }

        error.userMessage = errorMessage;
        return Promise.reject(error);
    }
);

export default axiosInstance;