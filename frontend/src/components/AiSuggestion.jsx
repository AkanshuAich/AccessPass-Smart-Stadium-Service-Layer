import { useState, useEffect } from 'react';

export default function AiSuggestion({ suggestion, loading }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (suggestion) {
      setTimeout(() => setVisible(true), 200);
    }
  }, [suggestion]);

  if (loading) {
    return (
      <div className="glass-card p-4 shimmer">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-lg bg-white/10 animate-pulse" />
          <div className="h-4 w-32 bg-white/10 rounded animate-pulse" />
        </div>
        <div className="space-y-2">
          <div className="h-3 w-full bg-white/10 rounded animate-pulse" />
          <div className="h-3 w-3/4 bg-white/10 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (!suggestion) return null;

  return (
    <div
      className={`glass-card overflow-hidden transition-all duration-500 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      {/* Header gradient */}
      <div className="bg-gradient-to-r from-primary-600/30 via-accent-cyan/20 to-accent-blue/30 px-4 py-3 flex items-center gap-2 border-b border-white/5">
        <span className="text-lg">🧠</span>
        <span className="font-semibold text-sm gradient-text">AI Suggestion</span>
        <span className="ml-auto text-[10px] text-white/30 font-medium tracking-wider uppercase">Powered by Gemini</span>
      </div>

      <div className="p-4 space-y-3">
        {/* Best stall */}
        {suggestion.best_stall && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-wait-fast/20 flex items-center justify-center text-sm shrink-0">🎯</div>
            <div>
              <p className="text-sm font-medium text-white">{suggestion.best_stall.name}</p>
              <p className="text-xs text-white/50 mt-0.5">{suggestion.best_stall.reason}</p>
            </div>
          </div>
        )}

        {/* Best timing */}
        {suggestion.best_timing && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent-blue/20 flex items-center justify-center text-sm shrink-0">⏰</div>
            <div>
              <p className="text-sm text-white/80">{suggestion.best_timing}</p>
            </div>
          </div>
        )}

        {/* Tip */}
        {suggestion.tip && (
          <div className="bg-primary-500/10 border border-primary-500/20 rounded-xl p-3 mt-2">
            <p className="text-xs text-primary-300">💡 {suggestion.tip}</p>
          </div>
        )}
      </div>
    </div>
  );
}
