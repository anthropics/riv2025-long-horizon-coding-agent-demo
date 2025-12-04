import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Leaf, ArrowRight, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { db } from '@/lib/db';
import { useApp } from '@/context/AppContext';
import { IssueTypeIcon } from '@/components/common/IssueTypeIcon';
import { PriorityIcon } from '@/components/common/PriorityIcon';
import { formatDistanceToNow } from 'date-fns';

export function HomePage() {
  const navigate = useNavigate();
  const { currentUser, setCurrentProject, translations: t } = useApp();

  // Live queries for dashboard data
  const projects = useLiveQuery(
    () => db.projects.filter((p) => !p.isArchived).toArray(),
    []
  );

  const recentIssues = useLiveQuery(async () => {
    if (!currentUser) return [];
    const issues = await db.issues
      .where('assigneeId')
      .equals(currentUser.id)
      .toArray();
    return issues.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()).slice(0, 5);
  }, [currentUser]);

  const activities = useLiveQuery(async () => {
    const logs = await db.activityLog.orderBy('timestamp').reverse().limit(10).toArray();
    const enrichedLogs = await Promise.all(
      logs.map(async (log) => {
        const issue = await db.issues.get(log.issueId);
        const user = await db.users.get(log.userId);
        return { ...log, issue, user };
      })
    );
    return enrichedLogs;
  }, []);

  const stats = useLiveQuery(async () => {
    const totalIssues = await db.issues.count();
    const doneColumns = (await db.boards.toArray())
      .flatMap((b) => b.columns)
      .filter((c) => c.statusCategory === 'done')
      .map((c) => c.id);

    const openIssues = await db.issues.filter((i) => !doneColumns.includes(i.status)).count();

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const resolvedThisWeek = await db.issues
      .filter((i) => i.resolvedAt && i.resolvedAt >= weekAgo)
      .count();

    return { totalIssues, openIssues, resolvedThisWeek };
  }, []);

  const handleProjectClick = async (project: typeof projects extends (infer T)[] | undefined ? T : never) => {
    if (project) {
      setCurrentProject(project);
      navigate(`/project/${project.key}/board`);
    }
  };

  // Empty state for first-time users
  if (!projects || projects.length === 0) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <div className="text-center max-w-md animate-fade-in">
          <div className="w-20 h-20 mx-auto mb-6 bg-[#7B2332]/10 rounded-full flex items-center justify-center">
            <Leaf className="w-10 h-10 text-[#7B2332]" />
          </div>
          <h1
            className="text-3xl font-semibold mb-3"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {t.welcomeMessage}
          </h1>
          <p className="text-muted-foreground mb-8">
            {t.noProjectsMessage}
          </p>
          <Button
            size="lg"
            onClick={() => navigate('/projects/new')}
            className="bg-[#E8A87C] hover:bg-[#d4946d] text-white gap-2"
          >
            <Plus className="w-5 h-5" />
            {t.createYourFirstProject}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 stagger-children">
      {/* Welcome Section */}
      <div>
        <h1
          className="text-2xl font-semibold"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Welcome back{currentUser?.name ? `, ${currentUser.name.split(' ')[0]}` : ''}
        </h1>
        <p className="text-muted-foreground mt-1">
          Here's what's happening across your projects
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover-lift">
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-[#7B2332]" style={{ fontFamily: 'var(--font-display)' }}>
              {stats?.totalIssues ?? 0}
            </div>
            <p className="text-sm text-muted-foreground">Total Issues</p>
          </CardContent>
        </Card>
        <Card className="hover-lift">
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-[#E8A87C]" style={{ fontFamily: 'var(--font-display)' }}>
              {stats?.openIssues ?? 0}
            </div>
            <p className="text-sm text-muted-foreground">Open Issues</p>
          </CardContent>
        </Card>
        <Card className="hover-lift">
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-[#C25B6A]" style={{ fontFamily: 'var(--font-display)' }}>
              {stats?.resolvedThisWeek ?? 0}
            </div>
            <p className="text-sm text-muted-foreground">Resolved This Week</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Projects */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle style={{ fontFamily: 'var(--font-display)' }}>
                Recent Projects
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/projects')}>
                View all
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {projects.slice(0, 4).map((project) => (
                  <button
                    key={project.id}
                    onClick={() => handleProjectClick(project)}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted transition-colors text-left hover-lift"
                  >
                    <div
                      className="w-10 h-10 rounded-md flex items-center justify-center text-white font-semibold"
                      style={{ backgroundColor: project.color }}
                    >
                      {project.icon || project.key.slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{project.name}</div>
                      <div className="text-xs text-muted-foreground">{project.key}</div>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Assigned to Me */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle style={{ fontFamily: 'var(--font-display)' }}>
                Assigned to Me
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentIssues && recentIssues.length > 0 ? (
                <div className="space-y-2">
                  {recentIssues.map((issue) => (
                    <button
                      key={issue.id}
                      onClick={async () => {
                        const project = await db.projects.get(issue.projectId);
                        if (project) {
                          setCurrentProject(project);
                          navigate(`/project/${project.key}/board?issue=${issue.key}`);
                        }
                      }}
                      className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-muted transition-colors text-left"
                    >
                      <IssueTypeIcon type={issue.type} size={16} />
                      <span className="text-xs text-muted-foreground">{issue.key}</span>
                      <span className="flex-1 text-sm truncate">{issue.summary}</span>
                      <PriorityIcon priority={issue.priority} size={14} />
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No issues assigned to you
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle style={{ fontFamily: 'var(--font-display)' }}>
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activities && activities.length > 0 ? (
            <div className="space-y-3">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <Clock className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">{activity.user?.name ?? 'Unknown'}</span>
                      {' '}
                      {activity.action.replace('_', ' ')}
                      {activity.issue && (
                        <>
                          {' on '}
                          <span className="font-medium text-[#E8A87C]">
                            {activity.issue.key}
                          </span>
                        </>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No recent activity
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
