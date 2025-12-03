import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Pencil, Trash2, Users, Calendar, ListChecks, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { db, createTeamMember, updateTeamMember, deleteTeamMember, USER_COLORS, getNextUserColor } from '@/lib/db';
import { useApp } from '@/context/AppContext';
import { toast } from 'sonner';
import type { TeamMember, Issue } from '@/types';

export function TeamPage() {
  const { projectKey } = useParams();
  const { currentProject, setCurrentProject, translations } = useApp();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newAvailableWeeks, setNewAvailableWeeks] = useState(4);
  const [newHoursPerWeek, setNewHoursPerWeek] = useState(40);
  const [newColor, setNewColor] = useState(USER_COLORS[0]);

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

  const teamMembers = useLiveQuery(
    () => project ? db.teamMembers.where('projectId').equals(project.id).toArray() : [],
    [project?.id]
  );

  const issues = useLiveQuery(
    () => project ? db.issues.where('projectId').equals(project.id).toArray() : [],
    [project?.id]
  );

  const boards = useLiveQuery(
    () => project ? db.boards.where('projectId').equals(project.id).toArray() : [],
    [project?.id]
  );

  // Calculate team member stats
  const memberStats = useMemo(() => {
    if (!teamMembers || !issues || !boards?.length) return {};

    const stats: Record<string, { assignedCount: number; totalPoints: number; completedPoints: number }> = {};

    const board = boards[0];
    const doneColumnIds = board.columns.filter(c => c.statusCategory === 'done').map(c => c.id);

    teamMembers.forEach(member => {
      const assignedIssues = issues.filter(i => i.assigneeId === member.userId);
      const completedIssues = assignedIssues.filter(i => doneColumnIds.includes(i.status));

      stats[member.id] = {
        assignedCount: assignedIssues.length,
        totalPoints: assignedIssues.reduce((sum, i) => sum + (i.storyPoints ?? 0), 0),
        completedPoints: completedIssues.reduce((sum, i) => sum + (i.storyPoints ?? 0), 0),
      };
    });

    return stats;
  }, [teamMembers, issues, boards]);

  // Calculate total capacity
  const totalCapacity = useMemo(() => {
    if (!teamMembers) return { totalWeeks: 0, totalHours: 0 };
    return teamMembers.reduce((acc, member) => ({
      totalWeeks: acc.totalWeeks + member.availableWeeks,
      totalHours: acc.totalHours + (member.availableWeeks * (member.hoursPerWeek ?? 40)),
    }), { totalWeeks: 0, totalHours: 0 });
  }, [teamMembers]);

  const handleCreate = async () => {
    if (!project || !newName.trim()) return;
    try {
      // Generate a unique userId for the team member
      const userId = `team-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      await createTeamMember({
        projectId: project.id,
        userId,
        name: newName.trim(),
        email: newEmail.trim() || undefined,
        color: newColor,
        availableWeeks: newAvailableWeeks,
        hoursPerWeek: newHoursPerWeek,
      });

      resetForm();
      setIsCreateOpen(false);
      toast.success(translations.teamMemberAdded);
    } catch (error) {
      toast.error(translations.failedToAddTeamMember);
    }
  };

  const handleUpdate = async () => {
    if (!editingMember || !editingMember.name.trim()) return;
    try {
      await updateTeamMember(editingMember.id, {
        name: editingMember.name.trim(),
        email: editingMember.email?.trim() || undefined,
        color: editingMember.color,
        availableWeeks: editingMember.availableWeeks,
        hoursPerWeek: editingMember.hoursPerWeek,
      });
      setEditingMember(null);
      toast.success(translations.teamMemberUpdated);
    } catch (error) {
      toast.error(translations.failedToUpdateTeamMember);
    }
  };

  const handleDelete = async (memberId: string) => {
    try {
      await deleteTeamMember(memberId);
      toast.success(translations.teamMemberRemoved);
    } catch (error) {
      toast.error(translations.failedToRemoveTeamMember);
    }
  };

  const resetForm = () => {
    setNewName('');
    setNewEmail('');
    setNewAvailableWeeks(4);
    setNewHoursPerWeek(40);
    const existingColors = teamMembers?.map(m => m.color) ?? [];
    setNewColor(getNextUserColor(existingColors));
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (!project) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">{translations.loading}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#7B2332]/10">
            <Users className="w-5 h-5 text-[#7B2332]" />
          </div>
          <div>
            <h1 className="text-xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
              {translations.teamTitle}
            </h1>
            <p className="text-sm text-muted-foreground">
              {translations.teamDescription} {project.name}
            </p>
          </div>
        </div>
        <Button onClick={() => { resetForm(); setIsCreateOpen(true); }} className="bg-[#E8A87C] hover:bg-[#d4946d] text-white gap-2">
          <Plus className="w-4 h-4" />
          {translations.addTeamMember}
        </Button>
      </div>

      {/* Team Capacity Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border rounded-lg p-4 bg-card">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Users className="w-4 h-4" />
            <span className="text-sm">{translations.teamSize}</span>
          </div>
          <p className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
            {teamMembers?.length ?? 0}
          </p>
        </div>
        <div className="border rounded-lg p-4 bg-card">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Calendar className="w-4 h-4" />
            <span className="text-sm">{translations.totalAvailableWeeks}</span>
          </div>
          <p className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
            {totalCapacity.totalWeeks}
          </p>
        </div>
        <div className="border rounded-lg p-4 bg-card">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <ListChecks className="w-4 h-4" />
            <span className="text-sm">{translations.totalCapacityHours}</span>
          </div>
          <p className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
            {totalCapacity.totalHours}
          </p>
        </div>
      </div>

      {/* Team Members List */}
      {teamMembers && teamMembers.length > 0 ? (
        <div className="border rounded-lg divide-y">
          <div className="grid grid-cols-12 gap-4 p-4 bg-muted/50 text-sm font-medium text-muted-foreground">
            <div className="col-span-4">{translations.member}</div>
            <div className="col-span-2 text-center">{translations.availableWeeks}</div>
            <div className="col-span-2 text-center">{translations.hoursPerWeek}</div>
            <div className="col-span-2 text-center">{translations.assignedTasks}</div>
            <div className="col-span-2 text-center">{translations.actions}</div>
          </div>
          {teamMembers.map((member) => {
            const stats = memberStats[member.id] || { assignedCount: 0, totalPoints: 0, completedPoints: 0 };
            const progress = stats.totalPoints > 0 ? (stats.completedPoints / stats.totalPoints) * 100 : 0;

            return (
              <div key={member.id} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-muted/30 transition-colors">
                <div className="col-span-4 flex items-center gap-3">
                  <Avatar className="h-10 w-10 border-2" style={{ borderColor: member.color }}>
                    <AvatarFallback style={{ backgroundColor: `${member.color}20`, color: member.color }} className="font-medium">
                      {getInitials(member.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{member.name}</p>
                    {member.email && (
                      <p className="text-xs text-muted-foreground">{member.email}</p>
                    )}
                  </div>
                </div>
                <div className="col-span-2 text-center">
                  <Badge variant="secondary" className="font-mono">
                    {member.availableWeeks} {member.availableWeeks !== 1 ? 'weeks' : 'week'}
                  </Badge>
                </div>
                <div className="col-span-2 text-center">
                  <span className="text-sm text-muted-foreground">{member.hoursPerWeek ?? 40}h</span>
                </div>
                <div className="col-span-2 text-center">
                  <div className="space-y-1">
                    <span className="text-sm font-medium">{stats.assignedCount}</span>
                    {stats.totalPoints > 0 && (
                      <div className="flex items-center gap-2">
                        <Progress value={progress} className="h-1.5" />
                        <span className="text-xs text-muted-foreground">{stats.completedPoints}/{stats.totalPoints} pts</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="col-span-2 flex justify-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditingMember(member)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => handleDelete(member.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="border rounded-lg p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 rounded-full bg-muted">
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-medium" style={{ fontFamily: 'var(--font-display)' }}>{translations.noTeamMembersYet}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {translations.addTeamMemberDesc}
              </p>
            </div>
            <Button onClick={() => { resetForm(); setIsCreateOpen(true); }} className="bg-[#E8A87C] hover:bg-[#d4946d] text-white gap-2">
              <Plus className="w-4 h-4" />
              {translations.addFirstTeamMember}
            </Button>
          </div>
        </div>
      )}

      {/* Capacity Info */}
      {teamMembers && teamMembers.length > 0 && (
        <div className="border rounded-lg p-4 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-amber-900 dark:text-amber-100" style={{ fontFamily: 'var(--font-display)' }}>
                {translations.capacityPlanningTip}
              </h4>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                {translations.capacityPlanningTipDesc}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'var(--font-display)' }}>{translations.addTeamMember}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="name">{translations.nameRequired}</Label>
              <Input
                id="name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g., John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{translations.emailOptional}</Label>
              <Input
                id="email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="e.g., john@example.com"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="availableWeeks">{translations.availableWeeks}</Label>
                <Select
                  value={newAvailableWeeks.toString()}
                  onValueChange={(v) => setNewAvailableWeeks(parseInt(v))}
                >
                  <SelectTrigger id="availableWeeks">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 52].map((w) => (
                      <SelectItem key={w} value={w.toString()}>{w} week{w !== 1 ? 's' : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="hoursPerWeek">{translations.hoursPerWeek}</Label>
                <Select
                  value={newHoursPerWeek.toString()}
                  onValueChange={(v) => setNewHoursPerWeek(parseInt(v))}
                >
                  <SelectTrigger id="hoursPerWeek">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[8, 16, 20, 24, 30, 32, 35, 40].map((h) => (
                      <SelectItem key={h} value={h.toString()}>{h} hours</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{translations.avatarColor}</Label>
              <div className="flex flex-wrap gap-2">
                {USER_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewColor(c)}
                    className={`w-7 h-7 rounded-full transition-transform ${newColor === c ? 'ring-2 ring-offset-2 ring-foreground scale-110' : 'hover:scale-105'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <span className="text-sm text-muted-foreground">{translations.preview}</span>
              <Avatar className="h-10 w-10 border-2" style={{ borderColor: newColor }}>
                <AvatarFallback style={{ backgroundColor: `${newColor}20`, color: newColor }} className="font-medium">
                  {getInitials(newName || 'JD')}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium">{newName || 'John Doe'}</span>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>{translations.cancel}</Button>
              <Button onClick={handleCreate} disabled={!newName.trim()} className="bg-[#E8A87C] hover:bg-[#d4946d] text-white">
                {translations.addMember}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingMember} onOpenChange={(open) => !open && setEditingMember(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'var(--font-display)' }}>{translations.editTeamMember}</DialogTitle>
          </DialogHeader>
          {editingMember && (
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">{translations.nameRequired}</Label>
                <Input
                  id="edit-name"
                  value={editingMember.name}
                  onChange={(e) => setEditingMember({ ...editingMember, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">{translations.emailOptional}</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editingMember.email ?? ''}
                  onChange={(e) => setEditingMember({ ...editingMember, email: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-availableWeeks">{translations.availableWeeks}</Label>
                  <Select
                    value={editingMember.availableWeeks.toString()}
                    onValueChange={(v) => setEditingMember({ ...editingMember, availableWeeks: parseInt(v) })}
                  >
                    <SelectTrigger id="edit-availableWeeks">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 52].map((w) => (
                        <SelectItem key={w} value={w.toString()}>{w} week{w !== 1 ? 's' : ''}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-hoursPerWeek">{translations.hoursPerWeek}</Label>
                  <Select
                    value={(editingMember.hoursPerWeek ?? 40).toString()}
                    onValueChange={(v) => setEditingMember({ ...editingMember, hoursPerWeek: parseInt(v) })}
                  >
                    <SelectTrigger id="edit-hoursPerWeek">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[8, 16, 20, 24, 30, 32, 35, 40].map((h) => (
                        <SelectItem key={h} value={h.toString()}>{h} hours</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>{translations.avatarColor}</Label>
                <div className="flex flex-wrap gap-2">
                  {USER_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEditingMember({ ...editingMember, color: c })}
                      className={`w-7 h-7 rounded-full transition-transform ${editingMember.color === c ? 'ring-2 ring-offset-2 ring-foreground scale-110' : 'hover:scale-105'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setEditingMember(null)}>{translations.cancel}</Button>
                <Button onClick={handleUpdate} disabled={!editingMember.name.trim()} className="bg-[#E8A87C] hover:bg-[#d4946d] text-white">
                  {translations.saveChanges}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
