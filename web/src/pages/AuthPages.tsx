import { CheckCircle2, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { FieldError } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { useDocumentMeta } from '@/lib/hooks';
import { useAuth, useToasts } from '@/store';

function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center px-4 py-12">
      <div className="text-center">
        <Link to="/" className="inline-flex items-center gap-2.5 transition-transform hover:scale-105" aria-label="Shopzy home">
          <img src="/logo.png" alt="Shopzy logo" className="size-12 object-contain" />
          <span className="font-heading text-2xl font-bold tracking-tight text-ink-900 dark:text-slate-100">
            Shop<span className="text-sky-500">zy</span>
          </span>
        </Link>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-ink-900 dark:text-slate-100">{title}</h1>
        <p className="mt-1.5 text-sm text-ink-500 dark:text-slate-400">{subtitle}</p>
      </div>
      <div className="card mt-6 p-6">{children}</div>
    </div>
  );
}

function PasswordInput({
  id,
  value,
  onChange,
  autoComplete,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  placeholder?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        required
        className="input pr-11"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600 dark:text-slate-500 dark:hover:text-slate-300"
      >
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

export function LoginPage() {
  useDocumentMeta('Sign in | SHOPZY', 'Sign in to save shops, write reviews and manage your business listing.');

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  const { login, user } = useAuth();
  const navigate = useNavigate();
  const push = useToasts((s) => s.push);

  if (user) {
    const dest =
      user.role === 'admin' || user.role === 'super_admin' ? '/admin' : user.role === 'owner' ? '/owner' : '/account';
    return <Navigate to={dest} replace />;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setPending(true);
    try {
      const signedIn = await login(identifier, password);
      push(`Welcome back, ${signedIn.profile.firstName ?? 'there'}!`, 'success');
      navigate(
        signedIn.role === 'admin' || signedIn.role === 'super_admin'
          ? '/admin'
          : signedIn.role === 'owner'
            ? '/owner'
            : '/account',
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your SHOPZY account">
      <form onSubmit={onSubmit} className="space-y-4">
        {error && (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="identifier" className="label">
            Email or phone number
          </label>
          <input
            id="identifier"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            autoComplete="username"
            placeholder="you@example.com or 9876543210"
            required
            className="input"
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="label">
              Password
            </label>
            <Link to="/forgot-password" className="mb-1.5 text-xs font-medium text-brand-600 hover:text-brand-700">
              Forgot?
            </Link>
          </div>
          <PasswordInput id="password" value={password} onChange={setPassword} autoComplete="current-password" />
        </div>

        <button type="submit" disabled={pending} className="btn-primary btn-md w-full">
          {pending && <Loader2 size={16} className="animate-spin" aria-hidden />}
          {pending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-ink-500 dark:text-slate-400">
        New to SHOPZY?{' '}
        <Link to="/register" className="font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300">
          Create an account
        </Link>
      </p>

      <details className="mt-5 rounded-xl border border-ink-200 dark:border-slate-800 bg-ink-50 dark:bg-slate-800/60 px-4 py-3 text-xs text-ink-600 dark:text-slate-400">
        <summary className="cursor-pointer font-medium text-ink-700 dark:text-slate-200">Demo accounts</summary>
        <ul className="mt-2 space-y-1 font-mono">
          <li>admin@shopzy.in · Admin@1234</li>
          <li>owner1@shopzy.in · Password@123</li>
          <li>aditya.sharma@example.com · Password@123</li>
        </ul>
      </details>
    </AuthShell>
  );
}

export function RegisterPage() {
  useDocumentMeta('Create your account | SHOPZY', 'Join SHOPZY to discover local shops or list your own business free.');

  const [params] = useSearchParams();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    role: (params.get('role') === 'owner' ? 'owner' : 'customer') as 'customer' | 'owner',
  });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  const { register, user } = useAuth();
  const navigate = useNavigate();
  const push = useToasts((s) => s.push);

  if (user) {
    const dest =
      user.role === 'admin' || user.role === 'super_admin' ? '/admin' : user.role === 'owner' ? '/owner' : '/account';
    return <Navigate to={dest} replace />;
  }

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    setPending(true);
    try {
      const { devCode } = await register(form);
      push('Account created — welcome to SHOPZY!', 'success');
      // In development the API returns the OTP so phone verification is testable.
      if (devCode) push(`Your verification code is ${devCode}`, 'info');
      navigate(form.role === 'owner' ? '/owner' : '/account');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setFieldErrors(err.fieldErrors);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle={form.role === 'owner' ? 'List your business and reach nearby customers' : 'Discover and compare local shops'}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {error && (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <fieldset>
          <legend className="label">I am a…</legend>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ['customer', 'Customer', 'Find & compare shops'],
                ['owner', 'Shop owner', 'List my business'],
              ] as const
            ).map(([value, label, hint]) => (
              <button
                key={value}
                type="button"
                onClick={() => set('role', value)}
                aria-pressed={form.role === value}
                className={
                  form.role === value
                    ? 'rounded-xl border-2 border-brand-600 bg-brand-50 dark:bg-slate-800 dark:border-brand-500 px-3 py-2.5 text-left'
                    : 'rounded-xl border-2 border-ink-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 px-3 py-2.5 text-left hover:border-ink-300 dark:hover:border-slate-600'
                }
              >
                <span className={`block text-sm font-semibold ${form.role === value ? 'text-brand-900 dark:text-brand-400' : 'text-ink-800 dark:text-slate-100'}`}>{label}</span>
                <span className="block text-xs text-ink-500 dark:text-slate-400">{hint}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="firstName" className="label">
              First name
            </label>
            <input
              id="firstName"
              value={form.firstName}
              onChange={(e) => set('firstName', e.target.value)}
              autoComplete="given-name"
              required
              className="input"
            />
            <FieldError message={fieldErrors.firstName} />
          </div>
          <div>
            <label htmlFor="lastName" className="label">
              Last name
            </label>
            <input
              id="lastName"
              value={form.lastName}
              onChange={(e) => set('lastName', e.target.value)}
              autoComplete="family-name"
              className="input"
            />
          </div>
        </div>

        <div>
          <label htmlFor="email" className="label">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
            autoComplete="email"
            required
            className="input"
          />
          <FieldError message={fieldErrors.email} />
        </div>

        <div>
          <label htmlFor="phone" className="label">
            Mobile number
          </label>
          <div className="flex">
            <span className="inline-flex items-center rounded-l-xl border border-r-0 border-ink-300 bg-ink-50 px-3 text-sm text-ink-500">
              +91
            </span>
            <input
              id="phone"
              type="tel"
              inputMode="numeric"
              value={form.phone}
              onChange={(e) => set('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
              autoComplete="tel-national"
              placeholder="9876543210"
              required
              className="input rounded-l-none"
            />
          </div>
          <FieldError message={fieldErrors.phone} />
        </div>

        <div>
          <label htmlFor="password" className="label">
            Password
          </label>
          <PasswordInput
            id="password"
            value={form.password}
            onChange={(v) => set('password', v)}
            autoComplete="new-password"
          />
          <FieldError message={fieldErrors.password} />
          <p className="mt-1.5 text-xs text-ink-500">
            At least 8 characters with an uppercase letter, a lowercase letter, a number and a symbol.
          </p>
        </div>

        <button type="submit" disabled={pending} className="btn-primary btn-md w-full">
          {pending && <Loader2 size={16} className="animate-spin" aria-hidden />}
          {pending ? 'Creating account…' : 'Create account'}
        </button>

        <p className="text-center text-xs text-ink-400 dark:text-slate-500">
          By continuing you agree to our{' '}
          <Link to="/terms" className="underline hover:text-ink-600 dark:hover:text-slate-300">
            Terms
          </Link>{' '}
          and{' '}
          <Link to="/privacy" className="underline hover:text-ink-600 dark:hover:text-slate-300">
            Privacy Policy
          </Link>
          .
        </p>
      </form>

      <p className="mt-5 text-center text-sm text-ink-500 dark:text-slate-400">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}

export function ForgotPasswordPage() {
  useDocumentMeta('Reset your password | SHOPZY', 'Recover access to your SHOPZY account.');

  const [identifier, setIdentifier] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [devToken, setDevToken] = useState<string | null>(null);

  const { user } = useAuth();
  const push = useToasts((s) => s.push);

  if (user) return <Navigate to="/" replace />;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setPending(true);
    try {
      const res = await api.post<{ resetToken?: string }>('/auth/forgot-password', { identifier });
      setSubmitted(true);
      if (res.data?.resetToken) {
        setDevToken(res.data.resetToken);
      }
      push('Reset instructions have been sent', 'success');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthShell title="Reset your password" subtitle="Enter your email or phone to receive reset instructions">
      {submitted ? (
        <div className="space-y-4 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 size={24} />
          </div>
          <h2 className="text-base font-semibold text-ink-900">Check your messages</h2>
          <p className="text-sm text-ink-500">
            If an account exists for <span className="font-semibold text-ink-800">{identifier}</span>, we have sent instructions to reset your password.
          </p>
          {devToken && (
            <div className="rounded-xl border border-brand-200 bg-brand-50 p-3 text-left text-xs">
              <p className="font-semibold text-brand-800">Development Token Detected:</p>
              <p className="mt-1 font-mono text-ink-700 break-all">{devToken}</p>
              <Link
                to={`/reset-password?token=${devToken}`}
                className="btn-primary btn-sm mt-2.5 inline-block text-center"
              >
                Proceed to Reset Password →
              </Link>
            </div>
          )}
          <div className="pt-2">
            <Link to="/login" className="btn-secondary btn-md w-full">
              Back to sign in
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          {error && (
            <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="reset-identifier" className="label">
              Email or 10-digit mobile number
            </label>
            <input
              id="reset-identifier"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="you@example.com or 9876543210"
              required
              className="input"
            />
          </div>

          <button type="submit" disabled={pending} className="btn-primary btn-md w-full">
            {pending && <Loader2 size={16} className="animate-spin" aria-hidden />}
            {pending ? 'Sending…' : 'Send reset instructions'}
          </button>

          <p className="text-center text-sm text-ink-500">
            Remember your password?{' '}
            <Link to="/login" className="font-medium text-brand-600 hover:text-brand-700">
              Sign in
            </Link>
          </p>
        </form>
      )}
    </AuthShell>
  );
}

export function ResetPasswordPage() {
  useDocumentMeta('Set new password | SHOPZY', 'Set a new password for your account.');

  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get('token') ?? '';

  const [token, setToken] = useState(tokenFromUrl);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  const navigate = useNavigate();
  const push = useToasts((s) => s.push);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!token.trim()) {
      setError('A reset token is required');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setPending(true);
    try {
      await api.post('/auth/reset-password', { token: token.trim(), password });
      push('Password reset successfully. Please sign in.', 'success');
      navigate('/login');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Invalid or expired reset token');
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthShell title="Set new password" subtitle="Enter your reset token and chosen password">
      <form onSubmit={onSubmit} className="space-y-4">
        {error && (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="token" className="label">
            Reset token
          </label>
          <input
            id="token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            required
            placeholder="Paste your reset token here"
            className="input font-mono text-xs"
          />
        </div>

        <div>
          <label htmlFor="new-password" className="label">
            New password
          </label>
          <PasswordInput id="new-password" value={password} onChange={setPassword} autoComplete="new-password" />
          <p className="mt-1.5 text-xs text-ink-500">
            At least 8 characters with an uppercase letter, a lowercase letter, a number and a symbol.
          </p>
        </div>

        <div>
          <label htmlFor="confirm-password" className="label">
            Confirm new password
          </label>
          <PasswordInput
            id="confirm-password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            autoComplete="new-password"
          />
        </div>

        <button type="submit" disabled={pending} className="btn-primary btn-md w-full">
          {pending && <Loader2 size={16} className="animate-spin" aria-hidden />}
          {pending ? 'Updating password…' : 'Update password'}
        </button>

        <p className="text-center text-sm text-ink-500">
          <Link to="/login" className="font-medium text-brand-600 hover:text-brand-700">
            Back to sign in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
