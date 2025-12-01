import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { db, createProject } from '@/lib/db';
import { useApp } from '@/context/AppContext';
import { toast } from 'sonner';

const PROJECT_COLORS = [
  '#1B4332', // Forest Green
  '#2D6A4F', // Deep Teal
  '#40916C', // Green
  '#52796F', // Sage
  '#D4A373', // Amber
  '#BC6C25', // Terracotta
  '#E9C46A', // Yellow
  '#2196F3', // Blue
  '#9B59B6', // Purple
  '#F4A261', // Orange
];

export function NewProjectPage() {
  const navigate = useNavigate();
  const { setCurrentProject } = useApp();

  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(PROJECT_COLORS[0]);
  const [keyManuallySet, setKeyManuallySet] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; key?: string }>({});

  // Auto-generate key from name
  const generatedKey = useMemo(() => {
    if (keyManuallySet) return key;
    const words = name.trim().split(/\s+/);
    if (words.length === 1) {
      return words[0].slice(0, 4).toUpperCase();
    }
    return words
      .map((w) => w[0])
      .join('')
      .slice(0, 4)
      .toUpperCase();
  }, [name, key, keyManuallySet]);

  const handleKeyChange = (value: string) => {
    const sanitized = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
    setKey(sanitized);
    setKeyManuallySet(true);
  };

  const validateForm = async (): Promise<boolean> => {
    const newErrors: { name?: string; key?: string } = {};

    if (!name.trim()) {
      newErrors.name = 'Project name is required';
    }

    const finalKey = keyManuallySet ? key : generatedKey;
    if (!finalKey) {
      newErrors.key = 'Project key is required';
    } else {
      // Check for duplicate key
      const existingProject = await db.projects.where('key').equals(finalKey).first();
      if (existingProject) {
        newErrors.key = 'This project key is already in use';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const isValid = await validateForm();
    if (!isValid) return;

    setIsSubmitting(true);

    try {
      const finalKey = keyManuallySet ? key : generatedKey;
      const project = await createProject({
        name: name.trim(),
        key: finalKey,
        description: description.trim() || undefined,
        color,
        icon: '',
        isArchived: false,
      });

      setCurrentProject(project);
      toast.success('Project created successfully!');
      navigate(`/project/${project.key}/board`);
    } catch (error) {
      console.error('Failed to create project:', error);
      toast.error('Failed to create project');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Back button */}
      <Button
        variant="ghost"
        className="mb-6 gap-2"
        onClick={() => navigate(-1)}
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </Button>

      <Card>
        <CardHeader>
          <CardTitle style={{ fontFamily: 'var(--font-display)' }}>
            Create a new project
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Project Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Canopy Development"
                className={errors.name ? 'border-destructive' : ''}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name}</p>
              )}
            </div>

            {/* Key */}
            <div className="space-y-2">
              <Label htmlFor="key">Project Key *</Label>
              <Input
                id="key"
                value={keyManuallySet ? key : generatedKey}
                onChange={(e) => handleKeyChange(e.target.value)}
                placeholder="e.g., CAN"
                className={errors.key ? 'border-destructive' : ''}
                maxLength={10}
              />
              <p className="text-xs text-muted-foreground">
                Used as a prefix for issue keys (e.g., {generatedKey || 'KEY'}-1, {generatedKey || 'KEY'}-2)
              </p>
              {errors.key && (
                <p className="text-sm text-destructive">{errors.key}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your project..."
                rows={3}
              />
            </div>

            {/* Color */}
            <div className="space-y-2">
              <Label>Project Color</Label>
              <div className="flex flex-wrap gap-2">
                {PROJECT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-8 h-8 rounded-md transition-all ${
                      color === c
                        ? 'ring-2 ring-offset-2 ring-foreground scale-110'
                        : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-2">Preview</p>
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-md flex items-center justify-center text-white font-semibold"
                  style={{ backgroundColor: color }}
                >
                  {(keyManuallySet ? key : generatedKey).slice(0, 2) || 'PR'}
                </div>
                <div>
                  <p className="font-medium">{name || 'Project Name'}</p>
                  <p className="text-xs text-muted-foreground">
                    {keyManuallySet ? key : generatedKey || 'KEY'}
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-[#D4A373] hover:bg-[#c4935f] text-white"
              >
                Create Project
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
