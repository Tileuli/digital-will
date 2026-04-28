import React from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Shield,
  Users,
  Clock,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  Activity,
  Settings,
} from 'lucide-react';
import authService from '../services/auth';

const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const user = authService.getCurrentUser();

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Overview' },
    { to: '/dashboard/vault', icon: Shield, label: 'My Vault' },
    { to: '/dashboard/recipients', icon: Users, label: 'Recipients' },
    { to: '/dashboard/checkins', icon: Clock, label: 'Check-ins' },
    { to: '/dashboard/activity', icon: Activity, label: 'Activity' },
    { to: '/dashboard/settings', icon: Settings, label: 'Settings' },
  ];

  const initials =
    user?.full_name
      ?.split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) ||
    user?.email?.charAt(0).toUpperCase() ||
    'U';

  const sidebarW = collapsed ? 'lg:w-20' : 'lg:w-72';
  const mainML = collapsed ? 'lg:ml-20' : 'lg:ml-72';

  return (
    <div className="min-h-screen bg-slate-50/50 flex">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 flex flex-col
          bg-white border-r border-slate-200/80
          transition-all duration-300 ease-in-out
          w-72
          ${sidebarW}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 h-16 px-5 border-b border-slate-200/80 relative">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center flex-shrink-0">
            <Shield size={17} className="text-white" />
          </div>
          {!collapsed && (
            <span className="font-semibold text-slate-900 tracking-tight">
              Digital Will
            </span>
          )}

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white border border-slate-200 rounded-full items-center justify-center text-slate-400 hover:text-slate-700 hover:border-slate-300 transition shadow-sm z-10"
          >
            <ChevronLeft
              size={12}
              className={`transition-transform ${collapsed ? 'rotate-180' : ''}`}
            />
          </button>

          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden ml-auto text-slate-400 hover:text-slate-700 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* User */}
        <div
          className={`flex items-center gap-3 px-4 py-4 border-b border-slate-200/80 ${
            collapsed ? 'lg:justify-center lg:px-0' : ''
          }`}
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-semibold text-sm flex-shrink-0">
            {initials}
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">
                {user?.full_name || 'User'}
              </p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to;
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                title={collapsed ? item.label : undefined}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition
                  ${collapsed ? 'lg:justify-center' : ''}
                  ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }
                `}
              >
                <Icon size={18} className="flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-slate-200/80">
          <button
            onClick={handleLogout}
            title={collapsed ? 'Logout' : undefined}
            className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition ${
              collapsed ? 'lg:justify-center' : ''
            }`}
          >
            <LogOut size={18} className="flex-shrink-0" />
            {!collapsed && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <div
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${mainML}`}
      >
        {/* Mobile topbar */}
        <header className="lg:hidden sticky top-0 z-20 flex items-center gap-3 px-4 h-14 bg-white/90 backdrop-blur border-b border-slate-200/80">
          <button
            onClick={() => setMobileOpen(true)}
            className="text-slate-600 hover:text-slate-900 transition"
          >
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
              <Shield size={13} className="text-white" />
            </div>
            <span className="font-semibold text-slate-900 text-sm">
              Digital Will
            </span>
          </div>
        </header>

        <main className="flex-1 w-full">
          <div className="max-w-6xl mx-auto px-6 py-8 lg:px-10 lg:py-10">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
