import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  KeyRound,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  Eye,
  EyeOff,
  Shield,
  XCircle,
} from 'lucide-react';
import { fetchTestMaterial, type TestMaterial } from '../services/recipientPortal';
import {
  deriveMasterKey,
  unwrapPrivateKeyWithMasterKey,
} from '../services/crypto';

const RecipientVerify = () => {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [material, setMaterial] = useState<TestMaterial | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [passphrase, setPassphrase] = useState('');
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<'idle' | 'success' | 'fail'>('idle');
  const [resultMessage, setResultMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setLoadError('Missing verification token');
      return;
    }
    fetchTestMaterial(token)
      .then(setMaterial)
      .catch((err) =>
        setLoadError(
          err?.response?.data?.message || 'Invalid or expired test link'
        )
      );
  }, [token]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!material) return;
    setSubmitting(true);
    setResult('idle');
    setResultMessage('');

    try {
      const kdfKey = await deriveMasterKey(
        passphrase,
        material.recipient.kdf_salt
      );
      await unwrapPrivateKeyWithMasterKey(
        JSON.parse(material.recipient.encrypted_private_key),
        kdfKey
      );
      setResult('success');
      setResultMessage(
        "Your passphrase still works. You'll be able to unlock the vault when it's released."
      );
    } catch {
      setResult('fail');
      setResultMessage(
        'That passphrase did not unlock your key. Try again — or check that your password manager has the correct entry.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loadError) {
    return (
      <Shell>
        <div className="text-center space-y-3 py-4">
          <div className="inline-flex w-12 h-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">
            <AlertTriangle size={22} />
          </div>
          <p className="text-rose-700 text-sm">{loadError}</p>
          <Link
            to="/"
            className="inline-block text-slate-500 hover:text-slate-700 text-xs"
          >
            ← Back to home
          </Link>
        </div>
      </Shell>
    );
  }

  if (!material) {
    return (
      <Shell>
        <div className="flex items-center justify-center gap-2 text-slate-500 py-6">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="space-y-6">
        <div className="text-center">
          <div className="inline-flex w-14 h-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 mb-3">
            <KeyRound size={26} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Verify your passphrase
          </h1>
          <p className="text-sm text-slate-600 mt-1.5">
            Confirm the passphrase you set when you accepted the invitation
            from{' '}
            <span className="font-semibold text-slate-900">
              {material.owner.name}
            </span>{' '}
            still works.
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 text-xs text-blue-900/90 leading-relaxed">
          This is a local check. Your passphrase never leaves the browser. We
          only test that your existing wrapped key can be unlocked — no actual
          vault contents are released.
        </div>

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Passphrase
            </label>
            <div className="relative">
              <input
                type={showPassphrase ? 'text' : 'password'}
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                required
                className="w-full pr-10 border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition text-slate-900 placeholder-slate-400"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassphrase((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 transition"
                tabIndex={-1}
              >
                {showPassphrase ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={submitting || passphrase.length === 0}
            className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition inline-flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Checking…
              </>
            ) : (
              'Test passphrase'
            )}
          </button>
        </form>

        {result === 'success' && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-emerald-900">
                Passphrase works
              </p>
              <p className="text-xs text-emerald-800/80 mt-1 leading-relaxed">
                {resultMessage}
              </p>
            </div>
          </div>
        )}
        {result === 'fail' && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 flex items-start gap-3">
            <XCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-rose-900">
                Wrong passphrase
              </p>
              <p className="text-xs text-rose-800/80 mt-1 leading-relaxed">
                {resultMessage}
              </p>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
};

const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
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

    <div className="flex-1 flex items-center justify-center p-4 py-10 relative overflow-hidden">
      <div
        className="absolute -top-32 left-1/2 -translate-x-1/2 -z-10 w-[700px] h-[700px] rounded-full bg-gradient-to-br from-blue-100/60 to-indigo-100/40 blur-3xl"
        aria-hidden
      />
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-7 sm:p-8">
        {children}
      </div>
    </div>
  </div>
);

export default RecipientVerify;
