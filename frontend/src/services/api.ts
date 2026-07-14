import axios from 'axios';

export type ApplicationStatus = 'Applied' | 'OA' | 'Assignment' | 'Interview' | 'HR Round' | 'Offer' | 'Rejected' | 'Withdrawn';
export type ApplicationPriority = 'High' | 'Medium' | 'Low';
export type ApplicationSource = 'LinkedIn' | 'Wellfound' | 'Company Careers' | 'Internshala' | 'Unstop' | 'Referral' | 'Other';
export type ApplicationMethod = 'Website' | 'LinkedIn Easy Apply' | 'Referral' | 'Email' | 'Recruiter' | 'Other';

export interface User {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  success: boolean;
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface Platform {
  _id: string;
  userId: string;
  name: string;
  website?: string;
  logo?: string;
  color?: string;
  description?: string;
  isDefault: boolean;
  applicationsCount?: number;
  savedJobsCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Application {
  _id: string;
  userId: string;
  company: string;
  role: string;
  platformId: any;
  jobUrl?: string;
  status: ApplicationStatus;
  appliedDate: string;
  followUpDate?: string;
  priority: ApplicationPriority;
  notes?: string;
  isPinned?: boolean;
  companyWebsite?: string;
  applicationMethod?: ApplicationMethod;
  recruiterName?: string;
  recruiterEmail?: string;
  recruiterLinkedIn?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationHistory {
  _id: string;
  applicationId: string;
  userId: string;
  status: string;
  note: string;
  createdAt: string;
}

export interface SavedJob {
  _id: string;
  userId: string;
  company: string;
  role: string;
  platformId: any;
  jobUrl?: string;
  notes?: string;
  savedDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  totalApplications: number;
  statusCounts: Record<ApplicationStatus, number>;
  recentApplications: Application[];
  followUpsDueToday: Application[];
  applicationsThisWeek: number;
  applicationsThisMonth: number;
  activeApplications: number;
  successRate: number;
  recentActivity: Array<{
    _id: string;
    applicationId: string;
    company: string;
    status: string;
    note: string;
    createdAt: string;
  }>;
  applicationsByPlatform: Array<{
    _id: string;
    name: string;
    color: string;
    count: number;
  }>;
}

export interface FilterParams {
  search?: string;
  status?: string;
  platformId?: string;
  priority?: string;
  sortBy?: 'newest' | 'oldest' | 'company';
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach JWT Access Token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle 401 Unauthorized / Token Expired
let isRefreshing = false;
let failedRequestsQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedRequestsQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedRequestsQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check if error is 401 and not already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      // If it's an auth request failing, do not retry
      if (
        originalRequest.url.includes('/auth/login') ||
        originalRequest.url.includes('/auth/register') ||
        originalRequest.url.includes('/auth/refresh')
      ) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedRequestsQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        isRefreshing = false;
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;

        localStorage.setItem('accessToken', newAccessToken);
        localStorage.setItem('refreshToken', newRefreshToken);

        apiClient.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        processQueue(null, newAccessToken);
        isRefreshing = false;

        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;

        // Clear local storage and redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export const api = {
  // --- AUTH ENDPOINTS ---
  register: async (data: Partial<User> & { password?: string }): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/register', data);
    return response.data;
  },

  login: async (data: { email?: string; password?: string }): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/login', data);
    return response.data;
  },

  logout: async (): Promise<void> => {
    const refreshToken = localStorage.getItem('refreshToken');
    try {
      await apiClient.post('/auth/logout', { refreshToken });
    } catch (e) {
      // ignore
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  },

  getCurrentUser: async (): Promise<{ success: boolean; user: User }> => {
    const response = await apiClient.get<{ success: boolean; user: User }>('/auth/me');
    return response.data;
  },

  // --- DASHBOARD ENDPOINTS ---
  getDashboard: async (): Promise<DashboardStats> => {
    const response = await apiClient.get<{ success: boolean; data: DashboardStats }>('/dashboard');
    return response.data.data;
  },

  // --- APPLICATION ENDPOINTS ---
  getApplications: async (params?: FilterParams): Promise<Application[]> => {
    const response = await apiClient.get<{ success: boolean; count: number; data: Application[] }>('/applications', {
      params,
    });
    return response.data.data;
  },

  getApplication: async (id: string): Promise<Application> => {
    const response = await apiClient.get<{ success: boolean; data: Application }>(`/applications/${id}`);
    return response.data.data;
  },

  createApplication: async (data: Partial<Application>): Promise<Application> => {
    const response = await apiClient.post<{ success: boolean; data: Application }>('/applications', data);
    return response.data.data;
  },

  updateApplication: async (id: string, data: Partial<Application>): Promise<Application> => {
    const response = await apiClient.put<{ success: boolean; data: Application }>(`/applications/${id}`, data);
    return response.data.data;
  },

  deleteApplication: async (id: string): Promise<void> => {
    await apiClient.delete<{ success: boolean; message: string }>(`/applications/${id}`);
  },

  updateStatus: async (id: string, status: ApplicationStatus): Promise<Application> => {
    const response = await apiClient.patch<{ success: boolean; data: Application }>(`/applications/${id}/status`, {
      status,
    });
    return response.data.data;
  },

  getHistory: async (id: string): Promise<ApplicationHistory[]> => {
    const response = await apiClient.get<{ success: boolean; count: number; data: ApplicationHistory[] }>(
      `/applications/${id}/history`
    );
    return response.data.data;
  },

  duplicateApplication: async (id: string): Promise<Application> => {
    const response = await apiClient.post<{ success: boolean; data: Application }>(`/applications/${id}/duplicate`);
    return response.data.data;
  },

  importApplicationsBatch: async (applications: Partial<Application>[]): Promise<Application[]> => {
    const response = await apiClient.post<{ success: boolean; count: number; data: Application[] }>(
      '/applications/import-batch',
      { applications }
    );
    return response.data.data;
  },

  // --- SAVED JOBS ENDPOINTS ---
  getSavedJobs: async (): Promise<SavedJob[]> => {
    const response = await apiClient.get<{ success: boolean; count: number; data: SavedJob[] }>('/saved-jobs');
    return response.data.data;
  },

  createSavedJob: async (data: Partial<SavedJob>): Promise<SavedJob> => {
    const response = await apiClient.post<{ success: boolean; data: SavedJob }>('/saved-jobs', data);
    return response.data.data;
  },

  deleteSavedJob: async (id: string): Promise<void> => {
    await apiClient.delete<{ success: boolean; message: string }>(`/saved-jobs/${id}`);
  },

  applySavedJob: async (id: string): Promise<Application> => {
    const response = await apiClient.post<{ success: boolean; data: Application }>(`/saved-jobs/${id}/apply`);
    return response.data.data;
  },

  // --- PLATFORMS ENDPOINTS ---
  getPlatforms: async (): Promise<Platform[]> => {
    const response = await apiClient.get<Platform[]>('/platforms');
    return response.data;
  },

  getPlatformStats: async (): Promise<Platform[]> => {
    const response = await apiClient.get<Platform[]>('/platforms/stats');
    return response.data;
  },

  createPlatform: async (data: Partial<Platform>): Promise<Platform> => {
    const response = await apiClient.post<Platform>('/platforms', data);
    return response.data;
  },

  updatePlatform: async (id: string, data: Partial<Platform>): Promise<Platform> => {
    const response = await apiClient.put<Platform>(`/platforms/${id}`, data);
    return response.data;
  },

  deletePlatform: async (id: string, moveTo?: string): Promise<void> => {
    await apiClient.delete(`/platforms/${id}`, {
      params: { moveTo }
    });
  },

  setDefaultPlatform: async (id: string): Promise<Platform> => {
    const response = await apiClient.patch<Platform>(`/platforms/${id}/default`);
    return response.data;
  },
};

export default apiClient;
