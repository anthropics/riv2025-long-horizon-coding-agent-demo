import { useState, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Moon, Sun, Monitor, Upload, Download, Trash2, Palette, Check, Globe } from 'lucide-react';
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
import type { ColorTheme, Language } from '@/types';

// Language configuration
const LANGUAGES: { id: Language; name: string; nativeName: string; flag: string }[] = [
  { id: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { id: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { id: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
];

// Theme configuration
const COLOR_THEMES: { id: ColorTheme; name: string; description: string; colors: { primary: string; secondary: string; accent: string } }[] = [
  {
    id: 'ruby',
    name: 'Ruby',
    description: 'Classic red theme with warm coral accents',
    colors: { primary: '#7B2332', secondary: '#C25B6A', accent: '#E8A87C' }
  },
  {
    id: 'ocean',
    name: 'Ocean',
    description: 'Deep sea blues with teal accents',
    colors: { primary: '#0D5C75', secondary: '#4BA3C3', accent: '#00D4AA' }
  },
  {
    id: 'forest',
    name: 'Forest',
    description: 'Nature-inspired greens with earthy tones',
    colors: { primary: '#1B4332', secondary: '#52796F', accent: '#D4A373' }
  },
  {
    id: 'sunset',
    name: 'Sunset',
    description: 'Warm oranges, pinks, and golden hues',
    colors: { primary: '#E85D04', secondary: '#FF6B9D', accent: '#FFD166' }
  },
  {
    id: 'lavender',
    name: 'Lavender',
    description: 'Soft purples with pink and mint accents',
    colors: { primary: '#7C4DFF', secondary: '#B388FF', accent: '#FF8ED4' }
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    description: 'Neon pinks, cyans, and electric vibes',
    colors: { primary: '#FF2E97', secondary: '#00D9FF', accent: '#FFE000' }
  },
  {
    id: 'retro',
    name: 'Retro',
    description: 'Warm vintage colors inspired by 70s design',
    colors: { primary: '#C85A38', secondary: '#6B8E6B', accent: '#E8B039' }
  }
];

export function SettingsPage() {
  const { currentUser, theme, setTheme, colorTheme, setColorTheme, language, setLanguage, translations: t, refreshUser } = useApp();
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
          {t.settings}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t.settingsDescription}
        </p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle>{t.profile}</CardTitle>
          <CardDescription>{t.profileDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t.name}</Label>
            <Input
              id="name"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Your name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">{t.email}</Label>
            <Input
              id="email"
              type="email"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              placeholder="your@email.com"
            />
          </div>
          <Button onClick={handleUpdateProfile} className="bg-[#E8A87C] hover:bg-[#d4946d] text-white">
            {t.saveProfile}
          </Button>
        </CardContent>
      </Card>

      {/* Language */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            {t.language}
          </CardTitle>
          <CardDescription>{t.languageDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.id}
                data-testid={`language-${lang.id}`}
                onClick={() => setLanguage(lang.id)}
                className={`
                  relative group p-4 rounded-lg border-2 transition-all duration-200
                  hover:shadow-md hover:scale-[1.02]
                  ${language === lang.id
                    ? 'border-primary ring-2 ring-primary/20 shadow-md bg-primary/5'
                    : 'border-border hover:border-primary/50'
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{lang.flag}</span>
                  <div className="text-left">
                    <p className="text-sm font-medium" style={{ fontFamily: 'var(--font-display)' }}>
                      {lang.nativeName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {lang.name}
                    </p>
                  </div>
                </div>

                {/* Check Mark */}
                {language === lang.id && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-3 h-3 text-primary-foreground" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle>{t.appearance}</CardTitle>
          <CardDescription>{t.appearanceDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Light/Dark Mode */}
            <div className="space-y-2">
              <Label>{t.mode}</Label>
              <div className="flex gap-2">
                <Button
                  variant={theme === 'light' ? 'default' : 'outline'}
                  className={theme === 'light' ? 'bg-accent hover:bg-accent/90 text-accent-foreground' : ''}
                  onClick={() => setTheme('light')}
                >
                  <Sun className="w-4 h-4 mr-2" />
                  {t.light}
                </Button>
                <Button
                  variant={theme === 'dark' ? 'default' : 'outline'}
                  className={theme === 'dark' ? 'bg-accent hover:bg-accent/90 text-accent-foreground' : ''}
                  onClick={() => setTheme('dark')}
                >
                  <Moon className="w-4 h-4 mr-2" />
                  {t.dark}
                </Button>
                <Button
                  variant={theme === 'system' ? 'default' : 'outline'}
                  className={theme === 'system' ? 'bg-accent hover:bg-accent/90 text-accent-foreground' : ''}
                  onClick={() => setTheme('system')}
                >
                  <Monitor className="w-4 h-4 mr-2" />
                  {t.system}
                </Button>
              </div>
            </div>

            {/* Color Theme */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-primary" />
                <Label>{t.colorTheme}</Label>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {COLOR_THEMES.map((themeOption) => (
                  <button
                    key={themeOption.id}
                    onClick={() => setColorTheme(themeOption.id)}
                    className={`
                      relative group p-3 rounded-lg border-2 transition-all duration-200
                      hover:shadow-md hover:scale-[1.02]
                      ${colorTheme === themeOption.id
                        ? 'border-primary ring-2 ring-primary/20 shadow-md'
                        : 'border-border hover:border-primary/50'
                      }
                    `}
                  >
                    {/* Color Preview */}
                    <div className="flex gap-1 mb-2">
                      <div
                        className="w-6 h-6 rounded-full shadow-sm"
                        style={{ backgroundColor: themeOption.colors.primary }}
                      />
                      <div
                        className="w-6 h-6 rounded-full shadow-sm"
                        style={{ backgroundColor: themeOption.colors.secondary }}
                      />
                      <div
                        className="w-6 h-6 rounded-full shadow-sm"
                        style={{ backgroundColor: themeOption.colors.accent }}
                      />
                    </div>

                    {/* Theme Name */}
                    <p className="text-sm font-medium text-left" style={{ fontFamily: 'var(--font-display)' }}>
                      {themeOption.name}
                    </p>
                    <p className="text-xs text-muted-foreground text-left leading-snug mt-0.5">
                      {themeOption.description}
                    </p>

                    {/* Check Mark */}
                    {colorTheme === themeOption.id && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-3 h-3 text-primary-foreground" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Default Project */}
      <Card>
        <CardHeader>
          <CardTitle>{t.defaultProject}</CardTitle>
          <CardDescription>{t.defaultProjectDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={currentUser?.settings?.defaultProjectId ?? 'none'}
            onValueChange={handleSetDefaultProject}
          >
            <SelectTrigger>
              <SelectValue placeholder={t.noDefaultProject} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t.noDefaultProject}</SelectItem>
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
          <CardTitle>{t.dataManagement}</CardTitle>
          <CardDescription>{t.dataManagementDescription}</CardDescription>
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
              {isExporting ? t.exporting : t.exportData}
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
                  {isImporting ? t.importing : t.importData}
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
            {t.exportDescription}
          </p>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">{t.dangerZone}</CardTitle>
          <CardDescription>{t.dangerZoneDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                {t.clearAllData}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t.deleteConfirmTitle}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t.deleteConfirmDescription}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleClearAllData}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {t.deleteEverything}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      {/* Keyboard Shortcuts */}
      <Card>
        <CardHeader>
          <CardTitle>{t.keyboardShortcuts}</CardTitle>
          <CardDescription>{t.keyboardShortcutsDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t.openSearch}</span>
              <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">⌘ K</kbd>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t.createIssue}</span>
              <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">C</kbd>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t.goToBoard}</span>
              <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">G B</kbd>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t.goToBacklog}</span>
              <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">G L</kbd>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t.goToSprints}</span>
              <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">G S</kbd>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t.goToSettings}</span>
              <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">G ,</kbd>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardHeader>
          <CardTitle>{t.aboutCanopy}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-2">
            {t.aboutDescription}
          </p>
          <p className="text-xs text-muted-foreground">
            {t.version}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
