import React from 'react';
import { CheckCircle2, Circle, Loader2, AlertCircle } from 'lucide-react';
import { ProcessingStep } from '../types.ts';

interface ProcessingStatusProps {
  steps: ProcessingStep[];
}

export const ProcessingStatus: React.FC<ProcessingStatusProps> = ({ steps }) => {
  return (
    <div className="w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 sm:p-7 no-print transition-colors">
      <div className="flex items-center space-x-2.5 mb-5">
        <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
        <h3 className="font-semibold text-slate-900 dark:text-white text-base">
          Processing Video Content Pipeline
        </h3>
      </div>

      <div className="space-y-3.5">
        {steps.map((step) => {
          let icon = <Circle className="w-4 h-4 text-slate-300 dark:text-slate-600 flex-shrink-0" />;
          let textColor = 'text-slate-500 dark:text-slate-400';

          if (step.status === 'completed') {
            icon = <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />;
            textColor = 'text-slate-700 dark:text-slate-200';
          } else if (step.status === 'in_progress') {
            icon = <Loader2 className="w-4 h-4 text-indigo-600 animate-spin flex-shrink-0" />;
            textColor = 'text-indigo-600 dark:text-indigo-400 font-medium';
          } else if (step.status === 'failed') {
            icon = <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />;
            textColor = 'text-rose-600 dark:text-rose-400';
          } else if (step.status === 'skipped') {
            icon = <Circle className="w-4 h-4 text-amber-500 flex-shrink-0" />;
            textColor = 'text-slate-500 dark:text-slate-400 italic';
          }

          return (
            <div key={step.id} className="flex items-start space-x-3 text-sm">
              <div className="mt-0.5">{icon}</div>
              <div className="flex-1">
                <span className={textColor}>{step.label}</span>
                {step.detail && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    {step.detail}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
