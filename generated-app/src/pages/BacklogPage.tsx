import { useState, useCallback, useMemo, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, ChevronDown, ChevronRight, Play, Check, Calendar, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { db, updateIssue, createSprint, startSprint, completeSprint } from '@/lib/db';
import { useApp } from '@/context/AppContext';
import { IssueTypeIcon } from '@/components/common/IssueTypeIcon';
import { PriorityIcon } from '@/components/common/PriorityIcon';
import { CreateIssueModal } from '@/components/modals/CreateIssueModal';
import { CreateSprintModal } from '@/components/modals/CreateSprintModal';
import { IssueDetailPanel } from '@/components/board/IssueDetailPanel';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Issue, Sprint } from '@/types';

export function BacklogPage() {
  const { projectKey } = useParams();
  const { currentProject, setCurrentProject, currentUser } = useApp();
  const [quickFilter, setQuickFilter] = useState('');
  const [createIssueOpen, setCreateIssueOpen] = useState(false);
  const [createSprintOpen, setCreateSprintOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [draggingIssue, setDraggingIssue] = useState<Issue | null>(null);
  const [expandedSprints, setExpandedSprints] = useState<Set<string>>(new Set(['backlog']));

  // Load project if needed
  useEffect(() => {
    async function loadProject() {
      if (projectKey && !currentProject) {
        const project = await db.projects.where('key').equals(projectKey).first();
        if (project) setCurrentProject(project);
      }
    }
    loadProject();
  }, [projectKey, currentProject, setCurrentProject]);

  // Live queries
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

  const users = useLiveQuery(() => db.users.toArray(), []);

  const labels = useLiveQuery(
    () => project
      ? db.labels.where('projectId').equals(project.id).toArray()
      : [],
    [project?.id]
  );

  const board = useLiveQuery(
    () => project
      ? db.boards.where('projectId').equals(project.id).first()
      : null,
    [project?.id]
  );

  // Filter issues (exclude epics and sub-tasks)
  const issues = useMemo(() => {
    if (!allIssues) return [];
    let filtered = allIssues.filter(i => i.type !== 'Epic' && !i.parentId);

    if (quickFilter.trim()) {
      const lower = quickFilter.toLowerCase();
      filtered = filtered.filter(
        i => i.summary.toLowerCase().includes(lower) || i.key.toLowerCase().includes(lower)
      );
    }

    return filtered.sort((a, b) => a.sortOrder - b.sortOrder);
  }, [allIssues, quickFilter]);

  // Group issues by sprint
  const backlogIssues = issues.filter(i => !i.sprintId);
  const sprintIssues = useMemo(() => {
    const map = new Map<string, Issue[]>();
    sprints?.forEach(s => {
      map.set(s.id, issues.filter(i => i.sprintId === s.id));
    });
    return map;
  }, [issues, sprints]);

  // Calculate story points
  const getStoryPoints = (issueList: Issue[]) => issueList.reduce((sum, i) => sum + (i.storyPoints ?? 0), 0);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = useCallback((e: DragStartEvent) => {
    const issue = issues.find(i => i.id === e.active.id);
    if (issue) setDraggingIssue(issue);
  }, [issues]);

  const handleDragEnd = useCallback(async (e: DragEndEvent) => {
    setDraggingIssue(null);
    if (!currentUser) return;

    const { active, over } = e;
    if (!over) return;

    const activeIssue = issues.find(i => i.id === active.id);
    if (!activeIssue) return;

    const overId = String(over.id);

    // Check if dropping on a sprint container
    if (overId.startsWith('sprint-')) {
      const sprintId = overId.replace('sprint-', '');
      const newSprintId = sprintId === 'backlog' ? undefined : sprintId;

      if (activeIssue.sprintId !== newSprintId) {
        await updateIssue(activeIssue.id, { sprintId: newSprintId }, currentUser.id);
        toast.success(newSprintId ? 'Added to sprint' : 'Moved to backlog');
      }
    }
  }, [issues, currentUser]);

  const toggleSprint = (id: string) => {
    setExpandedSprints(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleStartSprint = async (sprintId: string) => {
    try {
      await startSprint(sprintId);
      toast.success('Sprint started');
    } catch (error) {
      toast.error('Failed to start sprint');
    }
  };

  const handleCompleteSprint = async (sprintId: string) => {
    try {
      await completeSprint(sprintId, 'backlog');
      toast.success('Sprint completed');
    } catch (error) {
      toast.error('Failed to complete sprint');
    }
  };

  if (!project) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading...</div>;
  }

  // Sort sprints: active first, then future, then completed
  const sortedSprints = [...(sprints ?? [])].sort((a, b) => {
    const order = { active: 0, future: 1, completed: 2 };
    return order[a.status] - order[b.status];
  });

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
              Backlog
            </h1>
            <p className="text-sm text-muted-foreground">
              {issues.length} issues • {getStoryPoints(issues)} story points
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Input
              placeholder="Filter issues..."
              value={quickFilter}
              onChange={(e) => setQuickFilter(e.target.value)}
              className="w-48 h-9"
            />
            <Button variant="outline" size="sm" onClick={() => setCreateSprintOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Sprint
            </Button>
            <Button
              size="sm"
              onClick={() => setCreateIssueOpen(true)}
              className="bg-[#D4A373] hover:bg-[#c4935f] text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Issue
            </Button>
          </div>
        </div>

        {/* Sprints and Backlog */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="space-y-4">
            {/* Sprints */}
            {sortedSprints.filter(s => s.status !== 'completed').map((sprint) => {
              const sprintIssueList = sprintIssues.get(sprint.id) ?? [];
              const completedPoints = sprintIssueList
                .filter(i => board?.columns.find(c => c.id === i.status)?.statusCategory === 'done')
                .reduce((sum, i) => sum + (i.storyPoints ?? 0), 0);
              const totalPoints = getStoryPoints(sprintIssueList);
              const isExpanded = expandedSprints.has(sprint.id);

              return (
                <Collapsible key={sprint.id} open={isExpanded} onOpenChange={() => toggleSprint(sprint.id)}>
                  <div className="border rounded-lg bg-card">
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50">
                        <div className="flex items-center gap-3">
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{sprint.name}</span>
                              {sprint.status === 'active' && (
                                <Badge className="bg-[#40916C] text-white">Active</Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {sprint.startDate && sprint.endDate && (
                                <span>
                                  {format(new Date(sprint.startDate), 'MMM d')} - {format(new Date(sprint.endDate), 'MMM d')}
                                </span>
                              )}
                              {' • '}
                              {sprintIssueList.length} issues • {completedPoints}/{totalPoints} points
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                          {sprint.status === 'future' && (
                            <Button size="sm" variant="outline" onClick={() => handleStartSprint(sprint.id)}>
                              <Play className="w-3 h-3 mr-1" />
                              Start
                            </Button>
                          )}
                          {sprint.status === 'active' && (
                            <Button size="sm" variant="outline" onClick={() => handleCompleteSprint(sprint.id)}>
                              <Check className="w-3 h-3 mr-1" />
                              Complete
                            </Button>
                          )}
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div
                        id={`sprint-${sprint.id}`}
                        className="p-2 border-t min-h-[60px]"
                      >
                        <SortableContext items={sprintIssueList.map(i => i.id)} strategy={verticalListSortingStrategy}>
                          {sprintIssueList.length > 0 ? (
                            sprintIssueList.map(issue => (
                              <BacklogIssueRow
                                key={issue.id}
                                issue={issue}
                                users={users}
                                labels={labels}
                                onClick={() => setSelectedIssue(issue)}
                              />
                            ))
                          ) : (
                            <div className="text-sm text-muted-foreground text-center py-4">
                              Drag issues here to add to sprint
                            </div>
                          )}
                        </SortableContext>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            })}

            {/* Backlog */}
            <Collapsible open={expandedSprints.has('backlog')} onOpenChange={() => toggleSprint('backlog')}>
              <div className="border rounded-lg bg-card">
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50">
                    <div className="flex items-center gap-3">
                      {expandedSprints.has('backlog') ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      <div>
                        <span className="font-medium">Backlog</span>
                        <div className="text-xs text-muted-foreground">
                          {backlogIssues.length} issues • {getStoryPoints(backlogIssues)} story points
                        </div>
                      </div>
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div
                    id="sprint-backlog"
                    className="p-2 border-t min-h-[100px]"
                  >
                    <SortableContext items={backlogIssues.map(i => i.id)} strategy={verticalListSortingStrategy}>
                      {backlogIssues.length > 0 ? (
                        backlogIssues.map(issue => (
                          <BacklogIssueRow
                            key={issue.id}
                            issue={issue}
                            users={users}
                            labels={labels}
                            onClick={() => setSelectedIssue(issue)}
                          />
                        ))
                      ) : (
                        <div className="text-sm text-muted-foreground text-center py-8">
                          No issues in backlog
                        </div>
                      )}
                    </SortableContext>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          </div>

          <DragOverlay>
            {draggingIssue && (
              <div className="bg-card border rounded-lg p-2 shadow-lg opacity-90">
                <div className="flex items-center gap-2">
                  <IssueTypeIcon type={draggingIssue.type} size={14} />
                  <span className="text-xs text-muted-foreground">{draggingIssue.key}</span>
                  <span className="text-sm">{draggingIssue.summary}</span>
                </div>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      <CreateIssueModal open={createIssueOpen} onOpenChange={setCreateIssueOpen} />
      <CreateSprintModal open={createSprintOpen} onOpenChange={setCreateSprintOpen} projectId={project.id} />
      {selectedIssue && <IssueDetailPanel issue={selectedIssue} onClose={() => setSelectedIssue(null)} />}
    </>
  );
}

interface BacklogIssueRowProps {
  issue: Issue;
  users?: Array<{ id: string; name: string; color: string }>;
  labels?: Array<{ id: string; name: string; color: string }>;
  onClick: () => void;
}

function BacklogIssueRow({ issue, users, labels, onClick }: BacklogIssueRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: issue.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const assignee = users?.find(u => u.id === issue.assigneeId);
  const issueLabels = labels?.filter(l => issue.labels.includes(l.id)) ?? [];

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 rounded-md cursor-pointer group"
    >
      <div {...attributes} {...listeners} className="opacity-0 group-hover:opacity-100 cursor-grab">
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </div>
      <IssueTypeIcon type={issue.type} size={16} />
      <span className="text-xs text-muted-foreground font-medium w-16">{issue.key}</span>
      <span className="flex-1 text-sm truncate">{issue.summary}</span>

      {issue.storyPoints && (
        <span className="text-xs bg-muted px-1.5 py-0.5 rounded font-medium">
          {issue.storyPoints}
        </span>
      )}

      <PriorityIcon priority={issue.priority} size={14} />

      {issueLabels.slice(0, 2).map(label => (
        <Badge
          key={label.id}
          variant="outline"
          className="text-[10px] px-1.5 py-0"
          style={{ backgroundColor: `${label.color}15`, borderColor: label.color, color: label.color }}
        >
          {label.name}
        </Badge>
      ))}

      {assignee && (
        <Avatar className="w-6 h-6">
          <AvatarFallback className="text-[10px]" style={{ backgroundColor: assignee.color }}>
            {getInitials(assignee.name)}
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
