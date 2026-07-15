import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  LockKeyhole,
  Loader2,
  Mail,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { isSupabaseReady, supabase } from '../../../integrations/supabase/client';
import { useAuth } from '../../../modules/auth/context/AuthContext';
import { getAuthRedirectUrl } from '../../../shared/auth/auth-redirect';
import { isMockMode } from '../../../shared/lib/mockData';
import { getRoleHomeScreen } from '../../../shared/security/access-policy';
import logo from '../../../imports/image-1.png';

type AuthStep = 'options' | 'email' | 'code';

const OTP_MIN_LENGTH = 6;
const OTP_MAX_LENGTH = 8;

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
    <label className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm transition-all duration-200 focus-within:border-purple-600 focus-within:ring-2 focus-within:ring-purple-100 focus-within:shadow-md w-full text-left">
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-700 transition-colors duration-200 group-focus-within:bg-purple-600 group-focus-within:text-white">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 group-focus-within:text-purple-600 transition-colors duration-200">{label}</span>
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

export function LoginScreen() {
  const { login, mockLogin, user, navigate } = useAuth();
  const [step, setStep] = useState<AuthStep>('options');
  const [isRegistering, setIsRegistering] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [code, setCode] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);
  const isValidEmail = normalizedEmail.includes('@') && normalizedEmail.includes('.');
  const isValidPassword = password.length >= 6;
  const canLoginWithEmail = isValidEmail && isValidPassword;
  const canSendCode = isValidEmail && isValidPassword && fullName.trim().length >= 3 && password === passwordConfirm;
  const cleanCode = code.replace(/\D/g, '').slice(0, OTP_MAX_LENGTH);

  const resetMessages = () => {
    setNotice('');
    setError('');
  };

  useEffect(() => {
    if (!user) return;
    navigate(getRoleHomeScreen(user.role));
  }, [navigate, user]);

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
        if (!role) { setError('Credenciales inválidas.'); return; }
        return;
      }

      if (!isSupabaseReady || !supabase) {
        setError('Supabase no esta configurado para iniciar sesiones reales.');
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
        setError('Supabase no esta configurado para crear cuentas reales.');
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
      setNotice(`Reenviamos un código nuevo a ${normalizedEmail}.`);
    } catch (err) {
      setError(authErrorMessage(err, 'No pudimos reenviar el código. Intenta de nuevo.'));
    } finally {
      setLoading(false);
    }
  };

  const verifyEmailCode = async () => {
    if (cleanCode.length < OTP_MIN_LENGTH || cleanCode.length > OTP_MAX_LENGTH) {
      setError(`Ingresa el código de ${OTP_MIN_LENGTH} a ${OTP_MAX_LENGTH} dígitos.`);
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

  return (
    <main
      className="min-h-screen bg-slate-50 text-[#12051F] flex items-center justify-center relative py-12 px-4"
      style={{
        backgroundImage: 'linear-gradient(135deg, #f5eefc 0%, #eef0fc 100%)',
      }}
    >
      <div className="w-full max-w-[440px] bg-white rounded-[32px] border border-slate-100 shadow-[0_32px_64px_-15px_rgba(15,23,42,0.06)] p-8 md:p-10 flex flex-col items-center relative">
        
        {step !== 'options' && (
          <button
            type="button"
            onClick={() => setStep('options')}
            className="absolute left-6 top-6 h-10 w-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-600 border border-slate-100 transition-all duration-200 hover:bg-slate-100 hover:text-slate-900 active:scale-95 shadow-sm"
            aria-label="Volver"
          >
            <ArrowLeft size={18} />
          </button>
        )}

        {/* LOGO */}
        <div className="flex flex-col items-center mb-6 mt-2">
          <img src={logo} alt="RayoExpress" className="h-28 object-contain" />
        </div>

        {/* TITULOS Y TEXTOS */}
        <div className="text-center w-full mb-6">
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            {step === 'code' ? 'Verifica tu correo' : step === 'email' ? 'Correo electronico' : 'Bienvenido'}
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed font-medium mt-2">
            {step === 'code'
              ? 'Escribe el código que acabamos de enviarte.'
              : step === 'email'
                ? isRegistering
                  ? 'Crea tu cuenta nueva y valida tu dirección.'
                  : 'Ingresa con tu correo y clave de acceso.'
                : 'Seleccione su método de inicio de sesión preferido.'}
          </p>
        </div>

        {/* PASOS */}
        {step === 'options' && (
          <div className="w-full space-y-3.5">
            {/* GOOGLE BUTTON */}
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

            {/* EMAIL BUTTON */}
            <button
              type="button"
              onClick={() => startEmailFlow(false)}
              className="flex h-12 w-full items-center justify-between rounded-2xl bg-purple-700 px-4 font-bold text-white shadow-sm transition-all duration-200 hover:bg-purple-800 active:scale-98"
            >
              <span className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-white">
                  <Mail size={15} />
                </span>
                <span className="text-sm">Correo electronico</span>
              </span>
              <ArrowRight size={16} className="text-purple-200" />
            </button>

            {/* ENLACE REGISTRO */}
            <button
              type="button"
              onClick={() => startEmailFlow(true)}
              className="w-full text-center text-xs font-black text-slate-900 hover:underline transition-all active:scale-98 pt-2"
            >
              Crear cuenta nueva
            </button>

            {/* INFO SECTION */}
            <div className="flex gap-3 bg-transparent p-1 pt-4 border-t border-slate-100 mt-4">
              <ShieldCheck size={20} className="text-slate-600 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-slate-500 leading-normal font-medium text-left">
                El ingreso con Google es directo y automático. El registro con correo requiere verificación mediante código temporal.
              </p>
            </div>
          </div>
        )}

        {step === 'email' && (
          <div className="w-full space-y-4">
            <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1 border border-slate-200/50">
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
                placeholder="Minimo 6 caracteres"
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
              {isRegistering ? 'Enviar codigo' : 'Iniciar sesion'}
            </PrimaryButton>
          </div>
        )}

        {step === 'code' && (
          <div className="w-full space-y-4">
            <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">Verificando Correo</p>
                <p className="mt-0.5 truncate text-sm font-bold text-slate-800 max-w-[180px] md:max-w-[240px]">{normalizedEmail}</p>
              </div>
              <button
                type="button"
                onClick={() => setStep('email')}
                className="text-xs font-bold text-purple-700 hover:text-purple-800"
              >
                Cambiar
              </button>
            </div>

            <Field icon={<Sparkles size={16} />} label="Código Recibido">
              <input
                aria-label="Código de verificación"
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, OTP_MAX_LENGTH))}
                placeholder="000000"
                inputMode="numeric"
                autoComplete="one-time-code"
                className="mt-0.5 w-full bg-transparent text-lg font-black tracking-[0.2em] text-slate-850 outline-none placeholder:tracking-normal placeholder:text-slate-355"
              />
            </Field>

            <PrimaryButton onClick={verifyEmailCode} disabled={cleanCode.length < OTP_MIN_LENGTH} loading={loading}>
              Enviar codigo
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

        {/* FEEDBACK MESSAGES */}
        {notice && (
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800 leading-normal w-full mt-4 animate-fadeIn">
            {notice}
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-800 leading-normal w-full mt-4 animate-fadeIn">
            {error}
          </div>
        )}

      </div>
    </main>
  );
}
