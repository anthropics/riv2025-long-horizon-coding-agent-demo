import { useEffect, useState } from 'react';
import { X, PartyPopper, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { generateCompletionStory, getCompletionHeadline } from '@/lib/completion-stories';
import type { IssueType } from '@/types';

interface CompletionStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskName: string;
  taskKey: string;
  taskType?: IssueType;
}

export function CompletionStoryModal({
  isOpen,
  onClose,
  taskName,
  taskKey,
  taskType,
}: CompletionStoryModalProps) {
  const [headline, setHeadline] = useState('');
  const [story, setStory] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Generate fresh story when modal opens
      setHeadline(getCompletionHeadline());
      setStory(generateCompletionStory(taskName, taskType));
      setIsAnimating(true);

      // Auto-close after 6 seconds
      const timer = setTimeout(() => {
        onClose();
      }, 6000);

      return () => clearTimeout(timer);
    } else {
      setIsAnimating(false);
    }
  }, [isOpen, taskName, taskType, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-[100] animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
        <div
          className={`
            relative bg-card rounded-2xl shadow-2xl max-w-lg w-full p-8 pointer-events-auto
            border-2 border-[var(--color-accent)]
            transform transition-all duration-500 ease-out
            ${isAnimating ? 'animate-scale-in opacity-100' : 'scale-95 opacity-0'}
          `}
          data-testid="completion-story-modal"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Decorative elements */}
          <div className="absolute -top-3 -left-3 text-[var(--color-accent)] animate-bounce-slow">
            <PartyPopper className="w-8 h-8" />
          </div>
          <div className="absolute -top-3 -right-12 text-amber-500 animate-pulse">
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="absolute -bottom-3 -right-3 text-[var(--color-accent)] animate-bounce-slow" style={{ animationDelay: '0.5s' }}>
            <PartyPopper className="w-8 h-8 transform -scale-x-100" />
          </div>

          {/* Content */}
          <div className="text-center">
            {/* Headline */}
            <h2
              className="text-2xl font-bold mb-2 bg-gradient-to-r from-[var(--color-primary)] via-[var(--color-accent)] to-amber-500 bg-clip-text text-transparent"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {headline}
            </h2>

            {/* Task info */}
            <div className="flex items-center justify-center gap-2 mb-4 text-muted-foreground">
              <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
                DONE
              </span>
              <span className="text-sm font-medium">{taskKey}</span>
            </div>

            {/* Task name */}
            <p className="text-lg font-semibold mb-4 text-foreground line-clamp-2">
              {taskName}
            </p>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-muted-foreground/30 to-transparent" />
              <Sparkles className="w-4 h-4 text-amber-500" />
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-muted-foreground/30 to-transparent" />
            </div>

            {/* Story */}
            <p
              className="text-muted-foreground leading-relaxed text-sm italic"
              data-testid="completion-story-text"
            >
              "{story}"
            </p>

            {/* Progress bar for auto-close */}
            <div className="mt-6 w-full h-1 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] rounded-full animate-shrink"
                style={{ animationDuration: '6s', animationTimingFunction: 'linear' }}
              />
            </div>

            {/* Action button */}
            <Button
              onClick={onClose}
              className="mt-4 bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/90 text-white"
            >
              Continue Conquering
            </Button>
          </div>
        </div>
      </div>

      {/* Custom animations */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.9) translateY(20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }

        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }

        .animate-scale-in {
          animation: scale-in 0.4s ease-out forwards;
        }

        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }

        .animate-shrink {
          animation: shrink 6s linear forwards;
        }
      `}</style>
    </>
  );
}
