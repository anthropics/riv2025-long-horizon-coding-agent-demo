import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  signUp as dbSignUp,
  signIn as dbSignIn,
  signOut as dbSignOut,
  getCurrentAuthUser,
  hasAuthUsers,
  updateAuthUserSettings,
  db
} from '@/lib/db';
import type { AuthUser } from '@/types';

interface AuthState {
  authUser: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  requiresAuth: boolean;
}

interface AuthContextValue extends AuthState {
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateSettings: (settings: Partial<AuthUser['settings']>) => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [requiresAuth, setRequiresAuth] = useState(false);

  // Check if user is authenticated on mount
  useEffect(() => {
    async function checkAuth() {
      try {
        // First check if any auth users exist
        const hasUsers = await hasAuthUsers();
        setRequiresAuth(hasUsers);

        if (hasUsers) {
          // Try to get current auth user from session
          const user = await getCurrentAuthUser();
          setAuthUser(user);
        }
      } catch (err) {
        console.error('Failed to check auth:', err);
      } finally {
        setIsLoading(false);
      }
    }
    checkAuth();
  }, []);

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    setIsLoading(true);
    try {
      const { user } = await dbSignUp(email, password, name);
      setAuthUser(user);
      setRequiresAuth(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { user } = await dbSignIn(email, password);
      setAuthUser(user);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setIsLoading(true);
    try {
      const tokenSetting = await db.settings.get('currentSessionToken');
      await dbSignOut(tokenSetting?.value as string | undefined);
      setAuthUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateSettings = useCallback(async (settings: Partial<AuthUser['settings']>) => {
    if (authUser) {
      await updateAuthUserSettings(authUser.id, settings);
      setAuthUser({ ...authUser, settings: { ...authUser.settings, ...settings } });
    }
  }, [authUser]);

  const refreshAuth = useCallback(async () => {
    try {
      const user = await getCurrentAuthUser();
      setAuthUser(user);
    } catch (err) {
      console.error('Failed to refresh auth:', err);
    }
  }, []);

  const value: AuthContextValue = {
    authUser,
    isAuthenticated: !!authUser,
    isLoading,
    requiresAuth,
    signUp,
    signIn,
    signOut,
    updateSettings,
    refreshAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
