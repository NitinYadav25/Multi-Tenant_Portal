import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';

export const apiClient = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Response interceptor for consistent error extraction and handling 401
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    // If unauthorized, notify subscriber or redirect
    if (error.response && error.response.status === 401) {
      if (
        !window.location.pathname.startsWith('/login') &&
        !window.location.pathname.startsWith('/register')
      ) {
        window.dispatchEvent(new CustomEvent('auth:unauthorized'));
      }
    }

    const errorMsg =
      error.response?.data?.error?.message ||
      error.message ||
      'An unexpected error occurred';

    const customError = new Error(errorMsg);
    customError.status = error.response?.status;
    customError.code = error.response?.data?.error?.code;
    customError.details = error.response?.data?.error?.details;

    return Promise.reject(customError);
  }
);

/* Auth API */
export const authApi = {
  register: (data) => apiClient.post('/auth/register', data),
  login: (data) => apiClient.post('/auth/login', data),
  logout: () => apiClient.post('/auth/logout'),
  getMe: () => apiClient.get('/auth/me')
};

/* Organizations API */
export const orgsApi = {
  list: () => apiClient.get('/organizations'),
  create: (data) => apiClient.post('/organizations', data),
  get: (orgId) => apiClient.get(`/organizations/${orgId}`),
  delete: (orgId) => apiClient.delete(`/organizations/${orgId}`),
  getStats: (orgId) => apiClient.get(`/organizations/${orgId}/stats`)
};

/* Members API */
export const membersApi = {
  list: (orgId) => apiClient.get(`/organizations/${orgId}/members`),
  add: (orgId, data) => apiClient.post(`/organizations/${orgId}/members`, data),
  updateRole: (orgId, userId, data) => apiClient.patch(`/organizations/${orgId}/members/${userId}`, data),
  remove: (orgId, userId) => apiClient.delete(`/organizations/${orgId}/members/${userId}`)
};

/* Projects API */
export const projectsApi = {
  list: (orgId, params) => apiClient.get(`/organizations/${orgId}/projects`, { params }),
  create: (orgId, data) => apiClient.post(`/organizations/${orgId}/projects`, data),
  get: (projectId) => apiClient.get(`/projects/${projectId}`),
  update: (projectId, data) => apiClient.patch(`/projects/${projectId}`, data),
  delete: (projectId) => apiClient.delete(`/projects/${projectId}`)
};

/* Tasks API */
export const tasksApi = {
  list: (projectId, params) => apiClient.get(`/projects/${projectId}/tasks`, { params }),
  create: (projectId, data) => apiClient.post(`/projects/${projectId}/tasks`, data),
  update: (taskId, data) => apiClient.patch(`/tasks/${taskId}`, data),
  delete: (taskId) => apiClient.delete(`/tasks/${taskId}`)
};
