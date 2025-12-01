import { Zap, Bookmark, Bug, CheckSquare, Square } from 'lucide-react';
import type { IssueType } from '@/types';

interface IssueTypeIconProps {
  type: IssueType;
  size?: number;
  className?: string;
}

const typeConfig: Record<IssueType, { icon: React.ElementType; color: string }> = {
  Epic: { icon: Zap, color: '#9B59B6' },
  Story: { icon: Bookmark, color: '#C25B6A' },
  Bug: { icon: Bug, color: '#D84315' },
  Task: { icon: CheckSquare, color: '#2196F3' },
  'Sub-task': { icon: Square, color: '#8896A6' },
};

export function IssueTypeIcon({ type, size = 16, className }: IssueTypeIconProps) {
  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <Icon
      style={{ color: config.color, width: size, height: size }}
      className={className}
    />
  );
}

export function getIssueTypeColor(type: IssueType): string {
  return typeConfig[type].color;
}
