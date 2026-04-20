import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  return (
    <Layout>
      <div className="page-container">
        <h1 className="text-2xl font-bold text-white mb-6">
          Your <span className="gradient-text">Profile</span>
        </h1>

        <div className="glass-card p-6 mb-6 animate-fade-in">
          {/* Avatar */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-blue flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-primary-500/30">
              {user?.section}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Section {user?.section} — Seat {user?.seat}</h2>
              <p className="text-sm text-white/40">{user?.ticket_id}</p>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-3">
            <div className="flex items-center justify-between py-3 border-t border-white/5">
              <span className="text-sm text-white/50">Ticket ID</span>
              <span className="text-sm font-mono text-white/80">{user?.ticket_id}</span>
            </div>
            <div className="flex items-center justify-between py-3 border-t border-white/5">
              <span className="text-sm text-white/50">Section</span>
              <span className="text-sm font-medium text-white">{user?.section}</span>
            </div>
            <div className="flex items-center justify-between py-3 border-t border-white/5">
              <span className="text-sm text-white/50">Seat</span>
              <span className="text-sm font-medium text-white">{user?.seat}</span>
            </div>
            <div className="flex items-center justify-between py-3 border-t border-white/5">
              <span className="text-sm text-white/50">Status</span>
              <span className="badge-fast">Active</span>
            </div>
          </div>
        </div>

        {/* About */}
        <div className="glass-card p-6 mb-6">
          <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
            <span>🏟️</span> About AccessPass
          </h3>
          <p className="text-sm text-white/50 leading-relaxed">
            AccessPass digitizes stadium service access so you never stand in
            physical queues. Browse stalls, join digital queues, and get notified
            when your order is ready — all from your phone.
          </p>
          <div className="flex gap-2 mt-4 flex-wrap">
            <span className="text-[10px] bg-white/5 border border-white/10 text-white/40 px-2 py-1 rounded-full">React</span>
            <span className="text-[10px] bg-white/5 border border-white/10 text-white/40 px-2 py-1 rounded-full">FastAPI</span>
            <span className="text-[10px] bg-white/5 border border-white/10 text-white/40 px-2 py-1 rounded-full">Gemini AI</span>
            <span className="text-[10px] bg-white/5 border border-white/10 text-white/40 px-2 py-1 rounded-full">WebSocket</span>
          </div>
        </div>

        {/* Logout */}
        <button onClick={handleLogout} className="btn-danger w-full" id="logout-btn">
          Sign Out
        </button>
      </div>
    </Layout>
  );
}
