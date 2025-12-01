import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useLiveQuery } from 'dexie-react-hooks';
import { Calendar } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { IssueTypeIcon } from '@/components/common/IssueTypeIcon';
import { PriorityIcon } from '@/components/common/PriorityIcon';
import { db } from '@/lib/db';
import { cn } from '@/lib/utils';
import { format, isPast, isToday } from 'date-fns';
import type { Issue } from '@/types';

interface IssueCardProps {
  issue: Issue;
  onClick?: () => void;
  isDragging?: boolean;
}

export function IssueCard({ issue, onClick, isDragging }: IssueCardProps) {
  const assignee = useLiveQuery(
    () => issue.assigneeId ? db.users.get(issue.assigneeId) : null,
    [issue.assigneeId]
  );

  const labels = useLiveQuery(
    () => issue.labels.length > 0 ? db.labels.where('id').anyOf(issue.labels).toArray() : [],
    [issue.labels]
  );

  const isOverdue = issue.dueDate && isPast(new Date(issue.dueDate)) && !isToday(new Date(issue.dueDate));
  const isDueToday = issue.dueDate && isToday(new Date(issue.dueDate));

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-card p-3 rounded-lg border shadow-sm cursor-pointer transition-all',
        'hover:shadow-md hover:-translate-y-0.5',
        isDragging && 'shadow-lg rotate-2 opacity-90'
      )}
    >
      {/* Top row: type, key */}
      <div className="flex items-center gap-2 mb-2">
        <IssueTypeIcon type={issue.type} size={14} />
        <span className="text-xs text-muted-foreground font-medium">
          {issue.key}
        </span>
      </div>

      {/* Summary */}
      <h4 className="text-sm font-medium line-clamp-2 mb-2">{issue.summary}</h4>

      {/* Labels */}
      {labels && labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {labels.slice(0, 3).map((label) => (
            <Badge
              key={label.id}
              variant="outline"
              className="text-[10px] px-1.5 py-0"
              style={{
                backgroundColor: `${label.color}15`,
                borderColor: label.color,
                color: label.color,
              }}
            >
              {label.name}
            </Badge>
          ))}
          {labels.length > 3 && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              +{labels.length - 3}
            </Badge>
          )}
        </div>
      )}

      {/* Bottom row: story points, priority, due date, assignee */}
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-2">
          {issue.storyPoints && (
            <span className="text-xs bg-muted px-1.5 py-0.5 rounded font-medium">
              {issue.storyPoints}
            </span>
          )}
          <PriorityIcon priority={issue.priority} size={14} />
          {issue.dueDate && (
            <span
              className={cn(
                'flex items-center gap-1 text-xs',
                isOverdue && 'text-destructive',
                isDueToday && 'text-warning'
              )}
            >
              <Calendar className="w-3 h-3" />
              {format(new Date(issue.dueDate), 'MMM d')}
            </span>
          )}
        </div>

        {assignee && (
          <Avatar className="w-6 h-6">
            <AvatarFallback
              className="text-[10px]"
              style={{ backgroundColor: assignee.color }}
            >
              {assignee.name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2)}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    </div>
  );
}

interface SortableIssueCardProps {
  issue: Issue;
  onClick?: () => void;
}

export function SortableIssueCard({ issue, onClick }: SortableIssueCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: issue.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <IssueCard issue={issue} onClick={onClick} />
    </div>
  );
}
