import React from 'react';
import { Progress } from './progress';
import { Loader2 } from 'lucide-react';
import type { ProgressState } from '@/hooks/use-progress';

interface ProgressOverlayProps {
  progress: ProgressState;
}

export function ProgressOverlay({ progress }: ProgressOverlayProps) {
  if (!progress.isActive) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      data-testid="progress-overlay"
    >
      <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl" data-testid="progress-modal">
        <div className="flex items-center gap-3 mb-6">
          <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
          <h3 className="text-lg font-semibold text-slate-800" data-testid="progress-title">
            Daten werden verarbeitet
          </h3>
        </div>

        <p className="text-slate-600 mb-4" data-testid="progress-message">
          {progress.message || 'Bitte warten...'}
        </p>

        <div className="space-y-3">
          <Progress 
            value={progress.percent} 
            className="h-3 bg-slate-100"
            data-testid="progress-bar"
          />
          
          <div className="flex justify-between text-sm">
            <span className="text-slate-500" data-testid="progress-count">
              {progress.processed.toLocaleString('de-DE')} / {progress.total.toLocaleString('de-DE')}
            </span>
            <span className="font-medium text-emerald-600" data-testid="progress-percent">
              {progress.percent}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
