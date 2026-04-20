import { useState, useEffect, useCallback, memo } from 'react';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import toast from 'react-hot-toast';
import { useWebSocket } from '../hooks/useWebSocket';

// ✅ MOVED OUTSIDE — React.memo prevents unnecessary re-renders
// and moving it outside means React sees the same component identity across renders
const getStatusColor = (status) => {
  switch (status) {
    case 'pending': return 'bg-purple-500/20 text-purple-400 border-purple-500/20';
    case 'queued': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/20';
    case 'preparing': return 'bg-blue-500/20 text-blue-500 border-blue-500/20';
    case 'ready': return 'bg-green-500/20 text-green-500 border-green-500/20';
    case 'rejected': return 'bg-red-500/20 text-red-400 border-red-500/20';
    default: return 'bg-gray-500/20 text-gray-400 border-gray-500/20';
  }
};

const OrderCard = memo(function OrderCard({ order, onUpdateStatus, onReject }) {
  return (
    <div className="glass-card p-4 space-y-4 transition-all duration-300">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-xl font-bold text-white mb-1">Tokens: #{order.token_number}</h3>
          <span className={`text-xs font-semibold px-2 py-1 rounded border ${getStatusColor(order.status)} uppercase tracking-wider transition-colors duration-300`}>
            {order.status}
          </span>
        </div>
        <div className="text-right text-sm text-white/40">
          <p>{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
          <p>ID: {order.id}</p>
        </div>
      </div>

      <div className="space-y-2 bg-surface-950/50 p-3 rounded-lg border border-white/5">
        {order.items.map((item, i) => (
          <div key={i} className="flex justify-between text-sm">
            <span className="text-white/80"><span className="text-primary-400 font-bold mr-2">{item.quantity}x</span>{item.name}</span>
          </div>
        ))}
      </div>

      {order.rejection_reason && (
        <div className="bg-red-500/10 border border-red-500/20 p-2 rounded text-xs text-red-400">
          <strong>Rejection:</strong> {order.rejection_reason}
        </div>
      )}

      <div className="flex gap-2 pt-2">
        {order.status === 'pending' && (
          <>
            <button 
              className="flex-1 btn-primary py-2 text-sm bg-purple-600 hover:bg-purple-500" 
              onClick={() => onUpdateStatus(order.id, 'queued')}
            >
              ✓ Accept
            </button>
            <button 
              className="px-3 btn-secondary py-2 text-sm border-red-500/30 text-red-400 hover:bg-red-500/10" 
              onClick={() => onReject(order.id)}
            >
              ✕
            </button>
          </>
        )}
        {order.status === 'queued' && (
          <button 
            className="flex-1 btn-primary py-2 text-sm bg-blue-600 hover:bg-blue-500" 
            onClick={() => onUpdateStatus(order.id, 'preparing')}
          >
            Start Preparing
          </button>
        )}
        {order.status === 'preparing' && (
          <button 
            className="flex-1 btn-primary py-2 text-sm bg-green-600 hover:bg-green-500" 
            onClick={() => onUpdateStatus(order.id, 'ready')}
          >
            Mark Ready
          </button>
        )}
        {order.status === 'ready' && (
          <button 
            className="flex-1 btn-secondary py-2 text-sm border-green-500/30 text-green-400" 
            onClick={() => onUpdateStatus(order.id, 'collected')}
          >
            Mark Collected
          </button>
        )}
      </div>
    </div>
  );
});

export default function VendorDashboard() {
  const { user, logout } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { connected } = useWebSocket(); // ensure socket connects

  const fetchOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await client.get('/vendor/orders');
      setOrders(res.data);
    } catch (err) {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Fetch once on mount; use silent if we might already have data
    fetchOrders();

    // Listen for WebSocket order updates
    const handleWsUpdate = (e) => {
      const updated = e.detail;
      if (updated.stall_id !== user.stall_id) return;

      if (updated.is_new) {
        setOrders(prev => [updated.order, ...prev]);
        toast.success('New Order Received! 📥');
      } else if (updated.status === 'cancelled') {
        setOrders(prev => prev.filter(o => o.id !== updated.order_id));
        toast('Order was cancelled by customer', { icon: '🚫' });
      } else {
        setOrders(prev => prev.map(o => 
          o.id === updated.order_id ? { ...o, status: updated.status } : o
        ));
      }
    };

    const handleReconnect = () => fetchOrders(true);

    window.addEventListener('ws_order_update', handleWsUpdate);
    window.addEventListener('ws_reconnected', handleReconnect);
    return () => {
      window.removeEventListener('ws_order_update', handleWsUpdate);
      window.removeEventListener('ws_reconnected', handleReconnect);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchOrders, user.stall_id]);

  const updateStatus = useCallback(async (orderId, newStatus, rejectionReason = null) => {
    // OPTIMISTIC UPDATE
    setOrders(prev => {
      const updated = prev.map(o => o.id === orderId ? { ...o, status: newStatus, rejection_reason: rejectionReason } : o);
      return updated;
    });
    
    try {
      await client.patch(`/vendor/orders/${orderId}/status`, { 
        status: newStatus,
        rejection_reason: rejectionReason 
      });
      toast.success(`Order marked as ${newStatus}`);
    } catch (err) {
      // ROLLBACK on error — refetch to get true state
      fetchOrders(true);
      toast.error(err.response?.data?.detail || 'Failed to update order');
    }
  }, [fetchOrders]);

  const handleReject = useCallback(async (orderId) => {
    const reason = window.prompt("Why are you rejecting this order? (e.g. Out of stock, Stall closing soon)");
    if (reason === null) return; // Cancelled prompt
    if (!reason.trim()) {
      toast.error("You must provide a reason for rejection");
      return;
    }
    updateStatus(orderId, 'rejected', reason);
  }, [updateStatus]);

  if (loading && orders.length === 0) {
    return (
      <div className="min-h-screen bg-[#0c0a14] p-6">
        <div className="flex justify-between items-center mb-8">
          <div className="space-y-2">
            <div className="w-48 h-8 bg-white/5 animate-pulse rounded-lg" />
            <div className="w-32 h-4 bg-white/5 animate-pulse rounded-lg" />
          </div>
          <div className="w-12 h-12 bg-white/5 animate-pulse rounded-xl" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => (
            <div key={i} className="space-y-4">
              <div className="w-full h-10 bg-white/5 animate-pulse rounded-lg" />
              <div className="w-full h-48 bg-white/5 animate-pulse rounded-2xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Filter Active vs Completed
  const activeOrders = orders.filter(o => ['pending', 'queued', 'preparing', 'ready'].includes(o.status));
  const completedOrders = orders.filter(o => ['collected', 'completed', 'rejected'].includes(o.status));

  // Group active
  const pending = activeOrders.filter(o => o.status === 'pending');
  const queued = activeOrders.filter(o => o.status === 'queued');
  const preparing = activeOrders.filter(o => o.status === 'preparing');
  const ready = activeOrders.filter(o => o.status === 'ready');

  return (
    <div className="min-h-screen bg-surface-950 pb-20 page-container">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-surface-900/80 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center justify-between p-4 max-w-7xl mx-auto">
          <div>
            <div className="flex items-center gap-3">
              <button onClick={() => window.location.href = '/vendor/select-stall'} className="mr-2 text-white/50 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <span className="text-2xl">🏪</span>
              <h1 className="text-xl font-bold text-white">Vendor Portal</h1>
            </div>
            <p className="text-xs text-white/50 ml-14">Stall ID: {user?.stall_id} {connected ? "• Live 🟢" : "• Reconnecting..."}</p>
          </div>
          <button onClick={logout} className="p-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 max-w-7xl mx-auto">
        {orders.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⏳</span>
            </div>
            <h3 className="text-lg font-bold text-white mb-1">No Orders Yet</h3>
            <p className="text-white/50">Orders will appear here as soon as they are placed.</p>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              
              {/* Lane 0: Incoming */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-purple-500/20 pb-2">
                  <h2 className="text-lg font-bold text-purple-400">Incoming ({pending.length})</h2>
                </div>
                {pending.length === 0 && <p className="text-sm text-white/20 italic">No new orders</p>}
                {pending.map(o => <OrderCard key={o.id} order={o} onUpdateStatus={updateStatus} onReject={handleReject} />)}
              </div>

              {/* Lane 1: Waiting */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-yellow-500/20 pb-2">
                  <h2 className="text-lg font-bold text-yellow-500">Queue ({queued.length})</h2>
                </div>
                {queued.map(o => <OrderCard key={o.id} order={o} onUpdateStatus={updateStatus} onReject={handleReject} />)}
              </div>

              {/* Lane 2: Preparing */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-blue-500/20 pb-2">
                  <h2 className="text-lg font-bold text-blue-500">Cooking ({preparing.length})</h2>
                </div>
                {preparing.map(o => <OrderCard key={o.id} order={o} onUpdateStatus={updateStatus} onReject={handleReject} />)}
              </div>

              {/* Lane 3: Ready */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-green-500/20 pb-2">
                  <h2 className="text-lg font-bold text-green-500">Ready ({ready.length})</h2>
                </div>
                {ready.map(o => <OrderCard key={o.id} order={o} onUpdateStatus={updateStatus} onReject={handleReject} />)}
              </div>

            </div>
            
            {/* History Toggle */}
            {completedOrders.length > 0 && (
              <div className="mt-12 opacity-50 hover:opacity-100 transition-opacity">
                 <h2 className="text-lg font-bold text-white mb-4">Recent History (Collected / Completed)</h2>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {completedOrders.map(o => <OrderCard key={o.id} order={o} onUpdateStatus={updateStatus} onReject={handleReject} />)}
                 </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
