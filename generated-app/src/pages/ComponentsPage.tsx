import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Pencil, Trash2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { db, createComponent } from '@/lib/db';
import { useApp } from '@/context/AppContext';
import { toast } from 'sonner';

export function ComponentsPage() {
  const { projectKey } = useParams();
  const { currentProject, setCurrentProject } = useApp();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<{
    id: string;
    name: string;
    description?: string;
    leadUserId?: string;
  } | null>(null);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newLeadUserId, setNewLeadUserId] = useState('');

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

  const components = useLiveQuery(
    () => project ? db.components.where('projectId').equals(project.id).toArray() : [],
    [project?.id]
  );

  const users = useLiveQuery(() => db.users.toArray(), []);

  const handleCreate = async () => {
    if (!project || !newName.trim()) return;
    try {
      await createComponent({
        projectId: project.id,
        name: newName.trim(),
        description: newDescription.trim() || undefined,
        leadUserId: newLeadUserId || undefined,
      });
      setNewName('');
      setNewDescription('');
      setNewLeadUserId('');
      setIsCreateOpen(false);
      toast.success('Component created');
    } catch (error) {
      toast.error('Failed to create component');
    }
  };

  const handleUpdate = async () => {
    if (!editingComponent || !editingComponent.name.trim()) return;
    try {
      await db.components.update(editingComponent.id, {
        name: editingComponent.name.trim(),
        description: editingComponent.description?.trim() || undefined,
        leadUserId: editingComponent.leadUserId || undefined,
      });
      setEditingComponent(null);
      toast.success('Component updated');
    } catch (error) {
      toast.error('Failed to update component');
    }
  };

  const handleDelete = async (componentId: string) => {
    try {
      // Remove component from issues
      const issues = await db.issues.filter(i => i.components.includes(componentId)).toArray();
      for (const issue of issues) {
        await db.issues.update(issue.id, {
          components: issue.components.filter(c => c !== componentId)
        });
      }
      await db.components.delete(componentId);
      toast.success('Component deleted');
    } catch (error) {
      toast.error('Failed to delete component');
    }
  };

  if (!project) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading...</div>;
  }

  const getUserName = (userId?: string) => users?.find(u => u.id === userId)?.name ?? 'Unassigned';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
            Components
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage components for {project.name}
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="bg-[#E8A87C] hover:bg-[#d4946d] text-white gap-2">
          <Plus className="w-4 h-4" />
          Create Component
        </Button>
      </div>

      {/* Components List */}
      {components && components.length > 0 ? (
        <div className="border rounded-lg divide-y">
          {components.map((component) => (
            <div key={component.id} className="flex items-center justify-between p-4 hover:bg-muted/50">
              <div>
                <div className="font-medium">{component.name}</div>
                {component.description && (
                  <p className="text-sm text-muted-foreground mt-1">{component.description}</p>
                )}
                {component.leadUserId && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    <User className="w-3 h-3" />
                    Lead: {getUserName(component.leadUserId)}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditingComponent({
                    id: component.id,
                    name: component.name,
                    description: component.description,
                    leadUserId: component.leadUserId,
                  })}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  onClick={() => handleDelete(component.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="border rounded-lg p-8 text-center text-muted-foreground">
          No components yet. Create a component to organize your issues by area.
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'var(--font-display)' }}>Create Component</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g., API, UI, Database"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Describe this component..."
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Component Lead</Label>
              <Select value={newLeadUserId || 'none'} onValueChange={(v) => setNewLeadUserId(v === 'none' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a lead (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No lead</SelectItem>
                  {users?.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={!newName.trim()} className="bg-[#E8A87C] hover:bg-[#d4946d] text-white">
                Create
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingComponent} onOpenChange={(open) => !open && setEditingComponent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'var(--font-display)' }}>Edit Component</DialogTitle>
          </DialogHeader>
          {editingComponent && (
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name *</Label>
                <Input
                  id="edit-name"
                  value={editingComponent.name}
                  onChange={(e) => setEditingComponent({ ...editingComponent, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editingComponent.description ?? ''}
                  onChange={(e) => setEditingComponent({ ...editingComponent, description: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Component Lead</Label>
                <Select
                  value={editingComponent.leadUserId || 'none'}
                  onValueChange={(v) => setEditingComponent({ ...editingComponent, leadUserId: v === 'none' ? '' : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a lead (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No lead</SelectItem>
                    {users?.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setEditingComponent(null)}>Cancel</Button>
                <Button onClick={handleUpdate} disabled={!editingComponent.name.trim()} className="bg-[#E8A87C] hover:bg-[#d4946d] text-white">
                  Save
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
