import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { 
  Home, 
  Shield, 
  Users, 
  Clock,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import authService from '../services/auth';

const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const user = authService.getCurrentUser();

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/dashboard', icon: <Home size={20} />, label: 'Dashboard' },
    { to: '/dashboard/vault', icon: <Shield size={20} />, label: 'My Vault' },
    { to: '/dashboard/recipients', icon: <Users size={20} />, label: 'Recipients' },
    { to: '/dashboard/checkins', icon: <Clock size={20} />, label: 'Check-ins' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow-md"
      >
        {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40 w-64 bg-gray-900 text-white
        transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
        lg:translate-x-0 transition-transform duration-200
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-gray-800">
            <Link to="/" className="flex items-center space-x-3">
              <Shield size={32} className="text-blue-400" />
              <span className="text-2xl font-bold">Digital Will</span>
            </Link>
          </div>

          {/* User info */}
          <div className="p-6 border-b border-gray-800">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="font-bold text-lg">
                  {user?.full_name?.charAt(0) || user?.email?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div>
                <p className="font-semibold">{user?.full_name || 'User'}</p>
                <p className="text-sm text-gray-400 truncate">{user?.email}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4">
            <ul className="space-y-2">
              {navItems.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-800 transition-colors"
                    onClick={() => setSidebarOpen(false)}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Logout button */}
          <div className="p-4 border-t border-gray-800">
            <button
              onClick={handleLogout}
              className="flex items-center justify-center space-x-3 w-full p-3 rounded-lg bg-red-600 hover:bg-red-700 transition-colors"
            >
              <LogOut size={20} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:ml-64">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Welcome back, {user?.full_name?.split(' ')[0] || 'User'}!
                </h1>
                <p className="text-gray-600">Manage your digital legacy</p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="font-medium">Next check-in due</p>
                  <p className="text-sm text-gray-600">
                    {user?.next_checkin_due 
                      ? new Date(user.next_checkin_due).toLocaleDateString() 
                      : 'Not set'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;