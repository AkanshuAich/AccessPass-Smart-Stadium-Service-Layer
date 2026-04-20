import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import Layout from '../components/Layout';
import OrderTracker from '../components/OrderTracker';
import toast from 'react-hot-toast';
import { SkeletonOrder } from '../components/Skeleton';

const CACHE_KEY = 'accesspass_orders_cache';

function getOrdersCache() {
  const cached = sessionStorage.getItem(CACHE_KEY) || localStorage.getItem(CACHE_KEY);
  return cached ? JSON.parse(cached) : [];
}

export default function OrderPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState(getOrdersCache);
  const [loading, setLoading] = useState(orders.length === 0);

  const fetchOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await client.get('/orders');
      setOrders(res.data);
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(res.data));
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Use cached length check to determine silent vs visible fetch
    const hasCached = getOrdersCache().length > 0;
    fetchOrders(hasCached);
    const interval = setInterval(() => fetchOrders(true), 10000);

    const handleWsUpdate = (e) => {
      const updated = e.detail;
      setOrders(prev => {
        const newOrders = prev.map(o => 
          o.id === updated.order_id ? { ...o, status: updated.status } : o
        );
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(newOrders));
        return newOrders;
      });
    };

    const handleReconnect = () => fetchOrders(true);

    window.addEventListener('ws_order_update', handleWsUpdate);
    window.addEventListener('ws_reconnected', handleReconnect);

    return () => {
      clearInterval(interval);
      window.removeEventListener('ws_order_update', handleWsUpdate);
      window.removeEventListener('ws_reconnected', handleReconnect);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchOrders]);

  const handleCancel = async (orderId) => {
    try {
      await client.patch(`/orders/${orderId}/cancel`);
      toast.success('Order cancelled');
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to cancel');
    }
  };

  const activeOrders = orders.filter(o => ['pending', 'queued', 'preparing', 'ready'].includes(o.status));
  const pastOrders = orders.filter(o => ['collected', 'completed', 'cancelled', 'rejected'].includes(o.status));

  return (
    <Layout>
      <div className="page-container">
        <h1 className="text-2xl font-bold text-white mb-6 animate-fade-in">
          Your <span className="gradient-text">Orders</span>
        </h1>

        {loading && orders.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <SkeletonOrder key={i} />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20 animate-scale-in">
            <span className="text-6xl block mb-4">📋</span>
            <h2 className="text-lg font-semibold text-white mb-2">No orders yet</h2>
            <p className="text-sm text-white/40 mb-6">Browse stalls and place your first order</p>
            <button onClick={() => navigate('/home')} className="btn-primary">
              Browse Stalls
            </button>
          </div>
        ) : (
          <div className="space-y-8 animate-scale-in">
            {/* Active Orders */}
            {activeOrders.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-wait-fast animate-pulse" />
                  Active Orders ({activeOrders.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 transition-all duration-500">
                  {activeOrders.map((order, idx) => (
                    <div 
                      key={order.id} 
                      className="animate-scale-in"
                      style={{ animationDelay: `${idx * 100}ms` }}
                    >
                      <div className="glass-card overflow-hidden group hover:bg-white/[0.07] transition-all duration-300" id={`order-${order.id}`}>
                        {/* Ready notification bar */}
                        {order.status === 'ready' && (
                          <div className="bg-gradient-to-r from-wait-fast/20 to-wait-fast/10 px-4 py-2 flex items-center gap-2 border-b border-wait-fast/20 animate-pulse">
                            <span className="text-sm">🔔</span>
                            <span className="text-sm font-semibold text-wait-fast">Your order is ready! Head to the stall.</span>
                          </div>
                        )}

                      <div className="p-5">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="font-semibold text-white">{order.stall_name}</h3>
                            <p className="text-xs text-white/40 mt-0.5">
                              Token #{order.token_number} • {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-primary-300">
                              #{order.token_number}
                            </p>
                            {order.estimated_wait > 0 && order.status !== 'ready' && (
                              <p className="text-[11px] text-white/40">~{order.estimated_wait} min wait</p>
                            )}
                          </div>
                        </div>

                        {/* Progress tracker */}
                        <div className="mb-4">
                          <OrderTracker status={order.status} rejection_reason={order.rejection_reason} />
                        </div>

                        {/* Items */}
                        <div className="bg-white/3 rounded-lg p-3 mb-4">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-sm py-1">
                              <span className="text-white/60">
                                {item.quantity}× {item.name}
                              </span>
                              <span className="text-white/40">
                                ${(item.price * item.quantity).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Cancel button */}
                        {(order.status === 'pending' || order.status === 'queued' || order.status === 'preparing') && (
                          <button
                            onClick={() => handleCancel(order.id)}
                            className="btn-danger w-full text-sm py-2"
                          >
                            Cancel Order
                          </button>
                        )}
                      </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Past Orders */}
            {pastOrders.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">
                  Past Orders
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {pastOrders.map((order) => (
                    <div key={order.id} className="glass-card p-4 opacity-60">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-medium text-white">{order.stall_name}</h3>
                          <p className="text-xs text-white/40">
                            Token #{order.token_number} • {order.items.length} item(s)
                          </p>
                        </div>
                        <span className={`badge text-[10px] ${
                          (order.status === 'collected' || order.status === 'completed')
                            ? 'bg-wait-fast/20 text-wait-fast border border-wait-fast/30' 
                            : order.status === 'rejected'
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : 'bg-white/10 text-white/40 border border-white/10'
                        }`}>
                          {(order.status === 'collected' || order.status === 'completed') 
                            ? '✓ Completed' 
                            : order.status === 'rejected' 
                            ? '✕ Rejected' 
                            : '✕ Cancelled'}
                        </span>
                      </div>
                      {order.status === 'rejected' && order.rejection_reason && (
                        <div className="mt-3 p-2 bg-red-500/5 rounded border border-red-500/10">
                          <p className="text-[10px] text-red-400 font-medium uppercase mb-0.5">Reason for rejection</p>
                          <p className="text-xs text-white/70 italic leading-snug">"{order.rejection_reason}"</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
