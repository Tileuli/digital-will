import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Loader2,
} from 'lucide-react';
import vaultService from '../../services/vault';
import type { CheckinLog, CheckinStatus } from '../../types';

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  return new Date(value).toLocaleString();
};

const CheckinsPage = () => {
  const [status, setStatus] = useState<CheckinStatus | null>(null);
  const [history, setHistory] = useState<CheckinLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statusRes, historyRes] = await Promise.all([
        vaultService.getCheckinStatus(),
        vaultService.getCheckinHistory(),
      ]);
      setStatus(statusRes);
      setHistory(historyRes.checkins || []);
    } catch {
      toast.error('Failed to load check-in data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCheckIn = async () => {
    try {
      setCheckingIn(true);
      await vaultService.checkIn();
      toast.success('Check-in successful');
      await loadData();
    } catch {
      toast.error('Check-in failed');
    } finally {
      setCheckingIn(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-500">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading check-in data…
      </div>
    );
  }

  const overdue = !!status?.is_overdue;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-2">
          Lifeline
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Check-ins
        </h1>
        <p className="text-slate-600 mt-2 max-w-2xl">
          Confirm that you are okay and monitor your next deadline.
        </p>
      </div>

      {/* Status card */}
      <div
        className={`rounded-2xl border p-6 lg:p-8 ${
          overdue
            ? 'bg-rose-50 border-rose-200'
            : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex items-center gap-2.5 mb-6">
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center ${
              overdue
                ? 'bg-rose-100 text-rose-600'
                : 'bg-emerald-50 text-emerald-600'
            }`}
          >
            {overdue ? (
              <AlertCircle size={17} />
            ) : (
              <CheckCircle2 size={17} />
            )}
          </div>
          <h2 className="text-lg font-semibold text-slate-900">
            Current status
          </h2>
          <span
            className={`ml-auto text-xs font-semibold px-2.5 py-1 rounded-full border ${
              overdue
                ? 'bg-rose-100 text-rose-700 border-rose-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}
          >
            {overdue ? 'Overdue' : 'Up to date'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {[
            {
              label: 'Last check-in',
              value: formatDate(status?.last_checkin),
              highlight: false,
            },
            {
              label: 'Next due',
              value: formatDate(status?.next_checkin_due),
              highlight: !!overdue,
            },
            {
              label: 'Interval',
              value: `${status?.checkin_interval_days ?? '—'} days`,
              highlight: false,
            },
            {
              label: 'Reminder sent',
              value: status?.reminder_sent_at
                ? formatDate(status.reminder_sent_at)
                : 'Not yet',
              highlight: false,
            },
          ].map(({ label, value, highlight }) => (
            <div
              key={label}
              className={`rounded-xl px-4 py-3 ${
                overdue ? 'bg-white/60' : 'bg-slate-50'
              }`}
            >
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                {label}
              </p>
              <p
                className={`text-sm font-semibold ${
                  highlight ? 'text-rose-600' : 'text-slate-900'
                }`}
              >
                {value}
              </p>
            </div>
          ))}
        </div>

        <button
          onClick={handleCheckIn}
          disabled={checkingIn}
          className={`font-semibold px-5 py-2.5 rounded-lg transition disabled:opacity-50 inline-flex items-center gap-2 ${
            overdue
              ? 'bg-rose-600 hover:bg-rose-700 text-white'
              : 'bg-slate-900 hover:bg-slate-800 text-white'
          }`}
        >
          {checkingIn ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Checking in…
            </>
          ) : (
            "I'm okay — check in now"
          )}
        </button>
      </div>

      {/* History */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 lg:p-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-5">
          Check-in history
        </h2>

        {history.length === 0 ? (
          <div className="text-center py-14">
            <Clock size={36} className="text-slate-200 mx-auto mb-3" />
            <p className="text-slate-700 font-medium">
              No check-in history yet.
            </p>
          </div>
        ) : (
          <div className="relative pl-6">
            <div className="absolute left-[7px] top-2 bottom-2 w-px bg-slate-200" />
            <div className="space-y-2">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="relative hover:bg-slate-50 rounded-lg p-3 -ml-3 transition group"
                >
                  <div className="absolute left-[-13px] top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white border-2 border-emerald-500" />
                  <div className="flex items-center gap-3">
                    <Calendar
                      size={14}
                      className="text-slate-400 flex-shrink-0"
                    />
                    <p className="text-sm font-medium text-slate-800">
                      {formatDate(item.checkin_date)}
                    </p>
                    <span className="ml-auto text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded-full capitalize">
                      {item.method || 'manual'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CheckinsPage;
