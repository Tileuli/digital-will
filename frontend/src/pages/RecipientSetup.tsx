import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Key,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  Eye,
  EyeOff,
  Shield,
} from 'lucide-react';
import {
  acceptInvitation,
  fetchInvitation,
  type InvitationSummary,
} from '../services/recipientPortal';
import {
  deriveMasterKey,
  exportPublicKey,
  generateRsaKeyPair,
  randomSalt,
  wrapPrivateKeyWithMasterKey,
} from '../services/crypto';

const RecipientSetup = () => {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [invitation, setInvitation] = useState<InvitationSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [passphrase, setPassphrase] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [testToken, setTestToken] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Missing invitation token');
      return;
    }
    fetchInvitation(token)
      .then(setInvitation)
      .catch((e) =>
        setError(e?.response?.data?.message || 'Invalid or expired invitation')
      );
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passphrase.length < 10) {
      toast.error('Passphrase must be at least 10 characters');
      return;
    }
    if (passphrase !== confirm) {
      toast.error('Passphrases do not match');
      return;
    }
    try {
      setSubmitting(true);
      const kdf_salt = randomSalt(16);
      const kdfKey = await deriveMasterKey(passphrase, kdf_salt);
      const keyPair = await generateRsaKeyPair();
      const public_key = await exportPublicKey(keyPair.publicKey);
      const wrapped = await wrapPrivateKeyWithMasterKey(
        keyPair.privateKey,
        kdfKey
      );

      const res = await acceptInvitation({
        token,
        kdf_salt,
        public_key,
        encrypted_private_key: JSON.stringify(wrapped),
      });

      setTestToken(res.test_token);
      setDone(true);
      toast.success('Setup complete');
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || err?.message || 'Setup failed'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (error) {
    return (
      <Shell>
        <div className="text-center space-y-3 py-4">
          <div className="inline-flex w-12 h-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">
            <AlertTriangle size={22} />
          </div>
          <p className="text-rose-700 text-sm">{error}</p>
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

  if (!invitation) {
    return (
      <Shell>
        <div className="flex items-center justify-center gap-2 text-slate-500 py-6">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading invitation…
        </div>
      </Shell>
    );
  }

  if (done) {
    const verifyUrl = testToken
      ? `${window.location.origin}/recipient/verify?token=${encodeURIComponent(testToken)}`
      : '';

    const copyUrl = async () => {
      if (!verifyUrl) return;
      try {
        await navigator.clipboard.writeText(verifyUrl);
        toast.success('Link copied');
      } catch {
        toast.error('Could not copy — please copy manually');
      }
    };

    return (
      <Shell>
        <div className="text-center space-y-4">
          <div className="inline-flex w-14 h-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 mb-1">
            <ShieldCheck size={28} />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 tracking-tight">
            You're all set
          </h2>
          <p className="text-slate-600 text-sm">
            <span className="font-semibold text-slate-900">
              {invitation.owner_name}
            </span>{' '}
            can now encrypt their vault contents to you. If the release
            condition is ever triggered, you'll receive another email with a
            claim link.
          </p>
          <p className="text-slate-500 text-xs leading-relaxed">
            Keep your passphrase safe — it cannot be recovered, and without it
            you will not be able to decrypt anything.
          </p>

          {verifyUrl && (
            <div className="text-left bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2">
              <p className="text-xs font-semibold text-blue-900 uppercase tracking-wider">
                Bookmark this link
              </p>
              <p className="text-xs text-blue-900/80 leading-relaxed">
                Use this URL any time to verify your passphrase still works —
                without waiting for an actual release. We can't show it again
                later.
              </p>
              <div className="flex items-center gap-2 mt-1">
                <input
                  readOnly
                  value={verifyUrl}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  className="flex-1 text-xs font-mono bg-white border border-blue-200 rounded-lg px-3 py-2 text-slate-700 truncate"
                />
                <button
                  type="button"
                  onClick={copyUrl}
                  className="text-xs font-semibold px-3 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition"
                >
                  Copy
                </button>
              </div>
            </div>
          )}

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

  return (
    <Shell>
      <div className="space-y-6">
        <div className="text-center">
          <div className="inline-flex w-14 h-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 mb-3">
            <Key size={26} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Set up your recipient key
          </h1>
          <p className="text-sm text-slate-600 mt-1.5">
            <span className="font-semibold text-slate-900">
              {invitation.owner_name}
            </span>{' '}
            has invited you as a trusted recipient.
          </p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-sm text-amber-900 leading-relaxed">
          Your passphrase never leaves this browser. The server only sees an
          encrypted blob that cannot be opened without it.{' '}
          <span className="font-semibold">
            Losing the passphrase means losing access.
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Passphrase
            </label>
            <div className="relative">
              <input
                type={showPassphrase ? 'text' : 'password'}
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                minLength={10}
                required
                className="w-full pr-10 border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition text-slate-900 placeholder-slate-400"
                placeholder="Minimum 10 characters"
                autoComplete="new-password"
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
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Confirm passphrase
            </label>
            <input
              type={showPassphrase ? 'text' : 'password'}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              minLength={10}
              required
              className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition text-slate-900 placeholder-slate-400"
              placeholder="Repeat it"
              autoComplete="new-password"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition inline-flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Generating
                keypair…
              </>
            ) : (
              'Generate keypair & accept'
            )}
          </button>
        </form>
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

export default RecipientSetup;
