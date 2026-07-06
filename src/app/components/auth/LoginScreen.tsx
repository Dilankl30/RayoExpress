import { useMemo, useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  LockKeyhole,
  Loader2,
  Mail,
  ShieldCheck,
  Sparkles,
  UserRound,
  Zap,
} from 'lucide-react';
import { isSupabaseReady, supabase } from '../../../integrations/supabase/client';
import { useAuth } from '../../../modules/auth/context/AuthContext';
import logo from '../../../imports/image-1.png';

type AuthStep = 'options' | 'email' | 'code';

const OTP_MIN_LENGTH = 6;
const OTP_MAX_LENGTH = 8;

const brand = {
  ink: '#12051F',
  primary: '#4514D8',
  primaryDark: '#2A087A',
  accent: '#FFE83D',
  cyan: '#56E4F2',
  surface: '#F6F5FA',
};

function GoogleMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
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
    <label className="group flex items-center gap-3 rounded-[24px] border border-[#D9D4EA] bg-white px-4 py-3.5 shadow-[0_14px_34px_rgba(18,5,31,0.06)] transition focus-within:border-[#4514D8] focus-within:shadow-[0_18px_42px_rgba(69,20,216,0.12)]">
      <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-[#F1EEFF] text-[#4514D8] transition group-focus-within:bg-[#4514D8] group-focus-within:text-white">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#6D6681]">{label}</span>
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
      className="flex h-14 w-full items-center justify-center gap-2 rounded-[28px] bg-[#4514D8] px-5 text-base font-extrabold text-white shadow-[0_18px_40px_rgba(69,20,216,0.28)] transition hover:bg-[#3710B8] disabled:cursor-not-allowed disabled:bg-[#CFC8E7] disabled:text-white/70 disabled:shadow-none"
    >
      {loading ? <Loader2 size={20} className="animate-spin" /> : null}
      {children}
    </button>
  );
}

export function LoginScreen() {
  const { login } = useAuth();
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
      setError('Ingresa tu correo y una clave valida.');
      return;
    }

    setLoading(true);
    resetMessages();
    try {
      if (!isSupabaseReady || !supabase) {
        throw new Error('Supabase no esta configurado para iniciar sesion real.');
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (signInError) throw signInError;
      await login('customer');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos iniciar sesion.');
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
        throw new Error('Supabase no esta configurado para enviar codigos reales.');
      }

      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${window.location.origin}/login`,
          data: { full_name: fullName.trim() },
        },
      });

      if (otpError) throw otpError;
      setStep('code');
      setNotice(`Te enviamos un codigo de verificacion a ${normalizedEmail}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos enviar el codigo. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const verifyEmailCode = async () => {
    if (cleanCode.length < OTP_MIN_LENGTH || cleanCode.length > OTP_MAX_LENGTH) {
      setError(`Ingresa el codigo de ${OTP_MIN_LENGTH} a ${OTP_MAX_LENGTH} digitos.`);
      return;
    }

    setLoading(true);
    resetMessages();
    try {
      if (!isSupabaseReady || !supabase) {
        throw new Error('Supabase no esta configurado para verificar codigos reales.');
      }

      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: normalizedEmail,
        token: cleanCode,
        type: 'email',
      });

      if (verifyError) throw verifyError;

      const { error: passwordError } = await supabase.auth.updateUser({
        password,
        data: { full_name: fullName.trim() },
      });

      if (passwordError) throw passwordError;
      await login('customer');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos crear la cuenta con ese codigo.');
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
          redirectTo: `${window.location.origin}/login`,
          queryParams: { prompt: 'select_account' },
        },
      });

      if (oauthError) throw oauthError;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos iniciar con Google.');
      setGoogleLoading(false);
    }
  };

  return (
    <main
      className="min-h-screen overflow-hidden bg-[#F6F5FA] text-[#12051F]"
      style={{
        backgroundImage:
          'radial-gradient(circle at 12% 12%, rgba(255,232,61,0.32), transparent 30%), radial-gradient(circle at 88% 4%, rgba(86,228,242,0.32), transparent 28%), linear-gradient(135deg, #F9F8FF 0%, #F4F1FF 54%, #FFFFFF 100%)',
      }}
    >
      <div className="mx-auto grid min-h-screen w-full max-w-6xl items-center gap-8 px-5 py-8 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
        <motion.section
          initial={{ opacity: 0, x: -22 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45 }}
          className="relative hidden min-h-[720px] overflow-hidden rounded-[40px] bg-[#4514D8] p-10 text-white shadow-[0_28px_80px_rgba(69,20,216,0.28)] lg:block"
        >
          <div className="absolute -right-36 -top-24 h-72 w-72 rounded-full bg-[#FFE83D] opacity-75 blur-sm" />
          <div className="absolute bottom-0 left-0 h-72 w-full bg-gradient-to-t from-[#1C0559] to-transparent" />
          <div className="absolute left-10 top-44 h-20 w-20 rounded-full border-[18px] border-[#56E4F2]/45" />
          <div className="absolute right-12 top-56 h-16 w-16 rotate-12 rounded-3xl bg-white/12" />
          <div className="relative z-10 flex h-full flex-col justify-between">
            <div>
              <div className="flex items-center gap-3">
                <img src={logo} alt="RayoExpress" className="h-14 w-14 rounded-2xl bg-white p-2 shadow-lg" />
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#FFE83D]">RayoExpress</p>
                  <h1 className="text-4xl font-black leading-tight">Entrar debe sentirse rapido.</h1>
                </div>
              </div>
              <p className="mt-8 max-w-md text-lg font-medium leading-8 text-white/82">
                Accede con Google o entra con correo y clave. Para crear cuenta validamos tu correo con un codigo.
              </p>
            </div>

            <div className="grid gap-4">
              {[
                ['Codigo seguro', 'Cada ingreso por correo se confirma con un codigo temporal.'],
                ['Clave protegida', 'Tu cuenta queda lista solo despues de verificar el codigo.'],
                ['Perfil limpio', 'Tus datos se completan despues, dentro de la app.'],
              ].map(([title, text]) => (
                <div key={title} className="flex items-start gap-3 rounded-[26px] bg-white/12 p-4 backdrop-blur">
                  <CheckCircle2 className="mt-0.5 text-[#FFE83D]" size={22} />
                  <div>
                    <p className="font-extrabold">{title}</p>
                    <p className="text-sm leading-6 text-white/72">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mx-auto w-full max-w-[520px]"
        >
          <button
            type="button"
            onClick={() => (step === 'options' ? window.history.back() : setStep('options'))}
            className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#12051F] shadow-[0_14px_34px_rgba(18,5,31,0.08)] transition hover:-translate-x-0.5"
            aria-label="Volver"
          >
            <ArrowLeft size={24} />
          </button>

          <div className="rounded-[36px] border border-white/70 bg-white/86 p-6 shadow-[0_24px_80px_rgba(18,5,31,0.12)] backdrop-blur md:p-8">
            <div className="mb-7 flex items-center justify-between gap-4">
              <div>
                <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#FFF6B8] px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-[#3B2B00]">
                  <Zap size={14} /> Acceso seguro
                </p>
                <h2 className="text-3xl font-black leading-tight md:text-4xl">
                  {step === 'code' ? 'Verifica tu correo' : step === 'email' ? 'Correo electronico' : 'Bienvenido'}
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#686174]">
                  {step === 'code'
                    ? 'Escribe el codigo que acabamos de enviarte.'
                    : step === 'email'
                      ? isRegistering
                        ? 'Crea tu cuenta y valida tu correo con un codigo.'
                        : 'Ingresa con tu correo y clave.'
                      : 'Elige como quieres entrar a RayoExpress.'}
                </p>
              </div>
              <img src={logo} alt="RayoExpress" className="h-14 w-14 rounded-2xl bg-[#F2EEFF] p-2" />
            </div>

            {step === 'options' ? (
              <div className="grid gap-3">
                <button
                  type="button"
                  onClick={loginWithGoogle}
                  disabled={googleLoading}
                  className="flex h-14 items-center justify-between rounded-[20px] border border-[#DCD7EA] bg-white px-4 text-left font-extrabold text-[#12051F] shadow-sm transition hover:border-[#4514D8]/35 hover:shadow-[0_14px_34px_rgba(18,5,31,0.08)] disabled:cursor-wait"
                >
                  <span className="flex items-center gap-3">
                    {googleLoading ? <Loader2 size={20} className="animate-spin text-[#4514D8]" /> : <GoogleMark />}
                    Continuar con Google
                  </span>
                  <ArrowRight size={20} />
                </button>

                <button
                  type="button"
                  onClick={() => startEmailFlow(false)}
                  className="flex h-14 items-center justify-between rounded-[20px] bg-[#4514D8] px-4 text-left font-extrabold text-white shadow-[0_14px_34px_rgba(69,20,216,0.22)] transition hover:bg-[#3710B8]"
                >
                  <span className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FFE83D] text-[#12051F]">
                      <Mail size={18} />
                    </span>
                    Correo electronico
                  </span>
                  <ArrowRight size={20} />
                </button>

                <button
                  type="button"
                  onClick={() => startEmailFlow(true)}
                  className="mt-2 rounded-[20px] bg-[#F1EEFF] px-4 py-4 text-center text-sm font-extrabold text-[#4514D8] transition hover:bg-[#E8E0FF]"
                >
                  Crear cuenta nueva
                </button>

                <div className="mt-5 flex items-start gap-3 rounded-[24px] bg-[#F6F5FA] p-4">
                  <ShieldCheck size={22} className="mt-0.5 text-[#4514D8]" />
                  <p className="text-sm leading-6 text-[#686174]">
                    Google entra directo. El registro por correo se activa solo cuando el codigo enviado coincide.
                  </p>
                </div>
              </div>
            ) : null}

            {step === 'email' ? (
              <div className="grid gap-4">
                <div className="grid grid-cols-2 rounded-[22px] bg-[#F1EEFF] p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegistering(false);
                      resetMessages();
                    }}
                    className={`h-11 rounded-[18px] text-sm font-black transition ${!isRegistering ? 'bg-white text-[#4514D8] shadow-sm' : 'text-[#6D6681]'}`}
                  >
                    Ingresar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegistering(true);
                      resetMessages();
                    }}
                    className={`h-11 rounded-[18px] text-sm font-black transition ${isRegistering ? 'bg-white text-[#4514D8] shadow-sm' : 'text-[#6D6681]'}`}
                  >
                    Registrarme
                  </button>
                </div>

                {isRegistering ? (
                  <Field icon={<UserRound size={20} />} label="Nombre">
                    <input
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      placeholder="Tu nombre completo"
                      className="mt-1 w-full bg-transparent text-base font-bold text-[#12051F] outline-none placeholder:text-[#9A94AA]"
                    />
                  </Field>
                ) : null}

                <Field icon={<Mail size={20} />} label="Correo">
                  <input
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="correo@ejemplo.com"
                    type="email"
                    autoComplete="email"
                    className="mt-1 w-full bg-transparent text-base font-bold text-[#12051F] outline-none placeholder:text-[#9A94AA]"
                  />
                </Field>

                <Field icon={<LockKeyhole size={20} />} label="Clave">
                  <input
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Minimo 6 caracteres"
                    type="password"
                    autoComplete={isRegistering ? 'new-password' : 'current-password'}
                    className="mt-1 w-full bg-transparent text-base font-bold text-[#12051F] outline-none placeholder:text-[#9A94AA]"
                  />
                </Field>

                {isRegistering ? (
                  <Field icon={<LockKeyhole size={20} />} label="Confirmar clave">
                    <input
                      value={passwordConfirm}
                      onChange={(event) => setPasswordConfirm(event.target.value)}
                      placeholder="Repite tu clave"
                      type="password"
                      autoComplete="new-password"
                      className="mt-1 w-full bg-transparent text-base font-bold text-[#12051F] outline-none placeholder:text-[#9A94AA]"
                    />
                  </Field>
                ) : null}

                <PrimaryButton
                  onClick={isRegistering ? sendEmailCode : signInWithEmail}
                  disabled={isRegistering ? !canSendCode : !canLoginWithEmail}
                  loading={loading}
                >
                  {isRegistering ? 'Enviar codigo' : 'Iniciar sesion'}
                </PrimaryButton>
              </div>
            ) : null}

            {step === 'code' ? (
              <div className="grid gap-4">
                <div className="rounded-[24px] bg-[#F1EEFF] p-4">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-[#6D6681]">Correo</p>
                  <p className="mt-1 truncate text-base font-extrabold text-[#12051F]">{normalizedEmail}</p>
                </div>

                <Field icon={<Sparkles size={20} />} label="Codigo">
                  <input
                    value={cleanCode}
                    onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, OTP_MAX_LENGTH))}
                    placeholder="00000000"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    className="mt-1 w-full bg-transparent text-2xl font-black tracking-[0.24em] text-[#12051F] outline-none placeholder:tracking-normal placeholder:text-[#9A94AA]"
                  />
                </Field>

                <PrimaryButton onClick={verifyEmailCode} disabled={cleanCode.length < OTP_MIN_LENGTH} loading={loading}>
                  Verificar codigo
                </PrimaryButton>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setStep('email')}
                    className="h-12 rounded-[20px] bg-[#F6F5FA] text-sm font-extrabold text-[#12051F] transition hover:bg-[#ECE8F8]"
                  >
                    Cambiar correo
                  </button>
                  <button
                    type="button"
                    onClick={sendEmailCode}
                    disabled={loading}
                    className="h-12 rounded-[20px] bg-[#FFF6B8] text-sm font-extrabold text-[#3B2B00] transition hover:bg-[#FFE83D] disabled:opacity-60"
                  >
                    Reenviar
                  </button>
                </div>
              </div>
            ) : null}

            {notice ? (
              <div className="mt-5 rounded-[20px] border border-[#BFEEDC] bg-[#ECFFF7] px-4 py-3 text-sm font-bold text-[#147B55]">
                {notice}
              </div>
            ) : null}

            {error ? (
              <div className="mt-5 rounded-[20px] border border-[#FFD3D3] bg-[#FFF3F3] px-4 py-3 text-sm font-bold text-[#9F1D1D]">
                {error}
              </div>
            ) : null}

          </div>

          <p className="mx-auto mt-5 max-w-md text-center text-xs font-semibold leading-5 text-[#827B91]">
            Al continuar aceptas entrar de forma segura a RayoExpress. Las cuentas de tiendas y repartidores se validan desde el panel correspondiente.
          </p>
        </motion.section>
      </div>

      <div
        className="pointer-events-none fixed bottom-0 left-0 right-0 h-24"
        style={{ background: `linear-gradient(180deg, transparent, ${brand.surface})` }}
      />
    </main>
  );
}
