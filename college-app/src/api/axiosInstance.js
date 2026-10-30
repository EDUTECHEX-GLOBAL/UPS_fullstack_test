// src/api/axiosInstance.js
import axios from 'axios';
import API_BASE_URL from '../config/api';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

const isDev = process.env.NODE_ENV === 'development';
const isFormDataPayload = (value) => typeof FormData !== 'undefined' && value instanceof FormData;
const devLog = (...args) => { if (isDev) console.log(...args); };
const devWarn = (...args) => { if (isDev) console.warn(...args); };
const devErr = (...args) => { if (isDev) console.error(...args); };

const EXPECTED_404_PATTERNS = [
  '/eqhe',
  '/scores',
  '/personal',
  '/address',
  '/specialneeds',
  '/firsteducation',
  '/documents',
  '/language',
  '/application/preview',
];

const isExpected404 = (url, status, method) => {
  if (status !== 404) return false;
  if (method === 'GET' && url?.includes('/api/helpdesk/')) return true;
  return EXPECTED_404_PATTERNS.some(p => url?.includes(p));
};

const getSessionKey = () => sessionStorage.getItem('sessionKey');

export const getActiveToken = () => {
  const key = getSessionKey();

  if (key) {
    return (
      localStorage.getItem(`token_${key}`) ||
      localStorage.getItem('token') ||
      null
    );
  }

  return localStorage.getItem('token') || null;
};

export const clearAllUserData = () => {
  const key = getSessionKey();

  const fields = [
    'token',
    'userData',
    'studentType',
    'userEmail',
    'profileCompleted',
    'userProfile',
    'testingActiveSections',
    'gusApplicationData',
    'masterApplicationData',
    'selectedCourseForApplication',
    'currentSelectedCourse',
    'selectedMasterCourseForApplication',
    'masterCourseConfirmed',
  ];

  if (key) {
    fields.forEach(field => localStorage.removeItem(`${field}_${key}`));
  }

  fields.forEach(field => localStorage.removeItem(field));
  sessionStorage.removeItem('sessionKey');
};

axiosInstance.interceptors.request.use(
  (config) => {
    const token = getActiveToken();

    devLog(`🔍 [${config.method?.toUpperCase()}] ${config.url}`);

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      devLog('   ✅ Token attached');
    } else {
      devWarn('   ⚠️ No token — request may fail auth');
    }

    if (isFormDataPayload(config.data)) {
      if (typeof config.headers?.delete === 'function') {
        config.headers.delete('Content-Type');
        config.headers.delete('content-type');
      } else {
        delete config.headers['Content-Type'];
        delete config.headers['content-type'];
      }
      devLog('   FormData payload detected; browser will set multipart boundary');
    }
    if (['put', 'post', 'patch'].includes(config.method)) {
      devLog('   📦 Body:', config.data);
    }

    return config;
  },
  (error) => {
    devErr('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

axiosInstance.interceptors.response.use(
  (response) => {
    devLog(`✅ [${response.status}] ${response.config.url}`);
    return response;
  },
  (error) => {
    const url = error.config?.url;
    const method = error.config?.method?.toUpperCase();
    const status = error.response?.status;
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      '';

    const isCanceled =
      error.code === 'ERR_CANCELED' ||
      error.name === 'CanceledError' ||
      error.name === 'AbortError' ||
      axios.isCancel?.(error);

    if (isCanceled) {
      devLog(`Request canceled: ${method || 'GET'} ${url || ''}`);
      return Promise.reject(error);
    }

    if (isExpected404(url, status, method)) {
      devLog(`ℹ️ [404] No data yet for ${url}`);
      return Promise.reject(error);
    }

    devErr(`❌ [${status ?? 'NET'}] ${method} ${url}`);
    devErr(`   💬 ${message}`);
    devErr(`   📦`, error.response?.data);

    const isAuthEndpoint = [
      '/login',
      '/register',
      '/signin',
      '/signup',
      '/impersonate-from-signin',
    ].some(p => url?.includes(p));

    if (isAuthEndpoint) {
      return Promise.reject(error);
    }

    if (status === 401) {
      devErr('🔑 401 auth error — clearing session');

      clearAllUserData();

      const currentPath = window.location.pathname;
      const alreadyOnAuthPage =
        currentPath.includes('/sign-in') ||
        currentPath.includes('/signin') ||
        currentPath.includes('/login');

      if (!alreadyOnAuthPage) {
        window.location.href = '/sign-in?session=expired';
      }
    }

    if (status === 500) {
      devErr('💡 500 — check backend server logs');
    }

    if (error.code === 'ECONNABORTED') {
      devErr('⏱️ Request timed out — backend may be slow/down');
    }

    if (error.message === 'Network Error') {
      devErr('🌐 Network error — cannot reach:', axiosInstance.defaults.baseURL);
    }

    return Promise.reject(error);
  }
);

devLog('🌐 Axios ready →', axiosInstance.defaults.baseURL);

export default axiosInstance;
