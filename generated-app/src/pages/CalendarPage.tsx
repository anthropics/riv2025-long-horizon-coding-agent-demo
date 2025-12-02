import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronLeft, ChevronRight, CalendarDays, Circle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { db } from '@/lib/db';
import { useApp } from '@/context/AppContext';
import { IssueTypeIcon } from '@/components/common/IssueTypeIcon';
import { PriorityIcon } from '@/components/common/PriorityIcon';
import {
  addDays,
  addMonths,
  subMonths,
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  isToday,
  isPast,
  startOfWeek,
  endOfWeek,
  getDay,
} from 'date-fns';
import { cn } from '@/lib/utils';
import type { Issue, User } from '@/types';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function CalendarPage() {
  const { projectKey } = useParams();
  const { currentProject, setCurrentProject, openIssueDetail } = useApp();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

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

  const issues = useLiveQuery(
    () => project
      ? db.issues.where('projectId').equals(project.id).toArray()
      : [],
    [project?.id]
  );

  const users = useLiveQuery(
    () => db.users.toArray(),
    []
  );

  const board = useLiveQuery(
    () => project
      ? db.boards.where('projectId').equals(project.id).first()
      : null,
    [project?.id]
  );

  // Get issues with due dates
  const issuesWithDueDates = useMemo(() => {
    return issues?.filter(issue => issue.dueDate) ?? [];
  }, [issues]);

  // Group issues by date for easy lookup
  const issuesByDate = useMemo(() => {
    const map = new Map<string, Issue[]>();
    issuesWithDueDates.forEach(issue => {
      if (issue.dueDate) {
        const dateKey = format(new Date(issue.dueDate), 'yyyy-MM-dd');
        const existing = map.get(dateKey) ?? [];
        map.set(dateKey, [...existing, issue]);
      }
    });
    return map;
  }, [issuesWithDueDates]);

  // Generate calendar days for current month view (with padding for full weeks)
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart); // Sunday before month starts
    const calendarEnd = endOfWeek(monthEnd); // Saturday after month ends

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth]);

  // Get done column ids for status checks
  const doneColumnIds = useMemo(() => {
    return board?.columns.filter(c => c.statusCategory === 'done').map(c => c.id) ?? [];
  }, [board]);

  const navigateMonth = useCallback((direction: 'prev' | 'next') => {
    setCurrentMonth(prev => direction === 'next' ? addMonths(prev, 1) : subMonths(prev, 1));
  }, []);

  const goToToday = useCallback(() => {
    setCurrentMonth(new Date());
    setSelectedDate(new Date());
  }, []);

  const getUserById = (id: string | undefined): User | undefined => {
    return users?.find(u => u.id === id);
  };

  const getIssueStatus = (issue: Issue) => {
    const isCompleted = doneColumnIds.includes(issue.status);
    const isOverdue = issue.dueDate && isPast(new Date(issue.dueDate)) && !isCompleted;
    return { isCompleted, isOverdue };
  };

  const getIssuesForDate = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return issuesByDate.get(dateKey) ?? [];
  };

  // Get stats for header
  const stats = useMemo(() => {
    const total = issuesWithDueDates.length;
    const overdue = issuesWithDueDates.filter(i => {
      const isCompleted = doneColumnIds.includes(i.status);
      return i.dueDate && isPast(new Date(i.dueDate)) && !isCompleted;
    }).length;
    const completed = issuesWithDueDates.filter(i => doneColumnIds.includes(i.status)).length;
    const upcoming = total - overdue - completed;
    return { total, overdue, completed, upcoming };
  }, [issuesWithDueDates, doneColumnIds]);

  if (!project) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
            <CalendarDays className="w-6 h-6 text-primary" />
            Calendar
          </h1>
          <p className="text-sm text-muted-foreground">
            {stats.total} items with due dates · {stats.overdue} overdue · {stats.upcoming} upcoming
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={() => navigateMonth('prev')}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="min-w-[140px] text-center font-medium">
              {format(currentMonth, 'MMMM yyyy')}
            </span>
            <Button variant="outline" size="icon" onClick={() => navigateMonth('next')}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-destructive" />
          <span>Overdue</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-accent" />
          <span>Due Today</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-primary" />
          <span>Upcoming</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-success/70" />
          <span>Completed</span>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="border rounded-lg overflow-hidden bg-card shadow-sm">
        {/* Weekday Header */}
        <div className="grid grid-cols-7 bg-muted/60 border-b">
          {WEEKDAYS.map((day, i) => (
            <div
              key={day}
              className={cn(
                'py-3 text-center text-sm font-medium text-muted-foreground',
                i === 0 || i === 6 ? 'text-muted-foreground/70' : ''
              )}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, index) => {
            const dayIssues = getIssuesForDate(day);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const dayIsToday = isToday(day);
            const isWeekend = getDay(day) === 0 || getDay(day) === 6;

            // Count by status
            const overdueCount = dayIssues.filter(i => getIssueStatus(i).isOverdue).length;
            const completedCount = dayIssues.filter(i => getIssueStatus(i).isCompleted).length;
            const pendingCount = dayIssues.length - overdueCount - completedCount;

            return (
              <div
                key={index}
                onClick={() => setSelectedDate(day)}
                className={cn(
                  'min-h-[110px] p-2 border-b border-r cursor-pointer transition-colors',
                  'hover:bg-muted/50',
                  isCurrentMonth ? 'bg-card' : 'bg-muted/30',
                  isWeekend && isCurrentMonth && 'bg-muted/20',
                  isSelected && 'bg-accent/20 ring-2 ring-accent ring-inset',
                  dayIsToday && 'bg-primary/5',
                  '[&:nth-child(7n)]:border-r-0'
                )}
              >
                {/* Day number */}
                <div className={cn(
                  'flex items-center justify-between mb-1'
                )}>
                  <span className={cn(
                    'inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-medium',
                    !isCurrentMonth && 'text-muted-foreground/50',
                    dayIsToday && 'bg-primary text-primary-foreground',
                    isSelected && !dayIsToday && 'bg-accent text-accent-foreground'
                  )}>
                    {format(day, 'd')}
                  </span>
                  {dayIssues.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {dayIssues.length} {dayIssues.length === 1 ? 'item' : 'items'}
                    </span>
                  )}
                </div>

                {/* Issue Pills/Indicators */}
                {isCurrentMonth && dayIssues.length > 0 && (
                  <div className="space-y-1">
                    {dayIssues.slice(0, 3).map(issue => {
                      const { isCompleted, isOverdue } = getIssueStatus(issue);
                      return (
                        <div
                          key={issue.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            openIssueDetail(issue);
                          }}
                          className={cn(
                            'flex items-center gap-1 px-1.5 py-0.5 rounded text-xs truncate cursor-pointer',
                            'transition-all hover:scale-[1.02] hover:shadow-sm',
                            isCompleted && 'bg-success/15 text-success line-through opacity-70',
                            isOverdue && !isCompleted && 'bg-destructive/15 text-destructive',
                            !isCompleted && !isOverdue && dayIsToday && 'bg-accent/20 text-accent-foreground',
                            !isCompleted && !isOverdue && !dayIsToday && 'bg-primary/10 text-primary'
                          )}
                        >
                          <IssueTypeIcon type={issue.type} size={10} />
                          <span className="truncate">{issue.key}</span>
                        </div>
                      );
                    })}
                    {dayIssues.length > 3 && (
                      <div className="text-xs text-muted-foreground pl-1">
                        +{dayIssues.length - 3} more
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day Detail Panel */}
      {selectedDate && (
        <div className="border rounded-lg bg-card p-4 shadow-sm animate-in slide-in-from-bottom-2 duration-200">
          <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
            <CalendarDays className="w-4 h-4 text-primary" />
            {format(selectedDate, 'EEEE, MMMM d, yyyy')}
            {isToday(selectedDate) && (
              <Badge variant="secondary" className="ml-2">Today</Badge>
            )}
          </h3>

          {getIssuesForDate(selectedDate).length > 0 ? (
            <div className="space-y-2">
              {getIssuesForDate(selectedDate).map(issue => {
                const { isCompleted, isOverdue } = getIssueStatus(issue);
                const assignee = getUserById(issue.assigneeId);

                return (
                  <div
                    key={issue.id}
                    onClick={() => openIssueDetail(issue)}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all',
                      'hover:shadow-md hover:border-primary/30',
                      isCompleted && 'opacity-60 bg-success/5 border-success/20',
                      isOverdue && !isCompleted && 'bg-destructive/5 border-destructive/30'
                    )}
                  >
                    <IssueTypeIcon type={issue.type} size={18} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground font-medium">
                          {issue.key}
                        </span>
                        <PriorityIcon priority={issue.priority} size={12} />
                        {isOverdue && !isCompleted && (
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Overdue
                          </Badge>
                        )}
                        {isCompleted && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-success/20 text-success">
                            Done
                          </Badge>
                        )}
                      </div>
                      <p className={cn(
                        'text-sm font-medium truncate',
                        isCompleted && 'line-through'
                      )}>
                        {issue.summary}
                      </p>
                    </div>
                    {assignee && (
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium text-white flex-shrink-0"
                        style={{ backgroundColor: assignee.color }}
                        title={assignee.name}
                      >
                        {assignee.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    {issue.storyPoints !== undefined && issue.storyPoints > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {issue.storyPoints} SP
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No items due on this date
            </p>
          )}
        </div>
      )}

      {/* Empty state when no issues have due dates */}
      {issuesWithDueDates.length === 0 && (
        <div className="text-center py-12 border rounded-lg bg-card">
          <CalendarDays className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-2" style={{ fontFamily: 'var(--font-display)' }}>
            No Due Dates Set
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Add due dates to your issues to see them on the calendar.
            This helps you visualize and prioritize workloads.
          </p>
        </div>
      )}
    </div>
  );
}
