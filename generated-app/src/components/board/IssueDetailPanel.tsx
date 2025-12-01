import { useState, useCallback, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { X, Copy, MoreHorizontal, Trash2, Copy as Clone, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { db, updateIssue, deleteIssue, addComment, createIssue } from '@/lib/db';
import { useApp } from '@/context/AppContext';
import { IssueTypeIcon } from '@/components/common/IssueTypeIcon';
import { PriorityIcon } from '@/components/common/PriorityIcon';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import type { Issue, IssueType, Priority, Comment as CommentType, ActivityLog } from '@/types';

interface IssueDetailPanelProps {
  issue: Issue;
  onClose: () => void;
}

export function IssueDetailPanel({ issue, onClose }: IssueDetailPanelProps) {
  const { currentUser } = useApp();
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [summary, setSummary] = useState(issue.summary);
  const [description, setDescription] = useState(issue.description ?? '');
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [newComment, setNewComment] = useState('');

  // Live queries
  const board = useLiveQuery(
    () => db.boards.where('projectId').equals(issue.projectId).first(),
    [issue.projectId]
  );

  const users = useLiveQuery(() => db.users.toArray(), []);

  const labels = useLiveQuery(
    () => db.labels.where('projectId').equals(issue.projectId).toArray(),
    [issue.projectId]
  );

  const sprints = useLiveQuery(
    () => db.sprints.where('projectId').equals(issue.projectId).toArray(),
    [issue.projectId]
  );

  const epics = useLiveQuery(
    () => db.issues.where('projectId').equals(issue.projectId).and(i => i.type === 'Epic').toArray(),
    [issue.projectId]
  );

  const comments = useLiveQuery(
    () => db.comments.where('issueId').equals(issue.id).toArray(),
    [issue.id]
  );

  const activities = useLiveQuery(
    () => db.activityLog.where('issueId').equals(issue.id).toArray(),
    [issue.id]
  );

  const subTasks = useLiveQuery(
    () => db.issues.where('parentId').equals(issue.id).toArray(),
    [issue.id]
  );

  const childIssues = useLiveQuery(
    () => issue.type === 'Epic'
      ? db.issues.where('epicId').equals(issue.id).toArray()
      : [],
    [issue.id, issue.type]
  );

  const assignee = users?.find(u => u.id === issue.assigneeId);
  const reporter = users?.find(u => u.id === issue.reporterId);

  // Sync state when issue changes
  useEffect(() => {
    setSummary(issue.summary);
    setDescription(issue.description ?? '');
  }, [issue.summary, issue.description]);

  // Handlers
  const handleUpdate = useCallback(
    async (updates: Partial<Issue>) => {
      if (!currentUser) return;
      try {
        await updateIssue(issue.id, updates, currentUser.id);
      } catch (error) {
        console.error('Failed to update issue:', error);
        toast.error('Failed to update issue');
      }
    },
    [issue.id, currentUser]
  );

  const handleSaveSummary = useCallback(async () => {
    if (summary.trim() && summary !== issue.summary) {
      await handleUpdate({ summary: summary.trim() });
    }
    setIsEditingSummary(false);
  }, [summary, issue.summary, handleUpdate]);

  const handleSaveDescription = useCallback(async () => {
    if (description !== issue.description) {
      await handleUpdate({ description: description.trim() || undefined });
    }
    setIsEditingDescription(false);
  }, [description, issue.description, handleUpdate]);

  const handleAddComment = useCallback(async () => {
    if (!newComment.trim() || !currentUser) return;
    try {
      await addComment(issue.id, currentUser.id, newComment.trim());
      setNewComment('');
      toast.success('Comment added');
    } catch (error) {
      console.error('Failed to add comment:', error);
      toast.error('Failed to add comment');
    }
  }, [newComment, currentUser, issue.id]);

  const handleDelete = useCallback(async () => {
    try {
      await deleteIssue(issue.id);
      toast.success('Issue deleted');
      onClose();
    } catch (error) {
      console.error('Failed to delete issue:', error);
      toast.error('Failed to delete issue');
    }
  }, [issue.id, onClose]);

  const handleClone = useCallback(async () => {
    if (!currentUser) return;
    try {
      await createIssue({
        projectId: issue.projectId,
        type: issue.type,
        status: issue.status,
        summary: `${issue.summary} (copy)`,
        description: issue.description,
        priority: issue.priority,
        reporterId: currentUser.id,
        assigneeId: issue.assigneeId,
        epicId: issue.epicId,
        sprintId: issue.sprintId,
        storyPoints: issue.storyPoints,
        labels: [...issue.labels],
        components: [...issue.components],
      });
      toast.success('Issue cloned');
    } catch (error) {
      console.error('Failed to clone issue:', error);
      toast.error('Failed to clone issue');
    }
  }, [issue, currentUser]);

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(`${window.location.origin}/project/${issue.key.split('-')[0]}/board?issue=${issue.key}`);
    toast.success('Link copied to clipboard');
  }, [issue.key]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const completedChildIssues = childIssues?.filter(i => {
    const column = board?.columns.find(c => c.id === i.status);
    return column?.statusCategory === 'done';
  }) ?? [];

  return (
    <div className="fixed inset-y-0 right-0 w-[680px] bg-card border-l shadow-xl z-50 flex flex-col animate-slide-in-right">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <IssueTypeIcon type={issue.type} size={18} />
          <button
            onClick={handleCopyLink}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {issue.key}
          </button>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={handleCopyLink}>
            <Copy className="w-4 h-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleClone}>
                <Clone className="w-4 h-4 mr-2" />
                Clone Issue
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Issue
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Content */}
        <ScrollArea className="flex-1 p-4">
          {/* Summary */}
          <div className="mb-4">
            {isEditingSummary ? (
              <Input
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                onBlur={handleSaveSummary}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveSummary()}
                className="text-xl font-semibold"
                autoFocus
              />
            ) : (
              <h2
                onClick={() => setIsEditingSummary(true)}
                className="text-xl font-semibold cursor-pointer hover:bg-muted/50 rounded px-1 -mx-1"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {issue.summary}
              </h2>
            )}
          </div>

          {/* Status */}
          <div className="mb-6">
            <Select
              value={issue.status}
              onValueChange={(value) => handleUpdate({ status: value })}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {board?.columns.map((col) => (
                  <SelectItem key={col.id} value={col.id}>
                    {col.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="mb-6">
            <Label className="text-sm text-muted-foreground mb-2 block">
              Description
            </Label>
            {isEditingDescription ? (
              <div>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add a description (supports markdown)..."
                  rows={6}
                  className="mb-2"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveDescription}>
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setDescription(issue.description ?? '');
                      setIsEditingDescription(false);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => setIsEditingDescription(true)}
                className="min-h-[100px] p-3 border rounded-md cursor-pointer hover:bg-muted/50 prose prose-sm max-w-none"
              >
                {description ? (
                  <ReactMarkdown>{description}</ReactMarkdown>
                ) : (
                  <span className="text-muted-foreground">
                    Add a description...
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Child Issues (for Epics) */}
          {issue.type === 'Epic' && (
            <div className="mb-6">
              <Label className="text-sm text-muted-foreground mb-2 block">
                Child Issues ({completedChildIssues.length}/{childIssues?.length ?? 0})
              </Label>
              <div className="space-y-2">
                {childIssues?.map((child) => {
                  const isComplete = board?.columns.find(c => c.id === child.status)?.statusCategory === 'done';
                  return (
                    <div
                      key={child.id}
                      className="flex items-center gap-2 p-2 border rounded-md"
                    >
                      <IssueTypeIcon type={child.type} size={14} />
                      <span className="text-xs text-muted-foreground">{child.key}</span>
                      <span className={`flex-1 text-sm ${isComplete ? 'line-through text-muted-foreground' : ''}`}>
                        {child.summary}
                      </span>
                    </div>
                  );
                })}
                {(!childIssues || childIssues.length === 0) && (
                  <p className="text-sm text-muted-foreground">No child issues</p>
                )}
              </div>
            </div>
          )}

          {/* Sub-tasks */}
          {issue.type !== 'Epic' && issue.type !== 'Sub-task' && (
            <div className="mb-6">
              <Label className="text-sm text-muted-foreground mb-2 block">
                Sub-tasks
              </Label>
              <div className="space-y-2">
                {subTasks?.map((task) => {
                  const isComplete = board?.columns.find(c => c.id === task.status)?.statusCategory === 'done';
                  return (
                    <div
                      key={task.id}
                      className="flex items-center gap-2 p-2 border rounded-md"
                    >
                      <input
                        type="checkbox"
                        checked={isComplete}
                        onChange={async () => {
                          if (!currentUser) return;
                          const doneColumn = board?.columns.find(c => c.statusCategory === 'done');
                          const todoColumn = board?.columns.find(c => c.statusCategory === 'todo');
                          await updateIssue(
                            task.id,
                            { status: isComplete ? todoColumn?.id : doneColumn?.id },
                            currentUser.id
                          );
                        }}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <span className="text-xs text-muted-foreground">{task.key}</span>
                      <span className={`flex-1 text-sm ${isComplete ? 'line-through text-muted-foreground' : ''}`}>
                        {task.summary}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Activity */}
          <div>
            <Tabs defaultValue="all">
              <TabsList className="mb-4">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="comments">Comments</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-4">
                {/* Comment input */}
                <div className="flex gap-2">
                  <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    rows={2}
                    className="flex-1"
                  />
                  <Button onClick={handleAddComment} disabled={!newComment.trim()}>
                    Post
                  </Button>
                </div>

                {/* Activity feed */}
                <div className="space-y-3">
                  {[
                    ...(comments?.map((c) => ({
                      type: 'comment' as const,
                      timestamp: c.createdAt,
                      data: c,
                    })) ?? []),
                    ...(activities?.map((a) => ({
                      type: 'activity' as const,
                      timestamp: a.timestamp,
                      data: a,
                    })) ?? []),
                  ]
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                    .map((item, index) => {
                      if (item.type === 'comment') {
                        const comment = item.data as CommentType;
                        const author = users?.find(u => u.id === comment.authorId);
                        return (
                          <div key={`comment-${comment.id}`} className="flex gap-3">
                            <Avatar className="w-8 h-8">
                              <AvatarFallback style={{ backgroundColor: author?.color }}>
                                {author?.name ? getInitials(author.name) : '?'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm">{author?.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                                </span>
                                {comment.isEdited && (
                                  <span className="text-xs text-muted-foreground">(edited)</span>
                                )}
                              </div>
                              <div className="text-sm prose prose-sm max-w-none">
                                <ReactMarkdown>{comment.body}</ReactMarkdown>
                              </div>
                            </div>
                          </div>
                        );
                      } else {
                        const activity = item.data as ActivityLog;
                        const user = users?.find(u => u.id === activity.userId);
                        return (
                          <div key={`activity-${activity.id}`} className="flex gap-3 text-sm text-muted-foreground">
                            <Avatar className="w-8 h-8">
                              <AvatarFallback style={{ backgroundColor: user?.color }}>
                                {user?.name ? getInitials(user.name) : '?'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <span className="font-medium text-foreground">{user?.name}</span>
                              {' '}
                              {activity.action.replace('_', ' ')}
                              {activity.field && (
                                <>
                                  {' '}
                                  <span className="font-medium">{activity.field}</span>
                                </>
                              )}
                              {activity.fromValue && activity.toValue && (
                                <>
                                  {' from '}
                                  <span className="font-medium">{activity.fromValue}</span>
                                  {' to '}
                                  <span className="font-medium">{activity.toValue}</span>
                                </>
                              )}
                              <span className="text-xs block">
                                {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                              </span>
                            </div>
                          </div>
                        );
                      }
                    })}
                </div>
              </TabsContent>

              <TabsContent value="comments" className="space-y-4">
                {/* Comment input */}
                <div className="flex gap-2">
                  <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    rows={2}
                    className="flex-1"
                  />
                  <Button onClick={handleAddComment} disabled={!newComment.trim()}>
                    Post
                  </Button>
                </div>

                {comments?.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((comment) => {
                  const author = users?.find(u => u.id === comment.authorId);
                  return (
                    <div key={comment.id} className="flex gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback style={{ backgroundColor: author?.color }}>
                          {author?.name ? getInitials(author.name) : '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{author?.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                        <div className="text-sm prose prose-sm max-w-none">
                          <ReactMarkdown>{comment.body}</ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </TabsContent>

              <TabsContent value="history" className="space-y-3">
                {activities?.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map((activity) => {
                  const user = users?.find(u => u.id === activity.userId);
                  return (
                    <div key={activity.id} className="flex gap-3 text-sm text-muted-foreground">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback style={{ backgroundColor: user?.color }}>
                          {user?.name ? getInitials(user.name) : '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <span className="font-medium text-foreground">{user?.name}</span>
                        {' '}
                        {activity.action.replace('_', ' ')}
                        {activity.field && (
                          <>
                            {' '}
                            <span className="font-medium">{activity.field}</span>
                          </>
                        )}
                        {activity.fromValue && activity.toValue && (
                          <>
                            {' from '}
                            <span className="font-medium">{activity.fromValue}</span>
                            {' to '}
                            <span className="font-medium">{activity.toValue}</span>
                          </>
                        )}
                        <span className="text-xs block">
                          {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>

        {/* Sidebar */}
        <div className="w-[200px] border-l p-4 bg-muted/30">
          <div className="space-y-4">
            {/* Assignee */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">
                Assignee
              </Label>
              <Select
                value={issue.assigneeId ?? 'unassigned'}
                onValueChange={(value) => handleUpdate({ assigneeId: value === 'unassigned' ? undefined : value })}
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Unassigned">
                    {assignee && (
                      <div className="flex items-center gap-2">
                        <Avatar className="w-5 h-5">
                          <AvatarFallback
                            className="text-[10px]"
                            style={{ backgroundColor: assignee.color }}
                          >
                            {getInitials(assignee.name)}
                          </AvatarFallback>
                        </Avatar>
                        {assignee.name}
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {users?.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="w-5 h-5">
                          <AvatarFallback
                            className="text-[10px]"
                            style={{ backgroundColor: user.color }}
                          >
                            {getInitials(user.name)}
                          </AvatarFallback>
                        </Avatar>
                        {user.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Reporter */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">
                Reporter
              </Label>
              <div className="flex items-center gap-2 text-sm">
                {reporter && (
                  <>
                    <Avatar className="w-5 h-5">
                      <AvatarFallback
                        className="text-[10px]"
                        style={{ backgroundColor: reporter.color }}
                      >
                        {getInitials(reporter.name)}
                      </AvatarFallback>
                    </Avatar>
                    {reporter.name}
                  </>
                )}
              </div>
            </div>

            {/* Priority */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">
                Priority
              </Label>
              <Select
                value={issue.priority}
                onValueChange={(value) => handleUpdate({ priority: value as Priority })}
              >
                <SelectTrigger className="h-8">
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      <PriorityIcon priority={issue.priority} size={14} />
                      {issue.priority}
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(['Highest', 'High', 'Medium', 'Low', 'Lowest'] as Priority[]).map((p) => (
                    <SelectItem key={p} value={p}>
                      <div className="flex items-center gap-2">
                        <PriorityIcon priority={p} size={14} />
                        {p}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sprint */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">
                Sprint
              </Label>
              <Select
                value={issue.sprintId ?? 'backlog'}
                onValueChange={(value) => handleUpdate({ sprintId: value === 'backlog' ? undefined : value })}
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Backlog" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="backlog">Backlog</SelectItem>
                  {sprints?.map((sprint) => (
                    <SelectItem key={sprint.id} value={sprint.id}>
                      {sprint.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Epic */}
            {issue.type !== 'Epic' && (
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">
                  Epic
                </Label>
                <Select
                  value={issue.epicId ?? 'none'}
                  onValueChange={(value) => handleUpdate({ epicId: value === 'none' ? undefined : value })}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {epics?.map((epic) => (
                      <SelectItem key={epic.id} value={epic.id}>
                        {epic.key} - {epic.summary}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Story Points */}
            {issue.type !== 'Epic' && (
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">
                  Story Points
                </Label>
                <Input
                  type="number"
                  min="0.5"
                  max="100"
                  step="0.5"
                  value={issue.storyPoints ?? ''}
                  onChange={(e) =>
                    handleUpdate({
                      storyPoints: e.target.value ? parseFloat(e.target.value) : undefined,
                    })
                  }
                  className="h-8"
                  placeholder="Enter points"
                />
              </div>
            )}

            {/* Timestamps */}
            <div className="pt-4 border-t text-xs text-muted-foreground space-y-1">
              <div>
                Created: {format(new Date(issue.createdAt), 'MMM d, yyyy')}
              </div>
              <div>
                Updated: {format(new Date(issue.updatedAt), 'MMM d, yyyy')}
              </div>
              {issue.resolvedAt && (
                <div>
                  Resolved: {format(new Date(issue.resolvedAt), 'MMM d, yyyy')}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
