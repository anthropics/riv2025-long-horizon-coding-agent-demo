import { useState, useCallback, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Search,
  Plus,
  ChevronDown,
  Leaf,
  Settings,
  Moon,
  Sun,
  LogOut,
  User,
  Bell,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { db } from '@/lib/db';
import { useApp } from '@/context/AppContext';
import { CreateIssueModal } from '@/components/modals/CreateIssueModal';
import { GlobalSearchModal } from '@/components/modals/GlobalSearchModal';
import type { Project } from '@/types';

export function Header() {
  const { currentUser, currentProject, setCurrentProject, theme, setTheme } = useApp();
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);

  // Live query for all projects
  const projects = useLiveQuery(
    () => db.projects.filter((p) => !p.isArchived).toArray(),
    []
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Cmd+K for search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearchModal(true);
      }

      // C for create issue
      if (e.key === 'c' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setShowCreateModal(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleProjectSelect = useCallback(
    (project: Project) => {
      setCurrentProject(project);
      navigate(`/project/${project.key}/board`);
    },
    [setCurrentProject, navigate]
  );

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      <header className="h-14 bg-primary text-primary-foreground flex items-center px-4 gap-4 sticky top-0 z-50 shadow-md">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 font-semibold text-lg" style={{ fontFamily: 'var(--font-display)' }}>
          <Leaf className="w-6 h-6 text-accent" />
          <span>Canopy</span>
        </Link>

        {/* Spacer to push menu items to the right */}
        <div className="flex-1" />

        {/* Global Search - moved to the right */}
        <div className="w-72">
          <button
            onClick={() => setShowSearchModal(true)}
            className="w-full flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-md transition-colors text-sm text-white/80"
          >
            <Search className="w-4 h-4" />
            <span className="flex-1 text-left">Search...</span>
            <kbd className="text-xs bg-white/10 px-1.5 py-0.5 rounded">
              {navigator.platform.includes('Mac') ? '⌘K' : 'Ctrl+K'}
            </kbd>
          </button>
        </div>

        {/* Project Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="text-white hover:bg-white/10 gap-2"
            >
              {currentProject ? (
                <>
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: currentProject.color }}
                  />
                  <span>{currentProject.name}</span>
                </>
              ) : (
                <span>Select Project</span>
              )}
              <ChevronDown className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="w-64">
            <div className="p-2">
              <Input
                placeholder="Search projects..."
                className="h-8 text-sm"
              />
            </div>
            <DropdownMenuSeparator />
            {projects?.length === 0 ? (
              <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                No projects yet
              </div>
            ) : (
              projects?.map((project) => (
                <DropdownMenuItem
                  key={project.id}
                  onClick={() => handleProjectSelect(project)}
                  className="gap-2"
                >
                  <span
                    className="w-4 h-4 rounded flex items-center justify-center text-xs"
                    style={{ backgroundColor: project.color, color: 'white' }}
                  >
                    {project.icon || project.key[0]}
                  </span>
                  <span className="flex-1">{project.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {project.key}
                  </span>
                </DropdownMenuItem>
              ))
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/projects')}>
              View all projects
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/projects/new')}>
              <Plus className="w-4 h-4 mr-2" />
              Create new project
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Create Button */}
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2"
        >
          <Plus className="w-4 h-4" />
          Create
        </Button>

        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/10"
        >
          <Bell className="w-5 h-5" />
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full p-0 hover:bg-transparent"
            >
              <Avatar className="w-8 h-8 border-2 border-white/20">
                <AvatarFallback
                  style={{ backgroundColor: currentUser?.color }}
                  className="text-white text-xs font-medium"
                >
                  {currentUser?.name ? getInitials(currentUser.name) : 'U'}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{currentUser?.name}</p>
              <p className="text-xs text-muted-foreground">{currentUser?.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              <User className="w-4 h-4 mr-2" />
              Profile Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
              {theme === 'dark' ? (
                <>
                  <Sun className="w-4 h-4 mr-2" />
                  Light Mode
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 mr-2" />
                  Dark Mode
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Modals */}
      <CreateIssueModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
      />
      <GlobalSearchModal
        open={showSearchModal}
        onOpenChange={setShowSearchModal}
      />
    </>
  );
}
