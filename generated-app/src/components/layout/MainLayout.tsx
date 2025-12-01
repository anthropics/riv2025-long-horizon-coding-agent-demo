import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { useApp } from '@/context/AppContext';
import { Toaster } from '@/components/ui/sonner';

export function MainLayout() {
  const { isLoading } = useApp();

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading Canopy...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto bg-background">
          <div className="p-6 max-w-[1400px] mx-auto animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
      <Toaster position="top-right" />
    </div>
  );
}
