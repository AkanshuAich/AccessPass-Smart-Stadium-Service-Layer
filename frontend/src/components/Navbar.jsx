import { NavLink, useLocation } from 'react-router-dom';

const navItems = [
  {
    to: '/home',
    label: 'Stalls',
    icon: (active) => (
      <svg className={`w-6 h-6 ${active ? 'text-primary-400' : 'text-white/40'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    to: '/orders',
    label: 'Orders',
    icon: (active) => (
      <svg className={`w-6 h-6 ${active ? 'text-primary-400' : 'text-white/40'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
  },
  {
    to: '/profile',
    label: 'Profile',
    icon: (active) => (
      <svg className={`w-6 h-6 ${active ? 'text-primary-400' : 'text-white/40'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
];

export default function Navbar() {
  const location = useLocation();

  // Hide on scan page
  if (location.pathname === '/') return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 sm:pb-4">
        <div className="bg-surface-900/90 backdrop-blur-xl border-t sm:border border-white/5 px-4 py-2 sm:rounded-2xl shadow-xl">
          <div className="flex items-center justify-around">
            {navItems.map(({ to, label, icon }) => {
              const isActive = location.pathname.startsWith(to);
              return (
                <NavLink
                  key={to}
                  to={to}
                  className="flex flex-col items-center gap-0.5 py-1 px-4 transition-all"
                >
                  {icon(isActive)}
                  <span
                    className={`text-[10px] font-medium ${
                      isActive ? 'text-primary-400' : 'text-white/40'
                    }`}
                  >
                    {label}
                  </span>
                  {isActive && (
                    <div className="w-1 h-1 rounded-full bg-primary-400 mt-0.5" />
                  )}
                </NavLink>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
