import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import type { Priority } from '@/types';

interface PriorityIconProps {
  priority: Priority;
  size?: number;
  className?: string;
}

const priorityConfig: Record<Priority, { icon: React.ElementType; color: string; rotation?: number }> = {
  Highest: { icon: ArrowUp, color: '#BC6C25' },
  High: { icon: ArrowUp, color: '#E9C46A' },
  Medium: { icon: Minus, color: '#40916C' },
  Low: { icon: ArrowDown, color: '#2196F3' },
  Lowest: { icon: ArrowDown, color: '#8896A6' },
};

export function PriorityIcon({ priority, size = 16, className }: PriorityIconProps) {
  const config = priorityConfig[priority];
  const Icon = config.icon;

  return (
    <Icon
      style={{ color: config.color, width: size, height: size }}
      className={className}
    />
  );
}

export function getPriorityColor(priority: Priority): string {
  return priorityConfig[priority].color;
}
