import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Smile, Sparkles, Download, Trash2, Copy, Plus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { db, createEmoji, deleteEmoji } from '@/lib/db';
import { useApp } from '@/context/AppContext';
import { toast } from 'sonner';
import type { EmojiShape, EmojiExpression, EmojiAccessory, CustomEmoji } from '@/types';

// Shape path generators
const SHAPE_PATHS: Record<EmojiShape, string> = {
  'circle': 'M 64 8 A 56 56 0 1 1 64 120 A 56 56 0 1 1 64 8',
  'square': 'M 8 8 H 120 V 120 H 8 Z',
  'rounded-square': 'M 24 8 H 104 A 16 16 0 0 1 120 24 V 104 A 16 16 0 0 1 104 120 H 24 A 16 16 0 0 1 8 104 V 24 A 16 16 0 0 1 24 8',
  'heart': 'M 64 100 C 20 70 8 40 32 24 C 50 12 64 28 64 28 C 64 28 78 12 96 24 C 120 40 108 70 64 100 Z',
  'star': 'M 64 8 L 78 48 L 120 48 L 86 74 L 100 116 L 64 88 L 28 116 L 42 74 L 8 48 L 50 48 Z',
};

// Expression components generator
function generateExpression(expression: EmojiExpression, accentColor: string): string {
  switch (expression) {
    case 'happy':
      return `
        <circle cx="45" cy="55" r="6" fill="${accentColor}"/>
        <circle cx="83" cy="55" r="6" fill="${accentColor}"/>
        <path d="M 44 78 Q 64 98 84 78" stroke="${accentColor}" stroke-width="4" fill="none" stroke-linecap="round"/>
      `;
    case 'sad':
      return `
        <circle cx="45" cy="55" r="6" fill="${accentColor}"/>
        <circle cx="83" cy="55" r="6" fill="${accentColor}"/>
        <path d="M 44 90 Q 64 70 84 90" stroke="${accentColor}" stroke-width="4" fill="none" stroke-linecap="round"/>
      `;
    case 'angry':
      return `
        <line x1="35" y1="45" x2="55" y2="55" stroke="${accentColor}" stroke-width="3" stroke-linecap="round"/>
        <line x1="93" y1="45" x2="73" y2="55" stroke="${accentColor}" stroke-width="3" stroke-linecap="round"/>
        <circle cx="45" cy="58" r="5" fill="${accentColor}"/>
        <circle cx="83" cy="58" r="5" fill="${accentColor}"/>
        <path d="M 44 88 Q 64 78 84 88" stroke="${accentColor}" stroke-width="4" fill="none" stroke-linecap="round"/>
      `;
    case 'surprised':
      return `
        <circle cx="45" cy="55" r="8" fill="none" stroke="${accentColor}" stroke-width="3"/>
        <circle cx="83" cy="55" r="8" fill="none" stroke="${accentColor}" stroke-width="3"/>
        <circle cx="64" cy="88" rx="10" ry="14" fill="none" stroke="${accentColor}" stroke-width="3"/>
      `;
    case 'cool':
      return `
        <rect x="30" y="48" width="30" height="16" rx="4" fill="${accentColor}"/>
        <rect x="68" y="48" width="30" height="16" rx="4" fill="${accentColor}"/>
        <line x1="60" y1="56" x2="68" y2="56" stroke="${accentColor}" stroke-width="3"/>
        <path d="M 44 80 Q 64 95 84 80" stroke="${accentColor}" stroke-width="4" fill="none" stroke-linecap="round"/>
      `;
    case 'love':
      return `
        <path d="M 45 48 C 35 38 25 48 45 62 C 65 48 55 38 45 48" fill="#ff4d6d"/>
        <path d="M 83 48 C 73 38 63 48 83 62 C 103 48 93 38 83 48" fill="#ff4d6d"/>
        <path d="M 44 80 Q 64 95 84 80" stroke="${accentColor}" stroke-width="4" fill="none" stroke-linecap="round"/>
      `;
    case 'wink':
      return `
        <circle cx="45" cy="55" r="6" fill="${accentColor}"/>
        <path d="M 73 55 Q 83 50 93 55" stroke="${accentColor}" stroke-width="4" fill="none" stroke-linecap="round"/>
        <path d="M 44 78 Q 64 98 84 78" stroke="${accentColor}" stroke-width="4" fill="none" stroke-linecap="round"/>
      `;
    case 'thinking':
      return `
        <circle cx="45" cy="55" r="6" fill="${accentColor}"/>
        <circle cx="83" cy="55" r="6" fill="${accentColor}"/>
        <line x1="35" y1="40" x2="55" y2="48" stroke="${accentColor}" stroke-width="3" stroke-linecap="round"/>
        <path d="M 50 85 Q 70 85 75 85" stroke="${accentColor}" stroke-width="4" fill="none" stroke-linecap="round"/>
        <circle cx="100" cy="90" r="6" fill="${accentColor}" opacity="0.6"/>
        <circle cx="110" cy="80" r="4" fill="${accentColor}" opacity="0.4"/>
      `;
    case 'neutral':
      return `
        <circle cx="45" cy="55" r="6" fill="${accentColor}"/>
        <circle cx="83" cy="55" r="6" fill="${accentColor}"/>
        <line x1="44" y1="85" x2="84" y2="85" stroke="${accentColor}" stroke-width="4" stroke-linecap="round"/>
      `;
    case 'excited':
      return `
        <circle cx="45" cy="55" r="6" fill="${accentColor}"/>
        <circle cx="83" cy="55" r="6" fill="${accentColor}"/>
        <ellipse cx="64" cy="85" rx="16" ry="12" fill="${accentColor}"/>
        <line x1="30" y1="35" x2="40" y2="28" stroke="${accentColor}" stroke-width="3" stroke-linecap="round"/>
        <line x1="88" y1="35" x2="98" y2="28" stroke="${accentColor}" stroke-width="3" stroke-linecap="round"/>
      `;
    default:
      return '';
  }
}

// Accessory components generator
function generateAccessory(accessory: EmojiAccessory, accentColor: string): string {
  switch (accessory) {
    case 'glasses':
      return `
        <circle cx="45" cy="55" r="14" fill="none" stroke="${accentColor}" stroke-width="3"/>
        <circle cx="83" cy="55" r="14" fill="none" stroke="${accentColor}" stroke-width="3"/>
        <line x1="59" y1="55" x2="69" y2="55" stroke="${accentColor}" stroke-width="3"/>
        <line x1="31" y1="55" x2="20" y2="50" stroke="${accentColor}" stroke-width="2"/>
        <line x1="97" y1="55" x2="108" y2="50" stroke="${accentColor}" stroke-width="2"/>
      `;
    case 'sunglasses':
      return `
        <path d="M 28 48 H 60 V 68 H 28 V 48" fill="#1a1a2e" rx="4"/>
        <path d="M 68 48 H 100 V 68 H 68 V 48" fill="#1a1a2e" rx="4"/>
        <line x1="60" y1="55" x2="68" y2="55" stroke="#1a1a2e" stroke-width="4"/>
        <line x1="28" y1="53" x2="15" y2="48" stroke="#1a1a2e" stroke-width="3"/>
        <line x1="100" y1="53" x2="113" y2="48" stroke="#1a1a2e" stroke-width="3"/>
      `;
    case 'hat':
      return `
        <rect x="30" y="5" width="68" height="30" fill="${accentColor}" rx="4"/>
        <rect x="20" y="30" width="88" height="10" fill="${accentColor}"/>
      `;
    case 'crown':
      return `
        <path d="M 30 35 L 40 15 L 50 30 L 64 5 L 78 30 L 88 15 L 98 35 V 45 H 30 V 35 Z" fill="#ffd700"/>
        <circle cx="40" cy="20" r="4" fill="#ff4d6d"/>
        <circle cx="64" cy="12" r="5" fill="#4dabf7"/>
        <circle cx="88" cy="20" r="4" fill="#51cf66"/>
      `;
    case 'bow':
      return `
        <path d="M 50 25 C 30 15 30 35 50 30 C 30 45 30 25 50 35" fill="#ff6b9d"/>
        <path d="M 78 25 C 98 15 98 35 78 30 C 98 45 98 25 78 35" fill="#ff6b9d"/>
        <circle cx="64" cy="30" r="8" fill="#ff6b9d"/>
      `;
    case 'headphones':
      return `
        <path d="M 20 60 A 44 44 0 0 1 108 60" fill="none" stroke="#333" stroke-width="6"/>
        <rect x="14" y="55" width="14" height="25" rx="4" fill="#333"/>
        <rect x="100" y="55" width="14" height="25" rx="4" fill="#333"/>
        <ellipse cx="21" cy="67" rx="5" ry="8" fill="#666"/>
        <ellipse cx="107" cy="67" rx="5" ry="8" fill="#666"/>
      `;
    case 'mustache':
      return `
        <path d="M 40 75 Q 50 85 64 75 Q 78 85 88 75 Q 95 70 90 65 Q 80 70 64 65 Q 48 70 38 65 Q 33 70 40 75" fill="#4a3728"/>
      `;
    case 'none':
    default:
      return '';
  }
}

// Generate SVG for emoji
export function generateEmojiSVG(
  shape: EmojiShape,
  expression: EmojiExpression,
  accessory: EmojiAccessory,
  faceColor: string,
  accentColor: string
): string {
  const shapePath = SHAPE_PATHS[shape];
  const expressionSVG = generateExpression(expression, accentColor);
  const accessorySVG = generateAccessory(accessory, accentColor);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
    <defs>
      <linearGradient id="faceGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${faceColor};stop-opacity:1" />
        <stop offset="100%" style="stop-color:${adjustColor(faceColor, -20)};stop-opacity:1" />
      </linearGradient>
    </defs>
    <path d="${shapePath}" fill="url(#faceGradient)" stroke="${adjustColor(faceColor, -40)}" stroke-width="2"/>
    ${expressionSVG}
    ${accessorySVG}
  </svg>`;
}

// Utility to adjust color brightness
function adjustColor(color: string, amount: number): string {
  const hex = color.replace('#', '');
  const r = Math.max(0, Math.min(255, parseInt(hex.substring(0, 2), 16) + amount));
  const g = Math.max(0, Math.min(255, parseInt(hex.substring(2, 4), 16) + amount));
  const b = Math.max(0, Math.min(255, parseInt(hex.substring(4, 6), 16) + amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// Color palette for face colors
const FACE_COLORS = [
  '#FFD93D', // Yellow
  '#FF6B6B', // Coral
  '#4ECDC4', // Teal
  '#45B7D1', // Sky Blue
  '#96CEB4', // Sage
  '#FFEAA7', // Cream
  '#DDA0DD', // Plum
  '#98D8C8', // Mint
  '#F7DC6F', // Gold
  '#BB8FCE', // Lavender
  '#85C1E9', // Light Blue
  '#F5B7B1', // Pink
];

// Color palette for accent colors
const ACCENT_COLORS = [
  '#2D3436', // Dark Gray
  '#6C5CE7', // Purple
  '#00B894', // Green
  '#E17055', // Orange
  '#0984E3', // Blue
  '#D63031', // Red
  '#00CEC9', // Cyan
  '#E84393', // Magenta
  '#FDCB6E', // Yellow
  '#636E72', // Gray
];

const SHAPES: { value: EmojiShape; label: string }[] = [
  { value: 'circle', label: 'Circle' },
  { value: 'square', label: 'Square' },
  { value: 'rounded-square', label: 'Rounded Square' },
  { value: 'heart', label: 'Heart' },
  { value: 'star', label: 'Star' },
];

const EXPRESSIONS: { value: EmojiExpression; label: string }[] = [
  { value: 'happy', label: 'Happy' },
  { value: 'sad', label: 'Sad' },
  { value: 'angry', label: 'Angry' },
  { value: 'surprised', label: 'Surprised' },
  { value: 'cool', label: 'Cool' },
  { value: 'love', label: 'Love' },
  { value: 'wink', label: 'Wink' },
  { value: 'thinking', label: 'Thinking' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'excited', label: 'Excited' },
];

const ACCESSORIES: { value: EmojiAccessory; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'glasses', label: 'Glasses' },
  { value: 'sunglasses', label: 'Sunglasses' },
  { value: 'hat', label: 'Hat' },
  { value: 'crown', label: 'Crown' },
  { value: 'bow', label: 'Bow' },
  { value: 'headphones', label: 'Headphones' },
  { value: 'mustache', label: 'Mustache' },
];

export function EmojiCreatorPage() {
  const { translations: t } = useApp();

  // Form state for creating/editing emoji
  const [name, setName] = useState('');
  const [shape, setShape] = useState<EmojiShape>('circle');
  const [expression, setExpression] = useState<EmojiExpression>('happy');
  const [accessory, setAccessory] = useState<EmojiAccessory>('none');
  const [faceColor, setFaceColor] = useState('#FFD93D');
  const [accentColor, setAccentColor] = useState('#2D3436');

  // UI state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Get all emojis from database
  const emojis = useLiveQuery(() => db.emojis.orderBy('createdAt').reverse().toArray(), []);

  // Generate preview SVG
  const previewSVG = useMemo(() => {
    return generateEmojiSVG(shape, expression, accessory, faceColor, accentColor);
  }, [shape, expression, accessory, faceColor, accentColor]);

  // Reset form
  const resetForm = () => {
    setName('');
    setShape('circle');
    setExpression('happy');
    setAccessory('none');
    setFaceColor('#FFD93D');
    setAccentColor('#2D3436');
  };

  // Handle create emoji
  const handleCreateEmoji = async () => {
    if (!name.trim()) {
      toast.error('Please enter a name for your emoji');
      return;
    }

    try {
      await createEmoji({
        name: name.trim(),
        shape,
        expression,
        accessory,
        faceColor,
        accentColor,
        svgData: previewSVG,
      });

      toast.success('Emoji created successfully!');
      setIsCreateDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error('Failed to create emoji');
      console.error(error);
    }
  };

  // Handle delete emoji
  const handleDeleteEmoji = async (id: string) => {
    try {
      await deleteEmoji(id);
      toast.success('Emoji deleted');
    } catch (error) {
      toast.error('Failed to delete emoji');
      console.error(error);
    }
  };

  // Handle copy SVG
  const handleCopySVG = async (emoji: CustomEmoji) => {
    try {
      await navigator.clipboard.writeText(emoji.svgData);
      setCopiedId(emoji.id);
      toast.success('SVG copied to clipboard!');
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      toast.error('Failed to copy SVG');
    }
  };

  // Handle download SVG
  const handleDownloadSVG = (emoji: CustomEmoji) => {
    const blob = new Blob([emoji.svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${emoji.name.replace(/\s+/g, '-').toLowerCase()}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Emoji downloaded!');
  };

  return (
    <div className="min-h-full bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50">
        <div className="px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg">
                <Smile className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground font-display">
                  {t.emojiCreator || 'Emoji Creator'}
                </h1>
                <p className="text-muted-foreground text-sm mt-0.5">
                  {t.emojiCreatorDescription || 'Design custom emojis for your chats and reactions'}
                </p>
              </div>
            </div>
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md"
              data-testid="create-emoji-button"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t.createEmoji || 'Create Emoji'}
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="p-6">
        {/* Emoji Gallery */}
        {emojis && emojis.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
            {emojis.map((emoji) => (
              <div
                key={emoji.id}
                className="group relative bg-card border border-border rounded-xl p-4 hover:shadow-lg transition-all duration-200 hover:scale-105"
                data-testid={`emoji-card-${emoji.id}`}
              >
                <div
                  className="w-full aspect-square flex items-center justify-center"
                  dangerouslySetInnerHTML={{ __html: emoji.svgData }}
                />
                <p className="text-center text-sm font-medium text-foreground mt-2 truncate">
                  {emoji.name}
                </p>
                {/* Action buttons on hover */}
                <div className="absolute inset-0 bg-black/50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleCopySVG(emoji)}
                    className="h-8 w-8 p-0"
                    title="Copy SVG"
                  >
                    {copiedId === emoji.id ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleDownloadSVG(emoji)}
                    className="h-8 w-8 p-0"
                    title="Download SVG"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeleteEmoji(emoji.id)}
                    className="h-8 w-8 p-0"
                    title="Delete"
                    data-testid={`delete-emoji-${emoji.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="p-6 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 mb-6">
              <Sparkles className="w-12 h-12 text-amber-500" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              {t.noEmojisYet || 'No custom emojis yet'}
            </h2>
            <p className="text-muted-foreground mb-6 max-w-md">
              {t.noEmojisDescription || 'Create your first custom emoji to use in chats and reactions. Choose a shape, expression, and colors!'}
            </p>
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
              data-testid="create-first-emoji-button"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t.createFirstEmoji || 'Create Your First Emoji'}
            </Button>
          </div>
        )}
      </div>

      {/* Create Emoji Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-2xl" data-testid="create-emoji-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Smile className="w-5 h-5 text-amber-500" />
              {t.designYourEmoji || 'Design Your Emoji'}
            </DialogTitle>
            <DialogDescription>
              {t.emojiDesignDescription || 'Customize your emoji with different shapes, expressions, and accessories'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            {/* Preview */}
            <div className="flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 rounded-xl p-8">
              <div
                className="w-32 h-32 animate-bounce-slow"
                dangerouslySetInnerHTML={{ __html: previewSVG }}
                data-testid="emoji-preview"
              />
              <p className="text-sm text-muted-foreground mt-4">{t.livePreview || 'Live Preview'}</p>
            </div>

            {/* Controls */}
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="emoji-name">{t.emojiName || 'Emoji Name'}</Label>
                  <Input
                    id="emoji-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t.emojiNamePlaceholder || 'e.g., Happy Sun'}
                    data-testid="emoji-name-input"
                  />
                </div>

                {/* Shape */}
                <div className="space-y-2">
                  <Label>{t.shape || 'Shape'}</Label>
                  <Select value={shape} onValueChange={(v) => setShape(v as EmojiShape)}>
                    <SelectTrigger data-testid="shape-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SHAPES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Expression */}
                <div className="space-y-2">
                  <Label>{t.expression || 'Expression'}</Label>
                  <Select value={expression} onValueChange={(v) => setExpression(v as EmojiExpression)}>
                    <SelectTrigger data-testid="expression-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPRESSIONS.map((e) => (
                        <SelectItem key={e.value} value={e.value}>
                          {e.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Accessory */}
                <div className="space-y-2">
                  <Label>{t.accessory || 'Accessory'}</Label>
                  <Select value={accessory} onValueChange={(v) => setAccessory(v as EmojiAccessory)}>
                    <SelectTrigger data-testid="accessory-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ACCESSORIES.map((a) => (
                        <SelectItem key={a.value} value={a.value}>
                          {a.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Face Color */}
                <div className="space-y-2">
                  <Label>{t.faceColor || 'Face Color'}</Label>
                  <div className="flex flex-wrap gap-2">
                    {FACE_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setFaceColor(color)}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          faceColor === color
                            ? 'border-foreground scale-110 shadow-lg'
                            : 'border-transparent hover:scale-105'
                        }`}
                        style={{ backgroundColor: color }}
                        title={color}
                        data-testid={`face-color-${color}`}
                      />
                    ))}
                  </div>
                </div>

                {/* Accent Color */}
                <div className="space-y-2">
                  <Label>{t.accentColor || 'Accent Color (Eyes, Mouth)'}</Label>
                  <div className="flex flex-wrap gap-2">
                    {ACCENT_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setAccentColor(color)}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          accentColor === color
                            ? 'border-foreground scale-110 shadow-lg'
                            : 'border-transparent hover:scale-105'
                        }`}
                        style={{ backgroundColor: color }}
                        title={color}
                        data-testid={`accent-color-${color}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                resetForm();
              }}
            >
              {t.cancel || 'Cancel'}
            </Button>
            <Button
              onClick={handleCreateEmoji}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
              data-testid="save-emoji-button"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {t.createEmoji || 'Create Emoji'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <style>{`
        @keyframes bounce-slow {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
