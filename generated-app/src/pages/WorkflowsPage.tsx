import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Pencil, Trash2, CheckCircle, Circle, ArrowRight, GripVertical, Copy, GitBranch } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { db, createWorkflow, updateWorkflow, deleteWorkflow, initializeDefaultWorkflow, DEFAULT_WORKFLOW_ID } from '@/lib/db';
import { toast } from 'sonner';
import type { Workflow, WorkflowStatus, WorkflowTransition, StatusCategory } from '@/types';

const STATUS_CATEGORY_COLORS: Record<StatusCategory, string> = {
  todo: '#6B7280',
  in_progress: '#3B82F6',
  done: '#22C55E',
};

const STATUS_CATEGORY_LABELS: Record<StatusCategory, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  done: 'Done',
};

export function WorkflowsPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null);
  const [deleteConfirmWorkflow, setDeleteConfirmWorkflow] = useState<Workflow | null>(null);

  // Form state for creating/editing
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formStatuses, setFormStatuses] = useState<WorkflowStatus[]>([]);
  const [formTransitions, setFormTransitions] = useState<WorkflowTransition[]>([]);

  // Initialize default workflow on mount
  useEffect(() => {
    initializeDefaultWorkflow();
  }, []);

  const workflows = useLiveQuery(() => db.workflows.toArray(), []);

  const projectsUsingWorkflow = useLiveQuery(async () => {
    const projects = await db.projects.toArray();
    const usage: Record<string, number> = {};
    workflows?.forEach((w) => {
      usage[w.id] = projects.filter((p) => p.workflowId === w.id).length;
    });
    // Count projects using default workflow (no workflowId or default)
    const defaultCount = projects.filter((p) => !p.workflowId || p.workflowId === DEFAULT_WORKFLOW_ID).length;
    usage[DEFAULT_WORKFLOW_ID] = defaultCount;
    return usage;
  }, [workflows]);

  const resetForm = () => {
    setFormName('');
    setFormDescription('');
    setFormStatuses([
      { id: uuidv4(), name: 'Open', statusCategory: 'todo', sortOrder: 0 },
      { id: uuidv4(), name: 'In Progress', statusCategory: 'in_progress', sortOrder: 1 },
      { id: uuidv4(), name: 'Done', statusCategory: 'done', sortOrder: 2 },
    ]);
    setFormTransitions([]);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  const openEditDialog = (workflow: Workflow) => {
    setFormName(workflow.name);
    setFormDescription(workflow.description ?? '');
    setFormStatuses([...workflow.statuses]);
    setFormTransitions([...workflow.transitions]);
    setEditingWorkflow(workflow);
  };

  const handleCreate = async () => {
    if (!formName.trim()) return;
    if (formStatuses.length < 2) {
      toast.error('A workflow needs at least 2 statuses');
      return;
    }

    try {
      await createWorkflow({
        name: formName.trim(),
        description: formDescription.trim() || undefined,
        statuses: formStatuses,
        transitions: formTransitions,
        isDefault: false,
      });
      setIsCreateOpen(false);
      resetForm();
      toast.success('Workflow created');
    } catch (error) {
      toast.error('Failed to create workflow');
    }
  };

  const handleUpdate = async () => {
    if (!editingWorkflow || !formName.trim()) return;
    if (formStatuses.length < 2) {
      toast.error('A workflow needs at least 2 statuses');
      return;
    }

    try {
      await updateWorkflow(editingWorkflow.id, {
        name: formName.trim(),
        description: formDescription.trim() || undefined,
        statuses: formStatuses,
        transitions: formTransitions,
      });
      setEditingWorkflow(null);
      resetForm();
      toast.success('Workflow updated');
    } catch (error) {
      toast.error('Failed to update workflow');
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmWorkflow) return;
    try {
      await deleteWorkflow(deleteConfirmWorkflow.id);
      setDeleteConfirmWorkflow(null);
      toast.success('Workflow deleted');
    } catch (error) {
      toast.error('Failed to delete workflow');
    }
  };

  const handleDuplicate = async (workflow: Workflow) => {
    try {
      await createWorkflow({
        name: `${workflow.name} (Copy)`,
        description: workflow.description,
        statuses: workflow.statuses.map((s) => ({ ...s, id: uuidv4() })),
        transitions: workflow.transitions,
        isDefault: false,
      });
      toast.success('Workflow duplicated');
    } catch (error) {
      toast.error('Failed to duplicate workflow');
    }
  };

  // Status management within form
  const addStatus = () => {
    const newStatus: WorkflowStatus = {
      id: uuidv4(),
      name: '',
      statusCategory: 'todo',
      sortOrder: formStatuses.length,
    };
    setFormStatuses([...formStatuses, newStatus]);
  };

  const updateStatus = (index: number, updates: Partial<WorkflowStatus>) => {
    const updated = [...formStatuses];
    updated[index] = { ...updated[index], ...updates };
    setFormStatuses(updated);
  };

  const removeStatus = (index: number) => {
    const statusId = formStatuses[index].id;
    // Remove related transitions
    setFormTransitions(formTransitions.filter(
      (t) => t.fromStatusId !== statusId && t.toStatusId !== statusId
    ));
    // Remove status
    const updated = formStatuses.filter((_, i) => i !== index);
    // Update sort orders
    updated.forEach((s, i) => (s.sortOrder = i));
    setFormStatuses(updated);
  };

  const moveStatus = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === formStatuses.length - 1) return;
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const updated = [...formStatuses];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    updated.forEach((s, i) => (s.sortOrder = i));
    setFormStatuses(updated);
  };

  // Transition management
  const toggleTransition = (fromId: string, toId: string) => {
    const exists = formTransitions.some(
      (t) => t.fromStatusId === fromId && t.toStatusId === toId
    );
    if (exists) {
      setFormTransitions(
        formTransitions.filter(
          (t) => !(t.fromStatusId === fromId && t.toStatusId === toId)
        )
      );
    } else {
      setFormTransitions([...formTransitions, { fromStatusId: fromId, toStatusId: toId }]);
    }
  };

  const hasTransition = (fromId: string, toId: string) => {
    return formTransitions.some(
      (t) => t.fromStatusId === fromId && t.toStatusId === toId
    );
  };

  const WorkflowForm = () => (
    <div className="space-y-6">
      {/* Basic Info */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="workflow-name">Name *</Label>
          <Input
            id="workflow-name"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="e.g., Simple Workflow, Bug Tracking"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="workflow-description">Description</Label>
          <Textarea
            id="workflow-description"
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
            placeholder="Describe when this workflow should be used"
            rows={2}
          />
        </div>
      </div>

      {/* Statuses */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Statuses</Label>
          <Button type="button" variant="outline" size="sm" onClick={addStatus} className="gap-1">
            <Plus className="w-3 h-3" />
            Add Status
          </Button>
        </div>
        <div className="space-y-2">
          {formStatuses.map((status, index) => (
            <div key={status.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
              <GripVertical className="w-4 h-4 text-muted-foreground cursor-move" />
              <Input
                value={status.name}
                onChange={(e) => updateStatus(index, { name: e.target.value })}
                placeholder="Status name"
                className="flex-1"
              />
              <Select
                value={status.statusCategory}
                onValueChange={(v) => updateStatus(index, { statusCategory: v as StatusCategory })}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => moveStatus(index, 'up')}
                  disabled={index === 0}
                >
                  <span className="text-xs">↑</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => moveStatus(index, 'down')}
                  disabled={index === formStatuses.length - 1}
                >
                  <span className="text-xs">↓</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={() => removeStatus(index)}
                  disabled={formStatuses.length <= 2}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Transitions */}
      {formStatuses.length >= 2 && (
        <div className="space-y-3">
          <Label>Transitions (click to toggle)</Label>
          <div className="border rounded-lg p-4 bg-muted/30">
            <div className="grid gap-2">
              {formStatuses.map((fromStatus) => (
                <div key={fromStatus.id} className="flex items-center gap-2 flex-wrap">
                  <Badge
                    style={{
                      backgroundColor: `${STATUS_CATEGORY_COLORS[fromStatus.statusCategory]}20`,
                      borderColor: STATUS_CATEGORY_COLORS[fromStatus.statusCategory],
                      color: STATUS_CATEGORY_COLORS[fromStatus.statusCategory],
                    }}
                    className="min-w-[100px] justify-center"
                  >
                    {fromStatus.name || 'Unnamed'}
                  </Badge>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  <div className="flex gap-1 flex-wrap">
                    {formStatuses
                      .filter((s) => s.id !== fromStatus.id)
                      .map((toStatus) => (
                        <button
                          key={toStatus.id}
                          type="button"
                          onClick={() => toggleTransition(fromStatus.id, toStatus.id)}
                          className={`px-2 py-1 text-xs rounded border transition-colors ${
                            hasTransition(fromStatus.id, toStatus.id)
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-background border-border hover:bg-muted'
                          }`}
                        >
                          {toStatus.name || 'Unnamed'}
                        </button>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Define which status transitions are allowed. Click a status to enable/disable the transition.
          </p>
        </div>
      )}

      {/* Preview */}
      <div className="space-y-3">
        <Label>Preview</Label>
        <div className="flex items-center gap-2 flex-wrap">
          {formStatuses
            .slice()
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((status, index, arr) => (
              <div key={status.id} className="flex items-center gap-2">
                <Badge
                  style={{
                    backgroundColor: `${STATUS_CATEGORY_COLORS[status.statusCategory]}20`,
                    borderColor: STATUS_CATEGORY_COLORS[status.statusCategory],
                    color: STATUS_CATEGORY_COLORS[status.statusCategory],
                  }}
                >
                  {status.name || 'Unnamed'}
                </Badge>
                {index < arr.length - 1 && (
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
            Workflows
          </h1>
          <p className="text-sm text-muted-foreground">
            Create and manage workflows to define how issues transition between statuses
          </p>
        </div>
        <Button onClick={openCreateDialog} className="bg-[#E8A87C] hover:bg-[#d4946d] text-white gap-2">
          <Plus className="w-4 h-4" />
          Create Workflow
        </Button>
      </div>

      {/* Workflows List */}
      <div className="grid gap-4">
        {workflows?.map((workflow) => (
          <Card key={workflow.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <GitBranch className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {workflow.name}
                      {workflow.isDefault && (
                        <Badge variant="secondary" className="text-xs">Default</Badge>
                      )}
                    </CardTitle>
                    {workflow.description && (
                      <CardDescription className="mt-1">{workflow.description}</CardDescription>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDuplicate(workflow)}
                    title="Duplicate"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  {!workflow.isDefault && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(workflow)}
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => setDeleteConfirmWorkflow(workflow)}
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Statuses flow */}
              <div className="flex items-center gap-2 flex-wrap mb-3">
                {workflow.statuses
                  .slice()
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((status, index, arr) => (
                    <div key={status.id} className="flex items-center gap-2">
                      <Badge
                        style={{
                          backgroundColor: `${STATUS_CATEGORY_COLORS[status.statusCategory]}20`,
                          borderColor: STATUS_CATEGORY_COLORS[status.statusCategory],
                          color: STATUS_CATEGORY_COLORS[status.statusCategory],
                        }}
                      >
                        {status.name}
                      </Badge>
                      {index < arr.length - 1 && (
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  ))}
              </div>
              {/* Usage count */}
              <div className="text-sm text-muted-foreground">
                Used by {projectsUsingWorkflow?.[workflow.id] ?? 0} project(s)
              </div>
            </CardContent>
          </Card>
        ))}

        {(!workflows || workflows.length === 0) && (
          <div className="border rounded-lg p-8 text-center text-muted-foreground">
            No workflows yet. Create a workflow to define how issues move through statuses.
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'var(--font-display)' }}>Create Workflow</DialogTitle>
            <DialogDescription>
              Define the statuses and transitions for your workflow
            </DialogDescription>
          </DialogHeader>
          <WorkflowForm />
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!formName.trim() || formStatuses.length < 2}
              className="bg-[#E8A87C] hover:bg-[#d4946d] text-white"
            >
              Create Workflow
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingWorkflow} onOpenChange={(open) => !open && setEditingWorkflow(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'var(--font-display)' }}>Edit Workflow</DialogTitle>
            <DialogDescription>
              Modify the statuses and transitions for this workflow
            </DialogDescription>
          </DialogHeader>
          <WorkflowForm />
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setEditingWorkflow(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={!formName.trim() || formStatuses.length < 2}
              className="bg-[#E8A87C] hover:bg-[#d4946d] text-white"
            >
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmWorkflow} onOpenChange={(open) => !open && setDeleteConfirmWorkflow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workflow</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfirmWorkflow?.name}"?
              Projects using this workflow will be switched to the default workflow.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
