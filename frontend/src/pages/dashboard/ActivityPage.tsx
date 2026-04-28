import { useEffect, useState } from 'react';
import {
  Activity,
  LogIn,
  LogOut,
  UserPlus,
  Eye,
  Plus,
  Trash2,
  Mail,
  Key,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  Globe,
} from 'lucide-react';
import { fetchMyAuditLog, type AuditLogEntry } from '../../services/audit';

const PAGE_SIZE = 50;

const formatDateTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString();
};

const relative = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  if (day < 30) return `${Math.floor(day / 7)}w ago`;
  return d_format(iso);
};

const d_format = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

type Visual = {
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  tint: string;
};

const ACTION_VISUALS: Record<string, Visual> = {
  user_login: {
    label: 'Signed in',
    icon: LogIn,
    tint: 'bg-blue-50 text-blue-600',
  },
  user_logout: {
    label: 'Signed out',
    icon: LogOut,
    tint: 'bg-slate-100 text-slate-600',
  },
  user_register: {
    label: 'Created account',
    icon: UserPlus,
    tint: 'bg-emerald-50 text-emerald-600',
  },
  user_get_profile: {
    label: 'Loaded profile',
    icon: Eye,
    tint: 'bg-slate-100 text-slate-500',
  },
  vault_create: {
    label: 'Created vault item',
    icon: Plus,
    tint: 'bg-emerald-50 text-emerald-600',
  },
  vault_view: {
    label: 'Decrypted vault item',
    icon: Eye,
    tint: 'bg-blue-50 text-blue-600',
  },
  vault_delete: {
    label: 'Deleted vault item',
    icon: Trash2,
    tint: 'bg-rose-50 text-rose-600',
  },
  recipient_add: {
    label: 'Added recipient',
    icon: UserPlus,
    tint: 'bg-emerald-50 text-emerald-600',
  },
  recipient_delete: {
    label: 'Removed recipient',
    icon: Trash2,
    tint: 'bg-rose-50 text-rose-600',
  },
  recipient_resend: {
    label: 'Resent invitation',
    icon: Mail,
    tint: 'bg-amber-50 text-amber-600',
  },
  invitation_view: {
    label: 'Recipient viewed invitation',
    icon: Eye,
    tint: 'bg-slate-100 text-slate-500',
  },
  invitation_accept: {
    label: 'Recipient accepted invitation',
    icon: ShieldCheck,
    tint: 'bg-emerald-50 text-emerald-600',
  },
  claim_view: {
    label: 'Recipient opened claim',
    icon: Key,
    tint: 'bg-amber-50 text-amber-600',
  },
  claim_accessed: {
    label: 'Recipient unlocked vaults',
    icon: ShieldCheck,
    tint: 'bg-violet-50 text-violet-600',
  },
  checkin_create: {
    label: 'Checked in',
    icon: CheckCircle2,
    tint: 'bg-emerald-50 text-emerald-600',
  },
};

const visualFor = (action: string): Visual =>
  ACTION_VISUALS[action] || {
    label: action.replace(/_/g, ' '),
    icon: Activity,
    tint: 'bg-slate-100 text-slate-500',
  };

const ActivityPage = () => {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [total, setTotal] = useState(0);

  const load = async (offset = 0, append = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    try {
      const res = await fetchMyAuditLog(PAGE_SIZE, offset);
      setEntries((prev) => (append ? [...prev, ...res.logs] : res.logs));
      setTotal(res.total);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    load(0, false);
  }, []);

  const canLoadMore = entries.length < total;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-2">
          Audit
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Recent activity
        </h1>
        <p className="text-slate-600 mt-2 max-w-2xl">
          Every action on your account — sign-ins, vault changes, recipient
          updates, releases. Use this to spot anything unfamiliar.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 lg:p-8">
        {loading ? (
          <p className="text-slate-500 text-sm flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading activity…
          </p>
        ) : entries.length === 0 ? (
          <div className="text-center py-14">
            <Activity size={36} className="text-slate-200 mx-auto mb-3" />
            <p className="text-slate-700 font-medium">No activity yet.</p>
            <p className="text-slate-500 text-sm mt-1">
              Actions will appear here as you use your account.
            </p>
          </div>
        ) : (
          <>
            <div className="relative pl-6">
              <div className="absolute left-[7px] top-2 bottom-2 w-px bg-slate-200" />
              <ul className="space-y-1">
                {entries.map((e) => {
                  const v = visualFor(e.action);
                  const Icon = v.icon;
                  return (
                    <li
                      key={e.id}
                      className="relative hover:bg-slate-50 rounded-lg p-3 -ml-3 transition group"
                    >
                      <div className="absolute left-[-13px] top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white border-2 border-slate-300" />
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex-shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-lg ${v.tint}`}
                        >
                          <Icon size={15} />
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900">
                            {v.label}
                          </p>
                          <p
                            className="text-xs text-slate-500 mt-0.5 truncate"
                            title={formatDateTime(e.created_at)}
                          >
                            {relative(e.created_at)}
                            {e.ip_address && (
                              <>
                                {' '}
                                ·{' '}
                                <span className="inline-flex items-center gap-1">
                                  <Globe size={10} /> {e.ip_address}
                                </span>
                              </>
                            )}
                          </p>
                        </div>
                        <span className="text-xs text-slate-400 hidden sm:block">
                          {formatDateTime(e.created_at)}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            {canLoadMore && (
              <div className="mt-6 text-center">
                <button
                  onClick={() => load(entries.length, true)}
                  disabled={loadingMore}
                  className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Loading…
                    </>
                  ) : (
                    `Load more (${total - entries.length} remaining)`
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ActivityPage;
