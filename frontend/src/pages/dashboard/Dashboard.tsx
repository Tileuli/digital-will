import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield,
  Users,
  Clock,
  FileText,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
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

  const [user, setUser] = useState(authService.getCurrentUser());

  useEffect(() => {
    authService.fetchCurrentUser().then(setUser).catch(() => {});
  }, []);

  const activeVaults = useMemo(
    () => vaults.filter((v) => v.is_active).length,
    [vaults]
  );
  const releasedVaults = useMemo(
    () => vaults.filter((v) => v.release_triggered).length,
    [vaults]
  );

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
    {
      label: 'Vault items',
      value: String(vaults.length),
      icon: Shield,
      tint: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'Recipients',
      value: String(recipients.length),
      icon: Users,
      tint: 'bg-emerald-50 text-emerald-600',
    },
    {
      label: 'Days to next check-in',
      value: daysUntilCheckin,
      icon: Clock,
      tint: 'bg-violet-50 text-violet-600',
    },
    {
      label: 'Released vaults',
      value: String(releasedVaults),
      icon: FileText,
      tint: 'bg-amber-50 text-amber-600',
    },
  ];

  const quickActions = [
    {
      title: 'Manage vault',
      description: 'Create and update encrypted instructions',
      to: '/dashboard/vault',
      icon: Shield,
    },
    {
      title: 'Manage recipients',
      description: 'Choose who gets access',
      to: '/dashboard/recipients',
      icon: Users,
    },
    {
      title: 'Check-ins',
      description: 'View status and confirm you’re okay',
      to: '/dashboard/checkins',
      icon: Clock,
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-500">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading dashboard…
      </div>
    );
  }

  const overdue = !!status?.is_overdue;

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 lg:p-8 relative overflow-hidden">
        <div
          className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-gradient-to-br from-blue-100/60 to-indigo-100/40 blur-3xl"
          aria-hidden
        />
        <div className="relative flex items-start justify-between gap-6 flex-wrap">
          <div>
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-2">
              Overview
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Welcome back, {user?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'there'}
            </h1>
            <p className="text-slate-600 mt-2 max-w-xl">
              Monitor your digital will status and keep your check-ins up to date.
            </p>
          </div>
          <div
            className={`flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-full border ${
              overdue
                ? 'bg-rose-50 border-rose-200 text-rose-700'
                : 'bg-emerald-50 border-emerald-200 text-emerald-700'
            }`}
          >
            {overdue ? (
              <AlertCircle className="w-3.5 h-3.5" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5" />
            )}
            {overdue ? 'Check-in overdue' : 'Check-ins up to date'}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-2xl border border-slate-200 bg-white p-5"
            >
              <div className="flex items-center justify-between">
                <span
                  className={`inline-flex items-center justify-center w-9 h-9 rounded-lg ${stat.tint}`}
                >
                  <Icon size={17} />
                </span>
              </div>
              <p className="text-3xl font-bold text-slate-900 mt-4 tracking-tight">
                {stat.value}
              </p>
              <p className="text-xs text-slate-500 font-medium mt-1">
                {stat.label}
              </p>
            </div>
          );
        })}
      </div>

      {/* Check-in alert */}
      <div
        className={`rounded-2xl border p-5 ${
          overdue
            ? 'bg-rose-50 border-rose-200'
            : 'bg-amber-50/60 border-amber-200/60'
        }`}
      >
        <div className="flex items-start gap-4">
          <div
            className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
              overdue
                ? 'bg-rose-100 text-rose-600'
                : 'bg-amber-100 text-amber-700'
            }`}
          >
            <AlertCircle className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3
              className={`text-base font-semibold ${
                overdue ? 'text-rose-900' : 'text-amber-900'
              }`}
            >
              {overdue ? 'Check-in overdue' : 'Check-in status'}
            </h3>
            <div
              className={`mt-1 grid grid-cols-1 sm:grid-cols-3 gap-x-6 text-sm ${
                overdue ? 'text-rose-800/80' : 'text-amber-800/80'
              }`}
            >
              <p>Last: {formatDate(status?.last_checkin)}</p>
              <p>Next due: {formatDate(status?.next_checkin_due)}</p>
              <p>
                Reminder:{' '}
                {status?.reminder_sent_at
                  ? formatDate(status.reminder_sent_at)
                  : 'No'}
              </p>
            </div>
          </div>
          <Link
            to="/dashboard/checkins"
            className={`flex-shrink-0 text-sm font-semibold px-4 py-2 rounded-lg transition ${
              overdue
                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                : 'bg-slate-900 hover:bg-slate-800 text-white'
            }`}
          >
            Check in
          </Link>
        </div>
      </div>

      {/* Summary + Quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-4">
            System summary
          </h2>
          <dl className="divide-y divide-slate-100">
            {[
              ['Active vaults', activeVaults],
              ['Total recipients', recipients.length],
              [
                'Check-in interval',
                `${status?.checkin_interval_days ?? '—'} days`,
              ],
              [
                'Release status',
                releasedVaults > 0
                  ? `${releasedVaults} released`
                  : 'None released',
              ],
            ].map(([k, v]) => (
              <div
                key={String(k)}
                className="flex justify-between items-center py-3"
              >
                <dt className="text-sm text-slate-500">{k}</dt>
                <dd className="text-sm font-semibold text-slate-900">{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="lg:col-span-3 space-y-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.to}
                to={action.to}
                className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 hover:border-slate-300 hover:shadow-md transition group"
              >
                <div className="bg-slate-100 text-slate-700 p-3 rounded-xl group-hover:bg-slate-900 group-hover:text-white transition">
                  <Icon size={18} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900">
                    {action.title}
                  </h3>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {action.description}
                  </p>
                </div>
                <ArrowRight
                  size={16}
                  className="text-slate-300 group-hover:text-slate-900 group-hover:translate-x-0.5 transition flex-shrink-0"
                />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
