import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import QrScanner from '../components/QrScanner';

// Demo QR data for testing (generates JSON that the scanner expects)
const DEMO_TICKETS = [
  { ticket_id: 'TKT-2026-A101', section: 'A', seat: '101' },
  { ticket_id: 'TKT-2026-B205', section: 'B', seat: '205' },
  { ticket_id: 'TKT-2026-C314', section: 'C', seat: '314' },
];

export default function ScanPage() {
  const { login, isAuthenticated, user, backendReady } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);

  // Redirect if already authenticated + Background pre-fetching
  useEffect(() => {
    if (isAuthenticated) {
      navigate(user?.role === 'vendor' ? '/vendor' : '/home');
    }
  }, [isAuthenticated, user, navigate]);

  // 🚀 Background Pre-fetch stalls once backend is ready
  useEffect(() => {
    if (!backendReady) return;

    const prefetchData = async () => {
      try {
        const res = await client.get('/stalls');
        sessionStorage.setItem('accesspass_stalls_cache', JSON.stringify(res.data));
        console.log('📦 Stalls pre-fetched in background');
      } catch (err) {
        console.warn('Pre-fetch failed (non-blocking):', err.message);
      }
    };
    prefetchData();
  }, [backendReady]);

  const handleScan = async (ticketData) => {
    setLoggingIn(true);
    setError('');
    try {
      const userData = await login(ticketData);
      navigate(userData?.role === 'vendor' ? '/vendor' : '/home');
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Try again.');
      setLoggingIn(false);
    }
  };

  const handleDemoLogin = async (ticket) => {
    setLoggingIn(true);
    setError('');
    try {
      const userData = await login(ticket);
      navigate(userData?.role === 'vendor' ? '/vendor' : '/home');
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed.');
      setLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-950 flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-primary-600/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-20 left-10 w-[300px] h-[300px] bg-accent-cyan/8 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-md mx-auto">
        {/* Logo & Title */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-blue shadow-xl shadow-primary-500/30 mb-4">
            <span className="text-3xl">🏟️</span>
          </div>
          <h1 className="text-3xl font-bold gradient-text mb-2">AccessPass</h1>
          <p className="text-white/50 text-sm">Scan your ticket to get started</p>
        </div>

        {/* Auth State Switch */}
        {scanning ? (
          <div className="animate-fade-in">
            <QrScanner onScan={handleScan} onError={(msg) => setError(msg)} />
            <button
              onClick={() => setScanning(false)}
              className="btn-secondary w-full mt-4"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="space-y-4 animate-slide-up">
            {/* Scan button */}
            <button
              onClick={() => setScanning(true)}
              disabled={loggingIn}
              className="btn-primary w-full flex items-center justify-center gap-3 py-4 text-lg animate-glow"
              id="scan-qr-button"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              Scan Ticket QR Code
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 py-2">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-xs text-white/30 uppercase tracking-wider">or demo login</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* Demo tickets */}
            <div className="space-y-2">
              {DEMO_TICKETS.map((ticket) => (
                <button
                  key={ticket.ticket_id}
                  onClick={() => handleDemoLogin(ticket)}
                  disabled={loggingIn}
                  className="glass-card-hover w-full p-3 flex items-center gap-3"
                  id={`demo-login-${ticket.section}`}
                >
                  <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center text-sm font-bold text-primary-300">
                    {ticket.section}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-white">Section {ticket.section} — Seat {ticket.seat}</p>
                    <p className="text-xs text-white/40">{ticket.ticket_id}</p>
                  </div>
                  <svg className="w-4 h-4 text-white/20 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}

              <div className="flex items-center gap-3 py-2 mt-4">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-xs text-white/30 uppercase tracking-wider">vendor portal</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>

              <button
                onClick={() => handleDemoLogin({ ticket_id: 'vendor_demo', section: 'VENDOR', seat: '1' })}
                disabled={loggingIn}
                className="glass-card-hover w-full p-3 flex items-center justify-center gap-3 border border-primary-500/20"
                id="vendor-demo-login"
              >
                <div className="text-center">
                  <p className="text-sm font-medium text-primary-400">Vendor Terminal Login</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl animate-fade-in text-center">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Loading overlay */}
        {loggingIn && (
          <div className="fixed inset-0 bg-surface-950/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="text-center animate-scale-in">
              <div className="w-16 h-16 rounded-full border-4 border-primary-500/30 border-t-primary-400 animate-spin mx-auto mb-4" />
              <p className="text-white/70 text-sm">Validating ticket...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
