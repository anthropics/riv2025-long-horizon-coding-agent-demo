import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { AppProvider } from '@/context/AppContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { HomePage } from '@/pages/HomePage';
import { ProjectsPage } from '@/pages/ProjectsPage';
import { NewProjectPage } from '@/pages/NewProjectPage';
import { BoardPage } from '@/pages/BoardPage';
import { BacklogPage } from '@/pages/BacklogPage';
import { RoadmapPage } from '@/pages/RoadmapPage';
import { EpicsPage } from '@/pages/EpicsPage';
import { CalendarPage } from '@/pages/CalendarPage';
import { SprintsPage } from '@/pages/SprintsPage';
import { ProjectSettingsPage } from '@/pages/ProjectSettingsPage';
import { LabelsPage } from '@/pages/LabelsPage';
import { ComponentsPage } from '@/pages/ComponentsPage';
import { BurndownPage } from '@/pages/BurndownPage';
import { VelocityPage } from '@/pages/VelocityPage';
import { SprintReportPage } from '@/pages/SprintReportPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { AboutPage } from '@/pages/AboutPage';
import { WorkflowsPage } from '@/pages/WorkflowsPage';
import { TeamPage } from '@/pages/TeamPage';
import { AdminDashboardPage } from '@/pages/AdminDashboardPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { AuthPage } from '@/pages/AuthPage';

// Protected Route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, requiresAuth } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If auth is required but user is not authenticated, redirect to login
  if (requiresAuth && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Auth Route wrapper (redirects to home if already authenticated)
function AuthRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, requiresAuth } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If already authenticated, redirect to home
  if (requiresAuth && isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Auth Route */}
      <Route
        path="/login"
        element={
          <AuthRoute>
            <AuthPage />
          </AuthRoute>
        }
      />

      {/* Protected Routes */}
      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        {/* Home */}
        <Route path="/" element={<HomePage />} />

        {/* Projects */}
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/new" element={<NewProjectPage />} />

        {/* Project views */}
        <Route path="/project/:projectKey/board" element={<BoardPage />} />
        <Route path="/project/:projectKey/backlog" element={<BacklogPage />} />
        <Route path="/project/:projectKey/roadmap" element={<RoadmapPage />} />
        <Route path="/project/:projectKey/epics" element={<EpicsPage />} />
        <Route path="/project/:projectKey/calendar" element={<CalendarPage />} />
        <Route path="/project/:projectKey/sprints" element={<SprintsPage />} />
        <Route path="/project/:projectKey/settings" element={<ProjectSettingsPage />} />
        <Route path="/project/:projectKey/labels" element={<LabelsPage />} />
        <Route path="/project/:projectKey/components" element={<ComponentsPage />} />
        <Route path="/project/:projectKey/team" element={<TeamPage />} />

        {/* Reports */}
        <Route path="/project/:projectKey/reports/burndown" element={<BurndownPage />} />
        <Route path="/project/:projectKey/reports/velocity" element={<VelocityPage />} />
        <Route path="/project/:projectKey/reports/sprint" element={<SprintReportPage />} />

        {/* Settings */}
        <Route path="/settings" element={<SettingsPage />} />

        {/* Workflows */}
        <Route path="/workflows" element={<WorkflowsPage />} />

        {/* About */}
        <Route path="/about" element={<AboutPage />} />

        {/* Admin */}
        <Route path="/admin/dashboard" element={<AdminDashboardPage />} />

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppProvider>
          <AppRoutes />
        </AppProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
