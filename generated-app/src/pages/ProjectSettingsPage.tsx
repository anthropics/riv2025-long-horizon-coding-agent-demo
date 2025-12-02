import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Trash2, Archive, Download, AlertTriangle, GitBranch, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { db, updateProject, deleteProject, exportProject, initializeDefaultWorkflow, DEFAULT_WORKFLOW_ID } from '@/lib/db';
import { useApp } from '@/context/AppContext';
import { toast } from 'sonner';

const PROJECT_COLORS = [
  '#7B2332', '#A83B4C', '#C25B6A', '#B85C6E', '#E8A87C',
  '#D84315', '#E9C46A', '#2196F3', '#9B59B6', '#F4A261',
];

export function ProjectSettingsPage() {
  const { projectKey } = useParams();
  const navigate = useNavigate();
  const { currentProject, setCurrentProject } = useApp();

  const project = useLiveQuery(
    () => db.projects.where('key').equals(projectKey ?? '').first(),
    [projectKey]
  );

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('');
  const [workflowId, setWorkflowId] = useState<string | undefined>(undefined);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  // Initialize default workflow and fetch all workflows
  useEffect(() => {
    initializeDefaultWorkflow();
  }, []);

  const workflows = useLiveQuery(() => db.workflows.toArray(), []);

  useEffect(() => {
    if (project) {
      setName(project.name);
      setDescription(project.description ?? '');
      setColor(project.color);
      setWorkflowId(project.workflowId ?? DEFAULT_WORKFLOW_ID);
      setCurrentProject(project);
    }
  }, [project, setCurrentProject]);

  const handleSave = async () => {
    if (!project) return;
    try {
      await updateProject(project.id, {
        name,
        description: description || undefined,
        color,
        workflowId: workflowId === DEFAULT_WORKFLOW_ID ? undefined : workflowId,
      });
      toast.success('Settings saved');
    } catch (error) {
      toast.error('Failed to save settings');
    }
  };

  const handleArchive = async () => {
    if (!project) return;
    try {
      await updateProject(project.id, { isArchived: !project.isArchived });
      toast.success(project.isArchived ? 'Project restored' : 'Project archived');
      if (!project.isArchived) {
        setCurrentProject(null);
        navigate('/projects');
      }
    } catch (error) {
      toast.error('Failed to update project');
    }
  };

  const handleDelete = async () => {
    if (!project || deleteConfirmation !== project.key) return;
    try {
      await deleteProject(project.id);
      toast.success('Project deleted');
      setCurrentProject(null);
      navigate('/projects');
    } catch (error) {
      toast.error('Failed to delete project');
    }
  };

  const handleExport = async () => {
    if (!project) return;
    try {
      const data = await exportProject(project.id);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.key}-export.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Project exported');
    } catch (error) {
      toast.error('Failed to export project');
    }
  };

  if (!project) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
          Project Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage settings for {project.name}
        </p>
      </div>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>Basic project information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Project Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Project Key</Label>
            <Input value={project.key} disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground">Project key cannot be changed after creation</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Project Color</Label>
            <div className="flex flex-wrap gap-2">
              {PROJECT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-md transition-all ${
                    color === c ? 'ring-2 ring-offset-2 ring-foreground scale-110' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <Button onClick={handleSave} className="bg-[#E8A87C] hover:bg-[#d4946d] text-white">
            Save Changes
          </Button>
        </CardContent>
      </Card>

      {/* Workflow */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="w-5 h-5" />
            Workflow
          </CardTitle>
          <CardDescription>
            Assign a workflow to define how issues transition between statuses
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="workflow">Project Workflow</Label>
            <Select value={workflowId} onValueChange={setWorkflowId}>
              <SelectTrigger id="workflow">
                <SelectValue placeholder="Select a workflow" />
              </SelectTrigger>
              <SelectContent>
                {workflows?.map((workflow) => (
                  <SelectItem key={workflow.id} value={workflow.id}>
                    {workflow.name}
                    {workflow.isDefault && ' (Default)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              The workflow determines the available statuses and transitions for issues in this project
            </p>
          </div>

          {/* Show selected workflow preview */}
          {workflowId && workflows && (
            <div className="p-3 bg-muted/50 rounded-lg">
              {(() => {
                const selectedWorkflow = workflows.find((w) => w.id === workflowId);
                if (!selectedWorkflow) return null;
                return (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Status flow:</p>
                    <div className="flex items-center gap-1 flex-wrap text-xs">
                      {selectedWorkflow.statuses
                        .slice()
                        .sort((a, b) => a.sortOrder - b.sortOrder)
                        .map((status, index, arr) => (
                          <span key={status.id} className="flex items-center gap-1">
                            <span className="px-2 py-0.5 rounded bg-background border">{status.name}</span>
                            {index < arr.length - 1 && <span className="text-muted-foreground">→</span>}
                          </span>
                        ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <Button onClick={handleSave} className="bg-[#E8A87C] hover:bg-[#d4946d] text-white">
              Save Workflow
            </Button>
            <Link to="/workflows" className="text-sm text-primary hover:underline flex items-center gap-1">
              Manage Workflows
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Export */}
      <Card>
        <CardHeader>
          <CardTitle>Export</CardTitle>
          <CardDescription>Download project data as JSON</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={handleExport} className="gap-2">
            <Download className="w-4 h-4" />
            Export Project Data
          </Button>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>Irreversible and destructive actions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">{project.isArchived ? 'Restore project' : 'Archive project'}</p>
              <p className="text-sm text-muted-foreground">
                {project.isArchived
                  ? 'Restore this project to make it active again'
                  : 'Hide this project from the active list'}
              </p>
            </div>
            <Button variant="outline" onClick={handleArchive}>
              <Archive className="w-4 h-4 mr-2" />
              {project.isArchived ? 'Restore' : 'Archive'}
            </Button>
          </div>

          <Separator />

          <div className="flex items-center justify-between p-4 border border-destructive/50 rounded-lg">
            <div>
              <p className="font-medium text-destructive">Delete project</p>
              <p className="text-sm text-muted-foreground">
                Permanently delete this project and all its data
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Project</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the project
                    and all associated data including issues, sprints, and comments.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="py-4">
                  <Label htmlFor="confirm">
                    Type <span className="font-mono font-bold">{project.key}</span> to confirm
                  </Label>
                  <Input
                    id="confirm"
                    value={deleteConfirmation}
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                    className="mt-2"
                  />
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setDeleteConfirmation('')}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    disabled={deleteConfirmation !== project.key}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete Project
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
