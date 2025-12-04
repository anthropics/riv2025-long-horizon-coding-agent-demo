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
  const { currentProject, setCurrentProject, translations: t } = useApp();

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
      toast.success(t.settingsSaved);
    } catch (error) {
      toast.error(t.failedToSaveSettings);
    }
  };

  const handleArchive = async () => {
    if (!project) return;
    try {
      await updateProject(project.id, { isArchived: !project.isArchived });
      toast.success(project.isArchived ? t.projectRestored : t.projectArchived);
      if (!project.isArchived) {
        setCurrentProject(null);
        navigate('/projects');
      }
    } catch (error) {
      toast.error(t.failedToUpdateProject);
    }
  };

  const handleDelete = async () => {
    if (!project || deleteConfirmation !== project.key) return;
    try {
      await deleteProject(project.id);
      toast.success(t.projectDeleted);
      setCurrentProject(null);
      navigate('/projects');
    } catch (error) {
      toast.error(t.failedToDeleteProject);
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
      toast.success(t.projectExported);
    } catch (error) {
      toast.error(t.failedToExport);
    }
  };

  if (!project) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">{t.loading}</div>;
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
          {t.projectSettings}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t.manageSettingsFor} {project.name}
        </p>
      </div>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle>{t.general}</CardTitle>
          <CardDescription>{t.basicProjectInfo}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t.projectName}</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>{t.projectKey}</Label>
            <Input value={project.key} disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground">{t.projectKeyCannotChange}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t.description}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>{t.projectColor}</Label>
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
            {t.saveChanges}
          </Button>
        </CardContent>
      </Card>

      {/* Workflow */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="w-5 h-5" />
            {t.workflowSection}
          </CardTitle>
          <CardDescription>
            {t.assignWorkflow}
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
              {t.workflowDeterminesStatuses}
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
                    <p className="text-sm font-medium">{t.statusFlow}</p>
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
              {t.saveWorkflow}
            </Button>
            <Link to="/workflows" className="text-sm text-primary hover:underline flex items-center gap-1">
              {t.manageWorkflows}
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Export */}
      <Card>
        <CardHeader>
          <CardTitle>{t.exportSection}</CardTitle>
          <CardDescription>{t.downloadProjectJson}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={handleExport} className="gap-2">
            <Download className="w-4 h-4" />
            {t.exportProjectData}
          </Button>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            {t.dangerZone}
          </CardTitle>
          <CardDescription>{t.dangerZoneDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">{project.isArchived ? t.restoreProject : t.archiveProject}</p>
              <p className="text-sm text-muted-foreground">
                {project.isArchived
                  ? t.restoreProjectDesc
                  : t.archiveProjectDesc}
              </p>
            </div>
            <Button variant="outline" onClick={handleArchive}>
              <Archive className="w-4 h-4 mr-2" />
              {project.isArchived ? t.restoreProject : t.archiveProject}
            </Button>
          </div>

          <Separator />

          <div className="flex items-center justify-between p-4 border border-destructive/50 rounded-lg">
            <div>
              <p className="font-medium text-destructive">{t.deleteProjectTitle}</p>
              <p className="text-sm text-muted-foreground">
                {t.deleteProjectWarning}
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t.delete}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t.deleteProjectTitle}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t.deleteProjectWarning}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="py-4">
                  <Label htmlFor="confirm">
                    {t.typeToConfirm.replace('{key}', '')} <span className="font-mono font-bold">{project.key}</span>
                  </Label>
                  <Input
                    id="confirm"
                    value={deleteConfirmation}
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                    className="mt-2"
                  />
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setDeleteConfirmation('')}>{t.cancel}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    disabled={deleteConfirmation !== project.key}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {t.deleteProjectTitle}
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
