import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Loader2,
  AlertTriangle,
  Shield,
  Check,
  X as XIcon,
  Info,
} from 'lucide-react';
import { lookupVote, submitVote, type VoteLookup } from '../services/confirmers';
import { getErrorMessage } from '../services/api';

const ConfirmerVote = () => {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [state, setState] = useState<'loading' | 'ready' | 'submitted' | 'error'>(
    'loading'
  );
  const [info, setInfo] = useState<VoteLookup | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [chosen, setChosen] = useState<'yes' | 'no' | null>(null);

  useEffect(() => {
    if (!token) {
      setState('error');
      setError('Missing vote token.');
      return;
    }
    lookupVote(token)
      .then((res) => {
        setInfo(res);
        setState(res.already_voted ? 'submitted' : 'ready');
        if (res.already_voted) setChosen(res.already_voted);
      })
      .catch((err) => {
        setState('error');
        setError(getErrorMessage(err, 'Vote link invalid or expired.'));
      });
  }, [token]);

  const cast = async (vote: 'yes' | 'no') => {
    setBusy(true);
    try {
      await submitVote(token, vote);
      setChosen(vote);
      setState('submitted');
    } catch (err) {
      setError(getErrorMessage(err, 'Could not submit vote.'));
      setState('error');
    } finally {
      setBusy(false);
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
                Loading vote…
              </h1>
            </>
          )}

          {state === 'ready' && info && (
            <>
              <div className="inline-flex w-14 h-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 mb-3">
                <AlertTriangle size={26} />
              </div>
              <h1 className="text-xl font-semibold tracking-tight">
                Confirmation requested
              </h1>
              <p className="text-slate-600 text-sm mt-3">
                <strong className="text-slate-900">{info.owner.name}</strong>{' '}
                has missed multiple check-ins. As a trusted contact, you are
                being asked:
              </p>
              <p className="text-slate-900 font-semibold text-base mt-3">
                Has {info.owner.name} passed away or become unable to respond?
              </p>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => cast('yes')}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-rose-600 text-white font-semibold hover:bg-rose-700 transition disabled:opacity-50"
                >
                  {busy ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  Yes, confirm
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => cast('no')}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition disabled:opacity-50"
                >
                  <XIcon className="w-4 h-4" />
                  No / unsure
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-4 leading-relaxed">
                Confirming releases their prepared instructions to recipients.
                You can change your vote anytime by reopening this link.
              </p>
            </>
          )}

          {state === 'submitted' && info && (
            <>
              <div
                className={`inline-flex w-14 h-14 items-center justify-center rounded-2xl mb-3 ${
                  chosen === 'yes'
                    ? 'bg-rose-50 text-rose-600'
                    : 'bg-emerald-50 text-emerald-600'
                }`}
              >
                {chosen === 'yes' ? <Check size={26} /> : <Info size={26} />}
              </div>
              <h1 className="text-xl font-semibold tracking-tight">
                Vote recorded
              </h1>
              <p className="text-slate-600 text-sm mt-3">
                You voted{' '}
                <strong className="text-slate-900">
                  {chosen === 'yes' ? 'Yes' : 'No / unsure'}
                </strong>
                . Thank you. You can change your vote by reopening this email
                link if you change your mind.
              </p>
              <p className="text-xs text-slate-500 mt-4">
                A release happens only once enough trusted contacts agree.
              </p>
            </>
          )}

          {state === 'error' && (
            <>
              <div className="inline-flex w-14 h-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 mb-3">
                <AlertTriangle size={26} />
              </div>
              <h1 className="text-xl font-semibold tracking-tight">Problem</h1>
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

export default ConfirmerVote;
