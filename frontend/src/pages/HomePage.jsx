import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';
import client from '../api/client';
import Layout from '../components/Layout';
import StallCard from '../components/StallCard';
import AiSuggestion from '../components/AiSuggestion';
import { SkeletonStall, SkeletonCategory } from '../components/Skeleton';

const categories = ['all', 'food', 'beverage', 'snacks', 'dessert'];
const categoryLabels = {
  all: '🏪 All',
  food: '🍔 Food',
  beverage: '🥤 Drinks',
  snacks: '🍿 Snacks',
  dessert: '🍦 Dessert',
};

const CACHE_KEY = 'accesspass_stalls_cache';

export default function HomePage() {
  const { user } = useAuth();
  const { stallUpdates, matchMinute, isPeak, connected } = useWebSocket();
  const [stalls, setStalls] = useState(() => {
    // Try sessionStorage first, then fall back to localStorage for migration
    const cached = sessionStorage.getItem(CACHE_KEY) || localStorage.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) : [];
  });
  const [suggestion, setSuggestion] = useState(null);
  const [sugLoading, setSugLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [loading, setLoading] = useState(stalls.length === 0);

  const fetchStalls = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await client.get('/stalls');
      setStalls(res.data);
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(res.data));
    } catch (err) {
      console.error('Failed to fetch stalls:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Sync on mount and on WS reconnect
  useEffect(() => {
    // If we have cached data, fetch silently in background
    fetchStalls(stalls.length > 0);

    const handleReconnect = () => fetchStalls(true);
    window.addEventListener('ws_reconnected', handleReconnect);
    return () => window.removeEventListener('ws_reconnected', handleReconnect);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchStalls]);

  // Fetch AI suggestion
  useEffect(() => {
    const fetchSuggestion = async () => {
      try {
        const res = await client.get(`/suggestions?section=${user?.section || 'A'}`);
        setSuggestion(res.data);
      } catch (err) {
        console.error('Failed to fetch suggestion:', err);
      } finally {
        setSugLoading(false);
      }
    };
    fetchSuggestion();
    const intervalId = setInterval(fetchSuggestion, 30000);
    return () => clearInterval(intervalId);
  }, [user?.section]);

  // Merge live WebSocket data with stalls
  const liveMap = useMemo(() => {
    const map = {};
    stallUpdates.forEach((s) => {
      map[s.id] = s;
    });
    return map;
  }, [stallUpdates]);

  const filteredStalls = useMemo(() => {
    let result = stalls;
    if (category !== 'all') {
      result = result.filter((s) => s.category === category);
    }
    return result;
  }, [stalls, category]);

  const getMatchDisplay = () => {
    if (matchMinute <= 45) return `1st Half — ${matchMinute}'`;
    if (matchMinute <= 60) return `⏸️ Halftime — ${matchMinute - 45}' break`;
    return `2nd Half — ${matchMinute}'`;
  };

  return (
    <Layout>
      <div className="page-container">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 animate-fade-in">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Hey, <span className="gradient-text">Section {user?.section}</span> 👋
            </h1>
            <p className="text-sm text-white/40 mt-0.5">
              Seat {user?.seat} • {getMatchDisplay()}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {isPeak && (
              <span className="badge-crowded animate-pulse text-[10px]">🔥 PEAK</span>
            )}
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-medium transition-all duration-500 ${
              connected 
                ? 'bg-wait-fast/10 text-wait-fast border border-wait-fast/20' 
                : 'bg-white/5 text-white/40 border border-white/10'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-wait-fast' : 'bg-white/30 animate-pulse'}`} />
              {connected ? 'Live' : 'Connecting...'}
            </div>
          </div>
        </div>

        {/* AI Suggestion */}
        <div className="mb-6">
          <AiSuggestion suggestion={suggestion} loading={sugLoading} />
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1 scrollbar-hide">
          {loading && stalls.length === 0 ? (
            <SkeletonCategory />
          ) : (
            categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                  category === cat
                    ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30'
                    : 'bg-white/5 text-white/50 border border-white/5 hover:bg-white/10'
                }`}
              >
                {categoryLabels[cat]}
              </button>
            ))
          )}
        </div>

        {/* Stall List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 transition-all duration-500">
          {loading && stalls.length === 0 ? (
            Array.from({ length: 8 }).map((_, i) => (
              <SkeletonStall key={i} />
            ))
          ) : filteredStalls.length === 0 ? (
            <div className="text-center py-12 animate-scale-in col-span-full">
              <span className="text-4xl block mb-3">🏪</span>
              <p className="text-white/40">No stalls found in this category</p>
            </div>
          ) : (
            filteredStalls.map((stall, idx) => (
              <div 
                key={stall.id} 
                className="animate-scale-in" 
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <StallCard
                  stall={stall}
                  liveData={liveMap[stall.id]}
                />
              </div>
            ))
          )}
        </div>

        {/* Stats footer */}
        <div className="mt-8 glass-card p-4 animate-fade-in">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-white">{stalls.length}</p>
              <p className="text-xs text-white/40">Open Stalls</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary-400">{matchMinute}'</p>
              <p className="text-xs text-white/40">Match Clock</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-accent-cyan">
                {stalls.reduce((sum, s) => sum + (liveMap[s.id]?.active_orders ?? s.active_orders ?? 0), 0)}
              </p>
              <p className="text-xs text-white/40">Total Orders</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
