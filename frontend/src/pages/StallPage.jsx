import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../api/client';
import Layout from '../components/Layout';
import WaitBadge from '../components/WaitBadge';
import toast from 'react-hot-toast';

export default function StallPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [stall, setStall] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState([]);
  const [ordering, setOrdering] = useState(false);

  useEffect(() => {
    const fetchStall = async () => {
      try {
        const res = await client.get(`/stalls/${id}`);
        setStall(res.data);
      } catch (err) {
        toast.error('Stall not found');
        navigate('/home');
      } finally {
        setLoading(false);
      }
    };
    fetchStall();
  }, [id]);

  const toggleItem = (item) => {
    setSelectedItems((prev) => {
      const exists = prev.find((i) => i.id === item.id);
      if (exists) {
        return prev.filter((i) => i.id !== item.id);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const updateQuantity = (itemId, delta) => {
    setSelectedItems((prev) =>
      prev.map((i) => {
        if (i.id === itemId) {
          const newQty = Math.max(1, (i.quantity || 1) + delta);
          return { ...i, quantity: newQty };
        }
        return i;
      })
    );
  };

  const totalPrice = selectedItems.reduce(
    (sum, i) => sum + i.price * (i.quantity || 1),
    0
  );

  const handleOrder = async () => {
    if (selectedItems.length === 0) {
      toast.error('Select at least one item');
      return;
    }

    setOrdering(true);
    // OPTIMISTIC NAVIGATION: Go to orders immediately with a placeholder
    navigate('/orders');
    
    try {
      const res = await client.post('/orders', {
        stall_id: parseInt(id),
        items: selectedItems.map((i) => ({
          menu_item_id: i.id,
          name: i.name,
          quantity: i.quantity || 1,
          price: i.price,
        })),
      });
      toast.success(`Order placed! Token #${res.data.token_number}`, {
        icon: '🎫',
        duration: 4000,
      });
    } catch (err) {
      // If failure, navigate back and explain
      navigate(`/stalls/${id}`);
      toast.error(err.response?.data?.detail || 'Failed to place order. Please try again.');
    } finally {
      setOrdering(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="page-container p-6 space-y-6">
          <div className="w-24 h-6 bg-white/5 animate-pulse rounded-lg" />
          <div className="w-full h-48 bg-white/5 animate-pulse rounded-2xl" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="w-full h-24 bg-white/5 animate-pulse rounded-xl" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  if (!stall) return null;

  const categoryIcons = { food: '🍔', beverage: '🥤', snacks: '🍿', dessert: '🍦' };

  return (
    <Layout>
      <div className="page-container">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-white/50 hover:text-white transition-colors mb-4"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        {/* Stall Header */}
        <div className="glass-card p-6 mb-6 animate-fade-in">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500/30 to-accent-blue/30 flex items-center justify-center text-3xl">
              {categoryIcons[stall.category] || '🏪'}
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-white">{stall.name}</h1>
              <p className="text-sm text-white/50 mt-1">{stall.description}</p>
              <div className="flex items-center gap-3 mt-3">
                <WaitBadge waitTime={stall.wait_time} size="lg" />
                <span className="text-xs text-white/40">📍 {stall.location}</span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-white/5">
            <div className="text-center">
              <p className="text-lg font-bold text-white">{stall.active_orders}</p>
              <p className="text-[11px] text-white/40">In Queue</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-primary-400">{stall.wait_time} min</p>
              <p className="text-[11px] text-white/40">Est. Wait</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-accent-cyan">~{stall.avg_service_time} min</p>
              <p className="text-[11px] text-white/40">Per Order</p>
            </div>
          </div>

          {stall.rush_status && (
            <div className="mt-4 p-3 bg-wait-crowded/10 border border-wait-crowded/20 rounded-xl text-center">
              <p className="text-sm font-semibold text-wait-crowded">{stall.rush_status}</p>
            </div>
          )}
        </div>

        {/* Menu */}
        <h2 className="section-title flex items-center gap-2">
          <span>📋</span> Menu
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {stall.menu?.map((item) => {
            const selected = selectedItems.find((i) => i.id === item.id);
            return (
              <button
                key={item.id}
                onClick={() => toggleItem(item)}
                className={`w-full text-left p-4 rounded-xl transition-all duration-200 ${
                  selected
                    ? 'bg-primary-500/15 border border-primary-500/30'
                    : 'glass-card hover:bg-white/8'
                }`}
                id={`menu-item-${item.id}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-white">{item.name}</h3>
                      {!item.is_available && (
                        <span className="text-[10px] text-red-400 bg-red-400/10 px-2 py-0.5 rounded-full">
                          Sold out
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-white/40 mt-0.5">{item.description}</p>
                  </div>
                  <div className="text-right ml-3">
                    <p className="text-sm font-bold text-primary-300">${item.price.toFixed(2)}</p>
                    {selected && (
                      <div className="flex items-center gap-2 mt-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => { e.stopPropagation(); updateQuantity(item.id, -1); }}
                          className="w-6 h-6 rounded bg-white/10 flex items-center justify-center text-xs text-white hover:bg-white/20"
                        >
                          −
                        </button>
                        <span className="text-xs font-medium text-white w-4 text-center">{selected.quantity}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); updateQuantity(item.id, 1); }}
                          className="w-6 h-6 rounded bg-primary-500/30 flex items-center justify-center text-xs text-white hover:bg-primary-500/50"
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Order bar */}
        {selectedItems.length > 0 && (
          <div className="fixed bottom-16 left-0 right-0 z-40 animate-slide-up">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <button
                onClick={handleOrder}
                disabled={ordering}
                className="btn-primary w-full flex items-center justify-between py-4 px-6"
                id="place-order-btn"
              >
                <span className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
                    {selectedItems.reduce((sum, i) => sum + (i.quantity || 1), 0)}
                  </span>
                  <span className="font-semibold">
                    {ordering ? 'Placing order...' : 'Join Queue'}
                  </span>
                </span>
                <span className="font-bold">${totalPrice.toFixed(2)}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
