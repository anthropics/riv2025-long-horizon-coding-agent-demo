import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, initializeDefaultUser, getCurrentUser, setCurrentUser as dbSetCurrentUser } from '@/lib/db';
import type { User, Project, ThemeMode, ColorTheme } from '@/types';

interface AppState {
  currentUser: User | null;
  currentProject: Project | null;
  sidebarCollapsed: boolean;
  theme: ThemeMode;
  colorTheme: ColorTheme;
  isLoading: boolean;
}

interface AppContextValue extends AppState {
  setCurrentProject: (project: Project | null) => void;
  setCurrentUser: (user: User) => Promise<void>;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setTheme: (theme: ThemeMode) => Promise<void>;
  setColorTheme: (colorTheme: ColorTheme) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUserState] = useState<User | null>(null);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [sidebarCollapsed, setSidebarCollapsedState] = useState(false);
  const [theme, setThemeState] = useState<ThemeMode>('light');
  const [colorTheme, setColorThemeState] = useState<ColorTheme>('ruby');
  const [isLoading, setIsLoading] = useState(true);

  // Live query to keep user updated
  const liveUser = useLiveQuery(async () => {
    return await getCurrentUser();
  }, []);

  // Initialize user on mount
  useEffect(() => {
    async function init() {
      try {
        const user = await initializeDefaultUser();
        setCurrentUserState(user);
        setSidebarCollapsedState(user.settings?.sidebarCollapsed ?? false);
        setThemeState(user.settings?.theme ?? 'light');
        setColorThemeState(user.settings?.colorTheme ?? 'ruby');

        // Load default project if set
        if (user.settings?.defaultProjectId) {
          const project = await db.projects.get(user.settings.defaultProjectId);
          if (project && !project.isArchived) {
            setCurrentProject(project);
          }
        }
      } catch (err) {
        console.error('Failed to initialize user:', err);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  // Sync with live user changes
  useEffect(() => {
    if (liveUser) {
      setCurrentUserState(liveUser);
      setThemeState(liveUser.settings?.theme ?? 'light');
      setColorThemeState(liveUser.settings?.colorTheme ?? 'ruby');
      setSidebarCollapsedState(liveUser.settings?.sidebarCollapsed ?? false);
    }
  }, [liveUser]);

  // Apply theme and color theme to document
  useEffect(() => {
    const root = document.documentElement;

    // Remove old light/dark mode classes
    root.classList.remove('light', 'dark');

    // Apply light/dark mode
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.add(prefersDark ? 'dark' : 'light');
    } else {
      root.classList.add(theme);
    }

    // Remove old color theme classes
    const colorThemeClasses = ['theme-ruby', 'theme-ocean', 'theme-forest', 'theme-sunset', 'theme-lavender', 'theme-cyberpunk', 'theme-retro'];
    colorThemeClasses.forEach(cls => root.classList.remove(cls));

    // Apply color theme (ruby is the default, which doesn't need a class)
    if (colorTheme && colorTheme !== 'ruby') {
      root.classList.add(`theme-${colorTheme}`);
    }
  }, [theme, colorTheme]);

  const setCurrentUser = useCallback(async (user: User) => {
    await dbSetCurrentUser(user.id);
    setCurrentUserState(user);
  }, []);

  const refreshUser = useCallback(async () => {
    const user = await getCurrentUser();
    if (user) setCurrentUserState(user);
  }, []);

  const setSidebarCollapsed = useCallback((collapsed: boolean) => {
    setSidebarCollapsedState(collapsed);
    if (currentUser) {
      db.users.update(currentUser.id, {
        settings: { ...currentUser.settings, sidebarCollapsed: collapsed },
      });
    }
  }, [currentUser]);

  const setTheme = useCallback(async (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    if (currentUser) {
      await db.users.update(currentUser.id, {
        settings: { ...currentUser.settings, theme: newTheme },
      });
    }
  }, [currentUser]);

  const setColorTheme = useCallback(async (newColorTheme: ColorTheme) => {
    setColorThemeState(newColorTheme);
    if (currentUser) {
      await db.users.update(currentUser.id, {
        settings: { ...currentUser.settings, colorTheme: newColorTheme },
      });
    }
  }, [currentUser]);

  const value: AppContextValue = {
    currentUser,
    currentProject,
    sidebarCollapsed,
    theme,
    colorTheme,
    isLoading,
    setCurrentProject,
    setCurrentUser,
    setSidebarCollapsed,
    setTheme,
    setColorTheme,
    refreshUser,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
