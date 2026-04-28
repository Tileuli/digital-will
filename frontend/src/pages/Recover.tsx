import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Shield,
  Mail,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  Check,
  X,
  AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  beginRecovery,
  unlockWithRecoveryCode,
  completeRecovery,
} from '../services/recovery';
import { getErrorMessage } from '../services/api';

const PASSWORD_MIN = 8;

type Step = 'identify' | 'reset' | 'done';

const Recover: React.FC = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('identify');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [unlockedKey, setUnlockedKey] = useState<CryptoKey | null>(null);

  const passwordLongEnough = newPassword.length >= PASSWORD_MIN;
  const passwordsMatch =
    confirmPassword.length > 0 && newPassword === confirmPassword;
  const showMismatch = confirmPassword.length > 0 && !passwordsMatch;

  const handleIdentify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (!email.trim() || !code.trim()) {
      setError('Email and recovery code are required.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const { recovery } = await beginRecovery(email, code);
      const privateKey = await unlockWithRecoveryCode(
        code,
        recovery.kdf_salt,
        recovery.encrypted_private_key,
        recovery.kdf_algorithm
      );
      setUnlockedKey(privateKey);
      setStep('reset');
    } catch (err: any) {
      const msg = getErrorMessage(err, 'Recovery code is invalid or expired.');
      setError(
        /decrypt|operation|invalid/i.test(msg)
          ? 'That code did not unlock the account. Double-check it and try again.'
          : msg
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || !unlockedKey) return;
    if (!passwordLongEnough || !passwordsMatch) {
      setError('Please enter a valid matching password.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await completeRecovery({
        email,
        rawCode: code,
        newPassword,
        privateKey: unlockedKey,
      });
      setStep('done');
      toast.success('Password reset successful');
    } catch (err: any) {
      setError(getErrorMessage(err, 'Could not reset password. Try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col">
      <header className="border-b border-slate-200/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold tracking-tight">Digital Will</span>
          </Link>
          <Link
            to="/login"
            className="text-sm text-slate-600 hover:text-slate-900 transition"
          >
            Back to <span className="font-semibold text-slate-900">Sign in</span>
          </Link>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-4 py-10">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 mb-4">
              <KeyRound className="w-6 h-6 text-amber-600" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {step === 'done' ? 'Password reset' : 'Account recovery'}
            </h1>
            <p className="text-slate-600 mt-2 text-sm">
              {step === 'identify' &&
                'Enter your email and one of the recovery codes you saved.'}
              {step === 'reset' &&
                'Recovery code accepted. Choose a new password.'}
              {step === 'done' &&
                'You can now sign in with your new password.'}
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
            {error && (
              <div
                className="mb-6 p-3.5 bg-rose-50 border border-rose-200 rounded-lg"
                role="alert"
              >
                <p className="text-rose-700 text-center text-sm">{error}</p>
              </div>
            )}

            {step === 'identify' && (
              <form onSubmit={handleIdentify} className="space-y-5" noValidate>
                <div>
                  <label
                    htmlFor="rec-email"
                    className="block text-sm font-medium text-slate-700 mb-2"
                  >
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      id="rec-email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (error) setError('');
                      }}
                      className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition"
                      placeholder="you@example.com"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="rec-code"
                    className="block text-sm font-medium text-slate-700 mb-2"
                  >
                    Recovery Code
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      id="rec-code"
                      type="text"
                      value={code}
                      onChange={(e) => {
                        setCode(e.target.value);
                        if (error) setError('');
                      }}
                      className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition font-mono tracking-wider"
                      placeholder="xxxx-xxxx-xxxx-xxxx"
                      autoComplete="one-time-code"
                      spellCheck={false}
                      autoCapitalize="off"
                      required
                      disabled={loading}
                    />
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    Each code works once. Dashes are optional.
                  </p>
                </div>

                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3.5">
                  <div className="flex gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800 leading-relaxed">
                      Vaults you created before recovery will still release to
                      recipients on schedule, but you will not be able to view
                      their contents yourself afterwards.
                    </p>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-slate-900 text-white font-semibold py-2.5 rounded-lg hover:bg-slate-800 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Verifying…
                    </>
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {step === 'reset' && (
              <form onSubmit={handleReset} className="space-y-5" noValidate>
                <div>
                  <label
                    htmlFor="rec-new-pwd"
                    className="block text-sm font-medium text-slate-700 mb-2"
                  >
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      id="rec-new-pwd"
                      type={showPwd ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        if (error) setError('');
                      }}
                      className="w-full pl-9 pr-10 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition"
                      placeholder="••••••••"
                      required
                      minLength={PASSWORD_MIN}
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition p-1"
                      tabIndex={-1}
                    >
                      {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {newPassword.length > 0 && (
                    <p
                      className={`mt-2 text-xs flex items-center gap-1.5 ${
                        passwordLongEnough ? 'text-emerald-600' : 'text-slate-500'
                      }`}
                    >
                      {passwordLongEnough ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-slate-400" />
                      )}
                      At least {PASSWORD_MIN} characters
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="rec-confirm-pwd"
                    className="block text-sm font-medium text-slate-700 mb-2"
                  >
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      id="rec-confirm-pwd"
                      type={showConfirm ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (error) setError('');
                      }}
                      className={`w-full pl-9 pr-10 py-2.5 border rounded-lg focus:ring-2 outline-none transition ${
                        showMismatch
                          ? 'border-rose-300 focus:ring-rose-500 focus:border-rose-500'
                          : 'border-slate-200 focus:ring-slate-900 focus:border-slate-900'
                      }`}
                      placeholder="••••••••"
                      required
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition p-1"
                      tabIndex={-1}
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {showMismatch && (
                    <p className="mt-2 text-xs text-rose-600 flex items-center gap-1.5">
                      <X className="w-3.5 h-3.5" />
                      Passwords do not match
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || !passwordLongEnough || !passwordsMatch}
                  className="w-full bg-slate-900 text-white font-semibold py-2.5 rounded-lg hover:bg-slate-800 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Resetting password…
                    </>
                  ) : (
                    <>
                      Reset password
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {step === 'done' && (
              <div className="text-center space-y-5">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200">
                  <Check className="w-6 h-6 text-emerald-600" />
                </div>
                <p className="text-sm text-slate-600">
                  Your password has been updated. All previously issued
                  recovery codes have been invalidated. You can generate new
                  codes from Settings after signing in.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="w-full bg-slate-900 text-white font-semibold py-2.5 rounded-lg hover:bg-slate-800 transition flex items-center justify-center"
                >
                  Go to sign in
                  <ArrowRight className="ml-2 w-4 h-4" />
                </button>
              </div>
            )}

            <div className="mt-7 text-center text-sm">
              <Link
                to="/"
                className="inline-block text-slate-500 hover:text-slate-700 text-xs"
              >
                ← Back to home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Recover;
