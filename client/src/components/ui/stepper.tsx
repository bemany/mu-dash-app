import React from 'react';
import { cn } from '@/lib/utils';
import { Check, ChevronRight } from 'lucide-react';

interface StepperProps {
  currentStep: number;
  steps: string[];
}

export function Stepper({ currentStep, steps }: StepperProps) {
  return (
    <div className="w-full py-4">
      <div className="flex items-start justify-between relative max-w-4xl mx-auto">
        {/* Connecting Lines */}
        <div className="absolute left-0 top-5 w-full h-0.5 bg-slate-100" style={{ zIndex: 0 }} />
        <div 
          className="absolute left-0 top-5 h-0.5 bg-emerald-500 transition-all duration-500 ease-in-out"
          style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%`, zIndex: 0 }}
        />
        
        {steps.map((step, index) => {
          const stepNum = index + 1;
          const isActive = stepNum === currentStep;
          const isCompleted = stepNum < currentStep;

          return (
            <div key={step} className="flex flex-col items-center gap-2 relative group z-10">
              <div 
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300 shadow-sm bg-white",
                  isActive ? "border-emerald-500 text-emerald-600 scale-110 shadow-emerald-100 ring-4 ring-emerald-50" : 
                  isCompleted ? "border-emerald-500 bg-emerald-500 text-white" : 
                  "border-slate-200 text-slate-300"
                )}
              >
                {isCompleted ? <Check className="w-5 h-5" /> : stepNum}
              </div>
              
              <div className="flex flex-col items-center">
                 <span className={cn(
                   "text-sm font-semibold transition-colors duration-300 text-center",
                   isActive ? "text-emerald-900" : isCompleted ? "text-emerald-700" : "text-slate-400"
                 )}>
                   {step}
                 </span>
                 {isActive && (
                   <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-500 mt-0.5 animate-in fade-in slide-in-from-top-1">
                     Aktueller Schritt
                   </span>
                 )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
