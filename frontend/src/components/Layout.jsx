import Navbar from './Navbar';
import ConnectionStatus from './ConnectionStatus';
import { useWebSocket } from '../hooks/useWebSocket';

export default function Layout({ children }) {
  const { wsStatus } = useWebSocket();

  return (
    <div className="min-h-screen bg-[#0c0a14]">
      {/* WebSocket connection status banner */}
      <ConnectionStatus wsStatus={wsStatus} />

      {/* Ambient background gradient */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary-600/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-accent-blue/5 rounded-full blur-[100px]" />
      </div>
      
      <main className="relative z-10 animate-fade-in">
        {children}
      </main>
      
      <Navbar />
    </div>
  );
}
