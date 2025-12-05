import { useCallback, useEffect, useMemo } from 'react';
import { NavLink, useParams, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Kanban,
  ListTodo,
  Calendar,
  CalendarDays,
  BarChart3,
  TrendingUp,
  FileText,
  Settings,
  Tag,
  Layers,
  FolderKanban,
  PanelLeftClose,
  PanelLeft,
  Plus,
  Info,
  GitBranch,
  Zap,
  Users,
  Database,
  Smile,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useApp } from '@/context/AppContext';

interface NavItem {
  label: string;
  icon: React.ElementType;
  to: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export function Sidebar() {
  const { currentProject, sidebarCollapsed, setSidebarCollapsed, translations: t } = useApp();
  const { projectKey } = useParams();
  const navigate = useNavigate();

  const projectSections: NavSection[] = useMemo(() => currentProject
    ? [
        {
          title: t.planning,
          items: [
            { label: t.roadmap, icon: Calendar, to: `/project/${currentProject.key}/roadmap` },
            { label: t.epics, icon: Zap, to: `/project/${currentProject.key}/epics` },
            { label: t.calendar, icon: CalendarDays, to: `/project/${currentProject.key}/calendar` },
            { label: t.backlog, icon: ListTodo, to: `/project/${currentProject.key}/backlog` },
            { label: t.activeSprints, icon: TrendingUp, to: `/project/${currentProject.key}/sprints` },
          ],
        },
        {
          title: t.board,
          items: [
            { label: t.board, icon: Kanban, to: `/project/${currentProject.key}/board` },
          ],
        },
        {
          title: t.reports,
          items: [
            { label: t.burndownChart, icon: BarChart3, to: `/project/${currentProject.key}/reports/burndown` },
            { label: t.velocityChart, icon: TrendingUp, to: `/project/${currentProject.key}/reports/velocity` },
            { label: t.sprintReport, icon: FileText, to: `/project/${currentProject.key}/reports/sprint` },
          ],
        },
        {
          title: t.project,
          items: [
            { label: t.team || 'Team', icon: Users, to: `/project/${currentProject.key}/team` },
            { label: t.projectSettings, icon: Settings, to: `/project/${currentProject.key}/settings` },
            { label: t.components, icon: Layers, to: `/project/${currentProject.key}/components` },
            { label: t.labels, icon: Tag, to: `/project/${currentProject.key}/labels` },
          ],
        },
      ]
    : [], [currentProject, t]);

  // Keyboard shortcut for toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '[') {
        e.preventDefault();
        setSidebarCollapsed(!sidebarCollapsed);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sidebarCollapsed, setSidebarCollapsed]);

  const handleToggle = useCallback(() => {
    setSidebarCollapsed(!sidebarCollapsed);
  }, [sidebarCollapsed, setSidebarCollapsed]);

  return (
    <aside
      className={cn(
        'h-[calc(100vh-56px)] bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-200',
        sidebarCollapsed ? 'w-[60px]' : 'w-[240px]'
      )}
    >
      <ScrollArea className="flex-1">
        <div className={cn('py-4', sidebarCollapsed ? 'px-2' : 'px-3')}>
          {projectSections.length > 0 ? (
            projectSections.map((section) => (
              <div key={section.title} className="mb-4">
                {!sidebarCollapsed && (
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">
                    {section.title}
                  </h3>
                )}
                <nav className="space-y-0.5">
                  {section.items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-3 px-2 py-2 rounded-md text-sm transition-colors',
                          sidebarCollapsed && 'justify-center',
                          isActive
                            ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                            : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                        )
                      }
                      title={sidebarCollapsed ? item.label : undefined}
                    >
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      {!sidebarCollapsed && <span>{item.label}</span>}
                    </NavLink>
                  ))}
                </nav>
              </div>
            ))
          ) : (
            <div className="px-2">
              {!sidebarCollapsed && (
                <p className="text-sm text-muted-foreground mb-4">
                  Select a project to see navigation
                </p>
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Bottom section */}
      <div className={cn('border-t border-sidebar-border p-3', sidebarCollapsed ? 'px-2' : 'px-3')}>
        <nav className="space-y-0.5 mb-3">
          <NavLink
            to="/projects"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-2 py-2 rounded-md text-sm transition-colors',
                sidebarCollapsed && 'justify-center',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
              )
            }
            title={sidebarCollapsed ? t.projects : undefined}
          >
            <FolderKanban className="w-5 h-5 flex-shrink-0" />
            {!sidebarCollapsed && <span>{t.projects}</span>}
          </NavLink>
          <NavLink
            to="/workflows"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-2 py-2 rounded-md text-sm transition-colors',
                sidebarCollapsed && 'justify-center',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
              )
            }
            title={sidebarCollapsed ? t.workflows : undefined}
          >
            <GitBranch className="w-5 h-5 flex-shrink-0" />
            {!sidebarCollapsed && <span>{t.workflows}</span>}
          </NavLink>
          <NavLink
            to="/about"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-2 py-2 rounded-md text-sm transition-colors',
                sidebarCollapsed && 'justify-center',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
              )
            }
            title={sidebarCollapsed ? t.aboutUs : undefined}
          >
            <Info className="w-5 h-5 flex-shrink-0" />
            {!sidebarCollapsed && <span>{t.aboutUs}</span>}
          </NavLink>
          <NavLink
            to="/admin/dashboard"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-2 py-2 rounded-md text-sm transition-colors',
                sidebarCollapsed && 'justify-center',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
              )
            }
            title={sidebarCollapsed ? 'Admin Dashboard' : undefined}
          >
            <Database className="w-5 h-5 flex-shrink-0" />
            {!sidebarCollapsed && <span>Admin</span>}
          </NavLink>
          <NavLink
            to="/emoji-creator"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-2 py-2 rounded-md text-sm transition-colors',
                sidebarCollapsed && 'justify-center',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
              )
            }
            title={sidebarCollapsed ? (t.emojiCreator || 'Emoji Creator') : undefined}
            data-testid="emoji-creator-link"
          >
            <Smile className="w-5 h-5 flex-shrink-0" />
            {!sidebarCollapsed && <span>{t.emojiCreator || 'Emojis'}</span>}
          </NavLink>
        </nav>

        {!sidebarCollapsed && (
          <Button
            variant="outline"
            className="w-full justify-start gap-2 text-sm mb-3"
            onClick={() => navigate('/projects/new')}
          >
            <Plus className="w-4 h-4" />
            {t.createProject}
          </Button>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={handleToggle}
          className={cn(
            'w-full text-muted-foreground hover:text-foreground',
            sidebarCollapsed && 'justify-center px-0'
          )}
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? (
            <PanelLeft className="w-4 h-4" />
          ) : (
            <>
              <PanelLeftClose className="w-4 h-4 mr-2" />
              <span className="text-xs">Collapse</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}
