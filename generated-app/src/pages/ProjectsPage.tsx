import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Settings, Archive, MoreHorizontal, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { db, updateProject } from '@/lib/db';
import { useApp } from '@/context/AppContext';
import { toast } from 'sonner';

export function ProjectsPage() {
  const navigate = useNavigate();
  const { setCurrentProject } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  const projects = useLiveQuery(async () => {
    const allProjects = await db.projects.toArray();

    // Get issue counts for each project
    const projectsWithCounts = await Promise.all(
      allProjects.map(async (project) => {
        const issueCount = await db.issues.where('projectId').equals(project.id).count();
        return { ...project, issueCount };
      })
    );

    return projectsWithCounts;
  }, []);

  const filteredProjects = projects?.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.key.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesArchived = showArchived ? p.isArchived : !p.isArchived;
    return matchesSearch && matchesArchived;
  });

  const handleProjectClick = (project: NonNullable<typeof projects>[0]) => {
    setCurrentProject(project);
    navigate(`/project/${project.key}/board`);
  };

  const handleArchiveProject = async (projectId: string, archive: boolean) => {
    try {
      await updateProject(projectId, { isArchived: archive });
      toast.success(archive ? 'Project archived' : 'Project restored');
    } catch (error) {
      toast.error('Failed to update project');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-semibold"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Projects
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage and view all your projects
          </p>
        </div>
        <Button
          onClick={() => navigate('/projects/new')}
          className="bg-[#D4A373] hover:bg-[#c4935f] text-white gap-2"
        >
          <Plus className="w-4 h-4" />
          New Project
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          variant={showArchived ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowArchived(!showArchived)}
          className="gap-2"
        >
          <Archive className="w-4 h-4" />
          {showArchived ? 'Show Active' : 'Show Archived'}
        </Button>
      </div>

      {/* Projects Grid */}
      {filteredProjects && filteredProjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
          {filteredProjects.map((project) => (
            <Card
              key={project.id}
              className="hover-lift cursor-pointer"
              onClick={() => handleProjectClick(project)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-md flex items-center justify-center text-white font-semibold"
                      style={{ backgroundColor: project.color }}
                    >
                      {project.icon || project.key.slice(0, 2)}
                    </div>
                    <div>
                      <h3 className="font-medium">{project.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {project.key} • {project.issueCount} issues
                      </p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/project/${project.key}/settings`);
                        }}
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        Settings
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleArchiveProject(project.id, !project.isArchived);
                        }}
                      >
                        <Archive className="w-4 h-4 mr-2" />
                        {project.isArchived ? 'Restore' : 'Archive'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {project.description && (
                  <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                    {project.description}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16">
          <p className="text-muted-foreground mb-4">
            {searchQuery
              ? 'No projects match your search'
              : showArchived
              ? 'No archived projects'
              : 'No projects yet'}
          </p>
          {!searchQuery && !showArchived && (
            <Button
              onClick={() => navigate('/projects/new')}
              className="bg-[#D4A373] hover:bg-[#c4935f] text-white gap-2"
            >
              <Plus className="w-4 h-4" />
              Create your first project
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
