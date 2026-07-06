import { useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  Bike,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  Headphones,
  Info,
  KeyRound,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  UserRound,
  Zap,
} from 'lucide-react';
import { isSupabaseReady, supabase } from '../../../integrations/supabase/client';
import { useAuth } from '../../../modules/auth/context/AuthContext';
import { sendPasswordReset } from '../../../modules/auth/application/auth-service';
import { hashText, isSecurePassword } from '../../../shared/validation';
import type { Role } from '../../../shared/types';
import logo from '../../../imports/image-1.png';

const roles: {
  id: Role;
  label: string;
  desc: string;
  Icon: typeof ShoppingBag;
}[] = [
  { id: 'customer', label: 'Cliente', desc: 'Compra y sigue tus pedidos en tiempo real.', Icon: ShoppingBag },
  { id: 'driver', label: 'Repartidor', desc: 'Recibe entregas y administra tu ruta.', Icon: Bike },
  { id: 'store', label: 'Tienda', desc: 'Gestiona ventas, productos y pedidos.', Icon: Store },
];

const mockDemoAccounts = [
  { role: 'customer' as Role, email: 'customer@rayo.com', password: 'customer123', label: 'Cliente', Icon: ShoppingBag },
  { role: 'driver' as Role, email: 'driver@rayo.com', password: 'driver123', label: 'Repartidor', Icon: Bike },
  { role: 'store' as Role, email: 'store@rayo.com', password: 'store123', label: 'Tienda', Icon: Store },
];

const securityQuestions = [
  'Cual es el nombre de tu primera mascota?',
  'En que ciudad naciste?',
  'Cual fue tu primera escuela?',
];

function GoogleMark() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function FieldShell({
  icon,
  label,
  children,
  trailing,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  trailing?: React.ReactNode;
}) {
  return (
    <label className="flex items-center gap-3 rounded-[22px] border border-black/5 bg-[#F5F5F7] px-4 py-3.5 transition focus-within:border-[#EC0055]/30 focus-within:bg-white focus-within:shadow-[0_12px_34px_rgba(17,10,35,0.08)]">
      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-white text-[#12051F] shadow-sm">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#77727F]">{label}</span>
        {children}
      </span>
      {trailing}
    </label>
  );
}

export function LoginScreen() {
  const { login, mockLogin } = useAuth();
  const [tab, setTab] = useState<'email' | 'phone'>('email');
  const [selectedRole, setSelectedRole] = useState<Role>('customer');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState(securityQuestions[0]);
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | null>(null);

  const activeRole = roles.find((role) => role.id === selectedRole) ?? roles[0];
  const primaryActionLabel = isRegister ? 'Crear cuenta' : 'Ingresar';

  const loginWithProvider = async (provider: 'google') => {
    if (!supabase) return setError('Google no esta disponible en modo demo.');
    setError('');
    setOauthLoading(provider);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo conectar con Google.');
    } finally {
      setOauthLoading(null);
    }
  };

  const handleMockLogin = async (mockEmail: string, mockPassword: string) => {
    setError('');
    setLoading(true);
    try {
      const role = await mockLogin(mockEmail, mockPassword);
      if (!role) {
        setError('Credenciales invalidas. Usa una cuenta demo o revisa tus datos.');
      }
    } catch {
      setError('Error al iniciar sesion.');
    } finally {
      setLoading(false);
    }
  };

  const loginWithEmail = async () => {
    setError('');
    setLoading(true);
    try {
      if (!isSupabaseReady) {
        await handleMockLogin(email, password);
        return;
      }
      if (!supabase) throw new Error('Configura Supabase en .env');

      if (isRegister) {
        if (!fullName.trim()) throw new Error('Ingresa tu nombre completo.');
        if (password !== confirmPassword) throw new Error('Las contrasenas no coinciden.');
        if (!isSecurePassword(password)) throw new Error('La contrasena debe tener 8+ caracteres, mayuscula, minuscula, numero y caracter especial.');
        if (!securityAnswer.trim()) throw new Error('Responde tu pregunta de seguridad.');

        const answerHash = await hashText(securityAnswer);
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              security_question: securityQuestion,
              security_answer_hash: answerHash,
            },
          },
        });
        if (signUpError) throw signUpError;
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
      }

      await login(selectedRole);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error desconocido.');
    } finally {
      setLoading(false);
    }
  };

  const sendOtp = async () => {
    if (!isSupabaseReady) return setError('El ingreso por telefono no esta disponible en modo demo.');
    if (!supabase) return setError('Configura Supabase en .env');
    setError('');
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ phone: `+593${phone.replace(/\D/g, '')}` });
      if (error) throw error;
      setOtpSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al enviar el codigo.');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!isSupabaseReady) return setError('No disponible en modo demo.');
    if (!supabase) return setError('Configura Supabase en .env');
    setError('');
    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        phone: `+593${phone.replace(/\D/g, '')}`,
        token: otp,
        type: 'sms',
      });
      if (error) throw error;
      await login(selectedRole);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al verificar el codigo.');
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    if (!recoveryEmail) return setError('Ingresa tu correo.');
    setError('');
    setLoading(true);
    try {
      await sendPasswordReset(recoveryEmail);
      window.alert('Correo de recuperacion enviado. Revisa tu bandeja de entrada.');
      setRecoveryMode(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error en recuperacion.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F6F6F8] text-[#12051F] md:flex md:items-center md:justify-center md:p-6">
      <section className="relative mx-auto flex min-h-screen w-full max-w-[1180px] flex-col overflow-hidden bg-white shadow-none md:min-h-[820px] md:grid-cols-[0.92fr_1.08fr] md:flex-row md:rounded-[34px] md:shadow-[0_32px_100px_rgba(17,10,35,0.16)]">
        <div className="relative overflow-hidden bg-[#EC0055] px-6 pb-28 pt-8 text-white md:flex md:w-[44%] md:flex-col md:px-10 md:pb-10">
          <div className="absolute inset-0 opacity-20" style={{ background: 'radial-gradient(circle at 25% 15%, #FFFFFF 0, transparent 28%), radial-gradient(circle at 82% 74%, #53EBC4 0, transparent 26%)' }} />
          <div className="relative z-10 flex items-center justify-between">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-white/16 text-white backdrop-blur"
              aria-label="Volver"
            >
              <ArrowLeft size={22} />
            </button>
            <div className="flex items-center gap-2 rounded-full bg-white/16 px-3 py-2 text-sm font-semibold backdrop-blur">
              <ShieldCheck size={16} />
              Acceso seguro
            </div>
          </div>

          <div className="relative z-10 mt-10 md:mt-24">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-[26px] bg-white shadow-[0_18px_48px_rgba(18,5,31,0.18)]">
              <img src={logo} alt="Rayo Express" className="h-14 w-14 object-contain" />
            </div>
            <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/16 px-3 py-1.5 text-sm font-semibold backdrop-blur">
              <Sparkles size={15} />
              Delivery, super y pedidos en un solo lugar
            </p>
            <h1 className="max-w-[460px] text-[36px] font-black leading-[1.02] tracking-normal md:text-[46px]">
              Entra a RayoExpress sin perder el ritmo.
            </h1>
            <p className="mt-4 max-w-[430px] text-[16px] leading-7 text-white/88">
              Gestiona tus pedidos, direcciones, cupones y seguimiento en tiempo real con una cuenta lista para crecer.
            </p>
          </div>

          <div className="relative z-10 mt-8 hidden grid-cols-3 gap-3 md:grid">
            {[
              { label: 'Pedidos', value: '24/7' },
              { label: 'Soporte', value: 'En linea' },
              { label: 'Estado', value: 'En vivo' },
            ].map((item) => (
              <div key={item.label} className="rounded-[22px] bg-white/14 p-4 backdrop-blur">
                <p className="text-lg font-black">{item.value}</p>
                <p className="mt-1 text-xs font-semibold text-white/72">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        <motion.div
          className="relative z-20 -mt-20 flex-1 rounded-t-[34px] bg-white px-5 pb-8 pt-5 md:mt-0 md:flex md:items-center md:rounded-none md:px-10 md:py-10"
          initial={{ y: 32, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.45, type: 'spring' }}
        >
          <div className="mx-auto w-full max-w-[520px]">
            <div className="mx-auto mb-5 h-1.5 w-14 rounded-full bg-[#DDDDE3] md:hidden" />

            <div className="mb-5">
              <p className="text-sm font-bold text-[#EC0055]">
                {recoveryMode ? 'Recuperacion de acceso' : isRegister ? 'Registro de cuenta' : 'Bienvenido de nuevo'}
              </p>
              <h2 className="mt-1 text-[30px] font-black leading-tight tracking-normal">
                {recoveryMode ? 'Recupera tu cuenta' : isRegister ? 'Crea tu perfil' : 'Inicia sesion'}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#69636F]">
                {recoveryMode
                  ? 'Te enviaremos un enlace para restablecer tu contrasena.'
                  : isRegister
                    ? activeRole.desc
                    : 'Continua con Google o ingresa con tus credenciales.'}
              </p>
            </div>

            {!recoveryMode && (
              <div className="mb-5 grid grid-cols-2 rounded-[22px] bg-[#F0F0F3] p-1.5">
                <button
                  type="button"
                  onClick={() => setIsRegister(false)}
                  className={`rounded-[18px] py-3 text-sm font-black transition ${!isRegister ? 'bg-white text-[#12051F] shadow-sm' : 'text-[#77727F]'}`}
                >
                  Ingresar
                </button>
                <button
                  type="button"
                  onClick={() => setIsRegister(true)}
                  className={`rounded-[18px] py-3 text-sm font-black transition ${isRegister ? 'bg-white text-[#12051F] shadow-sm' : 'text-[#77727F]'}`}
                >
                  Registrarme
                </button>
              </div>
            )}

            {!recoveryMode && (
              <div className="mb-5 grid grid-cols-3 gap-2">
                {roles.map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSelectedRole(id)}
                    className={`flex min-h-[82px] flex-col items-center justify-center gap-2 rounded-[22px] border px-2 text-center text-xs font-black transition ${
                      selectedRole === id
                        ? 'border-[#EC0055] bg-[#FFF0F5] text-[#EC0055] shadow-[0_12px_30px_rgba(236,0,85,0.12)]'
                        : 'border-transparent bg-[#F5F5F7] text-[#12051F]'
                    }`}
                  >
                    <Icon size={22} />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            )}

            {error && (
              <div className="mb-4 rounded-[20px] border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {error}
              </div>
            )}

            {!isSupabaseReady && !recoveryMode && (
              <div className="mb-4 flex items-start gap-3 rounded-[22px] border border-amber-100 bg-[#FFF8E2] px-4 py-3 text-sm text-[#6F5200]">
                <Info size={18} className="mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-black">Modo demo activo</p>
                  <p className="mt-1 text-xs leading-5">Puedes probar el app con las cuentas demo de abajo.</p>
                </div>
              </div>
            )}

            {recoveryMode ? (
              <div className="space-y-4">
                <FieldShell icon={<Mail size={19} />} label="Correo">
                  <input
                    type="email"
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    placeholder="correo@ejemplo.com"
                    className="w-full bg-transparent text-[15px] font-semibold text-[#12051F] outline-none placeholder:text-[#9B97A2]"
                  />
                </FieldShell>
                <button
                  type="button"
                  onClick={resetPassword}
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-[26px] bg-[#EC0055] py-4 text-base font-black text-white shadow-[0_18px_44px_rgba(236,0,85,0.25)] disabled:opacity-55"
                >
                  {loading ? 'Enviando...' : 'Enviar enlace'}
                  <ArrowRight size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => setRecoveryMode(false)}
                  className="w-full rounded-[22px] bg-[#F5F5F7] py-3 text-sm font-black text-[#12051F]"
                >
                  Volver al login
                </button>
              </div>
            ) : (
              <>
                {isSupabaseReady && (
                  <>
                    <button
                      type="button"
                      onClick={() => loginWithProvider('google')}
                      disabled={loading || !!oauthLoading}
                      className="mb-4 flex w-full items-center justify-center gap-3 rounded-[24px] border border-black/8 bg-white py-4 text-sm font-black text-[#12051F] shadow-[0_12px_34px_rgba(17,10,35,0.08)] transition hover:bg-[#FAFAFB] disabled:opacity-55"
                    >
                      <GoogleMark />
                      {oauthLoading === 'google' ? 'Conectando...' : 'Continuar con Google'}
                    </button>

                    <div className="mb-4 flex items-center gap-3">
                      <span className="h-px flex-1 bg-[#ECECF0]" />
                      <span className="text-xs font-bold uppercase tracking-[0.1em] text-[#85808B]">o usa tus datos</span>
                      <span className="h-px flex-1 bg-[#ECECF0]" />
                    </div>

                    <div className="mb-4 grid grid-cols-2 rounded-[22px] bg-[#F0F0F3] p-1.5">
                      <button
                        type="button"
                        onClick={() => setTab('email')}
                        className={`flex items-center justify-center gap-2 rounded-[18px] py-3 text-sm font-black transition ${tab === 'email' ? 'bg-white text-[#12051F] shadow-sm' : 'text-[#77727F]'}`}
                      >
                        <Mail size={16} />
                        Email
                      </button>
                      <button
                        type="button"
                        onClick={() => setTab('phone')}
                        className={`flex items-center justify-center gap-2 rounded-[18px] py-3 text-sm font-black transition ${tab === 'phone' ? 'bg-white text-[#12051F] shadow-sm' : 'text-[#77727F]'}`}
                      >
                        <Phone size={16} />
                        Telefono
                      </button>
                    </div>
                  </>
                )}

                <div className="space-y-3.5">
                  {tab === 'email' || !isSupabaseReady ? (
                    <>
                      {isRegister && (
                        <FieldShell icon={<UserRound size={19} />} label="Nombre completo">
                          <input
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Tu nombre completo"
                            className="w-full bg-transparent text-[15px] font-semibold text-[#12051F] outline-none placeholder:text-[#9B97A2]"
                          />
                        </FieldShell>
                      )}
                      <FieldShell icon={<Mail size={19} />} label="Correo">
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="correo@ejemplo.com"
                          className="w-full bg-transparent text-[15px] font-semibold text-[#12051F] outline-none placeholder:text-[#9B97A2]"
                        />
                      </FieldShell>
                      <FieldShell
                        icon={<Lock size={19} />}
                        label="Contrasena"
                        trailing={
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-[#77727F]"
                            aria-label={showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
                          >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        }
                      >
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Tu contrasena"
                          className="w-full bg-transparent text-[15px] font-semibold text-[#12051F] outline-none placeholder:text-[#9B97A2]"
                        />
                      </FieldShell>

                      {isRegister && isSupabaseReady && (
                        <>
                          <FieldShell icon={<KeyRound size={19} />} label="Confirmar contrasena">
                            <input
                              type={showPassword ? 'text' : 'password'}
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              placeholder="Repite tu contrasena"
                              className="w-full bg-transparent text-[15px] font-semibold text-[#12051F] outline-none placeholder:text-[#9B97A2]"
                            />
                          </FieldShell>
                          <label className="block rounded-[22px] border border-black/5 bg-[#F5F5F7] px-4 py-3.5">
                            <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#77727F]">Pregunta de seguridad</span>
                            <select
                              value={securityQuestion}
                              onChange={(e) => setSecurityQuestion(e.target.value)}
                              className="w-full bg-transparent text-[15px] font-semibold text-[#12051F] outline-none"
                            >
                              {securityQuestions.map((question) => (
                                <option key={question}>{question}</option>
                              ))}
                            </select>
                          </label>
                          <FieldShell icon={<ShieldCheck size={19} />} label="Respuesta">
                            <input
                              type="text"
                              value={securityAnswer}
                              onChange={(e) => setSecurityAnswer(e.target.value)}
                              placeholder="Tu respuesta privada"
                              className="w-full bg-transparent text-[15px] font-semibold text-[#12051F] outline-none placeholder:text-[#9B97A2]"
                            />
                          </FieldShell>
                        </>
                      )}

                      {isSupabaseReady && !isRegister && (
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => setRecoveryMode(true)}
                            className="text-sm font-black text-[#EC0055]"
                          >
                            Olvide mi contrasena
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <FieldShell icon={<Phone size={19} />} label="Telefono">
                        <div className="flex items-center gap-2">
                          <span className="text-[15px] font-black text-[#12051F]">+593</span>
                          <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="98 765 4321"
                            className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-[#12051F] outline-none placeholder:text-[#9B97A2]"
                          />
                        </div>
                      </FieldShell>
                      {!otpSent ? (
                        <button
                          type="button"
                          onClick={sendOtp}
                          disabled={loading}
                          className="w-full rounded-[24px] border-2 border-[#EC0055] py-3.5 text-sm font-black text-[#EC0055] disabled:opacity-55"
                        >
                          {loading ? 'Enviando...' : 'Enviar codigo'}
                        </button>
                      ) : (
                        <FieldShell icon={<KeyRound size={19} />} label="Codigo OTP">
                          <input
                            type="text"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            placeholder="123456"
                            maxLength={6}
                            className="w-full bg-transparent text-[15px] font-semibold tracking-[0.16em] text-[#12051F] outline-none placeholder:text-[#9B97A2]"
                          />
                        </FieldShell>
                      )}
                    </>
                  )}
                </div>

                <motion.button
                  type="button"
                  onClick={tab === 'email' || !isSupabaseReady ? loginWithEmail : verifyOtp}
                  disabled={loading}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-[28px] bg-[#EC0055] py-4 text-base font-black text-white shadow-[0_18px_44px_rgba(236,0,85,0.28)] disabled:opacity-55"
                  whileTap={{ scale: 0.98 }}
                >
                  <Zap size={18} fill="#FFE83D" className="text-[#FFE83D]" />
                  {loading ? 'Procesando...' : primaryActionLabel}
                  <ArrowRight size={18} />
                </motion.button>

                {!isSupabaseReady && (
                  <div className="mt-5 rounded-[26px] bg-[#F5F5F7] p-3">
                    <p className="mb-3 px-1 text-xs font-black uppercase tracking-[0.1em] text-[#77727F]">Cuentas demo</p>
                    <div className="grid gap-2">
                      {mockDemoAccounts.map(({ role, email: demoEmail, password: demoPassword, label, Icon }) => (
                        <button
                          key={role}
                          type="button"
                          onClick={() => {
                            setEmail(demoEmail);
                            setPassword(demoPassword);
                            setSelectedRole(role);
                          }}
                          className={`flex items-center gap-3 rounded-[20px] bg-white p-3 text-left shadow-sm transition ${
                            selectedRole === role ? 'ring-2 ring-[#EC0055]' : ''
                          }`}
                        >
                          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FFF0F5] text-[#EC0055]">
                            <Icon size={20} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-black text-[#12051F]">{label}</span>
                            <span className="block truncate text-xs font-semibold text-[#77727F]">{demoEmail}</span>
                          </span>
                          <CheckCircle2 size={18} className="text-[#19A974]" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="mt-5 grid grid-cols-3 gap-2 text-center">
              {[
                { label: 'Seguro', Icon: ShieldCheck },
                { label: 'Soporte', Icon: Headphones },
                { label: 'Socios', Icon: Building2 },
              ].map(({ label, Icon }) => (
                <div key={label} className="rounded-[18px] bg-[#F8F8FA] px-2 py-3">
                  <Icon size={17} className="mx-auto text-[#12051F]" />
                  <p className="mt-1 text-[11px] font-black text-[#77727F]">{label}</p>
                </div>
              ))}
            </div>

            <p className="mt-5 text-center text-xs leading-5 text-[#77727F]">
              Al continuar aceptas los terminos de uso y la politica de privacidad de RayoExpress.
            </p>
          </div>
        </motion.div>
      </section>
    </main>
  );
}
