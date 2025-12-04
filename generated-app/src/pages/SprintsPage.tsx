import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Play, Check, Calendar, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { db, startSprint, completeSprint } from '@/lib/db';
import { useApp } from '@/context/AppContext';
import { toast } from 'sonner';
import { format, differenceInDays } from 'date-fns';

export function SprintsPage() {
  const { projectKey } = useParams();
  const navigate = useNavigate();
  const { currentProject, setCurrentProject, translations: t } = useApp();

  useEffect(() => {
    async function loadProject() {
      if (projectKey && !currentProject) {
        const project = await db.projects.where('key').equals(projectKey).first();
        if (project) setCurrentProject(project);
      }
    }
    loadProject();
  }, [projectKey, currentProject, setCurrentProject]);

  const project = useLiveQuery(
    () => db.projects.where('key').equals(projectKey ?? '').first(),
    [projectKey]
  );

  const sprints = useLiveQuery(
    () => project
      ? db.sprints.where('projectId').equals(project.id).toArray()
      : [],
    [project?.id]
  );

  const allIssues = useLiveQuery(
    () => project
      ? db.issues.where('projectId').equals(project.id).toArray()
      : [],
    [project?.id]
  );

  const board = useLiveQuery(
    () => project
      ? db.boards.where('projectId').equals(project.id).first()
      : null,
    [project?.id]
  );

  const handleStart = async (sprintId: string) => {
    try {
      await startSprint(sprintId);
      toast.success(t.sprintStarted);
    } catch (error) {
      toast.error(t.failedToStartSprint);
    }
  };

  const handleComplete = async (sprintId: string) => {
    try {
      await completeSprint(sprintId, 'backlog');
      toast.success(t.sprintCompleted);
    } catch (error) {
      toast.error(t.failedToCompleteSprint);
    }
  };

  if (!project) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">{t.loading}</div>;
  }

  const activeSprint = sprints?.find(s => s.status === 'active');
  const futureSprints = sprints?.filter(s => s.status === 'future') ?? [];
  const completedSprints = sprints?.filter(s => s.status === 'completed') ?? [];
  const doneStatuses = board?.columns.filter(c => c.statusCategory === 'done').map(c => c.id) ?? [];

  const getSprintStats = (sprintId: string) => {
    const issues = allIssues?.filter(i => i.sprintId === sprintId) ?? [];
    const totalPoints = issues.reduce((sum, i) => sum + (i.storyPoints ?? 0), 0);
    const completedPoints = issues
      .filter(i => doneStatuses.includes(i.status))
      .reduce((sum, i) => sum + (i.storyPoints ?? 0), 0);
    const completedCount = issues.filter(i => doneStatuses.includes(i.status)).length;
    return { total: issues.length, completed: completedCount, totalPoints, completedPoints };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
          {t.sprints}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t.manageSprintsDesc}
        </p>
      </div>

      {/* Active Sprint */}
      {activeSprint ? (
        <Card className="border-[#C25B6A]">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle style={{ fontFamily: 'var(--font-display)' }}>
                  {activeSprint.name}
                </CardTitle>
                <Badge className="bg-[#C25B6A] text-white">Active</Badge>
              </div>
              <Button size="sm" variant="outline" onClick={() => handleComplete(activeSprint.id)}>
                <Check className="w-4 h-4 mr-2" />
                Complete Sprint
              </Button>
            </div>
            {activeSprint.goal && (
              <p className="text-sm text-muted-foreground mt-1">{activeSprint.goal}</p>
            )}
          </CardHeader>
          <CardContent>
            {(() => {
              const stats = getSprintStats(activeSprint.id);
              const progress = stats.totalPoints ? (stats.completedPoints / stats.totalPoints) * 100 : 0;
              const daysRemaining = activeSprint.endDate
                ? Math.max(0, differenceInDays(new Date(activeSprint.endDate), new Date()))
                : null;

              return (
                <div className="space-y-4">
                  <div className="flex items-center gap-6 text-sm">
                    {activeSprint.startDate && activeSprint.endDate && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        {format(new Date(activeSprint.startDate), 'MMM d')} - {format(new Date(activeSprint.endDate), 'MMM d')}
                        {daysRemaining !== null && (
                          <span className="text-muted-foreground">({daysRemaining} days left)</span>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-muted-foreground" />
                      {stats.completedPoints}/{stats.totalPoints} story points
                    </div>
                    <div>
                      {stats.completed}/{stats.total} issues
                    </div>
                  </div>
                  <Progress value={progress} className="h-2" />
                  <Button
                    variant="link"
                    className="p-0 h-auto text-[#E8A87C]"
                    onClick={() => navigate(`/project/${projectKey}/board`)}
                  >
                    View on Board
                  </Button>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No active sprint. Start a sprint from the backlog to begin tracking progress.
          </CardContent>
        </Card>
      )}

      {/* Future Sprints */}
      {futureSprints.length > 0 && (
        <div>
          <h2 className="text-lg font-medium mb-3" style={{ fontFamily: 'var(--font-display)' }}>
            Future Sprints
          </h2>
          <div className="grid gap-4">
            {futureSprints.map(sprint => {
              const stats = getSprintStats(sprint.id);
              return (
                <Card key={sprint.id}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{sprint.name}</span>
                          <Badge variant="outline">Future</Badge>
                        </div>
                        {sprint.startDate && sprint.endDate && (
                          <div className="text-sm text-muted-foreground mt-1">
                            {format(new Date(sprint.startDate), 'MMM d')} - {format(new Date(sprint.endDate), 'MMM d')}
                          </div>
                        )}
                        <div className="text-sm text-muted-foreground">
                          {stats.total} issues • {stats.totalPoints} story points
                        </div>
                      </div>
                      <Button size="sm" onClick={() => handleStart(sprint.id)}>
                        <Play className="w-4 h-4 mr-2" />
                        Start Sprint
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Completed Sprints */}
      {completedSprints.length > 0 && (
        <div>
          <h2 className="text-lg font-medium mb-3" style={{ fontFamily: 'var(--font-display)' }}>
            Completed Sprints
          </h2>
          <div className="grid gap-4">
            {completedSprints.map(sprint => (
              <Card key={sprint.id}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{sprint.name}</span>
                        <Badge variant="secondary">Completed</Badge>
                      </div>
                      {sprint.completedAt && (
                        <div className="text-sm text-muted-foreground">
                          Completed {format(new Date(sprint.completedAt), 'MMM d, yyyy')}
                        </div>
                      )}
                      {sprint.velocity !== undefined && (
                        <div className="text-sm text-muted-foreground">
                          Velocity: {sprint.velocity} story points
                        </div>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/project/${projectKey}/reports/sprint?id=${sprint.id}`)}
                    >
                      View Report
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
