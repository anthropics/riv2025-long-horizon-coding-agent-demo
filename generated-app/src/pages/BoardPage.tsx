import { useState, useCallback, useEffect, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
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
  DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Plus, Filter, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { db, updateIssue } from '@/lib/db';
import { triggerConfetti } from '@/lib/confetti';
import { useApp } from '@/context/AppContext';
import { BoardColumn } from '@/components/board/BoardColumn';
import { IssueCard } from '@/components/board/IssueCard';
import { IssueDetailPanel } from '@/components/board/IssueDetailPanel';
import { CreateIssueModal } from '@/components/modals/CreateIssueModal';
import { CompletionStoryModal } from '@/components/modals/CompletionStoryModal';
import type { Issue, BoardColumn as BoardColumnType } from '@/types';
import { toast } from 'sonner';

export function BoardPage() {
  const { projectKey } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentProject, setCurrentProject, currentUser } = useApp();

  const [quickFilter, setQuickFilter] = useState('');
  const [activeIssueId, setActiveIssueId] = useState<string | null>(null);
  const [selectedIssueKey, setSelectedIssueKey] = useState<string | null>(
    searchParams.get('issue')
  );
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createInColumn, setCreateInColumn] = useState<string | undefined>();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [completionStory, setCompletionStory] = useState<{
    isOpen: boolean;
    taskName: string;
    taskKey: string;
    taskType?: string;
  }>({ isOpen: false, taskName: '', taskKey: '' });

  // Load project if not set
  useEffect(() => {
    async function loadProject() {
      if (projectKey && !currentProject) {
        const project = await db.projects.where('key').equals(projectKey).first();
        if (project) {
          setCurrentProject(project);
        }
      }
    }
    loadProject();
  }, [projectKey, currentProject, setCurrentProject]);

  // Live queries
  const project = useLiveQuery(
    () => db.projects.where('key').equals(projectKey ?? '').first(),
    [projectKey]
  );

  const board = useLiveQuery(
    () => project ? db.boards.where('projectId').equals(project.id).first() : null,
    [project?.id]
  );

  const activeSprint = useLiveQuery(
    () => project
      ? db.sprints.where('projectId').equals(project.id).and(s => s.status === 'active').first()
      : null,
    [project?.id]
  );

  const allIssues = useLiveQuery(
    () => project ? db.issues.where('projectId').equals(project.id).toArray() : [],
    [project?.id]
  );

  // Filter issues for board (only active sprint or all if no active sprint)
  const issues = useMemo(() => {
    if (!allIssues) return [];

    let filtered = allIssues.filter(
      (issue) => issue.type !== 'Epic' && !issue.parentId
    );

    // If there's an active sprint, show only sprint issues
    if (activeSprint) {
      filtered = filtered.filter((issue) => issue.sprintId === activeSprint.id);
    }

    // Apply quick filter
    if (quickFilter.trim()) {
      const lowerFilter = quickFilter.toLowerCase();
      filtered = filtered.filter(
        (issue) =>
          issue.summary.toLowerCase().includes(lowerFilter) ||
          issue.key.toLowerCase().includes(lowerFilter)
      );
    }

    return filtered;
  }, [allIssues, activeSprint, quickFilter]);

  // Get issue by key for detail panel
  const selectedIssue = useLiveQuery(
    () => selectedIssueKey
      ? db.issues.filter(i => i.key === selectedIssueKey).first()
      : null,
    [selectedIssueKey]
  );

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Get issues for a specific column
  const getColumnIssues = useCallback(
    (columnId: string) => {
      return issues
        .filter((issue) => issue.status === columnId)
        .sort((a, b) => a.sortOrder - b.sortOrder);
    },
    [issues]
  );

  // Drag handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveIssueId(event.active.id as string);
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    // Can be used for hover effects
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveIssueId(null);

      if (!over || !currentUser) return;

      const activeIssue = issues.find((i) => i.id === active.id);
      if (!activeIssue) return;

      const overId = over.id as string;

      // Check if dropping on a column
      const targetColumn = board?.columns.find((c) => c.id === overId);
      const overIssue = issues.find((i) => i.id === overId);
      const targetColumnId = targetColumn?.id ?? overIssue?.status;

      if (!targetColumnId) return;

      // Calculate new sort order
      const targetColumnIssues = getColumnIssues(targetColumnId);
      let newSortOrder: number;

      if (overIssue) {
        // Dropping on an issue - insert before it
        const overIndex = targetColumnIssues.findIndex((i) => i.id === overIssue.id);
        if (overIndex === 0) {
          newSortOrder = overIssue.sortOrder - 1;
        } else {
          const prevIssue = targetColumnIssues[overIndex - 1];
          newSortOrder = (prevIssue.sortOrder + overIssue.sortOrder) / 2;
        }
      } else {
        // Dropping on column - add to end
        newSortOrder = targetColumnIssues.length > 0
          ? Math.max(...targetColumnIssues.map((i) => i.sortOrder)) + 1
          : 0;
      }

      // Update issue
      try {
        await updateIssue(activeIssue.id, {
          status: targetColumnId,
          sortOrder: newSortOrder,
        }, currentUser.id);

        if (targetColumnId !== activeIssue.status) {
          const column = board?.columns.find((c) => c.id === targetColumnId);
          const previousColumn = board?.columns.find((c) => c.id === activeIssue.status);

          // Check if the issue was moved to a "done" column from a non-done column
          const isMovedToDone = column?.statusCategory === 'done' && previousColumn?.statusCategory !== 'done';

          if (isMovedToDone) {
            // Trigger confetti animation!
            triggerConfetti();
            // Show completion story
            setCompletionStory({
              isOpen: true,
              taskName: activeIssue.summary,
              taskKey: activeIssue.key,
              taskType: activeIssue.type,
            });
          }

          toast.success(`Moved to ${column?.name ?? targetColumnId}`);
        }
      } catch (error) {
        console.error('Failed to update issue:', error);
        toast.error('Failed to move issue');
      }
    },
    [issues, board, currentUser, getColumnIssues]
  );

  const handleIssueClick = useCallback(
    (issue: Issue) => {
      setSelectedIssueKey(issue.key);
      setSearchParams({ issue: issue.key });
    },
    [setSearchParams]
  );

  const handleCloseDetail = useCallback(() => {
    setSelectedIssueKey(null);
    setSearchParams({});
  }, [setSearchParams]);

  const handleQuickCreate = useCallback((columnId: string) => {
    setCreateInColumn(columnId);
    setCreateModalOpen(true);
  }, []);

  const activeIssue = issues.find((i) => i.id === activeIssueId);

  if (!project || !board) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading board...</div>
      </div>
    );
  }

  // Empty state
  if (issues.length === 0 && !quickFilter) {
    return (
      <>
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <div className="text-center max-w-md">
            <h2
              className="text-xl font-semibold mb-2"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Your board is empty
            </h2>
            <p className="text-muted-foreground mb-6">
              {activeSprint
                ? `No issues in ${activeSprint.name}. Add issues to the sprint from the backlog.`
                : 'Create your first issue to get started with the board.'}
            </p>
            <Button
              onClick={() => setCreateModalOpen(true)}
              className="bg-[#E8A87C] hover:bg-[#d4946d] text-white gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Issue
            </Button>
          </div>
        </div>

        {/* Create Issue Modal - must be rendered in empty state too */}
        <CreateIssueModal
          open={createModalOpen}
          onOpenChange={(open) => {
            setCreateModalOpen(open);
            if (!open) setCreateInColumn(undefined);
          }}
          defaultStatus={createInColumn}
        />
      </>
    );
  }

  return (
    <>
      <div className={isFullscreen ? 'fixed inset-0 z-50 bg-background p-6' : ''}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1
              className="text-xl font-semibold"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {board.name}
            </h1>
            {activeSprint && (
              <p className="text-sm text-muted-foreground">
                {activeSprint.name}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Input
              placeholder="Quick filter..."
              value={quickFilter}
              onChange={(e) => setQuickFilter(e.target.value)}
              className="w-48 h-9"
            />
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="w-4 h-4" />
              Filter
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Board */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto pb-4">
            {board.columns
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((column) => {
                const columnIssues = getColumnIssues(column.id);
                return (
                  <BoardColumn
                    key={column.id}
                    column={column}
                    issues={columnIssues}
                    onIssueClick={handleIssueClick}
                    onQuickCreate={() => handleQuickCreate(column.id)}
                  />
                );
              })}
          </div>

          <DragOverlay>
            {activeIssue && (
              <IssueCard issue={activeIssue} isDragging />
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Issue Detail Panel */}
      {selectedIssue && (
        <IssueDetailPanel
          issue={selectedIssue}
          onClose={handleCloseDetail}
        />
      )}

      {/* Create Issue Modal */}
      <CreateIssueModal
        open={createModalOpen}
        onOpenChange={(open) => {
          setCreateModalOpen(open);
          if (!open) setCreateInColumn(undefined);
        }}
        defaultStatus={createInColumn}
      />

      {/* Completion Story Modal */}
      <CompletionStoryModal
        isOpen={completionStory.isOpen}
        onClose={() => setCompletionStory({ ...completionStory, isOpen: false })}
        taskName={completionStory.taskName}
        taskKey={completionStory.taskKey}
        taskType={completionStory.taskType as any}
      />
    </>
  );
}
