import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface User {
  id: string;
  email: string;
  roles: string[];
  firstName?: string;
  lastName?: string;
  name?: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  accessToken: string | null;
  isRestoring: boolean;
  setAuth: (user: User, token: string) => void;
  setAccessToken: (token: string | null) => void;
  updateUser: (userFields: Partial<User>) => void;
  clearAuth: () => void;
  setRestoring: (status: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,
      accessToken: null,
      isRestoring: true, // Starts as true on initial load
      setAuth: (user, token) => set({ isAuthenticated: true, user, accessToken: token }),
      setAccessToken: (token) => set({ accessToken: token }),
      updateUser: (userFields) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...userFields } : null,
        })),
      clearAuth: () => set({ isAuthenticated: false, user: null, accessToken: null }),
      setRestoring: (status) => set({ isRestoring: status }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        accessToken: state.accessToken,
      }), // Don't persist isRestoring
      onRehydrateStorage: () => (state) => {
        // This runs after the store has been hydrated from localStorage
        if (state) {
          state.setRestoring(false);
        }
      },
    }
  )
);

// Backward compatibility exports for the interceptors before they are updated
export const getAccessToken = () => useAuthStore.getState().accessToken;
export const setAccessToken = (token: string | null) =>
  useAuthStore.getState().setAccessToken(token);
