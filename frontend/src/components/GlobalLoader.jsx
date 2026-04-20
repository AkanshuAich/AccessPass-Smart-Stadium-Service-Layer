import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const loadingMessages = [
  "Initializing stadium services...",
  "Waking up stadium servers...",
  "Syncing live queue data...",
  "Connecting to real-time systems...",
  "Almost there...",
];

const subtextMessages = [
  "Optimizing queues and live updates...",
  "Preparing your seamless experience...",
  "Setting up real-time connections...",
  "Loading stall and menu data...",
  "Finalizing stadium systems...",
];

export default function GlobalLoader() {
  const { warmupAttempt, warmupError } = useAuth();
  const [messageIndex, setMessageIndex] = useState(0);

  // Rotate messages every 3s for engagement
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % loadingMessages.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-surface-950 flex flex-col items-center justify-center p-6 text-center overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-500/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-accent-cyan/5 rounded-full blur-[100px] animate-pulse-slow" />
      </div>

      <div className="relative z-10 max-w-sm w-full space-y-8 animate-scale-in">
        {/* Logo/Icon */}
        <div className="relative mx-auto w-24 h-24">
          <div className="absolute inset-0 bg-primary-500/20 rounded-3xl blur-xl animate-pulse" />
          <div className="relative w-full h-full rounded-3xl bg-gradient-to-br from-primary-500 to-accent-blue flex items-center justify-center text-4xl shadow-2xl shadow-primary-500/40 border border-white/20">
            🏟️
          </div>
        </div>

        {/* Text content with smooth transition */}
        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Setting Up <span className="gradient-text">Stadium</span>
          </h1>
          <div className="flex flex-col gap-1.5 items-center min-h-[48px]">
            <p key={`msg-${messageIndex}`} className="text-white/60 text-sm font-medium animate-fade-in">
              {loadingMessages[messageIndex]}
            </p>
            <p key={`sub-${messageIndex}`} className="text-white/30 text-xs animate-fade-in">
              {subtextMessages[messageIndex]}
            </p>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="relative pt-4">
          <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary-500 to-accent-cyan rounded-full animate-progress-indefinite" />
          </div>
          <div className="mt-4 flex justify-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-bounce [animation-delay:-0.3s]" />
            <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-bounce [animation-delay:-0.15s]" />
            <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-bounce" />
          </div>
        </div>

        {/* Retry info — shows after 2+ failed attempts */}
        {warmupAttempt > 2 && warmupError && (
          <div className="animate-fade-in">
            <div className="glass-card p-3 border-primary-500/20">
              <div className="flex items-center justify-center gap-2 text-white/40 text-xs">
                <div className="w-2 h-2 rounded-full bg-primary-500/50 animate-pulse" />
                <span>Reconnecting to stadium services... (attempt {warmupAttempt})</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Subtle bottom text */}
      <div className="absolute bottom-8 text-[10px] uppercase tracking-[0.2em] text-white/20 font-bold">
        AccessPass Smart Stadium Layer
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes progress-indefinite {
          0% { left: -40%; width: 30%; }
          50% { left: 40%; width: 40%; }
          100% { left: 110%; width: 30%; }
        }
        .animate-progress-indefinite {
          animation: progress-indefinite 2s ease-in-out infinite;
          position: absolute;
        }
      `}} />
    </div>
  );
}
