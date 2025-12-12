import React from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface StepperProps {
  currentStep: number;
  steps: string[];
}

export function Stepper({ currentStep, steps }: StepperProps) {
  return (
    <div className="w-full py-4">
      <div className="flex items-center justify-between relative">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-slate-200 -z-10" />
        
        {steps.map((step, index) => {
          const stepNum = index + 1;
          const isActive = stepNum === currentStep;
          const isCompleted = stepNum < currentStep;

          return (
            <div key={step} className="flex flex-col items-center gap-2 bg-slate-50 px-2">
              <div 
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300",
                  isActive ? "border-primary bg-primary text-primary-foreground scale-110 shadow-lg" : 
                  isCompleted ? "border-emerald-500 bg-emerald-500 text-white" : 
                  "border-slate-300 bg-white text-slate-400"
                )}
              >
                {isCompleted ? <Check className="w-5 h-5" /> : stepNum}
              </div>
              <span className={cn(
                "text-xs font-medium absolute -bottom-6 w-32 text-center",
                isActive ? "text-primary" : "text-slate-400"
              )}>
                {step}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
