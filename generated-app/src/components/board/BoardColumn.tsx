import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { IssueCard, SortableIssueCard } from './IssueCard';
import { cn } from '@/lib/utils';
import type { Issue, BoardColumn as BoardColumnType } from '@/types';

interface BoardColumnProps {
  column: BoardColumnType;
  issues: Issue[];
  onIssueClick: (issue: Issue) => void;
  onQuickCreate: () => void;
}

export function BoardColumn({
  column,
  issues,
  onIssueClick,
  onQuickCreate,
}: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  const isOverLimit = column.wipLimit && issues.length > column.wipLimit;

  return (
    <div
      className={cn(
        'flex flex-col w-[300px] min-w-[300px] bg-muted/50 rounded-lg',
        isOver && 'ring-2 ring-accent'
      )}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b">
        <div className="flex items-center gap-2">
          <h3
            className="font-medium text-sm"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {column.name}
          </h3>
          <span className="text-xs text-muted-foreground bg-background px-1.5 py-0.5 rounded">
            {issues.length}
          </span>
          {column.wipLimit && (
            <span
              className={cn(
                'text-xs px-1.5 py-0.5 rounded',
                isOverLimit
                  ? 'bg-destructive/20 text-destructive'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              / {column.wipLimit}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onQuickCreate}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {/* WIP Warning */}
      {isOverLimit && (
        <div className="flex items-center gap-2 px-3 py-2 bg-destructive/10 text-destructive text-xs">
          <AlertCircle className="w-3 h-3" />
          Over WIP limit
        </div>
      )}

      {/* Cards */}
      <ScrollArea className="flex-1 max-h-[calc(100vh-220px)]">
        <div
          ref={setNodeRef}
          className={cn(
            'p-2 min-h-[100px] space-y-2',
            isOver && 'bg-accent/10'
          )}
        >
          <SortableContext
            items={issues.map((i) => i.id)}
            strategy={verticalListSortingStrategy}
          >
            {issues.map((issue) => (
              <SortableIssueCard
                key={issue.id}
                issue={issue}
                onClick={() => onIssueClick(issue)}
              />
            ))}
          </SortableContext>

          {issues.length === 0 && (
            <div className="py-8 text-center text-xs text-muted-foreground">
              Drop issues here
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
