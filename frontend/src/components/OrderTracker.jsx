const steps = [
  { key: 'pending', label: 'Incoming', icon: '📩' },
  { key: 'queued', label: 'Accepted', icon: '✓' },
  { key: 'preparing', label: 'Preparing', icon: '👨‍🍳' },
  { key: 'ready', label: 'Ready!', icon: '✅' },
  { key: 'collected', label: 'Collected', icon: '🎉' },
];

export default function OrderTracker({ status, rejection_reason }) {
  const currentIdx = steps.findIndex(s => s.key === status);

  if (status === 'rejected') {
    return (
      <div className="w-full py-4 bg-red-500/10 border border-red-500/20 rounded-xl px-4 animate-scale-in">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-xl">✕</div>
          <div>
            <h4 className="text-red-400 font-bold text-sm uppercase">Order Rejected</h4>
            <p className="text-white/60 text-xs mt-1 italic leading-tight">"{rejection_reason || 'Store unable to fulfill order'}"</p>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'cancelled') {
    return (
      <div className="w-full py-4 bg-white/5 border border-white/10 rounded-xl px-4 animate-scale-in opacity-60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-xl">🚫</div>
          <div>
            <h4 className="text-white/60 font-bold text-sm uppercase">Order Cancelled</h4>
            <p className="text-white/30 text-xs mt-1">This order is no longer being processed.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between w-full px-2">
      {steps.map((step, idx) => {
        const isActive = idx <= currentIdx;
        const isCurrent = idx === currentIdx;

        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            {/* Step circle */}
            <div className="flex flex-col items-center">
              <div
                className={`w-11 h-11 rounded-full flex items-center justify-center text-lg transition-all duration-500 ${
                  isCurrent
                    ? 'bg-gradient-to-br from-primary-500 to-accent-blue shadow-lg shadow-primary-500/40 scale-110'
                    : isActive
                    ? 'bg-primary-600/60 border-2 border-primary-400'
                    : 'bg-white/5 border-2 border-white/10'
                }`}
              >
                {step.icon}
              </div>
              <span
                className={`text-[11px] mt-1.5 font-medium text-center ${
                  isCurrent ? 'text-primary-300' : isActive ? 'text-white/60' : 'text-white/25'
                }`}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {idx < steps.length - 1 && (
              <div className="flex-1 h-0.5 mx-1.5 mt-[-18px]">
                <div
                  className={`h-full rounded transition-all duration-700 ${
                    idx < currentIdx
                      ? 'bg-gradient-to-r from-primary-500 to-primary-400'
                      : 'bg-white/10'
                  }`}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
