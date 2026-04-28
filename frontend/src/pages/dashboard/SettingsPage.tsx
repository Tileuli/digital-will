import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  ShieldCheck,
  ShieldOff,
  KeyRound,
  Loader2,
  Check,
  AlertTriangle,
  Copy,
  Smartphone,
  Download,
  RefreshCw,
  Cpu,
  Users,
  Trash2,
  Plus,
  Mail,
  CircleCheck,
  CircleDashed,
} from 'lucide-react';
import {
  addConfirmer,
  listConfirmers,
  removeConfirmer,
  setConfirmationThreshold,
  type Confirmer,
} from '../../services/confirmers';
import {
  beginTotpSetup,
  disableTotp,
  getTotpStatus,
  verifyTotpEnable,
  type TotpSetupResponse,
} from '../../services/twoFactor';
import {
  generateAndWrapRecoveryCodes,
  getRecoveryStatus,
  uploadRecoveryCodes,
} from '../../services/recovery';
import { getSessionKeys } from '../../services/keySession';
import authService from '../../services/auth';
import { upgradeKdf } from '../../services/kdfMigration';
import { getErrorMessage } from '../../services/api';

const SettingsPage = () => {
  const [statusLoading, setStatusLoading] = useState(true);
  const [totpEnabled, setTotpEnabled] = useState(false);

  const [recoveryStatus, setRecoveryStatus] = useState<{
    total: number;
    unused: number;
  } | null>(null);

  const [setupData, setSetupData] = useState<TotpSetupResponse | null>(null);
  const [setupCode, setSetupCode] = useState('');
  const [setupBusy, setSetupBusy] = useState(false);

  const [disableOpen, setDisableOpen] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [disableBusy, setDisableBusy] = useState(false);

  const [regenConfirm, setRegenConfirm] = useState(false);
  const [regenBusy, setRegenBusy] = useState(false);
  const [newCodes, setNewCodes] = useState<string[] | null>(null);
  const [newCodesAck, setNewCodesAck] = useState(false);

  const [kdfMigrateOpen, setKdfMigrateOpen] = useState(false);
  const [kdfPassword, setKdfPassword] = useState('');
  const [kdfBusy, setKdfBusy] = useState(false);
  const [currentKdf, setCurrentKdf] = useState<'pbkdf2' | 'argon2id'>(
    () => (authService.getCurrentUser()?.kdf_algorithm as 'pbkdf2' | 'argon2id') || 'pbkdf2'
  );

  const [confirmers, setConfirmers] = useState<Confirmer[]>([]);
  const [requiredConfirmations, setRequiredConfirmations] = useState(0);
  const [thresholdDraft, setThresholdDraft] = useState(0);
  const [thresholdBusy, setThresholdBusy] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addEmail, setAddEmail] = useState('');
  const [addName, setAddName] = useState('');
  const [addRelationship, setAddRelationship] = useState('');
  const [addBusy, setAddBusy] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const refreshStatus = async () => {
    try {
      const [totp, recovery, confirmerList] = await Promise.all([
        getTotpStatus(),
        getRecoveryStatus().catch(() => null),
        listConfirmers().catch(() => null),
      ]);
      setTotpEnabled(totp.totp_enabled);
      setRecoveryStatus(recovery);
      if (confirmerList) {
        setConfirmers(confirmerList.confirmers);
        setRequiredConfirmations(confirmerList.required_confirmations);
        setThresholdDraft(confirmerList.required_confirmations);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setStatusLoading(false);
    }
  };

  useEffect(() => {
    refreshStatus();
  }, []);

  const startSetup = async () => {
    setSetupBusy(true);
    try {
      const data = await beginTotpSetup();
      setSetupData(data);
      setSetupCode('');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not start 2FA setup'));
    } finally {
      setSetupBusy(false);
    }
  };

  const confirmSetup = async () => {
    if (setupCode.length < 6) return;
    setSetupBusy(true);
    try {
      await verifyTotpEnable(setupCode);
      toast.success('Two-factor authentication enabled');
      setSetupData(null);
      setSetupCode('');
      await refreshStatus();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Invalid code. Try the next one.'));
    } finally {
      setSetupBusy(false);
    }
  };

  const cancelSetup = () => {
    setSetupData(null);
    setSetupCode('');
  };

  const copySecret = async () => {
    if (!setupData) return;
    try {
      await navigator.clipboard.writeText(setupData.secret);
      toast.success('Secret copied');
    } catch {
      toast.error('Could not copy');
    }
  };

  const confirmDisable = async () => {
    if (!disablePassword) return;
    setDisableBusy(true);
    try {
      await disableTotp(disablePassword);
      toast.success('Two-factor authentication disabled');
      setDisableOpen(false);
      setDisablePassword('');
      await refreshStatus();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not disable 2FA'));
    } finally {
      setDisableBusy(false);
    }
  };

  const regenerateCodes = async () => {
    const session = getSessionKeys();
    if (!session) {
      toast.error('Please sign out and sign back in, then try again');
      return;
    }
    setRegenBusy(true);
    try {
      const user = authService.getCurrentUser();
      const algo = user?.kdf_algorithm || 'pbkdf2';
      const generated = await generateAndWrapRecoveryCodes(
        session.privateKey,
        10,
        algo
      );
      await uploadRecoveryCodes(generated.payload);
      setNewCodes(generated.rawCodes);
      setNewCodesAck(false);
      setRegenConfirm(false);
      await refreshStatus();
      toast.success('New recovery codes generated');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not regenerate codes'));
    } finally {
      setRegenBusy(false);
    }
  };

  const copyNewCodes = async () => {
    if (!newCodes) return;
    try {
      await navigator.clipboard.writeText(newCodes.join('\n'));
      toast.success('Recovery codes copied');
    } catch {
      toast.error('Could not copy');
    }
  };

  const runKdfMigration = async () => {
    if (!kdfPassword) return;
    setKdfBusy(true);
    try {
      const result = await upgradeKdf({
        password: kdfPassword,
        newAlgorithm: 'argon2id',
      });
      setCurrentKdf('argon2id');
      setKdfMigrateOpen(false);
      setKdfPassword('');
      toast.success('Upgraded to Argon2id. New recovery codes issued.');
      if (result.recoveryCodes.length > 0) {
        setNewCodes(result.recoveryCodes);
        setNewCodesAck(false);
      }
      await refreshStatus();
    } catch (err) {
      toast.error(getErrorMessage(err, 'KDF upgrade failed'));
    } finally {
      setKdfBusy(false);
    }
  };

  const handleAddConfirmer = async () => {
    if (!addEmail.trim() || !addName.trim()) return;
    setAddBusy(true);
    try {
      await addConfirmer({
        email: addEmail.trim(),
        name: addName.trim(),
        relationship: addRelationship.trim() || undefined,
      });
      setAddEmail('');
      setAddName('');
      setAddRelationship('');
      setAddOpen(false);
      await refreshStatus();
      toast.success('Invitation sent');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not add trusted contact'));
    } finally {
      setAddBusy(false);
    }
  };

  const handleRemoveConfirmer = async (id: string) => {
    setRemovingId(id);
    try {
      await removeConfirmer(id);
      await refreshStatus();
      toast.success('Trusted contact removed');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not remove'));
    } finally {
      setRemovingId(null);
    }
  };

  const handleSaveThreshold = async () => {
    if (thresholdDraft === requiredConfirmations) return;
    setThresholdBusy(true);
    try {
      const res = await setConfirmationThreshold(thresholdDraft);
      setRequiredConfirmations(res.required_confirmations);
      setThresholdDraft(res.required_confirmations);
      toast.success('Threshold updated');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not save threshold'));
    } finally {
      setThresholdBusy(false);
    }
  };

  const downloadNewCodes = () => {
    if (!newCodes) return;
    const user = authService.getCurrentUser();
    const header = `Digital Will — Recovery Codes
Account: ${user?.email ?? ''}
Generated: ${new Date().toISOString()}

Each code can be used ONCE to recover access to your account.
Store them somewhere safe. Do not share them.

`;
    const body = newCodes
      .map((c, i) => `${(i + 1).toString().padStart(2, ' ')}. ${c}`)
      .join('\n');
    const blob = new Blob([header + body + '\n'], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `digital-will-recovery-codes-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (statusLoading) {
    return (
      <div className="flex items-center gap-2 text-slate-500">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading settings…
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Settings
        </h1>
        <p className="text-slate-600 mt-1 text-sm">
          Account security and recovery options.
        </p>
      </div>

      {/* 2FA */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-start gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                totpEnabled
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              {totpEnabled ? (
                <ShieldCheck size={18} />
              ) : (
                <ShieldOff size={18} />
              )}
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Two-factor authentication
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">
                {totpEnabled
                  ? 'A 6-digit code is required when you sign in.'
                  : 'Add a second factor with an authenticator app.'}
              </p>
            </div>
          </div>
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
              totpEnabled
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            {totpEnabled ? 'On' : 'Off'}
          </span>
        </div>

        {!totpEnabled && !setupData && (
          <button
            onClick={startSetup}
            disabled={setupBusy}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition disabled:opacity-50"
          >
            {setupBusy ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Smartphone className="w-4 h-4" />
            )}
            Enable 2FA
          </button>
        )}

        {setupData && (
          <div className="space-y-4 mt-2 border-t border-slate-100 pt-5">
            <p className="text-sm text-slate-700">
              1. Open your authenticator app (Google Authenticator, Authy, 1Password, etc.) and scan this QR code.
            </p>
            <div className="flex items-center justify-center bg-slate-50 border border-slate-200 rounded-xl p-4">
              <img
                src={setupData.qr}
                alt="TOTP QR"
                className="w-48 h-48"
              />
            </div>

            <div>
              <p className="text-xs text-slate-500 mb-1.5">
                Or paste this secret manually:
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono break-all">
                  {setupData.secret}
                </code>
                <button
                  onClick={copySecret}
                  className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
                  aria-label="Copy secret"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="pt-2">
              <p className="text-sm text-slate-700 mb-2">
                2. Enter the current 6-digit code from your app:
              </p>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                autoComplete="one-time-code"
                value={setupCode}
                onChange={(e) => setSetupCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition text-center text-lg font-mono tracking-[0.4em]"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={confirmSetup}
                disabled={setupCode.length < 6 || setupBusy}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition disabled:opacity-50"
              >
                {setupBusy ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Verify and enable
              </button>
              <button
                onClick={cancelSetup}
                disabled={setupBusy}
                className="px-4 py-2.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-medium transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {totpEnabled && !disableOpen && (
          <button
            onClick={() => setDisableOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 text-sm font-semibold transition"
          >
            <ShieldOff className="w-4 h-4" />
            Disable 2FA
          </button>
        )}

        {totpEnabled && disableOpen && (
          <div className="space-y-3 border-t border-slate-100 pt-5">
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3.5">
              <div className="flex gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 leading-relaxed">
                  Disabling 2FA reduces your account security. Confirm your
                  password to proceed.
                </p>
              </div>
            </div>
            <input
              type="password"
              value={disablePassword}
              onChange={(e) => setDisablePassword(e.target.value)}
              placeholder="Current password"
              autoComplete="current-password"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition"
            />
            <div className="flex gap-2">
              <button
                onClick={confirmDisable}
                disabled={!disablePassword || disableBusy}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 transition disabled:opacity-50"
              >
                {disableBusy && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirm disable
              </button>
              <button
                onClick={() => {
                  setDisableOpen(false);
                  setDisablePassword('');
                }}
                disabled={disableBusy}
                className="px-4 py-2.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-medium transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>

      {/* KDF algorithm */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center flex-shrink-0">
              <Cpu size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Key derivation function
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Algorithm used to derive your master encryption key from your
                password.
              </p>
            </div>
          </div>
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
              currentKdf === 'argon2id'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}
          >
            {currentKdf === 'argon2id' ? 'Argon2id' : 'PBKDF2 (legacy)'}
          </span>
        </div>

        {currentKdf === 'pbkdf2' ? (
          !kdfMigrateOpen ? (
            <button
              type="button"
              onClick={() => setKdfMigrateOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition"
            >
              <Cpu className="w-4 h-4" />
              Upgrade to Argon2id
            </button>
          ) : (
            <div className="space-y-3 border-t border-slate-100 pt-5">
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3.5">
                <p className="text-xs text-slate-700 leading-relaxed">
                  Argon2id is more resistant to GPU-based password attacks
                  than PBKDF2. We will re-derive your master key with the new
                  algorithm and re-issue your recovery codes. Your password
                  itself does not change.
                </p>
              </div>
              <input
                type="password"
                value={kdfPassword}
                onChange={(e) => setKdfPassword(e.target.value)}
                placeholder="Current password"
                autoComplete="current-password"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={runKdfMigration}
                  disabled={!kdfPassword || kdfBusy}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition disabled:opacity-50"
                >
                  {kdfBusy && <Loader2 className="w-4 h-4 animate-spin" />}
                  Confirm and upgrade
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setKdfMigrateOpen(false);
                    setKdfPassword('');
                  }}
                  disabled={kdfBusy}
                  className="px-4 py-2.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-medium transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )
        ) : (
          <p className="text-xs text-slate-500">
            Your account uses Argon2id with OWASP-recommended parameters
            (m=19 MiB, t=2, p=1).
          </p>
        )}
      </section>

      {/* Trusted contacts (M-of-N death confirmation) */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
              <Users size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Trusted contacts
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">
                People we email if you miss check-ins. They vote on whether to
                release your vault.
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            {confirmers.length} added
          </span>
        </div>

        {confirmers.length > 0 && (
          <div className="space-y-2 mb-4">
            {confirmers.map((c) => {
              const accepted = !!c.accepted_at;
              return (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        accepted
                          ? 'bg-emerald-50 text-emerald-600'
                          : 'bg-amber-50 text-amber-600'
                      }`}
                    >
                      {accepted ? (
                        <CircleCheck size={16} />
                      ) : (
                        <CircleDashed size={16} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm text-slate-900 truncate">
                          {c.name}
                        </p>
                        {c.relationship && (
                          <span className="text-xs text-slate-500">
                            · {c.relationship}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 truncate">
                        <Mail className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{c.email}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                        accepted
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {accepted ? 'Accepted' : 'Pending'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveConfirmer(c.id)}
                      disabled={removingId === c.id}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition disabled:opacity-50"
                      aria-label="Remove"
                    >
                      {removingId === c.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!addOpen ? (
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold transition"
          >
            <Plus className="w-4 h-4" />
            Add trusted contact
          </button>
        ) : (
          <div className="space-y-3 border-t border-slate-100 pt-5">
            <input
              type="text"
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              placeholder="Full name"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition"
            />
            <input
              type="email"
              value={addEmail}
              onChange={(e) => setAddEmail(e.target.value)}
              placeholder="Email"
              autoComplete="off"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition"
            />
            <input
              type="text"
              value={addRelationship}
              onChange={(e) => setAddRelationship(e.target.value)}
              placeholder="Relationship (optional, e.g. spouse, sibling, lawyer)"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleAddConfirmer}
                disabled={!addEmail.trim() || !addName.trim() || addBusy}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition disabled:opacity-50"
              >
                {addBusy && <Loader2 className="w-4 h-4 animate-spin" />}
                Send invitation
              </button>
              <button
                type="button"
                onClick={() => {
                  setAddOpen(false);
                  setAddEmail('');
                  setAddName('');
                  setAddRelationship('');
                }}
                disabled={addBusy}
                className="px-4 py-2.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-medium transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {confirmers.length > 0 && (
          <div className="mt-5 pt-5 border-t border-slate-100">
            <p className="text-sm font-semibold text-slate-900 mb-1">
              Required confirmations to release
            </p>
            <p className="text-xs text-slate-500 mb-3">
              How many trusted contacts must vote &quot;yes&quot; before your vault is
              released. Set to <strong>0</strong> to release automatically when
              the inactivity threshold expires (no votes required).
            </p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={confirmers.length}
                value={thresholdDraft}
                onChange={(e) =>
                  setThresholdDraft(
                    Math.max(
                      0,
                      Math.min(confirmers.length, Number(e.target.value) || 0)
                    )
                  )
                }
                className="w-24 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition text-center font-mono"
              />
              <span className="text-sm text-slate-500">
                of {confirmers.length}
              </span>
              <button
                type="button"
                onClick={handleSaveThreshold}
                disabled={
                  thresholdBusy || thresholdDraft === requiredConfirmations
                }
                className="ml-auto inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition disabled:opacity-50"
              >
                {thresholdBusy && <Loader2 className="w-4 h-4 animate-spin" />}
                Save
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Recovery codes status */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
            <KeyRound size={18} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Recovery codes
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Used to regain account access if you forget your password.
            </p>
          </div>
        </div>

        {recoveryStatus ? (
          <div className="flex items-center justify-between rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 text-sm mb-4">
            <span className="text-slate-700">
              <span className="font-semibold text-slate-900">
                {recoveryStatus.unused}
              </span>{' '}
              of {recoveryStatus.total} codes remaining
            </span>
            {recoveryStatus.unused === 0 && (
              <span className="text-xs font-semibold text-rose-600">
                No codes left
              </span>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-500 mb-4">
            Recovery code status unavailable.
          </p>
        )}

        {newCodes ? (
          <div className="space-y-4 border-t border-slate-100 pt-5">
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3.5">
              <p className="text-sm text-emerald-800">
                <strong>New codes generated.</strong> Old codes are now invalid.
                Save the new ones somewhere safe — we will not show them again.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {newCodes.map((c, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-200 font-mono text-sm tracking-wider text-slate-800"
                >
                  <span className="text-slate-400 text-xs w-5 text-right">
                    {i + 1}.
                  </span>
                  <span className="flex-1 select-all">{c}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={copyNewCodes}
                className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium transition"
              >
                <Copy className="w-4 h-4" />
                Copy all codes
              </button>
              <button
                type="button"
                onClick={downloadNewCodes}
                className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium transition"
              >
                <Download className="w-4 h-4" />
                Download .txt
              </button>
            </div>

            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={newCodesAck}
                onChange={(e) => setNewCodesAck(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
              />
              <span className="text-sm text-slate-700">
                I have saved my new recovery codes in a safe place.
              </span>
            </label>

            <button
              type="button"
              disabled={!newCodesAck}
              onClick={() => setNewCodes(null)}
              className="w-full bg-slate-900 text-white font-semibold py-2.5 rounded-lg hover:bg-slate-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Done
            </button>
          </div>
        ) : !regenConfirm ? (
          <button
            type="button"
            onClick={() => setRegenConfirm(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold transition"
          >
            <RefreshCw className="w-4 h-4" />
            Generate new codes
          </button>
        ) : (
          <div className="space-y-3 border-t border-slate-100 pt-5">
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3.5">
              <div className="flex gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 leading-relaxed">
                  Generating new codes will <strong>invalidate all current
                  codes</strong>. Make sure no one is mid-recovery before
                  proceeding.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={regenerateCodes}
                disabled={regenBusy}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition disabled:opacity-50"
              >
                {regenBusy ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Confirm and generate
              </button>
              <button
                type="button"
                onClick={() => setRegenConfirm(false)}
                disabled={regenBusy}
                className="px-4 py-2.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-medium transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default SettingsPage;
