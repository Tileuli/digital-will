import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  KeyRound,
  AlertTriangle,
  Unlock,
  FileText,
  Paperclip,
  Download,
  Loader2,
  Eye,
  EyeOff,
  Shield,
} from 'lucide-react';
import {
  fetchClaim,
  markClaimAccessed,
  type ClaimPayload,
} from '../services/recipientPortal';
import {
  decryptJson,
  deriveMasterKey,
  unwrapPrivateKeyWithMasterKey,
  unwrapVaultKeyWithRecipientPrivateKey,
} from '../services/crypto';
import type { VaultPlaintext } from '../types';
import {
  downloadAttachment,
  formatBytes,
  isImage,
  makePreviewDataUrl,
} from '../services/files';

const RecipientClaim = () => {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [claim, setClaim] = useState<ClaimPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [passphrase, setPassphrase] = useState('');
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [vaults, setVaults] = useState<
    { id: string; plaintext: VaultPlaintext }[] | null
  >(null);

  useEffect(() => {
    if (!token) {
      setError('Missing claim token');
      return;
    }
    fetchClaim(token)
      .then(setClaim)
      .catch((e) =>
        setError(e?.response?.data?.message || 'Invalid or expired claim')
      );
  }, [token]);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claim) return;
    try {
      setSubmitting(true);
      const kdfKey = await deriveMasterKey(passphrase, claim.recipient.kdf_salt);
      const privateKey = await unwrapPrivateKeyWithMasterKey(
        JSON.parse(claim.recipient.encrypted_private_key),
        kdfKey
      );

      const decrypted: { id: string; plaintext: VaultPlaintext }[] = [];
      for (const v of claim.vaults) {
        try {
          const vaultKey = await unwrapVaultKeyWithRecipientPrivateKey(
            v.wrapped_key,
            privateKey
          );
          const pt = await decryptJson<VaultPlaintext>(v.encrypted_data, vaultKey);
          decrypted.push({ id: v.id, plaintext: pt });
        } catch (err) {
          console.error(`Failed to decrypt vault ${v.id}`, err);
        }
      }

      if (!decrypted.length) {
        throw new Error('Could not decrypt any vaults — wrong passphrase?');
      }

      setVaults(decrypted);
      markClaimAccessed(token).catch(() => {});
      toast.success('Vault unlocked');
    } catch (err: any) {
      toast.error(
        err?.message || 'Failed to decrypt — passphrase may be wrong'
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

  if (!claim) {
    return (
      <Shell>
        <div className="flex items-center justify-center gap-2 text-slate-500 py-6">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading claim…
        </div>
      </Shell>
    );
  }

  if (vaults) {
    return (
      <Shell wide>
        <div className="space-y-5">
          <div className="flex items-center gap-3 pb-5 border-b border-slate-100">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <Unlock size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Vaults from {claim.owner.name}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Decrypted locally in your browser · {vaults.length} item
                {vaults.length === 1 ? '' : 's'}
              </p>
            </div>
          </div>
          {vaults.map((v) => (
            <div
              key={v.id}
              className="border border-slate-200 rounded-xl p-5 space-y-3"
            >
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-slate-400" />
                <h3 className="font-semibold text-slate-900">
                  {v.plaintext.title}
                </h3>
              </div>
              {v.plaintext.description && (
                <p className="text-sm text-slate-600 italic">
                  {v.plaintext.description}
                </p>
              )}
              {v.plaintext.content && (
                <pre className="whitespace-pre-wrap break-words text-sm text-slate-800 bg-slate-50 p-4 rounded-lg border border-slate-100 font-mono">
                  {v.plaintext.content}
                </pre>
              )}
              {v.plaintext.attachments &&
                v.plaintext.attachments.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <Paperclip size={14} /> Attachments (
                      {v.plaintext.attachments.length})
                    </p>
                    <ul className="space-y-2">
                      {v.plaintext.attachments.map((a, i) => (
                        <li
                          key={i}
                          className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg p-3"
                        >
                          {isImage(a.mimetype) ? (
                            <img
                              src={makePreviewDataUrl(a)}
                              alt={a.filename}
                              className="w-14 h-14 object-cover rounded-md border border-slate-200"
                            />
                          ) : (
                            <div className="w-14 h-14 bg-white border border-slate-200 rounded-md flex items-center justify-center text-slate-400">
                              <FileText size={20} />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">
                              {a.filename}
                            </p>
                            <p className="text-xs text-slate-500">
                              {a.mimetype} · {formatBytes(a.size)}
                            </p>
                          </div>
                          <button
                            onClick={() => downloadAttachment(a)}
                            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition"
                            title="Download"
                          >
                            <Download size={16} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
            </div>
          ))}
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
          <div className="inline-flex w-14 h-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 mb-3">
            <KeyRound size={26} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Vault access released
          </h1>
          <p className="text-sm text-slate-600 mt-1.5">
            From{' '}
            <span className="font-semibold text-slate-900">
              {claim.owner.name}
            </span>
            . Enter the passphrase you chose when you accepted the invitation.
          </p>
        </div>

        <form onSubmit={handleUnlock} className="space-y-4">
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
            disabled={submitting}
            className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition inline-flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Decrypting…
              </>
            ) : (
              'Unlock vaults'
            )}
          </button>
        </form>
      </div>
    </Shell>
  );
};

const Shell: React.FC<{ children: React.ReactNode; wide?: boolean }> = ({
  children,
  wide,
}) => (
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
        className="absolute -top-32 left-1/2 -translate-x-1/2 -z-10 w-[700px] h-[700px] rounded-full bg-gradient-to-br from-amber-100/40 to-orange-100/30 blur-3xl"
        aria-hidden
      />
      <div
        className={`${
          wide ? 'max-w-3xl' : 'max-w-md'
        } w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-7 sm:p-8`}
      >
        {children}
      </div>
    </div>
  </div>
);

export default RecipientClaim;
