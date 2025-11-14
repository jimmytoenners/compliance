import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  onboarding_completed: boolean;
  company_name?: string;
  company_size?: string;
  company_industry?: string;
  primary_regulations?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  login: (user, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ user, token, isAuthenticated: true });
  },
  logout: async () => {
    // Call logout API to clear cookie
    await fetch('/api/auth/logout', { method: 'POST' });
    
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null, token: null, isAuthenticated: false });
  },
  setUser: (user) => {
    localStorage.setItem('user', JSON.stringify(user));
    set({ user });
  },
}));

// Initialize auth state from localStorage on app start
if (typeof window !== 'undefined') {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  
  if (token && userStr) {
    try {
      const user = JSON.parse(userStr);
      useAuthStore.setState({
        user,
        token,
        isAuthenticated: true
      });
    } catch (error) {
      console.error('Failed to parse user from localStorage:', error);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  }
}
