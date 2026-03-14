import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Clock, CheckCircle2, AlertCircle, Calendar } from 'lucide-react';
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

  useEffect(() => { loadData(); }, []);

  const handleCheckIn = async () => {
    try {
      setCheckingIn(true);
      await vaultService.checkIn();
      toast.success('Check-in successful!');
      await loadData();
    } catch {
      toast.error('Check-in failed');
    } finally {
      setCheckingIn(false);
    }
  };

  if (loading) return <div className="text-gray-600">Loading check-in data...</div>;

  const overdue = status?.is_overdue;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Check-ins</h1>
        <p className="text-gray-600 mt-2">Confirm that you are okay and monitor your next deadline.</p>
      </div>

      {/* Status card */}
      <div className={`rounded-2xl border p-6 lg:p-8 ${overdue ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100 shadow-sm'}`}>
        <div className="flex items-center gap-2 mb-6">
          {overdue
            ? <AlertCircle size={20} className="text-red-500" />
            : <CheckCircle2 size={20} className="text-green-500" />}
          <h2 className="text-xl font-semibold text-gray-900">Current Status</h2>
          <span className={`ml-auto text-xs font-semibold px-3 py-1 rounded-full ${overdue ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {overdue ? 'Overdue' : 'Up to date'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Last check-in',    value: formatDate(status?.last_checkin),       highlight: false },
            { label: 'Next due',         value: formatDate(status?.next_checkin_due),    highlight: !!overdue },
            { label: 'Interval',         value: `${status?.checkin_interval_days ?? '—'} days`, highlight: false },
            { label: 'Reminder sent',    value: status?.reminder_sent_at ? formatDate(status.reminder_sent_at) : 'Not yet', highlight: false },
          ].map(({ label, value, highlight }) => (
            <div key={label} className={`rounded-xl px-4 py-3 ${overdue ? 'bg-red-100/60' : 'bg-gray-50'}`}>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">{label}</p>
              <p className={`text-sm font-semibold ${highlight ? 'text-red-600' : 'text-gray-800'}`}>{value}</p>
            </div>
          ))}
        </div>

        <button
          onClick={handleCheckIn}
          disabled={checkingIn}
          className={`font-semibold px-6 py-3 rounded-xl transition-all duration-150 shadow-sm hover:shadow-md disabled:opacity-50 ${overdue ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
        >
          {checkingIn ? 'Checking in...' : "I'm okay — Check in now"}
        </button>
      </div>

      {/* History */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 lg:p-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Check-in History</h2>

        {history.length === 0 ? (
          <div className="text-center py-14">
            <Clock size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">No check-in history yet.</p>
          </div>
        ) : (
          <div className="relative pl-6">
            {/* Timeline line */}
            <div className="absolute left-[7px] top-1 bottom-1 w-px bg-gray-100" />
            <div className="space-y-4">
              {history.map((item) => (
                <div key={item.id} className="relative hover:bg-gray-50 rounded-xl p-3 -ml-3 transition-colors group">
                  {/* Dot */}
                  <div className="absolute left-[-13px] top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white border-2 border-green-400 group-hover:border-green-500 transition-colors" />
                  <div className="flex items-center gap-3">
                    <Calendar size={14} className="text-gray-300 flex-shrink-0" />
                    <p className="text-sm font-semibold text-gray-800">{formatDate(item.checkin_date)}</p>
                    <span className="ml-auto text-xs font-medium bg-blue-50 text-blue-600 border border-blue-100 px-2.5 py-0.5 rounded-full capitalize">
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