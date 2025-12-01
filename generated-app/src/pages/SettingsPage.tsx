import { useState, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Moon, Sun, Monitor, Upload, Download, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { db, exportAllData, importAllData } from '@/lib/db';
import { useApp } from '@/context/AppContext';
import { toast } from 'sonner';

export function SettingsPage() {
  const { currentUser, theme, setTheme, refreshUser } = useApp();
  const [userName, setUserName] = useState(currentUser?.name ?? '');
  const [userEmail, setUserEmail] = useState(currentUser?.email ?? '');
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const projects = useLiveQuery(() => db.projects.toArray(), []);

  const handleUpdateProfile = async () => {
    if (!currentUser) return;
    try {
      await db.users.update(currentUser.id, {
        name: userName.trim() || currentUser.name,
        email: userEmail.trim() || currentUser.email,
      });
      await refreshUser();
      toast.success('Profile updated');
    } catch (error) {
      toast.error('Failed to update profile');
    }
  };

  const handleSetDefaultProject = async (projectId: string) => {
    if (!currentUser) return;
    try {
      await db.users.update(currentUser.id, {
        settings: {
          ...currentUser.settings,
          defaultProjectId: projectId === 'none' ? undefined : projectId,
        },
      });
      await refreshUser();
      toast.success('Default project updated');
    } catch (error) {
      toast.error('Failed to update default project');
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const data = await exportAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `canopy-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Data exported successfully');
    } catch (error) {
      toast.error('Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await importAllData(data);
      await refreshUser();
      toast.success('Data imported successfully');
      window.location.reload();
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to import data. Please check the file format.');
    } finally {
      setIsImporting(false);
      event.target.value = '';
    }
  }, [refreshUser]);

  const handleClearAllData = async () => {
    try {
      await db.delete();
      await db.open();
      window.location.reload();
    } catch (error) {
      toast.error('Failed to clear data');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
          Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage your preferences and application settings
        </p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Update your personal information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Your name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              placeholder="your@email.com"
            />
          </div>
          <Button onClick={handleUpdateProfile} className="bg-[#D4A373] hover:bg-[#c4935f] text-white">
            Save Profile
          </Button>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Customize how Canopy looks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Theme</Label>
              <div className="flex gap-2">
                <Button
                  variant={theme === 'light' ? 'default' : 'outline'}
                  className={theme === 'light' ? 'bg-[#D4A373] hover:bg-[#c4935f] text-white' : ''}
                  onClick={() => setTheme('light')}
                >
                  <Sun className="w-4 h-4 mr-2" />
                  Light
                </Button>
                <Button
                  variant={theme === 'dark' ? 'default' : 'outline'}
                  className={theme === 'dark' ? 'bg-[#D4A373] hover:bg-[#c4935f] text-white' : ''}
                  onClick={() => setTheme('dark')}
                >
                  <Moon className="w-4 h-4 mr-2" />
                  Dark
                </Button>
                <Button
                  variant={theme === 'system' ? 'default' : 'outline'}
                  className={theme === 'system' ? 'bg-[#D4A373] hover:bg-[#c4935f] text-white' : ''}
                  onClick={() => setTheme('system')}
                >
                  <Monitor className="w-4 h-4 mr-2" />
                  System
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Default Project */}
      <Card>
        <CardHeader>
          <CardTitle>Default Project</CardTitle>
          <CardDescription>Choose which project opens by default</CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={currentUser?.settings?.defaultProjectId ?? 'none'}
            onValueChange={handleSetDefaultProject}
          >
            <SelectTrigger>
              <SelectValue placeholder="No default project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No default project</SelectItem>
              {projects?.filter(p => !p.isArchived).map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card>
        <CardHeader>
          <CardTitle>Data Management</CardTitle>
          <CardDescription>Export, import, or clear your data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleExport}
              disabled={isExporting}
              className="flex-1"
            >
              <Download className="w-4 h-4 mr-2" />
              {isExporting ? 'Exporting...' : 'Export Data'}
            </Button>
            <label className="flex-1">
              <Button
                variant="outline"
                disabled={isImporting}
                className="w-full"
                asChild
              >
                <span>
                  <Upload className="w-4 h-4 mr-2" />
                  {isImporting ? 'Importing...' : 'Import Data'}
                </span>
              </Button>
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleImport}
                disabled={isImporting}
              />
            </label>
          </div>
          <p className="text-xs text-muted-foreground">
            Export your data as JSON for backup or transfer. Import previously exported data to restore.
          </p>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>Irreversible actions that affect all your data</CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Clear All Data
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all your projects, issues, sprints, and settings.
                  This action cannot be undone. Consider exporting your data first.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleClearAllData}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete Everything
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      {/* Keyboard Shortcuts */}
      <Card>
        <CardHeader>
          <CardTitle>Keyboard Shortcuts</CardTitle>
          <CardDescription>Quick actions for power users</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Open search</span>
              <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">⌘ K</kbd>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Create issue</span>
              <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">C</kbd>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Go to board</span>
              <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">G B</kbd>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Go to backlog</span>
              <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">G L</kbd>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Go to sprints</span>
              <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">G S</kbd>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Go to settings</span>
              <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">G ,</kbd>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardHeader>
          <CardTitle>About Canopy</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-2">
            Canopy is a forest-inspired project management tool built for teams who value simplicity and focus.
          </p>
          <p className="text-xs text-muted-foreground">
            Version 1.0.0 • All data stored locally in your browser
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
