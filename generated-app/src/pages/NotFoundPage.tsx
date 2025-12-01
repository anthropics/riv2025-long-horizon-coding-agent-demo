import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      {/* Decorative illustration */}
      <div className="relative mb-8">
        <div className="text-[120px] font-bold text-[#7B2332]/10" style={{ fontFamily: 'var(--font-display)' }}>
          404
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex gap-2">
            {/* Tree icons */}
            <svg className="w-12 h-12 text-[#A83B4C]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L4 12h3v8h4v-6h2v6h4v-8h3L12 2z" />
            </svg>
            <svg className="w-16 h-16 text-[#7B2332]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L4 12h3v8h4v-6h2v6h4v-8h3L12 2z" />
            </svg>
            <svg className="w-12 h-12 text-[#C25B6A]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L4 12h3v8h4v-6h2v6h4v-8h3L12 2z" />
            </svg>
          </div>
        </div>
      </div>

      <h1 className="text-2xl font-semibold mb-2" style={{ fontFamily: 'var(--font-display)' }}>
        Lost in the Forest
      </h1>
      <p className="text-muted-foreground mb-8 max-w-md">
        The page you're looking for doesn't exist or has been moved.
        Let's get you back on the trail.
      </p>

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => navigate(-1)}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Go Back
        </Button>
        <Button
          onClick={() => navigate('/')}
          className="bg-[#E8A87C] hover:bg-[#d4946d] text-white gap-2"
        >
          <Home className="w-4 h-4" />
          Return Home
        </Button>
      </div>
    </div>
  );
}
