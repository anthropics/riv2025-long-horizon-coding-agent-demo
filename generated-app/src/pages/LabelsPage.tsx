import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { db, createLabel } from '@/lib/db';
import { useApp } from '@/context/AppContext';
import { toast } from 'sonner';

const LABEL_COLORS = [
  '#C25B6A', '#2196F3', '#9B59B6', '#E8A87C', '#D84315',
  '#E9C46A', '#7B2332', '#F4A261', '#E63946', '#457B9D',
];

export function LabelsPage() {
  const { projectKey } = useParams();
  const { currentProject, setCurrentProject } = useApp();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingLabel, setEditingLabel] = useState<{ id: string; name: string; color: string } | null>(null);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(LABEL_COLORS[0]);

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

  const labels = useLiveQuery(
    () => project ? db.labels.where('projectId').equals(project.id).toArray() : [],
    [project?.id]
  );

  const handleCreate = async () => {
    if (!project || !newName.trim()) return;
    try {
      await createLabel({ projectId: project.id, name: newName.trim(), color: newColor });
      setNewName('');
      setNewColor(LABEL_COLORS[0]);
      setIsCreateOpen(false);
      toast.success('Label created');
    } catch (error) {
      toast.error('Failed to create label');
    }
  };

  const handleUpdate = async () => {
    if (!editingLabel || !editingLabel.name.trim()) return;
    try {
      await db.labels.update(editingLabel.id, { name: editingLabel.name.trim(), color: editingLabel.color });
      setEditingLabel(null);
      toast.success('Label updated');
    } catch (error) {
      toast.error('Failed to update label');
    }
  };

  const handleDelete = async (labelId: string) => {
    try {
      // Remove label from issues
      const issues = await db.issues.filter(i => i.labels.includes(labelId)).toArray();
      for (const issue of issues) {
        await db.issues.update(issue.id, {
          labels: issue.labels.filter(l => l !== labelId)
        });
      }
      await db.labels.delete(labelId);
      toast.success('Label deleted');
    } catch (error) {
      toast.error('Failed to delete label');
    }
  };

  if (!project) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
            Labels
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage labels for {project.name}
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="bg-[#E8A87C] hover:bg-[#d4946d] text-white gap-2">
          <Plus className="w-4 h-4" />
          Create Label
        </Button>
      </div>

      {/* Labels List */}
      {labels && labels.length > 0 ? (
        <div className="border rounded-lg divide-y">
          {labels.map((label) => (
            <div key={label.id} className="flex items-center justify-between p-4 hover:bg-muted/50">
              <div className="flex items-center gap-3">
                <Badge
                  style={{ backgroundColor: `${label.color}20`, borderColor: label.color, color: label.color }}
                  className="text-sm"
                >
                  {label.name}
                </Badge>
                {label.description && (
                  <span className="text-sm text-muted-foreground">{label.description}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditingLabel({ id: label.id, name: label.name, color: label.color })}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  onClick={() => handleDelete(label.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="border rounded-lg p-8 text-center text-muted-foreground">
          No labels yet. Create a label to categorize your issues.
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'var(--font-display)' }}>Create Label</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g., frontend, urgent"
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {LABEL_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewColor(c)}
                    className={`w-6 h-6 rounded-md ${newColor === c ? 'ring-2 ring-offset-2 ring-foreground' : ''}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <span className="text-sm text-muted-foreground">Preview:</span>
              <Badge style={{ backgroundColor: `${newColor}20`, borderColor: newColor, color: newColor }}>
                {newName || 'label'}
              </Badge>
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
      <Dialog open={!!editingLabel} onOpenChange={(open) => !open && setEditingLabel(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'var(--font-display)' }}>Edit Label</DialogTitle>
          </DialogHeader>
          {editingLabel && (
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  value={editingLabel.name}
                  onChange={(e) => setEditingLabel({ ...editingLabel, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex flex-wrap gap-2">
                  {LABEL_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEditingLabel({ ...editingLabel, color: c })}
                      className={`w-6 h-6 rounded-md ${editingLabel.color === c ? 'ring-2 ring-offset-2 ring-foreground' : ''}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setEditingLabel(null)}>Cancel</Button>
                <Button onClick={handleUpdate} disabled={!editingLabel.name.trim()} className="bg-[#E8A87C] hover:bg-[#d4946d] text-white">
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
