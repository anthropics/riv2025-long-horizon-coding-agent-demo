import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/db';
import { useApp } from '@/context/AppContext';
import { IssueTypeIcon } from '@/components/common/IssueTypeIcon';
import { addDays, addMonths, differenceInDays, format, startOfMonth, endOfMonth, eachDayOfInterval, isToday } from 'date-fns';
import { cn } from '@/lib/utils';

export function RoadmapPage() {
  const { projectKey } = useParams();
  const { currentProject, setCurrentProject } = useApp();
  const [viewMode, setViewMode] = useState<'week' | 'month' | 'quarter'>('month');
  const [startDate, setStartDate] = useState(startOfMonth(new Date()));

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

  const epics = useLiveQuery(
    () => project
      ? db.issues.where('projectId').equals(project.id).and(i => i.type === 'Epic').toArray()
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

  // Generate timeline dates
  const timelineDays = useMemo(() => {
    const days = viewMode === 'week' ? 14 : viewMode === 'month' ? 35 : 90;
    return eachDayOfInterval({ start: startDate, end: addDays(startDate, days) });
  }, [startDate, viewMode]);

  // Calculate epic progress
  const epicProgress = useMemo(() => {
    const progress = new Map<string, { total: number; done: number }>();
    epics?.forEach(epic => {
      const children = allIssues?.filter(i => i.epicId === epic.id) ?? [];
      const doneStatuses = board?.columns.filter(c => c.statusCategory === 'done').map(c => c.id) ?? [];
      const done = children.filter(i => doneStatuses.includes(i.status)).length;
      progress.set(epic.id, { total: children.length, done });
    });
    return progress;
  }, [epics, allIssues, board]);

  const navigateTimeline = (direction: 'prev' | 'next') => {
    const offset = viewMode === 'week' ? 7 : viewMode === 'month' ? 30 : 90;
    setStartDate(prev => direction === 'next' ? addDays(prev, offset) : addDays(prev, -offset));
  };

  if (!project) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading...</div>;
  }

  const getBarStyle = (epic: typeof epics extends (infer T)[] | undefined ? T : never) => {
    if (!epic?.dueDate) return null;
    const epicStart = epic.createdAt;
    const epicEnd = new Date(epic.dueDate);
    const start = differenceInDays(epicStart, startDate);
    const duration = differenceInDays(epicEnd, epicStart);
    const dayWidth = 100 / timelineDays.length;

    return {
      left: `${Math.max(0, start * dayWidth)}%`,
      width: `${Math.min(100 - Math.max(0, start * dayWidth), Math.max(duration, 1) * dayWidth)}%`,
    };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
            Roadmap
          </h1>
          <p className="text-sm text-muted-foreground">
            {epics?.length ?? 0} epics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setStartDate(startOfMonth(new Date()))}>
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={() => navigateTimeline('prev')}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => navigateTimeline('next')}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as 'week' | 'month' | 'quarter')}
            className="h-9 px-3 border rounded-md text-sm"
          >
            <option value="week">Week</option>
            <option value="month">Month</option>
            <option value="quarter">Quarter</option>
          </select>
        </div>
      </div>

      {/* Timeline */}
      <div className="border rounded-lg overflow-hidden">
        {/* Timeline header */}
        <div className="flex bg-muted border-b">
          <div className="w-64 flex-shrink-0 p-2 border-r font-medium text-sm">Epic</div>
          <div className="flex-1 flex">
            {timelineDays.map((day, i) => (
              <div
                key={i}
                className={cn(
                  'flex-1 text-center text-xs py-2 border-r last:border-r-0',
                  isToday(day) && 'bg-accent/30'
                )}
              >
                {i === 0 || day.getDate() === 1 ? format(day, 'MMM d') : format(day, 'd')}
              </div>
            ))}
          </div>
        </div>

        {/* Epic rows */}
        {epics && epics.length > 0 ? (
          epics.map((epic) => {
            const progress = epicProgress.get(epic.id);
            const barStyle = getBarStyle(epic);
            const progressPercent = progress?.total ? (progress.done / progress.total) * 100 : 0;

            return (
              <div key={epic.id} className="flex border-b last:border-b-0 hover:bg-muted/50">
                <div className="w-64 flex-shrink-0 p-2 border-r">
                  <div className="flex items-center gap-2">
                    <IssueTypeIcon type="Epic" size={14} />
                    <span className="text-xs text-muted-foreground">{epic.key}</span>
                  </div>
                  <div className="text-sm font-medium truncate">{epic.summary}</div>
                  {progress && (
                    <div className="text-xs text-muted-foreground">
                      {progress.done}/{progress.total} issues done
                    </div>
                  )}
                </div>
                <div className="flex-1 relative py-4">
                  {barStyle && (
                    <div
                      className="absolute h-6 rounded-md bg-[#9B59B6] flex items-center px-2"
                      style={barStyle}
                    >
                      <div
                        className="absolute left-0 top-0 bottom-0 bg-[#7B3F99] rounded-l-md"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-8 text-center text-muted-foreground">
            No epics yet. Create an epic to see it on the roadmap.
          </div>
        )}
      </div>
    </div>
  );
}
