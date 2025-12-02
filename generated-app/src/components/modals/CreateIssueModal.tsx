import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { db, createIssue } from '@/lib/db';
import { useApp } from '@/context/AppContext';
import { IssueTypeIcon } from '@/components/common/IssueTypeIcon';
import { PriorityIcon } from '@/components/common/PriorityIcon';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { IssueType, Priority, TeamMember } from '@/types';
import { toast } from 'sonner';

interface CreateIssueModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultStatus?: string;
}

export function CreateIssueModal({ open, onOpenChange, defaultStatus }: CreateIssueModalProps) {
  const { currentProject, currentUser } = useApp();

  const [projectId, setProjectId] = useState(currentProject?.id ?? '');
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<IssueType>('Task');
  const [priority, setPriority] = useState<Priority>('Medium');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [storyPoints, setStoryPoints] = useState<string>('');
  const [createAnother, setCreateAnother] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const projects = useLiveQuery(() => db.projects.filter(p => !p.isArchived).toArray(), []);
  const users = useLiveQuery(() => db.users.toArray(), []);

  // Get team members for the selected project
  const teamMembers = useLiveQuery(
    async () => {
      if (!projectId) return [];
      return await db.teamMembers.where('projectId').equals(projectId).toArray();
    },
    [projectId]
  );

  // Combined assignee options (team members + system users)
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Update projectId when currentProject changes or modal opens
  useEffect(() => {
    if (currentProject) {
      setProjectId(currentProject.id);
    }
  }, [currentProject]);

  // Also sync projectId when modal opens to ensure latest project is used
  useEffect(() => {
    if (open && currentProject) {
      setProjectId(currentProject.id);
    }
  }, [open, currentProject]);

  const resetForm = () => {
    setSummary('');
    setDescription('');
    setType('Task');
    setPriority('Medium');
    setAssigneeId('');
    setStoryPoints('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!projectId || !summary.trim()) {
      toast.error('Please fill in required fields');
      return;
    }

    if (!currentUser) {
      toast.error('No user logged in');
      return;
    }

    setIsSubmitting(true);

    try {
      const board = await db.boards.where('projectId').equals(projectId).first();
      const status = defaultStatus ?? board?.columns[0]?.id ?? 'todo';

      await createIssue({
        projectId,
        type,
        status,
        summary: summary.trim(),
        description: description.trim() || undefined,
        priority,
        reporterId: currentUser.id,
        assigneeId: assigneeId || undefined,
        storyPoints: storyPoints ? parseFloat(storyPoints) : undefined,
        labels: [],
        components: [],
      });

      toast.success('Issue created successfully');

      if (createAnother) {
        resetForm();
      } else {
        onOpenChange(false);
        resetForm();
      }
    } catch (error) {
      console.error('Failed to create issue:', error);
      toast.error('Failed to create issue');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle style={{ fontFamily: 'var(--font-display)' }}>
            Create Issue
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Project */}
          {!currentProject && (
            <div className="space-y-2">
              <Label htmlFor="project">Project *</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects?.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded"
                          style={{ backgroundColor: project.color }}
                        />
                        {project.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Issue Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Issue Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as IssueType)}>
              <SelectTrigger>
                <SelectValue>
                  <div className="flex items-center gap-2">
                    <IssueTypeIcon type={type} size={16} />
                    {type}
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {(['Story', 'Bug', 'Task', 'Epic', 'Sub-task'] as IssueType[]).map((t) => (
                  <SelectItem key={t} value={t}>
                    <div className="flex items-center gap-2">
                      <IssueTypeIcon type={t} size={16} />
                      {t}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Summary */}
          <div className="space-y-2">
            <Label htmlFor="summary">Summary *</Label>
            <Input
              id="summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Enter issue summary"
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description (supports markdown)"
              rows={3}
            />
          </div>

          {/* Priority & Assignee row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                <SelectTrigger>
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      <PriorityIcon priority={priority} size={16} />
                      {priority}
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(['Highest', 'High', 'Medium', 'Low', 'Lowest'] as Priority[]).map((p) => (
                    <SelectItem key={p} value={p}>
                      <div className="flex items-center gap-2">
                        <PriorityIcon priority={p} size={16} />
                        {p}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Assignee</Label>
              <Select value={assigneeId || 'unassigned'} onValueChange={(v) => setAssigneeId(v === 'unassigned' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {/* Team Members */}
                  {teamMembers && teamMembers.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Team Members</div>
                      {teamMembers.map((member) => (
                        <SelectItem key={member.userId} value={member.userId}>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-5 w-5">
                              <AvatarFallback style={{ backgroundColor: `${member.color}20`, color: member.color, fontSize: '10px' }}>
                                {getInitials(member.name)}
                              </AvatarFallback>
                            </Avatar>
                            {member.name}
                          </div>
                        </SelectItem>
                      ))}
                    </>
                  )}
                  {/* System Users */}
                  {users && users.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">System Users</div>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-5 w-5">
                              <AvatarFallback style={{ backgroundColor: `${user.color}20`, color: user.color, fontSize: '10px' }}>
                                {getInitials(user.name)}
                              </AvatarFallback>
                            </Avatar>
                            {user.name}
                          </div>
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Story Points */}
          {type !== 'Epic' && (
            <div className="space-y-2">
              <Label htmlFor="storyPoints">Story Points</Label>
              <Input
                id="storyPoints"
                type="number"
                min="0.5"
                max="100"
                step="0.5"
                value={storyPoints}
                onChange={(e) => setStoryPoints(e.target.value)}
                placeholder="e.g., 5"
                className="w-32"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="createAnother"
                checked={createAnother}
                onCheckedChange={(checked) => setCreateAnother(checked as boolean)}
              />
              <Label htmlFor="createAnother" className="text-sm font-normal cursor-pointer">
                Create another
              </Label>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !summary.trim()}
                className="bg-accent hover:bg-accent/90"
              >
                Create
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
