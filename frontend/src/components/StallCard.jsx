import { useNavigate } from 'react-router-dom';
import WaitBadge from './WaitBadge';

const categoryIcons = {
  food: '🍔',
  beverage: '🥤',
  snacks: '🍿',
  dessert: '🍦',
};

const categoryColors = {
  food: 'from-orange-500/20 to-red-500/20',
  beverage: 'from-blue-500/20 to-cyan-500/20',
  snacks: 'from-yellow-500/20 to-amber-500/20',
  dessert: 'from-pink-500/20 to-purple-500/20',
};

export default function StallCard({ stall, liveData }) {
  const navigate = useNavigate();
  
  const waitTime = liveData?.wait_time ?? stall.wait_time ?? 0;
  const activeOrders = liveData?.active_orders ?? stall.active_orders ?? 0;
  const icon = categoryIcons[stall.category] || '🏪';
  const gradientBg = categoryColors[stall.category] || 'from-primary-500/20 to-accent-blue/20';

  return (
    <button
      id={`stall-card-${stall.id}`}
      onClick={() => navigate(`/stall/${stall.id}`)}
      className="glass-card-hover w-full text-left p-4 animate-fade-in group"
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${gradientBg} flex items-center justify-center text-2xl shrink-0 group-hover:scale-110 transition-transform duration-300`}>
          {icon}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-white truncate">{stall.name}</h3>
            <WaitBadge waitTime={waitTime} />
          </div>

          <p className="text-sm text-white/50 mt-0.5">{stall.location}</p>
          
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs text-white/40 flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {activeOrders} in queue
            </span>
            <span className="text-xs text-white/40">•</span>
            <span className="text-xs text-white/40">~{stall.avg_service_time} min/order</span>
          </div>

          {stall.rush_status && (
            <div className="mt-2 text-xs font-medium text-wait-crowded bg-wait-crowded/10 border border-wait-crowded/20 rounded-lg px-2 py-1 inline-block animate-pulse">
              {stall.rush_status}
            </div>
          )}
        </div>
        
        {/* Arrow */}
        <svg className="w-5 h-5 text-white/20 group-hover:text-primary-400 transition-colors shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );
}
