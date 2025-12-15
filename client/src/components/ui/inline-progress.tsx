import React from 'react';
import { Progress } from './progress';
import { Loader2 } from 'lucide-react';
import type { ProgressState } from '@/hooks/use-progress';

interface InlineProgressProps {
  progress: ProgressState;
}

export function InlineProgress({ progress }: InlineProgressProps) {
  if (!progress.isActive) return null;

  return (
    <div 
      className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-300"
      data-testid="inline-progress"
    >
      <div className="flex items-center gap-3 mb-4">
        <Loader2 className="w-5 h-5 text-emerald-600 animate-spin" />
        <span className="font-medium text-slate-700" data-testid="progress-message">
          {progress.message || 'Bitte warten...'}
        </span>
      </div>

      <div className="space-y-2">
        <Progress 
          value={progress.percent} 
          className="h-2.5 bg-slate-100"
          data-testid="progress-bar"
        />
        
        <div className="flex justify-between text-sm">
          <span className="text-slate-500" data-testid="progress-count">
            {progress.processed.toLocaleString('de-DE')} / {progress.total.toLocaleString('de-DE')} Datensätze
          </span>
          <span className="font-semibold text-emerald-600" data-testid="progress-percent">
            {progress.percent}%
          </span>
        </div>
      </div>
    </div>
  );
}
