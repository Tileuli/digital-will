import { Link } from 'react-router-dom';
import { Shield, Users, Clock, FileText, AlertCircle } from 'lucide-react';
import authService from '../../services/auth';

const Dashboard = () => {
  const user = authService.getCurrentUser();

  const stats = [
    { label: 'Vault Items', value: '0', icon: <Shield />, color: 'bg-blue-500' },
    { label: 'Recipients', value: '0', icon: <Users />, color: 'bg-green-500' },
    { label: 'Days Until Check-in', value: '7', icon: <Clock />, color: 'bg-purple-500' },
    { label: 'Check-in Streak', value: '0', icon: <FileText />, color: 'bg-orange-500' },
  ];

  const quickActions = [
    { title: 'Create First Vault', description: 'Add encrypted instructions', to: '/dashboard/vault', icon: <Shield /> },
    { title: 'Add Recipients', description: 'Choose who gets access', to: '/dashboard/recipients', icon: <Users /> },
    { title: 'Set Check-in Schedule', description: 'Configure reminder frequency', to: '/dashboard/checkins', icon: <Clock /> },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">
          Welcome, {user?.full_name || user?.email || 'User'}!
        </h1>
        <p className="text-blue-100">
          Your digital legacy is protected. Start by setting up your vault.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{stat.label}</p>
                <p className="text-3xl font-bold mt-2">{stat.value}</p>
              </div>
              <div className={`${stat.color} p-3 rounded-lg text-white`}>
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Setup Alert */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
        <div className="flex items-start space-x-4">
          <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-lg font-semibold text-yellow-800">Setup Required</h3>
            <p className="text-yellow-700 mt-1">
              Your account is not fully set up yet. Complete these steps to secure your digital legacy.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Start</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {quickActions.map((action, index) => (
            <Link
              key={index}
              to={action.to}
              className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow border border-gray-200"
            >
              <div className="flex items-start space-x-4">
                <div className="bg-blue-100 text-blue-600 p-3 rounded-lg">
                  {action.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{action.title}</h3>
                  <p className="text-gray-600 text-sm mt-1">{action.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Tutorial */}
      <div className="bg-gray-50 rounded-2xl p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">How Digital Will Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-4">
            <div className="text-blue-600 font-bold text-lg">1. Create Vault</div>
            <p className="text-gray-600">
              Upload encrypted files or write instructions that only your recipients can access.
            </p>
          </div>
          <div className="space-y-4">
            <div className="text-blue-600 font-bold text-lg">2. Add Recipients</div>
            <p className="text-gray-600">
              Choose trusted people who will receive access if something happens to you.
            </p>
          </div>
          <div className="space-y-4">
            <div className="text-blue-600 font-bold text-lg">3. Regular Check-ins</div>
            <p className="text-gray-600">
              Confirm you're okay regularly. If you miss check-ins, access is automatically released.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;