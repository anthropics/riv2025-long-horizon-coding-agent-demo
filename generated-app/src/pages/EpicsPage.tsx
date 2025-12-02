import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Plus,
  ChevronDown,
  ChevronRight,
  Layers,
  CheckCircle2,
  Circle,
  Clock,
  Filter,
  Search,
  BarChart2,
  Target
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { db } from '@/lib/db';
import { useApp } from '@/context/AppContext';
import { IssueTypeIcon } from '@/components/common/IssueTypeIcon';
import { PriorityIcon } from '@/components/common/PriorityIcon';
import { CreateIssueModal } from '@/components/modals/CreateIssueModal';
import { IssueDetailPanel } from '@/components/board/IssueDetailPanel';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { Issue } from '@/types';

type FilterStatus = 'all' | 'open' | 'in_progress' | 'done';

export function EpicsPage() {
  const { projectKey } = useParams();
  const { currentProject, setCurrentProject } = useApp();
  const [expandedEpics, setExpandedEpics] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);

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

  // Get child issues for each epic
  const childIssuesByEpic = useMemo(() => {
    const map = new Map<string, Issue[]>();
    if (!allIssues || !epics) return map;

    epics.forEach(epic => {
      const children = allIssues.filter(i => i.epicId === epic.id);
      map.set(epic.id, children);
    });

    return map;
  }, [epics, allIssues]);

  // Calculate epic progress
  const epicProgress = useMemo(() => {
    const progress = new Map<string, { total: number; done: number; inProgress: number; todo: number }>();

    epics?.forEach(epic => {
      const children = childIssuesByEpic.get(epic.id) ?? [];
      const doneStatuses = board?.columns.filter(c => c.statusCategory === 'done').map(c => c.id) ?? [];
      const inProgressStatuses = board?.columns.filter(c => c.statusCategory === 'in_progress').map(c => c.id) ?? [];

      const done = children.filter(i => doneStatuses.includes(i.status)).length;
      const inProgress = children.filter(i => inProgressStatuses.includes(i.status)).length;
      const todo = children.length - done - inProgress;

      progress.set(epic.id, { total: children.length, done, inProgress, todo });
    });

    return progress;
  }, [epics, childIssuesByEpic, board]);

  // Get epic status
  const getEpicStatus = (epicId: string): FilterStatus => {
    const progress = epicProgress.get(epicId);
    if (!progress || progress.total === 0) return 'open';
    if (progress.done === progress.total) return 'done';
    if (progress.inProgress > 0 || progress.done > 0) return 'in_progress';
    return 'open';
  };

  // Filter epics
  const filteredEpics = useMemo(() => {
    if (!epics) return [];

    return epics.filter(epic => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesEpic = epic.summary.toLowerCase().includes(query) ||
                          epic.key.toLowerCase().includes(query);
        const children = childIssuesByEpic.get(epic.id) ?? [];
        const matchesChildren = children.some(c =>
          c.summary.toLowerCase().includes(query) ||
          c.key.toLowerCase().includes(query)
        );
        if (!matchesEpic && !matchesChildren) return false;
      }

      // Status filter
      if (statusFilter !== 'all') {
        const epicStatus = getEpicStatus(epic.id);
        if (epicStatus !== statusFilter) return false;
      }

      return true;
    });
  }, [epics, searchQuery, statusFilter, childIssuesByEpic, epicProgress]);

  // Toggle epic expansion
  const toggleEpic = (epicId: string) => {
    setExpandedEpics(prev => {
      const next = new Set(prev);
      if (next.has(epicId)) {
        next.delete(epicId);
      } else {
        next.add(epicId);
      }
      return next;
    });
  };

  // Expand all epics
  const expandAll = () => {
    if (epics) {
      setExpandedEpics(new Set(epics.map(e => e.id)));
    }
  };

  // Collapse all epics
  const collapseAll = () => {
    setExpandedEpics(new Set());
  };

  // Calculate overall stats
  const stats = useMemo(() => {
    if (!epics) return { total: 0, done: 0, inProgress: 0, open: 0 };

    let done = 0, inProgress = 0, open = 0;
    epics.forEach(epic => {
      const status = getEpicStatus(epic.id);
      if (status === 'done') done++;
      else if (status === 'in_progress') inProgress++;
      else open++;
    });

    return { total: epics.length, done, inProgress, open };
  }, [epics, epicProgress]);

  // Show loading only for a short time, then show "project not found"
  const [hasTimedOut, setHasTimedOut] = useState(false);

  useEffect(() => {
    if (!project) {
      const timer = setTimeout(() => setHasTimedOut(true), 2000);
      return () => clearTimeout(timer);
    } else {
      setHasTimedOut(false);
    }
  }, [project]);

  if (!project) {
    if (hasTimedOut) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-4">
          <Layers className="w-12 h-12 text-muted-foreground/50" />
          <p>Project not found</p>
        </div>
      );
    }
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
            <Layers className="w-6 h-6 text-[#9B59B6]" />
            Epics
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage your epics and track their progress
          </p>
        </div>
        <Button
          onClick={() => setCreateModalOpen(true)}
          className="bg-accent hover:bg-accent/90 gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Epic
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-4 border rounded-lg bg-card">
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Total Epics</span>
          </div>
          <span className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
            {stats.total}
          </span>
        </div>
        <div className="p-4 border rounded-lg bg-card">
          <div className="flex items-center gap-2 mb-1">
            <Circle className="w-4 h-4 text-blue-500" />
            <span className="text-sm text-muted-foreground">Open</span>
          </div>
          <span className="text-2xl font-bold text-blue-500" style={{ fontFamily: 'var(--font-display)' }}>
            {stats.open}
          </span>
        </div>
        <div className="p-4 border rounded-lg bg-card">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-amber-500" />
            <span className="text-sm text-muted-foreground">In Progress</span>
          </div>
          <span className="text-2xl font-bold text-amber-500" style={{ fontFamily: 'var(--font-display)' }}>
            {stats.inProgress}
          </span>
        </div>
        <div className="p-4 border rounded-lg bg-card">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span className="text-sm text-muted-foreground">Done</span>
          </div>
          <span className="text-2xl font-bold text-green-500" style={{ fontFamily: 'var(--font-display)' }}>
            {stats.done}
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search epics and child issues..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as FilterStatus)}>
          <SelectTrigger className="w-40">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="done">Done</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex gap-1">
          <Button variant="outline" size="sm" onClick={expandAll}>
            Expand All
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAll}>
            Collapse All
          </Button>
        </div>
      </div>

      {/* Epic List */}
      <div className="border rounded-lg overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-[1fr_100px_120px_150px] gap-4 px-4 py-3 bg-muted border-b text-sm font-medium text-muted-foreground">
          <span>Epic</span>
          <span className="text-center">Issues</span>
          <span className="text-center">Progress</span>
          <span className="text-center">Status</span>
        </div>

        {/* Epic Rows */}
        <ScrollArea className="max-h-[600px]">
          {filteredEpics && filteredEpics.length > 0 ? (
            filteredEpics.map((epic) => {
              const progress = epicProgress.get(epic.id);
              const children = childIssuesByEpic.get(epic.id) ?? [];
              const isExpanded = expandedEpics.has(epic.id);
              const progressPercent = progress?.total ? (progress.done / progress.total) * 100 : 0;
              const epicStatus = getEpicStatus(epic.id);

              return (
                <div key={epic.id} className="border-b last:border-b-0">
                  {/* Epic Row */}
                  <div
                    className={cn(
                      "grid grid-cols-[1fr_100px_120px_150px] gap-4 px-4 py-3 items-center hover:bg-muted/50 cursor-pointer transition-colors",
                      isExpanded && "bg-muted/30"
                    )}
                    onClick={() => toggleEpic(epic.id)}
                  >
                    <div className="flex items-center gap-3">
                      <button
                        className="p-0.5 hover:bg-muted rounded"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleEpic(epic.id);
                        }}
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        )}
                      </button>
                      <IssueTypeIcon type="Epic" size={18} />
                      <span className="text-sm text-muted-foreground font-mono">{epic.key}</span>
                      <span
                        className="font-medium truncate cursor-pointer hover:text-primary hover:underline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedIssue(epic);
                        }}
                      >
                        {epic.summary}
                      </span>
                    </div>

                    <div className="text-center">
                      <Badge variant="outline" className="font-mono">
                        {children.length}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2">
                      <Progress value={progressPercent} className="h-2 flex-1" />
                      <span className="text-xs text-muted-foreground w-12 text-right">
                        {Math.round(progressPercent)}%
                      </span>
                    </div>

                    <div className="flex justify-center">
                      <Badge
                        variant={
                          epicStatus === 'done' ? 'default' :
                          epicStatus === 'in_progress' ? 'secondary' :
                          'outline'
                        }
                        className={cn(
                          epicStatus === 'done' && 'bg-green-500 hover:bg-green-600',
                          epicStatus === 'in_progress' && 'bg-amber-500 hover:bg-amber-600 text-white'
                        )}
                      >
                        {epicStatus === 'done' ? 'Completed' :
                         epicStatus === 'in_progress' ? 'In Progress' :
                         'Open'}
                      </Badge>
                    </div>
                  </div>

                  {/* Child Issues */}
                  {isExpanded && children.length > 0 && (
                    <div className="bg-muted/20 border-t">
                      {children.map((child) => {
                        const childColumn = board?.columns.find(c => c.id === child.status);
                        const isChildDone = childColumn?.statusCategory === 'done';
                        const isChildInProgress = childColumn?.statusCategory === 'in_progress';

                        return (
                          <div
                            key={child.id}
                            className="grid grid-cols-[1fr_100px_120px_150px] gap-4 px-4 py-2 items-center hover:bg-muted/50 cursor-pointer transition-colors border-t border-dashed"
                            onClick={() => setSelectedIssue(child)}
                          >
                            <div className="flex items-center gap-3 pl-12">
                              <IssueTypeIcon type={child.type} size={16} />
                              <span className="text-xs text-muted-foreground font-mono">{child.key}</span>
                              <span className={cn(
                                "text-sm truncate",
                                isChildDone && "line-through text-muted-foreground"
                              )}>
                                {child.summary}
                              </span>
                              <PriorityIcon priority={child.priority} size={14} />
                              {child.storyPoints && (
                                <Badge variant="outline" className="text-xs px-1.5 py-0">
                                  {child.storyPoints}
                                </Badge>
                              )}
                            </div>

                            <div />

                            <div />

                            <div className="flex justify-center">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-xs",
                                  isChildDone && "bg-green-100 text-green-700 border-green-300",
                                  isChildInProgress && "bg-amber-100 text-amber-700 border-amber-300"
                                )}
                              >
                                {childColumn?.name ?? 'Unknown'}
                              </Badge>
                            </div>
                          </div>
                        );
                      })}

                      {/* Summary row for this epic */}
                      <div className="px-4 py-2 pl-16 text-xs text-muted-foreground border-t bg-muted/30 flex items-center gap-4">
                        <span>
                          <strong>{progress?.done ?? 0}</strong> of <strong>{progress?.total ?? 0}</strong> issues done
                        </span>
                        <span className="text-muted-foreground/50">•</span>
                        <span>
                          <strong>{children.reduce((sum, c) => sum + (c.storyPoints ?? 0), 0)}</strong> story points total
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Empty state for epic with no children */}
                  {isExpanded && children.length === 0 && (
                    <div className="bg-muted/20 border-t px-4 py-6 text-center text-sm text-muted-foreground">
                      No child issues yet. Link issues to this epic to track progress.
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="p-12 text-center">
              <Layers className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2" style={{ fontFamily: 'var(--font-display)' }}>
                {searchQuery || statusFilter !== 'all' ? 'No epics match your filters' : 'No epics yet'}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {searchQuery || statusFilter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Epics help you organize related issues into larger initiatives'}
              </p>
              {!searchQuery && statusFilter === 'all' && (
                <Button
                  onClick={() => setCreateModalOpen(true)}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Create your first Epic
                </Button>
              )}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-xs text-muted-foreground">
        <span className="font-medium">Issue Hierarchy:</span>
        <div className="flex items-center gap-2">
          <IssueTypeIcon type="Epic" size={14} />
          <span>Epic (parent)</span>
        </div>
        <span className="text-muted-foreground/50">→</span>
        <div className="flex items-center gap-2">
          <IssueTypeIcon type="Story" size={14} />
          <IssueTypeIcon type="Bug" size={14} />
          <IssueTypeIcon type="Task" size={14} />
          <span>Child Issues</span>
        </div>
        <span className="text-muted-foreground/50">→</span>
        <div className="flex items-center gap-2">
          <IssueTypeIcon type="Sub-task" size={14} />
          <span>Sub-tasks</span>
        </div>
      </div>

      {/* Create Issue Modal - defaulting to Epic type would be nice, but we use the modal's default */}
      <CreateIssueModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
      />

      {/* Issue Detail Panel */}
      {selectedIssue && (
        <IssueDetailPanel
          issue={selectedIssue}
          onClose={() => setSelectedIssue(null)}
        />
      )}
    </div>
  );
}
