import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Check,
  X,
  Shield,
  Copy,
  Download,
  KeyRound,
} from 'lucide-react';
import toast from 'react-hot-toast';
import authService from '../services/auth';
import { getErrorMessage } from '../services/api';

const PASSWORD_MIN = 8;
const RESEND_COOLDOWN = 30;

type Step = 'email' | 'code' | 'password' | 'codes';

const Register: React.FC = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [registrationTicket, setRegistrationTicket] = useState('');

  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [acknowledged, setAcknowledged] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const passwordLongEnough = password.length >= PASSWORD_MIN;
  const passwordsMatch =
    confirmPassword.length > 0 && password === confirmPassword;
  const showMismatch = confirmPassword.length > 0 && !passwordsMatch;

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (!email.trim()) {
      setError('Please enter your email.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await authService.registerInit(email.trim());
      setStep('code');
      setResendIn(RESEND_COOLDOWN);
    } catch (err: any) {
      setError(getErrorMessage(err, 'Could not send code. Try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendIn > 0 || loading) return;
    setLoading(true);
    setError('');
    try {
      await authService.registerInit(email.trim());
      setResendIn(RESEND_COOLDOWN);
      toast.success('A new code is on the way');
    } catch (err: any) {
      setError(getErrorMessage(err, 'Could not resend code.'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || code.length !== 6) return;
    setLoading(true);
    setError('');
    try {
      const res = await authService.registerVerify(email.trim(), code);
      setRegistrationTicket(res.registration_ticket);
      setStep('password');
    } catch (err: any) {
      setError(getErrorMessage(err, 'Incorrect or expired code.'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || !passwordLongEnough || !passwordsMatch) return;
    setLoading(true);
    setError('');
    try {
      const result = await authService.registerComplete({
        registration_ticket: registrationTicket,
        password,
        full_name: fullName.trim() || undefined,
      });
      if (result.recoveryCodes && result.recoveryCodes.length > 0) {
        setRecoveryCodes(result.recoveryCodes);
        setStep('codes');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(getErrorMessage(err, 'Registration failed.'));
    } finally {
      setLoading(false);
    }
  };

  const copyAllCodes = async () => {
    try {
      await navigator.clipboard.writeText(recoveryCodes.join('\n'));
      toast.success('Recovery codes copied to clipboard');
    } catch {
      toast.error('Could not copy codes');
    }
  };

  const downloadCodes = () => {
    const header = `Digital Will — Recovery Codes
Account: ${email.trim()}
Generated: ${new Date().toISOString()}

Each code can be used ONCE to recover access to your account if you forget
your password. Store them somewhere safe (password manager, printed copy in
a secure location). Do not share them with anyone.

`;
    const body = recoveryCodes
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

  if (step === 'codes') {
    return (
      <div className="min-h-screen bg-white text-slate-900 flex flex-col">
        <header className="border-b border-slate-200/60">
          <div className="container mx-auto px-4 h-16 flex items-center">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <span className="font-semibold tracking-tight">Digital Will</span>
            </div>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center p-4 py-10">
          <div className="max-w-xl w-full">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 mb-4">
                <KeyRound className="w-6 h-6 text-amber-600" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Save your recovery codes
              </h1>
              <p className="text-slate-600 mt-2 text-sm max-w-md mx-auto">
                These 10 codes are the <strong>only way</strong> to recover your
                account if you forget your password. Each code works once. Store
                them somewhere safe — we will not show them again.
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <div className="grid grid-cols-2 gap-2 mb-5">
                {recoveryCodes.map((c, i) => (
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

              <div className="flex flex-col sm:flex-row gap-2 mb-5">
                <button
                  type="button"
                  onClick={copyAllCodes}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium transition"
                >
                  <Copy className="w-4 h-4" />
                  Copy all codes
                </button>
                <button
                  type="button"
                  onClick={downloadCodes}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium transition"
                >
                  <Download className="w-4 h-4" />
                  Download .txt
                </button>
              </div>

              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3.5 mb-5">
                <p className="text-xs text-amber-800 leading-relaxed">
                  <strong>Important:</strong> If you lose both your password and
                  these codes, your account cannot be recovered. After using a
                  recovery code, vaults you have already created will release to
                  recipients normally, but you will no longer be able to view
                  their contents yourself.
                </p>
              </div>

              <label className="flex items-start gap-2.5 mb-4 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={acknowledged}
                  onChange={(e) => setAcknowledged(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                />
                <span className="text-sm text-slate-700">
                  I have saved my recovery codes in a safe place.
                </span>
              </label>

              <button
                type="button"
                disabled={!acknowledged}
                onClick={() => navigate('/dashboard')}
                className="w-full bg-slate-900 text-white font-semibold py-2.5 rounded-lg hover:bg-slate-800 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                Continue to dashboard
                <ArrowRight className="ml-2 w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const stepNumber = step === 'email' ? 1 : step === 'code' ? 2 : 3;

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
            Already a member?{' '}
            <span className="font-semibold text-slate-900">Sign in</span>
          </Link>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-4 py-10 relative overflow-hidden">
        <div
          className="absolute -top-32 left-1/2 -translate-x-1/2 -z-10 w-[700px] h-[700px] rounded-full bg-gradient-to-br from-blue-100/60 to-indigo-100/40 blur-3xl"
          aria-hidden
        />

        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-1.5 mb-4">
              {[1, 2, 3].map((n) => (
                <span
                  key={n}
                  className={`h-1.5 w-8 rounded-full transition ${
                    n <= stepNumber ? 'bg-slate-900' : 'bg-slate-200'
                  }`}
                />
              ))}
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              {step === 'email' && 'Create your account'}
              {step === 'code' && 'Check your email'}
              {step === 'password' && 'Set your password'}
            </h1>
            <p className="text-slate-600 mt-2 text-sm">
              {step === 'email' &&
                'We will send a 6-digit code to confirm your email.'}
              {step === 'code' && (
                <>
                  Enter the code we sent to{' '}
                  <span className="font-medium text-slate-900">{email}</span>.
                </>
              )}
              {step === 'password' &&
                'Your password is your master encryption key — pick something strong.'}
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
            {error && (
              <div
                className="mb-6 p-3.5 bg-rose-50 border border-rose-200 rounded-lg"
                role="alert"
                aria-live="polite"
              >
                <p className="text-rose-700 text-center text-sm">{error}</p>
              </div>
            )}

            {step === 'email' && (
              <form onSubmit={handleSendCode} className="space-y-5" noValidate>
                <div>
                  <label
                    htmlFor="reg-email"
                    className="block text-sm font-medium text-slate-700 mb-2"
                  >
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      id="reg-email"
                      type="email"
                      autoComplete="email"
                      inputMode="email"
                      spellCheck={false}
                      autoCapitalize="off"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (error) setError('');
                      }}
                      className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition"
                      placeholder="you@example.com"
                      required
                      disabled={loading}
                      autoFocus
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || email.trim().length === 0}
                  className="w-full bg-slate-900 text-white font-semibold py-2.5 rounded-lg hover:bg-slate-800 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending code…
                    </>
                  ) : (
                    <>
                      Send code
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {step === 'code' && (
              <form onSubmit={handleVerifyCode} className="space-y-5" noValidate>
                <div>
                  <label
                    htmlFor="reg-code"
                    className="block text-sm font-medium text-slate-700 mb-2"
                  >
                    Verification code
                  </label>
                  <input
                    id="reg-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value.replace(/\D/g, ''));
                      if (error) setError('');
                    }}
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition text-center text-2xl font-mono tracking-[0.5em]"
                    placeholder="000000"
                    autoFocus
                    disabled={loading}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || code.length !== 6}
                  className="w-full bg-slate-900 text-white font-semibold py-2.5 rounded-lg hover:bg-slate-800 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Verifying…
                    </>
                  ) : (
                    <>
                      Verify
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="text-center text-sm text-slate-500">
                  Didn’t get it?{' '}
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendIn > 0 || loading}
                    className="text-slate-900 font-medium hover:underline disabled:opacity-40 disabled:cursor-not-allowed disabled:no-underline"
                  >
                    {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setStep('email');
                    setCode('');
                    setError('');
                  }}
                  className="w-full text-xs text-slate-500 hover:text-slate-700 transition"
                >
                  ← Use a different email
                </button>
              </form>
            )}

            {step === 'password' && (
              <form onSubmit={handleCreate} className="space-y-5" noValidate>
                <div>
                  <label
                    htmlFor="reg-name"
                    className="block text-sm font-medium text-slate-700 mb-2"
                  >
                    Full Name{' '}
                    <span className="text-slate-400 font-normal">
                      (optional)
                    </span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      id="reg-name"
                      type="text"
                      autoComplete="name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition"
                      placeholder="Jane Doe"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="reg-password"
                    className="block text-sm font-medium text-slate-700 mb-2"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      id="reg-password"
                      type={showPwd ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (error) setError('');
                      }}
                      className="w-full pl-9 pr-10 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition"
                      placeholder="••••••••"
                      required
                      minLength={PASSWORD_MIN}
                      disabled={loading}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition p-1"
                      tabIndex={-1}
                    >
                      {showPwd ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {password.length > 0 && (
                    <p
                      className={`mt-2 text-xs flex items-center gap-1.5 ${
                        passwordLongEnough
                          ? 'text-emerald-600'
                          : 'text-slate-500'
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
                    htmlFor="reg-confirm"
                    className="block text-sm font-medium text-slate-700 mb-2"
                  >
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      id="reg-confirm"
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
                      {showConfirm ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
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
                      Creating account…
                    </>
                  ) : (
                    <>
                      Create account
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            <div className="mt-7 text-center text-sm">
              <p className="text-slate-600">
                Already have an account?{' '}
                <Link
                  to="/login"
                  className="text-slate-900 font-semibold hover:underline"
                >
                  Sign in
                </Link>
              </p>
              <Link
                to="/"
                className="inline-block mt-3 text-slate-500 hover:text-slate-700 text-xs"
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

export default Register;
