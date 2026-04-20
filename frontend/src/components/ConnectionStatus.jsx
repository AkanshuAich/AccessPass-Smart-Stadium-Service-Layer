import { useState, useEffect } from 'react';

/**
 * ConnectionStatus - Subtle WebSocket status indicator
 * Shows a small animated bar at the top of the page
 */
export default function ConnectionStatus({ wsStatus }) {
  const [visible, setVisible] = useState(false);
  const [showConnected, setShowConnected] = useState(false);

  useEffect(() => {
    if (wsStatus === 'connecting' || wsStatus === 'reconnecting') {
      setVisible(true);
      setShowConnected(false);
    } else if (wsStatus === 'connected') {
      setShowConnected(true);
      // Auto-hide "connected" banner after 3s
      const timer = setTimeout(() => {
        setVisible(false);
        setShowConnected(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [wsStatus]);

  if (!visible && !showConnected) return null;

  const isConnected = wsStatus === 'connected';

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[60] transition-all duration-500 ${
        visible || showConnected
          ? 'translate-y-0 opacity-100'
          : '-translate-y-full opacity-0'
      }`}
    >
      <div
        className={`flex items-center justify-center gap-2 py-1.5 text-xs font-medium transition-colors duration-500 ${
          isConnected
            ? 'bg-wait-fast/10 text-wait-fast border-b border-wait-fast/20'
            : 'bg-primary-500/10 text-primary-300 border-b border-primary-500/20'
        }`}
      >
        {isConnected ? (
          <>
            <div className="w-1.5 h-1.5 rounded-full bg-wait-fast" />
            <span>Live updates active</span>
          </>
        ) : wsStatus === 'reconnecting' ? (
          <>
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span>Reconnecting to live updates...</span>
          </>
        ) : (
          <>
            <div className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-pulse" />
            <span>Connecting to live updates...</span>
          </>
        )}
      </div>
    </div>
  );
}
