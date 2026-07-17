import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Clock3,
  KeyRound,
  LockKeyhole,
  Loader2,
  Mail,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { isSupabaseReady, supabase } from '../../../integrations/supabase/client';
import { useAuth } from '../../../modules/auth/context/AuthContext';
import { getAuthRedirectUrl, isPasswordRecoveryUrl } from '../../../shared/auth/auth-redirect';
import { isMockMode } from '../../../shared/lib/mockData';
import { getRoleHomeScreen } from '../../../shared/security/access-policy';
import logo from '../../../imports/image-1.png';

type AuthStep = 'options' | 'email' | 'code' | 'recover' | 'new-password';

const OTP_MIN_LENGTH = 6;
const OTP_MAX_LENGTH = 8;
const CODE_TTL_SECONDS = 120;
const RECOVERY_LINK_TTL_SECONDS = 180;

function isPasswordRecoveryRedirect() {
  return isPasswordRecoveryUrl() && !hasRecoveryLinkExpired();
}

function getRecoveryIssuedAt() {
  if (typeof window === 'undefined') return null;

  const params = new URLSearchParams(window.location.search);
  const sentAt = Number(params.get('sent'));
  return Number.isFinite(sentAt) && sentAt > 0 ? sentAt : null;
}

function hasRecoveryLinkExpired() {
  const sentAt = getRecoveryIssuedAt();
  if (!sentAt) return isPasswordRecoveryUrl();
  return Date.now() - sentAt > RECOVERY_LINK_TTL_SECONDS * 1000;
}

function normalizeOtp(value: string) {
  return value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, OTP_MAX_LENGTH);
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" className="flex-shrink-0">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function Field({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="group flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-left shadow-sm transition-all duration-200 focus-within:border-purple-600 focus-within:shadow-md focus-within:ring-2 focus-within:ring-purple-100">
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-700 transition-colors duration-200 group-focus-within:bg-purple-600 group-focus-within:text-white">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 transition-colors duration-200 group-focus-within:text-purple-600">{label}</span>
        {children}
      </span>
    </label>
  );
}

function PrimaryButton({
  children,
  disabled,
  loading,
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  loading?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-purple-700 px-5 text-sm font-bold text-white shadow-md transition-all duration-200 hover:bg-purple-800 active:scale-98 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:active:scale-100"
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : null}
      {children}
    </button>
  );
}

function authErrorMessage(err: unknown, fallback: string) {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === 'object' && err !== null) {
    const maybeMessage = 'message' in err ? err.message : undefined;
    const maybeDescription = 'error_description' in err ? err.error_description : undefined;
    if (typeof maybeMessage === 'string' && maybeMessage) return maybeMessage;
    if (typeof maybeDescription === 'string' && maybeDescription) return maybeDescription;
  }
  return fallback;
}

function formatTimer(seconds: number) {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60).toString();
  const rest = (safeSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${rest}`;
}

export function LoginScreen() {
  const { login, mockLogin, user, navigate } = useAuth();
  const [step, setStep] = useState<AuthStep>(() => (isPasswordRecoveryRedirect() ? 'new-password' : 'options'));
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(isPasswordRecoveryRedirect);
  const [suppressSessionRedirect, setSuppressSessionRedirect] = useState(isPasswordRecoveryUrl);
  const [isRegistering, setIsRegistering] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [code, setCode] = useState('');
  const [codeExpiresAt, setCodeExpiresAt] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(CODE_TTL_SECONDS);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);
  const isValidEmail = normalizedEmail.includes('@') && normalizedEmail.includes('.');
  const isValidPassword = password.length >= 6;
  const canLoginWithEmail = isValidEmail && isValidPassword;
  const canSendCode = isValidEmail && isValidPassword && fullName.trim().length >= 3 && password === passwordConfirm;
  const canRecover = isValidEmail;
  const canUpdatePassword = newPassword.length >= 6 && newPassword === newPasswordConfirm;
  const cleanCode = normalizeOtp(code);

  const resetMessages = () => {
    setNotice('');
    setError('');
  };

  const startCodeTimer = () => {
    const expiresAt = Date.now() + CODE_TTL_SECONDS * 1000;
    setCodeExpiresAt(expiresAt);
    setRemainingSeconds(CODE_TTL_SECONDS);
  };

  const clearRecoveryUrl = () => {
    if (typeof window === 'undefined') return;
    window.history.replaceState({}, '', '/login');
  };

  useEffect(() => {
    if (!user || isPasswordRecovery || suppressSessionRedirect || step === 'new-password') return;
    navigate(getRoleHomeScreen(user.role));
  }, [isPasswordRecovery, navigate, step, suppressSessionRedirect, user]);

  useEffect(() => {
    if (!codeExpiresAt) return undefined;

    const interval = window.setInterval(() => {
      setRemainingSeconds(Math.max(0, Math.ceil((codeExpiresAt - Date.now()) / 1000)));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [codeExpiresAt]);

  useEffect(() => {
    if (!supabase) return undefined;

    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        if (hasRecoveryLinkExpired()) {
          setIsPasswordRecovery(false);
          setSuppressSessionRedirect(true);
          setStep('recover');
          resetMessages();
          setError('El enlace de recuperación expiró. Solicita uno nuevo para continuar.');
          clearRecoveryUrl();
          void supabase?.auth.signOut();
          return;
        }

        setIsPasswordRecovery(true);
        setStep('new-password');
        resetMessages();
        setNotice('Verificamos tu correo. Ahora crea una clave nueva.');
      }
    });

    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (isPasswordRecoveryUrl()) {
      if (hasRecoveryLinkExpired()) {
        setIsPasswordRecovery(false);
        setSuppressSessionRedirect(true);
        setStep('recover');
        setError('El enlace de recuperación expiró. Solicita uno nuevo para continuar.');
        clearRecoveryUrl();
        void supabase?.auth.signOut();
        return;
      }

      setIsPasswordRecovery(true);
      setSuppressSessionRedirect(true);
      setStep('new-password');
      setNotice('Crea una clave nueva para recuperar tu cuenta.');
    }
  }, []);

  const goBackToOptions = () => {
    setStep('options');
    setCode('');
    setNewPassword('');
    setNewPasswordConfirm('');
    resetMessages();
  };

  const startEmailFlow = (register = false) => {
    setIsRegistering(register);
    setStep('email');
    setCode('');
    setPassword('');
    setPasswordConfirm('');
    resetMessages();
  };

  const signInWithEmail = async () => {
    if (!canLoginWithEmail) {
      setError('Ingresa tu correo y una clave válida.');
      return;
    }

    setLoading(true);
    resetMessages();
    try {
      if (isMockMode) {
        const role = await mockLogin(normalizedEmail, password);
        if (!role) {
          setError('Credenciales inválidas.');
          return;
        }
        return;
      }

      if (!isSupabaseReady || !supabase) {
        setError('Supabase no está configurado para iniciar sesiones reales.');
        return;
      }

      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (signInError) throw signInError;
      await login('customer', signInData.session?.access_token);
    } catch (err) {
      setError(authErrorMessage(err, 'No pudimos iniciar sesión.'));
    } finally {
      setLoading(false);
    }
  };

  const sendEmailCode = async () => {
    if (!canSendCode) {
      setError(password !== passwordConfirm ? 'Las claves no coinciden.' : 'Completa nombre, correo y una clave de al menos 6 caracteres.');
      return;
    }

    setLoading(true);
    resetMessages();
    try {
      if (!isSupabaseReady || !supabase) {
        setError('Supabase no está configurado para crear cuentas reales.');
        return;
      }

      const { error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          emailRedirectTo: getAuthRedirectUrl('/login'),
          data: { full_name: fullName.trim() },
        },
      });

      if (signUpError) throw signUpError;
      setStep('code');
      startCodeTimer();
      setNotice(`Te enviamos un código de verificación a ${normalizedEmail}.`);
    } catch (err) {
      setError(authErrorMessage(err, 'No pudimos enviar el código. Intenta de nuevo.'));
    } finally {
      setLoading(false);
    }
  };

  const resendEmailCode = async () => {
    if (!isValidEmail) {
      setError('Ingresa un correo válido para reenviar el código.');
      return;
    }

    setLoading(true);
    resetMessages();
    try {
      if (!isSupabaseReady || !supabase) {
        throw new Error('Supabase no está configurado para reenviar códigos reales.');
      }

      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: normalizedEmail,
        options: {
          emailRedirectTo: getAuthRedirectUrl('/login'),
        },
      });

      if (resendError) throw resendError;
      startCodeTimer();
      setNotice(`Reenviamos un código nuevo a ${normalizedEmail}.`);
    } catch (err) {
      setError(authErrorMessage(err, 'No pudimos reenviar el código. Intenta de nuevo.'));
    } finally {
      setLoading(false);
    }
  };

  const verifyEmailCode = async () => {
    if (cleanCode.length < OTP_MIN_LENGTH || cleanCode.length > OTP_MAX_LENGTH) {
      setError(`Ingresa el código de ${OTP_MIN_LENGTH} a ${OTP_MAX_LENGTH} caracteres.`);
      return;
    }

    if (codeExpiresAt && Date.now() > codeExpiresAt) {
      setError('El código ya expiró. Solicita uno nuevo para continuar.');
      return;
    }

    setLoading(true);
    resetMessages();
    try {
      if (!isSupabaseReady || !supabase) {
        setError('Supabase no está configurado para verificar códigos reales.');
        return;
      }

      const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
        email: normalizedEmail,
        token: cleanCode,
        type: 'signup',
      });

      if (verifyError) throw verifyError;
      await login('customer', verifyData.session?.access_token);
    } catch (err) {
      setError(authErrorMessage(err, 'No pudimos crear la cuenta con ese código.'));
    } finally {
      setLoading(false);
    }
  };

  const sendRecoveryEmail = async () => {
    if (!canRecover) {
      setError('Ingresa el correo de tu cuenta para recuperarla.');
      return;
    }

    setLoading(true);
    resetMessages();
    try {
      if (!isSupabaseReady || !supabase) {
        setError('Supabase no está configurado para recuperar cuentas reales.');
        return;
      }

      const { error: recoveryError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: getAuthRedirectUrl(`/login?recover=1&sent=${Date.now()}`),
      });

      if (recoveryError) throw recoveryError;
      setNotice(`Te enviamos instrucciones de recuperación a ${normalizedEmail}. Revisa tu correo.`);
    } catch (err) {
      setError(authErrorMessage(err, 'No pudimos enviar la recuperación. Intenta de nuevo.'));
    } finally {
      setLoading(false);
    }
  };

  const updateRecoveredPassword = async () => {
    if (!canUpdatePassword) {
      setError(newPassword !== newPasswordConfirm ? 'Las claves no coinciden.' : 'La clave debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);
    resetMessages();
    try {
      if (!isSupabaseReady || !supabase) {
        setError('Supabase no está configurado para actualizar claves reales.');
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;

      await supabase.auth.signOut();
      setIsPasswordRecovery(false);
      setSuppressSessionRedirect(false);
      clearRecoveryUrl();
      setNotice('Clave actualizada. Ya puedes ingresar con tu correo.');
      setStep('email');
      setIsRegistering(false);
      setPassword('');
      setPasswordConfirm('');
      setNewPassword('');
      setNewPasswordConfirm('');
    } catch (err) {
      setError(authErrorMessage(err, 'No pudimos actualizar la clave.'));
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setGoogleLoading(true);
    resetMessages();
    try {
      if (!isSupabaseReady || !supabase) {
        setError('Google necesita Supabase configurado.');
        return;
      }

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: getAuthRedirectUrl('/login'),
          queryParams: { prompt: 'select_account' },
        },
      });

      if (oauthError) throw oauthError;
    } catch (err) {
      setError(authErrorMessage(err, 'No pudimos iniciar con Google.'));
      setGoogleLoading(false);
    }
  };

  const title =
    step === 'code'
      ? 'Verifica tu correo'
      : step === 'email'
        ? 'Correo electrónico'
        : step === 'recover'
          ? 'Recuperar cuenta'
          : step === 'new-password'
            ? 'Nueva clave'
            : 'Bienvenido';

  const subtitle =
    step === 'code'
      ? 'Escribe el código temporal que acabamos de enviarte.'
      : step === 'email'
        ? isRegistering
          ? 'Crea tu cuenta nueva y valida tu dirección.'
          : 'Ingresa con tu correo y clave de acceso.'
        : step === 'recover'
          ? 'Te enviaremos un enlace seguro para restablecer tu clave.'
          : step === 'new-password'
            ? 'Define una clave nueva para recuperar el acceso.'
            : 'Selecciona tu método de inicio de sesión preferido.';

  return (
    <main
      className="relative flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 text-[#12051F]"
      style={{
        backgroundImage: 'linear-gradient(135deg, #f5eefc 0%, #eef0fc 100%)',
      }}
    >
      <div className="relative flex w-full max-w-[440px] flex-col items-center rounded-[32px] border border-slate-100 bg-white p-8 shadow-[0_32px_64px_-15px_rgba(15,23,42,0.06)] md:p-10">
        {step !== 'options' && (
          <button
            type="button"
            onClick={goBackToOptions}
            className="absolute left-6 top-6 flex h-10 w-10 items-center justify-center rounded-full border border-slate-100 bg-slate-50 text-slate-600 shadow-sm transition-all duration-200 hover:bg-slate-100 hover:text-slate-900 active:scale-95"
            aria-label="Volver"
          >
            <ArrowLeft size={18} />
          </button>
        )}

        <div className="mb-6 mt-2 flex flex-col items-center">
          <img src={logo} alt="RayoExpress" className="h-28 object-contain" />
        </div>

        <div className="mb-6 w-full text-center">
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">{title}</h2>
          <p className="mt-2 text-xs font-medium leading-relaxed text-slate-500">{subtitle}</p>
        </div>

        {step === 'options' && (
          <div className="w-full space-y-3.5">
            <button
              type="button"
              onClick={loginWithGoogle}
              disabled={googleLoading}
              className="flex h-12 w-full items-center justify-between rounded-2xl border border-slate-200/80 bg-white px-4 font-bold text-slate-700 shadow-sm transition-all duration-200 hover:bg-slate-50 active:scale-98 disabled:opacity-50"
            >
              <span className="flex items-center gap-3">
                {googleLoading ? <Loader2 size={16} className="animate-spin text-purple-600" /> : <GoogleMark />}
                <span className="text-sm">Continuar con Google</span>
              </span>
              <ArrowRight size={16} className="text-slate-400" />
            </button>

            <button
              type="button"
              onClick={() => startEmailFlow(false)}
              className="flex h-12 w-full items-center justify-between rounded-2xl bg-purple-700 px-4 font-bold text-white shadow-sm transition-all duration-200 hover:bg-purple-800 active:scale-98"
            >
              <span className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-white">
                  <Mail size={15} />
                </span>
                <span className="text-sm">Correo electrónico</span>
              </span>
              <ArrowRight size={16} className="text-purple-200" />
            </button>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => startEmailFlow(true)}
                className="h-11 rounded-2xl bg-slate-100 text-xs font-black text-slate-900 transition-all hover:bg-slate-200 active:scale-98"
              >
                Crear cuenta
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep('recover');
                  resetMessages();
                }}
                className="h-11 rounded-2xl bg-purple-50 text-xs font-black text-purple-700 transition-all hover:bg-purple-100 active:scale-98"
              >
                Recuperar cuenta
              </button>
            </div>

            <div className="mt-4 flex gap-3 border-t border-slate-100 bg-transparent p-1 pt-4">
              <ShieldCheck size={20} className="mt-0.5 flex-shrink-0 text-slate-600" />
              <p className="text-left text-[11px] font-medium leading-normal text-slate-500">
                Google es directo. El correo usa clave y verificación temporal para crear o recuperar cuentas.
              </p>
            </div>
          </div>
        )}

        {step === 'email' && (
          <div className="w-full space-y-4">
            <div className="grid grid-cols-2 rounded-xl border border-slate-200/50 bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => {
                  setIsRegistering(false);
                  resetMessages();
                }}
                className={`h-9 rounded-lg text-xs font-bold transition-all duration-200 ${!isRegistering ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Ingresar
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsRegistering(true);
                  resetMessages();
                }}
                className={`h-9 rounded-lg text-xs font-bold transition-all duration-200 ${isRegistering ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Registrarme
              </button>
            </div>

            {isRegistering && (
              <Field icon={<UserRound size={16} />} label="Nombre">
                <input
                  aria-label="Nombre completo"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Tu nombre completo"
                  className="mt-0.5 w-full bg-transparent text-sm font-bold text-slate-850 outline-none placeholder:text-slate-350"
                />
              </Field>
            )}

            <Field icon={<Mail size={16} />} label="Correo">
              <input
                aria-label="Correo electronico"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="correo@ejemplo.com"
                type="email"
                autoComplete="email"
                className="mt-0.5 w-full bg-transparent text-sm font-bold text-slate-850 outline-none placeholder:text-slate-350"
              />
            </Field>

            <Field icon={<LockKeyhole size={16} />} label="Clave">
              <input
                aria-label="Clave"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Mínimo 6 caracteres"
                type="password"
                autoComplete={isRegistering ? 'new-password' : 'current-password'}
                className="mt-0.5 w-full bg-transparent text-sm font-bold text-slate-850 outline-none placeholder:text-slate-355"
              />
            </Field>

            {isRegistering && (
              <Field icon={<LockKeyhole size={16} />} label="Confirmar clave">
                <input
                  aria-label="Confirmar clave"
                  value={passwordConfirm}
                  onChange={(event) => setPasswordConfirm(event.target.value)}
                  placeholder="Repite tu contraseña"
                  type="password"
                  autoComplete="new-password"
                  className="mt-0.5 w-full bg-transparent text-sm font-bold text-slate-850 outline-none placeholder:text-slate-355"
                />
              </Field>
            )}

            <PrimaryButton
              onClick={isRegistering ? sendEmailCode : signInWithEmail}
              disabled={isRegistering ? !canSendCode : !canLoginWithEmail}
              loading={loading}
            >
              {isRegistering ? 'Enviar código' : 'Iniciar sesión'}
            </PrimaryButton>

            {!isRegistering && (
              <button
                type="button"
                onClick={() => {
                  setStep('recover');
                  resetMessages();
                }}
                className="w-full text-center text-xs font-bold text-purple-700 hover:text-purple-800"
              >
                ¿Olvidaste tu clave? Recuperar cuenta
              </button>
            )}
          </div>
        )}

        {step === 'code' && (
          <div className="w-full space-y-4">
            <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">Verificando correo</p>
                <p className="mt-0.5 max-w-[180px] truncate text-sm font-bold text-slate-800 md:max-w-[240px]">{normalizedEmail}</p>
              </div>
              <button type="button" onClick={() => setStep('email')} className="text-xs font-bold text-purple-700 hover:text-purple-800">
                Cambiar
              </button>
            </div>

            <Field icon={<Sparkles size={16} />} label="Código recibido">
              <input
                aria-label="Código de verificación"
                value={code}
                onChange={(event) => setCode(normalizeOtp(event.target.value))}
                placeholder="000000"
                inputMode="text"
                autoComplete="one-time-code"
                className="mt-0.5 w-full bg-transparent text-lg font-black tracking-[0.2em] text-slate-850 outline-none placeholder:tracking-normal placeholder:text-slate-355"
              />
            </Field>

            <div className="flex items-center justify-center gap-2 rounded-2xl bg-purple-50 px-4 py-3 text-xs font-bold text-purple-800">
              <Clock3 size={15} />
              El código vence en {formatTimer(remainingSeconds)}
            </div>

            <PrimaryButton onClick={verifyEmailCode} disabled={cleanCode.length < OTP_MIN_LENGTH} loading={loading}>
              Verificar código
            </PrimaryButton>

            <div className="flex justify-center">
              <button
                type="button"
                onClick={resendEmailCode}
                disabled={loading}
                className="text-xs font-bold text-purple-700 hover:text-purple-800 disabled:opacity-50"
              >
                ¿No recibiste el código? Reenviar código
              </button>
            </div>
          </div>
        )}

        {step === 'recover' && (
          <div className="w-full space-y-4">
            <Field icon={<Mail size={16} />} label="Correo de la cuenta">
              <input
                aria-label="Correo electronico"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="correo@ejemplo.com"
                type="email"
                autoComplete="email"
                className="mt-0.5 w-full bg-transparent text-sm font-bold text-slate-850 outline-none placeholder:text-slate-350"
              />
            </Field>

            <PrimaryButton onClick={sendRecoveryEmail} disabled={!canRecover} loading={loading}>
              Enviar recuperación
            </PrimaryButton>

            <p className="text-center text-[11px] font-medium leading-relaxed text-slate-500">
              Si tu correo ya existe en Supabase Auth, recibirás el enlace para restablecer la clave.
            </p>
          </div>
        )}

        {step === 'new-password' && (
          <div className="w-full space-y-4">
            <Field icon={<KeyRound size={16} />} label="Nueva clave">
              <input
                aria-label="Nueva clave"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="Mínimo 6 caracteres"
                type="password"
                autoComplete="new-password"
                className="mt-0.5 w-full bg-transparent text-sm font-bold text-slate-850 outline-none placeholder:text-slate-355"
              />
            </Field>

            <Field icon={<LockKeyhole size={16} />} label="Confirmar nueva clave">
              <input
                aria-label="Confirmar nueva clave"
                value={newPasswordConfirm}
                onChange={(event) => setNewPasswordConfirm(event.target.value)}
                placeholder="Repite tu nueva clave"
                type="password"
                autoComplete="new-password"
                className="mt-0.5 w-full bg-transparent text-sm font-bold text-slate-850 outline-none placeholder:text-slate-355"
              />
            </Field>

            <PrimaryButton onClick={updateRecoveredPassword} disabled={!canUpdatePassword} loading={loading}>
              Guardar nueva clave
            </PrimaryButton>
          </div>
        )}

        {notice && (
          <div className="mt-4 w-full animate-fadeIn rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs font-bold leading-normal text-emerald-800">
            {notice}
          </div>
        )}

        {error && (
          <div className="mt-4 w-full animate-fadeIn rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-xs font-bold leading-normal text-rose-800">
            {error}
          </div>
        )}
      </div>
    </main>
  );
}
