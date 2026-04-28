import { Link } from 'react-router-dom';
import {
  Shield,
  Clock,
  Lock,
  Users,
  ArrowRight,
  KeyRound,
  FileLock2,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import authService from '../services/auth';

const Home = () => {
  const isAuthenticated = authService.isAuthenticated();

  const primaryCta = isAuthenticated ? '/dashboard' : '/register';
  const primaryLabel = isAuthenticated ? 'Go to Dashboard' : 'Get Started Free';

  const features = [
    {
      icon: Lock,
      title: 'End-to-End Encryption',
      description:
        'Your data is encrypted on your device with AES-GCM before it ever leaves your browser.',
      accent: 'bg-blue-50 text-blue-600',
    },
    {
      icon: Shield,
      title: 'Zero Knowledge',
      description:
        'We store ciphertext only. Your master key is derived from your password — never sent to our servers.',
      accent: 'bg-emerald-50 text-emerald-600',
    },
    {
      icon: Clock,
      title: 'Automatic Release',
      description:
        'Set a check-in cadence. If you miss it, recipients are unlocked automatically — no manual step required.',
      accent: 'bg-amber-50 text-amber-600',
    },
    {
      icon: Users,
      title: 'Granular Recipients',
      description:
        'Add multiple trusted contacts. Each vault is wrapped to specific recipients you choose.',
      accent: 'bg-violet-50 text-violet-600',
    },
  ];

  const steps = [
    {
      title: 'Create your vault',
      description:
        'Write encrypted notes, credentials, or instructions. Encryption happens in your browser.',
      icon: FileLock2,
    },
    {
      title: 'Add trusted recipients',
      description:
        'Invite family or friends. Each recipient gets their own keypair to unlock content meant for them.',
      icon: Users,
    },
    {
      title: 'Set your check-in cadence',
      description:
        'Choose how often you confirm you’re active — weekly, monthly, or any custom interval.',
      icon: Clock,
    },
    {
      title: 'Stay protected, automatically',
      description:
        'Miss a check-in and the system releases access to the right people. No middlemen.',
      icon: CheckCircle2,
    },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Nav */}
      <header className="sticky top-0 z-30 backdrop-blur bg-white/80 border-b border-slate-200/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-slate-900 tracking-tight">
              Digital Will
            </span>
          </Link>
          <nav className="hidden sm:flex items-center gap-8 text-sm text-slate-600">
            <a href="#features" className="hover:text-slate-900 transition">
              Features
            </a>
            <a href="#how" className="hover:text-slate-900 transition">
              How it works
            </a>
            <a href="#security" className="hover:text-slate-900 transition">
              Security
            </a>
          </nav>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition"
              >
                Dashboard <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="hidden sm:inline-flex text-sm font-medium text-slate-700 hover:text-slate-900 px-3 py-2"
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition"
                >
                  Get started <ArrowRight className="w-4 h-4" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-blue-50/60 via-white to-white" />
        <div
          className="absolute -top-32 left-1/2 -translate-x-1/2 -z-10 w-[800px] h-[800px] rounded-full bg-gradient-to-br from-blue-200/40 to-indigo-200/30 blur-3xl"
          aria-hidden
        />
        <div className="container mx-auto px-4 pt-20 pb-24 lg:pt-28 lg:pb-32">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-medium mb-6">
                <Sparkles className="w-3.5 h-3.5" />
                End-to-end encrypted · Zero-knowledge
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 leading-[1.05]">
                Pass on what matters,{' '}
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  on your terms.
                </span>
              </h1>
              <p className="mt-6 text-lg text-slate-600 max-w-xl leading-relaxed">
                Digital Will encrypts the messages, credentials, and instructions
                you want loved ones to receive — and releases them only when you
                stop checking in.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Link
                  to={primaryCta}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-slate-900 text-white font-semibold hover:bg-slate-800 transition shadow-sm"
                >
                  {primaryLabel} <ArrowRight className="w-4 h-4" />
                </Link>
                {!isAuthenticated && (
                  <Link
                    to="/login"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition"
                  >
                    Sign in
                  </Link>
                )}
              </div>

              <div className="mt-8 flex items-center gap-6 text-xs text-slate-500">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  No card required
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Encrypted in your browser
                </div>
              </div>
            </div>

            {/* Visual: stylized vault card */}
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-3xl blur-2xl opacity-60" />
              <div className="relative bg-white rounded-2xl border border-slate-200 shadow-xl p-6 sm:p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                      <Lock className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="text-sm font-semibold text-slate-700">
                      Encrypted vault
                    </span>
                  </div>
                  <span className="text-[10px] font-bold tracking-wider px-2 py-1 rounded-full bg-emerald-50 text-emerald-700">
                    LOCKED
                  </span>
                </div>

                <div className="space-y-3">
                  {[
                    { name: 'Important letter', tag: 'Family' },
                    { name: 'Recovery codes', tag: 'Self' },
                    { name: 'Account credentials', tag: 'Spouse' },
                  ].map((item) => (
                    <div
                      key={item.name}
                      className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <KeyRound className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">
                            {item.name}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white text-slate-600 border border-slate-200">
                        {item.tag}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Next check-in in 6 days
                  </div>
                  <span className="text-emerald-600 font-medium">All clear</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 lg:py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mb-14">
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-3">
              Why Digital Will
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              Built so we can never read your data.
            </h2>
            <p className="mt-4 text-slate-600 leading-relaxed">
              Encryption happens client-side. The server only sees ciphertext —
              not your secrets, not your master key, not your recipients' keys.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="p-6 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-md transition group"
                >
                  <div
                    className={`inline-flex items-center justify-center w-11 h-11 rounded-xl mb-5 ${f.accent}`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 mb-2">
                    {f.title}
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {f.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-20 lg:py-24 bg-slate-50/60 border-y border-slate-200/60">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mb-14">
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-3">
              How it works
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              Four simple steps. No middlemen.
            </h2>
          </div>

          <ol className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((s, i) => {
              const Icon = s.icon;
              return (
                <li
                  key={s.title}
                  className="relative bg-white rounded-2xl border border-slate-200 p-6"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <span className="w-8 h-8 rounded-full bg-slate-900 text-white text-sm font-semibold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <Icon className="w-5 h-5 text-slate-400" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 mb-2">
                    {s.title}
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {s.description}
                  </p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* Security deep-dive */}
      <section id="security" className="py-20 lg:py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-10 items-center">
            <div>
              <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-3">
                The cryptography
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-5">
                Designed to fail closed.
              </h2>
              <p className="text-slate-600 leading-relaxed mb-6">
                Each vault is encrypted with a per-vault AES key. That key is
                wrapped to your RSA public key — and to each recipient's public
                key — so only the intended people can ever decrypt it.
              </p>
              <ul className="space-y-3 text-sm text-slate-700">
                {[
                  'Master key derived from your password (PBKDF2)',
                  'AES-GCM for vault contents',
                  'RSA-OAEP for per-recipient key wrapping',
                  'Server stores only ciphertext and public keys',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-slate-100 font-mono text-xs leading-relaxed overflow-hidden shadow-2xl">
              <div className="flex items-center gap-1.5 mb-4 text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
                <span className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
                <span className="ml-2 text-[11px]">vault.encrypt.ts</span>
              </div>
              <pre className="whitespace-pre-wrap break-words">
                <span className="text-slate-500">// happens in your browser</span>
                {'\n'}
                <span className="text-blue-400">const</span> key ={' '}
                <span className="text-purple-400">await</span> deriveAesKey()
                {'\n'}
                <span className="text-blue-400">const</span> ciphertext ={' '}
                <span className="text-purple-400">await</span>{' '}
                <span className="text-yellow-300">aesGcmEncrypt</span>(payload, key)
                {'\n'}
                <span className="text-blue-400">const</span> wrapped ={' '}
                recipients.<span className="text-yellow-300">map</span>((r) =&gt;
                {'\n'}
                {'  '}
                <span className="text-yellow-300">rsaWrap</span>(key, r.publicKey)
                {'\n'})
                {'\n\n'}
                <span className="text-slate-500">// only ciphertext leaves</span>
                {'\n'}
                <span className="text-yellow-300">api.post</span>(
                <span className="text-emerald-300">'/vaults'</span>, {'{'}{' '}
                ciphertext, wrapped {'}'})
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 lg:py-24">
        <div className="container mx-auto px-4">
          <div className="relative overflow-hidden rounded-3xl bg-slate-900 text-white p-10 sm:p-14">
            <div
              className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-gradient-to-br from-blue-500/30 to-indigo-500/30 blur-3xl"
              aria-hidden
            />
            <div className="relative max-w-2xl">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
                Start your digital will today.
              </h2>
              <p className="mt-4 text-slate-300 text-lg leading-relaxed">
                It takes a few minutes. Free while in beta — no card required.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Link
                  to={primaryCta}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-white text-slate-900 font-semibold hover:bg-slate-100 transition"
                >
                  {primaryLabel} <ArrowRight className="w-4 h-4" />
                </Link>
                {!isAuthenticated && (
                  <Link
                    to="/login"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg border border-white/20 text-white font-semibold hover:bg-white/10 transition"
                  >
                    Sign in
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200/60 py-10">
        <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <Shield className="w-4 h-4" />
            Digital Will · Encrypted by design
          </div>
          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} Digital Will. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
