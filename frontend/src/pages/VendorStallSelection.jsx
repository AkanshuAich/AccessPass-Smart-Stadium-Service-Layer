import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function VendorStallSelection() {
  const [stalls, setStalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const navigate = useNavigate();
  const { updateUser, logout } = useAuth();

  useEffect(() => {
    const fetchStalls = async () => {
      try {
        const res = await client.get('/stalls');
        setStalls(res.data);
      } catch (err) {
        toast.error('Failed to load stalls');
      } finally {
        setLoading(false);
      }
    };
    fetchStalls();
  }, []);

  const handleSelectStall = async (stallId) => {
    setAssigning(true);
    try {
      await client.patch('/vendor/assign-stall', { stall_id: stallId });
      updateUser({ stall_id: stallId });
      toast.success('Stall assigned successfully!');
      navigate('/vendor');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to assign stall');
      setAssigning(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-950 pb-20 page-container">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-surface-900/80 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center justify-between p-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <button onClick={logout} className="mr-2 text-white/50 hover:text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <span className="text-2xl">🏪</span>
            <h1 className="text-xl font-bold text-white">Vendor Portal Setup</h1>
          </div>
          <button onClick={logout} className="p-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 max-w-7xl mx-auto mt-8">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-white mb-2">Select Your <span className="gradient-text">Stall</span></h2>
          <p className="text-white/50">Choose the stall you are operating today to view its live queues.</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-12 h-12 rounded-full border-4 border-primary-500/30 border-t-primary-400 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stalls.map((stall) => (
              <button
                key={stall.id}
                onClick={() => handleSelectStall(stall.id)}
                disabled={assigning}
                className="glass-card-hover text-left p-0 overflow-hidden relative group"
              >
                <div className="h-32 bg-surface-900 overflow-hidden">
                  <div className="w-full h-full bg-primary-500/10 flex items-center justify-center">
                    <span className="text-4xl opacity-50 block group-hover:scale-110 transition-transform duration-500">
                      {stall.category === 'food' ? '🍔' : stall.category === 'beverage' ? '🥤' : '🍟'}
                    </span>
                  </div>
                </div>
                
                <div className="p-5">
                  <h3 className="text-lg font-bold text-white mb-1 group-hover:text-primary-400 transition-colors">
                    {stall.name}
                  </h3>
                  <p className="text-sm text-white/50 mb-4">{stall.location}</p>
                  
                  <div className="flex items-center text-sm font-medium text-white/40 group-hover:text-white/80 transition-colors">
                    <span className="flex-1">ID: #{stall.id}</span>
                    <span className="flex items-center gap-1 text-primary-400">
                      Select Stall
                      <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
