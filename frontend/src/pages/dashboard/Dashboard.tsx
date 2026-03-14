import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Users, Clock, FileText, AlertCircle, ArrowRight } from 'lucide-react';
import authService from '../../services/auth';
import vaultService from '../../services/vault';
import type { Vault, Recipient, CheckinStatus } from '../../types';

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  return new Date(value).toLocaleString();
};

const Dashboard = () => {
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [status, setStatus] = useState<CheckinStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const user = authService.getCurrentUser();

  const activeVaults = useMemo(() => vaults.filter((v) => v.is_active).length, [vaults]);
  const releasedVaults = useMemo(() => vaults.filter((v) => v.release_triggered).length, [vaults]);

  const daysUntilCheckin = useMemo(() => {
    if (!status?.next_checkin_due) return '—';
    const diffMs = new Date(status.next_checkin_due).getTime() - Date.now();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return diffDays < 0 ? 'Overdue' : String(diffDays);
  }, [status]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [vaultRes, recipientRes, statusRes] = await Promise.all([
          vaultService.getVaults(),
          vaultService.getRecipients(),
          vaultService.getCheckinStatus(),
        ]);
        setVaults(vaultRes.vaults || []);
        setRecipients(recipientRes.recipients || []);
        setStatus(statusRes);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const stats = [
    { label: 'Vault Items',         value: String(vaults.length),     icon: <Shield size={22} />,   color: 'bg-blue-500' },
    { label: 'Recipients',          value: String(recipients.length),  icon: <Users size={22} />,    color: 'bg-green-500' },
    { label: 'Days Until Check-in', value: daysUntilCheckin,           icon: <Clock size={22} />,    color: 'bg-purple-500' },
    { label: 'Released Vaults',     value: String(releasedVaults),     icon: <FileText size={22} />, color: 'bg-orange-500' },
  ];

  const quickActions = [
    { title: 'Manage Vault',      description: 'Create and update encrypted instructions', to: '/dashboard/vault',       icon: <Shield size={22} /> },
    { title: 'Manage Recipients', description: 'Choose who gets access',                   to: '/dashboard/recipients',  icon: <Users size={22} /> },
    { title: 'Check-ins',         description: 'View status and confirm you are okay',     to: '/dashboard/checkins',    icon: <Clock size={22} /> },
  ];

  if (loading) {
    return <div className="text-gray-600">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">
          Welcome, {user?.full_name || user?.email || 'User'}!
        </h1>
        <p className="text-blue-100">
          Monitor your digital will status and keep your check-ins up to date.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">{stat.label}</p>
                <p className="text-4xl font-bold mt-2 text-gray-900">{stat.value}</p>
              </div>
              <div className={`${stat.color} p-3 rounded-xl text-white shadow-sm`}>
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Check-in alert */}
      <div className={`rounded-xl p-5 border ${status?.is_overdue ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}>
        <div className="flex items-start gap-4">
          <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${status?.is_overdue ? 'text-red-500' : 'text-yellow-500'}`} />
          <div className="flex-1">
            <h3 className={`text-base font-semibold ${status?.is_overdue ? 'text-red-800' : 'text-yellow-800'}`}>
              {status?.is_overdue ? 'Check-in overdue!' : 'Current check-in status'}
            </h3>
            <div className={`mt-1 space-y-0.5 text-sm ${status?.is_overdue ? 'text-red-700' : 'text-yellow-700'}`}>
              <p>Last check-in: {formatDate(status?.last_checkin)}</p>
              <p>Next due: {formatDate(status?.next_checkin_due)}</p>
              <p>Reminder sent: {status?.reminder_sent_at ? formatDate(status.reminder_sent_at) : 'No'}</p>
            </div>
          </div>
          <Link
            to="/dashboard/checkins"
            className={`flex-shrink-0 text-sm font-semibold px-4 py-2 rounded-lg transition-colors ${status?.is_overdue ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-yellow-500 hover:bg-yellow-600 text-white'}`}
          >
            Check in
          </Link>
        </div>
      </div>

      {/* Summary + Quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Summary */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">System Summary</h2>
          <dl className="space-y-3">
            {[
              ['Active vaults',      activeVaults],
              ['Total recipients',   recipients.length],
              ['Check-in interval',  `${status?.checkin_interval_days ?? '—'} days`],
              ['Release status',     releasedVaults > 0 ? `${releasedVaults} released` : 'None released'],
            ].map(([k, v]) => (
              <div key={String(k)} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                <dt className="text-sm text-gray-500">{k}</dt>
                <dd className="text-sm font-semibold text-gray-800">{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Quick actions */}
        <div className="lg:col-span-3 space-y-3">
          {quickActions.map((action, index) => (
            <Link
              key={index}
              to={action.to}
              className="flex items-center gap-4 bg-white rounded-xl shadow-sm border border-gray-100 px-5 py-4 hover:shadow-md hover:border-blue-200 hover:-translate-y-0.5 transition-all duration-200 group"
            >
              <div className="bg-blue-50 text-blue-600 p-3 rounded-xl group-hover:bg-blue-100 transition-colors">
                {action.icon}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{action.title}</h3>
                <p className="text-sm text-gray-500 mt-0.5">{action.description}</p>
              </div>
              <ArrowRight size={18} className="text-gray-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all flex-shrink-0" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;