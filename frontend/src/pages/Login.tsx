import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Lock,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Shield,
  KeyRound,
} from 'lucide-react';
import authService from '../services/auth';
import { getErrorMessage } from '../services/api';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [totpChallenge, setTotpChallenge] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState('');

  const updateField = (field: 'email' | 'password', value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (error) setError('');
  };

  const isValid =
    formData.email.trim().length > 0 && formData.password.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || loading) return;
    setLoading(true);
    setError('');

    try {
      const result = await authService.login({
        email: formData.email.trim(),
        password: formData.password,
      });
      if (result.totp_required && result.totp_challenge) {
        setTotpChallenge(result.totp_challenge);
        setTotpCode('');
        return;
      }
      navigate('/dashboard');
    } catch (err: any) {
      setError(getErrorMessage(err, 'Login failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleTotpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || !totpChallenge || totpCode.trim().length === 0) return;
    setLoading(true);
    setError('');
    try {
      await authService.verifyLoginTotp({
        totp_challenge: totpChallenge,
        code: totpCode,
        password: formData.password,
      });
      navigate('/dashboard');
    } catch (err: any) {
      setError(getErrorMessage(err, 'Invalid verification code.'));
    } finally {
      setLoading(false);
    }
  };

  const cancelTotp = () => {
    setTotpChallenge(null);
    setTotpCode('');
    setError('');
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
            to="/register"
            className="text-sm text-slate-600 hover:text-slate-900 transition"
          >
            New here? <span className="font-semibold text-slate-900">Sign up</span>
          </Link>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-4 relative overflow-hidden">
        <div
          className="absolute -top-32 left-1/2 -translate-x-1/2 -z-10 w-[700px] h-[700px] rounded-full bg-gradient-to-br from-blue-100/60 to-indigo-100/40 blur-3xl"
          aria-hidden
        />

        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Welcome back
            </h1>
            <p className="text-slate-600 mt-2">
              Sign in to your Digital Will account.
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

            {totpChallenge ? (
              <form onSubmit={handleTotpSubmit} className="space-y-5" noValidate>
                <div className="text-center mb-1">
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 mb-3">
                    <KeyRound className="w-5 h-5 text-blue-600" />
                  </div>
                  <h2 className="text-base font-semibold text-slate-900">
                    Two-factor verification
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Enter the 6-digit code from your authenticator app.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="totp-code"
                    className="block text-sm font-medium text-slate-700 mb-2"
                  >
                    Verification code
                  </label>
                  <input
                    id="totp-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={totpCode}
                    onChange={(e) => {
                      setTotpCode(e.target.value.replace(/\D/g, ''));
                      if (error) setError('');
                    }}
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition text-center text-lg font-mono tracking-[0.4em]"
                    placeholder="000000"
                    autoFocus
                    disabled={loading}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || totpCode.length < 6}
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

                <button
                  type="button"
                  onClick={cancelTotp}
                  className="w-full text-xs text-slate-500 hover:text-slate-700 transition"
                >
                  ← Use a different account
                </button>
              </form>
            ) : (
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <div>
                <label
                  htmlFor="login-email"
                  className="block text-sm font-medium text-slate-700 mb-2"
                >
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    id="login-email"
                    type="email"
                    name="email"
                    autoComplete="email"
                    inputMode="email"
                    spellCheck={false}
                    autoCapitalize="off"
                    value={formData.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition text-slate-900 placeholder-slate-400"
                    placeholder="you@example.com"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="login-password"
                  className="block text-sm font-medium text-slate-700 mb-2"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    autoComplete="current-password"
                    value={formData.password}
                    onChange={(e) => updateField('password', e.target.value)}
                    className="w-full pl-9 pr-10 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition text-slate-900 placeholder-slate-400"
                    placeholder="••••••••"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition p-1"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !isValid}
                className="w-full bg-slate-900 text-white font-semibold py-2.5 rounded-lg hover:bg-slate-800 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </>
                )}
              </button>

              <div className="text-center">
                <Link
                  to="/recover"
                  className="text-xs text-slate-500 hover:text-slate-700 transition"
                >
                  Forgot password? Use a recovery code →
                </Link>
              </div>
            </form>
            )}

            <div className="mt-7 text-center text-sm">
              <p className="text-slate-600">
                Don't have an account?{' '}
                <Link
                  to="/register"
                  className="text-slate-900 font-semibold hover:underline"
                >
                  Create one
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

export default Login;
