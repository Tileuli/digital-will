import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Shield,
  Users,
} from 'lucide-react';
import {
  acceptConfirmerInvite,
  lookupConfirmerInvite,
  type InviteLookup,
} from '../services/confirmers';
import { getErrorMessage } from '../services/api';

const ConfirmerAccept = () => {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [state, setState] = useState<'loading' | 'ready' | 'accepted' | 'error'>(
    'loading'
  );
  const [info, setInfo] = useState<InviteLookup | null>(null);
  const [error, setError] = useState('');
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (!token) {
      setState('error');
      setError('Missing invitation token.');
      return;
    }
    lookupConfirmerInvite(token)
      .then((res) => {
        setInfo(res);
        setState(res.confirmer.accepted ? 'accepted' : 'ready');
      })
      .catch((err) => {
        setState('error');
        setError(getErrorMessage(err, 'Invitation not found or expired.'));
      });
  }, [token]);

  const accept = async () => {
    setAccepting(true);
    try {
      await acceptConfirmerInvite(token);
      setState('accepted');
    } catch (err) {
      setError(getErrorMessage(err, 'Could not accept invitation.'));
    } finally {
      setAccepting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col">
      <header className="border-b border-slate-200/60">
        <div className="container mx-auto px-4 h-16 flex items-center">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold tracking-tight">Digital Will</span>
          </Link>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-4 py-10">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
          {state === 'loading' && (
            <>
              <div className="inline-flex w-14 h-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 mb-3">
                <Loader2 size={26} className="animate-spin" />
              </div>
              <h1 className="text-xl font-semibold tracking-tight">
                Loading invitation…
              </h1>
            </>
          )}
          {state === 'ready' && info && (
            <>
              <div className="inline-flex w-14 h-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 mb-3">
                <Users size={26} />
              </div>
              <h1 className="text-xl font-semibold tracking-tight">
                Trusted-contact invitation
              </h1>
              <p className="text-slate-600 text-sm mt-3">
                <strong className="text-slate-900">{info.owner.name}</strong>{' '}
                has added you as a trusted contact in their Digital Will. If
                they ever miss enough check-ins, we will email you and ask
                whether they have passed away. Your vote, combined with others,
                releases their prepared instructions.
              </p>
              <p className="text-slate-500 text-xs mt-3">
                You will <strong>not</strong> see any of their data. Only a
                yes/no question, if it is ever asked.
              </p>
              <button
                type="button"
                onClick={accept}
                disabled={accepting}
                className="w-full mt-6 bg-slate-900 text-white font-semibold py-2.5 rounded-lg hover:bg-slate-800 transition disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {accepting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                Accept role
              </button>
            </>
          )}
          {state === 'accepted' && info && (
            <>
              <div className="inline-flex w-14 h-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 mb-3">
                <CheckCircle2 size={26} />
              </div>
              <h1 className="text-xl font-semibold tracking-tight">
                You are a trusted contact
              </h1>
              <p className="text-slate-600 text-sm mt-3">
                Thank you. {info.owner.name} now has you listed. We will only
                email you if they miss several check-ins in a row.
              </p>
              <Link
                to="/"
                className="inline-block mt-6 text-slate-500 hover:text-slate-700 text-sm"
              >
                ← Back to home
              </Link>
            </>
          )}
          {state === 'error' && (
            <>
              <div className="inline-flex w-14 h-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 mb-3">
                <AlertTriangle size={26} />
              </div>
              <h1 className="text-xl font-semibold tracking-tight">
                Invitation problem
              </h1>
              <p className="text-slate-600 text-sm mt-2">{error}</p>
              <Link
                to="/"
                className="inline-block mt-6 text-slate-500 hover:text-slate-700 text-sm"
              >
                ← Back to home
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConfirmerAccept;
