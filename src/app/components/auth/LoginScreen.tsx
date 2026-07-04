import { useState } from 'react';
import { motion } from 'motion/react';
import { Eye, EyeOff, Phone, Mail, Zap, ArrowRight, Info } from 'lucide-react';
import { isSupabaseReady, supabase } from '../../../integrations/supabase/client';
import { useAuth } from '../../../modules/auth/context/AuthContext';
import { sendPasswordReset } from '../../../modules/auth/application/auth-service';
import { hashText, isSecurePassword } from '../../../shared/validation';
import type { Role } from '../../../shared/types';
import logo from '../../../imports/image-1.png';

const roles: { id: Role; label: string; icon: string; desc: string }[] = [
  { id: 'customer', label: 'Cliente', icon: '👤', desc: 'Pide lo que quieras' },
  { id: 'driver', label: 'Repartidor', icon: '🛵', desc: 'Reparte y gana' },
  { id: 'store', label: 'Tienda', icon: '🏪', desc: 'Vende más' },
];

const mockDemoAccounts = [
  { role: 'customer' as Role, email: 'customer@rayo.com', password: 'customer123', label: 'Cliente', icon: '👤' },
  { role: 'driver' as Role, email: 'driver@rayo.com', password: 'driver123', label: 'Repartidor', icon: '🛵' },
  { role: 'store' as Role, email: 'store@rayo.com', password: 'store123', label: 'Tienda', icon: '🏪' },
];

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
  const [securityQuestion, setSecurityQuestion] = useState('¿Cuál es el nombre de tu primera mascota?');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const loginWithProvider = async (provider: 'google' | 'facebook') => {
    if (!supabase) return setError('No disponible en modo demo');
    setError('');
    await supabase.auth.signInWithOAuth({ provider });
  };

  const handleMockLogin = async (email: string, password: string) => {
    setError('');
    setLoading(true);
    try {
      const role = await mockLogin(email, password);
      if (!role) {
        setError('Credenciales inválidas. Usa las cuentas demo de abajo.');
      }
    } catch {
      setError('Error al iniciar sesión');
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
        if (!fullName.trim()) throw new Error('Ingresa tu nombre completo');
        if (password !== confirmPassword) throw new Error('Las contraseñas no coinciden');
        if (!isSecurePassword(password)) throw new Error('La contraseña debe tener 8+ caracteres, mayúscula, minúscula, número y carácter especial');
        if (!securityAnswer.trim()) throw new Error('Responde tu pregunta de seguridad');

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
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const sendOtp = async () => {
    if (!isSupabaseReady) return setError('No disponible en modo demo. Usa email.');
    if (!supabase) return setError('Configura Supabase en .env');
    setError('');
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ phone: `+593${phone.replace(/\D/g, '')}` });
      if (error) throw error;
      setOtpSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al enviar OTP');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!isSupabaseReady) return setError('No disponible en modo demo');
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
      setError(err instanceof Error ? err.message : 'Error al verificar OTP');
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    if (!recoveryEmail) return setError('Ingresa tu correo');
    setError('');
    setLoading(true);
    try {
      await sendPasswordReset(recoveryEmail);
      alert('Correo de recuperación enviado. Revisa tu bandeja de entrada.');
      setRecoveryMode(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error en recuperación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col md:flex-row md:items-center md:justify-center relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg, var(--brand) 0%, var(--brand-dark) 100%)' }}
    >
      <div
        className="absolute top-0 right-0 w-48 h-48 md:w-96 md:h-96 rounded-full opacity-20"
        style={{ background: 'radial-gradient(circle, #FFD400, transparent)', transform: 'translate(30%, -30%)' }}
      />
      <div
        className="absolute top-20 left-0 w-32 h-32 md:w-64 md:h-64 rounded-full opacity-10"
        style={{ background: 'radial-gradient(circle, #ffffff, transparent)', transform: 'translate(-40%, 0)' }}
      />

      <div className="flex flex-col items-center pt-12 md:pt-0 pb-2 px-6 relative z-10 md:pr-12">
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, type: 'spring' }}
        >
          <img src={logo} alt="Rayo Express" className="w-24 h-24 md:w-32 md:h-32 object-contain rounded-2xl" />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center mt-2"
        >
          <p className="text-white/60 text-sm tracking-widest uppercase">Tu delivery de confianza</p>
        </motion.div>
      </div>

      <motion.div
        className="flex-1 md:flex-none md:w-[480px] bg-card rounded-t-3xl md:rounded-3xl px-5 pt-6 pb-8 md:pb-6 relative z-10 md:shadow-2xl md:max-h-[90vh] md:overflow-y-auto"
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.5, type: 'spring' }}
      >
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {roles.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelectedRole(r.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm whitespace-nowrap flex-shrink-0 transition-all ${
                selectedRole === r.id ? 'text-white shadow-md' : 'bg-surface-hover text-text-secondary'
              }`}
              style={selectedRole === r.id ? { backgroundColor: 'var(--brand)' } : {}}
            >
              <span>{r.icon}</span>
              <span>{r.label}</span>
            </button>
          ))}
        </div>

        <h2 className="text-text-primary mb-1">
          {recoveryMode ? 'Recuperar contraseña' : isRegister ? 'Crear cuenta gratis' : 'Iniciar sesión'}
        </h2>
        <p className="text-text-secondary text-sm mb-3">
          {isRegister ? `Crear cuenta · ${roles.find((r) => r.id === selectedRole)?.desc}` : roles.find((r) => r.id === selectedRole)?.desc}
        </p>

        {error && (
          <div className="bg-danger-light border border-red-200 rounded-xl px-4 py-3 mb-4">
            <p className="text-danger text-sm">{error}</p>
          </div>
        )}

        {/* Demo mode banner */}
        {!isSupabaseReady && !recoveryMode && (
          <div className="bg-warning-light border border-amber-200 rounded-xl px-4 py-3 mb-4 flex items-start gap-2">
            <Info size={15} className="text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-amber-800">
              <p className="font-semibold mb-1">Modo demo — Sin base de datos</p>
              <p>Usa las cuentas demo de abajo para ingresar.</p>
            </div>
          </div>
        )}

        {!isSupabaseReady ? (
          <>
            <div className="space-y-3 mb-4">
              <div className="bg-surface rounded-xl px-4 py-3">
                <p className="text-xs text-text-secondary mb-1">Correo electrónico</p>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="correo@ejemplo.com"
                  className="w-full bg-transparent text-text-primary outline-none placeholder:text-text-secondary text-sm"
                />
              </div>
              <div className="bg-surface rounded-xl px-4 py-3 flex items-center">
                <div className="flex-1">
                  <p className="text-xs text-text-secondary mb-1">Contraseña</p>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-transparent text-text-primary outline-none placeholder:text-text-secondary text-sm"
                  />
                </div>
                <button onClick={() => setShowPassword(!showPassword)} className="text-text-secondary ml-2 flex-shrink-0">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <motion.button
                onClick={loginWithEmail}
                disabled={loading}
                className="w-full py-4 rounded-2xl text-white shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ backgroundColor: 'var(--brand)' }}
                whileTap={{ scale: 0.98 }}
              >
                <Zap size={17} style={{ color: '#FFD400' }} fill="#FFD400" />
                {loading ? 'Ingresando...' : 'Ingresar'}
                <ArrowRight size={16} />
              </motion.button>
            </div>

            <div className="border-t border-border-light pt-4">
              <p className="text-xs text-text-secondary text-center mb-3 font-medium">CUENTAS DE DEMO</p>
              <div className="grid grid-cols-2 gap-2">
                {mockDemoAccounts.map((acc) => (
                  <button
                    key={acc.role}
                    onClick={() => {
                      setEmail(acc.email);
                      setPassword(acc.password);
                      setSelectedRole(acc.role);
                    }}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-left text-xs transition-all ${
                      selectedRole === acc.role ? 'ring-2 ring-brand bg-brand-light' : 'bg-surface hover:bg-surface-hover'
                    }`}
                  >
                    <span className="text-lg">{acc.icon}</span>
                    <div>
                      <p className="font-semibold text-text-primary">{acc.label}</p>
                      <p className="text-[10px] text-text-secondary mt-0.5">{acc.email}</p>
                    </div>
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-text-secondary text-center mt-2">Selecciona una cuenta y presiona Ingresar</p>
            </div>
          </>
        ) : (
          <>
        <div className="flex gap-3 mb-5">
          <button onClick={() => loginWithProvider('google')} disabled={loading} className="flex-1 flex items-center justify-center gap-2 border border-border rounded-xl py-3 hover:bg-surface-hover transition-colors text-sm text-text-secondary">
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Google
          </button>
          <button onClick={() => loginWithProvider('facebook')} disabled={loading} className="flex-1 flex items-center justify-center gap-2 border border-border rounded-xl py-3 hover:bg-surface-hover transition-colors text-sm text-text-secondary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#1877F2">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
            Facebook
          </button>
        </div>

        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-border" />
          <span className="text-text-secondary text-xs">o continúa con</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <div className="flex bg-surface-hover rounded-xl p-1 mb-4">
          <button
            onClick={() => setTab('email')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm transition-all ${tab === 'email' ? 'bg-card shadow-sm text-text-primary' : 'text-text-secondary'}`}
          >
            <Mail size={14} />
            Email
          </button>
          <button
            onClick={() => setTab('phone')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm transition-all ${tab === 'phone' ? 'bg-card shadow-sm text-text-primary' : 'text-text-secondary'}`}
          >
            <Phone size={14} />
            Teléfono
          </button>
        </div>

        {recoveryMode ? (
          <div className="space-y-3">
            <div className="bg-surface rounded-xl px-4 py-3">
              <p className="text-xs text-text-secondary mb-1">Correo electrónico</p>
              <input
                type="email"
                value={recoveryEmail}
                onChange={(e) => setRecoveryEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
                className="w-full bg-transparent text-text-primary outline-none placeholder:text-text-secondary text-sm"
              />
            </div>
            <button
              onClick={resetPassword}
              disabled={loading}
              className="w-full py-3 rounded-xl text-white text-sm font-medium disabled:opacity-50"
              style={{ backgroundColor: 'var(--brand)' }}
            >
              {loading ? 'Enviando...' : 'Enviar correo de recuperación'}
            </button>
          </div>
        ) : tab === 'email' ? (
          <div className="space-y-3">
            {isRegister && (
              <div className="bg-surface rounded-xl px-4 py-3">
                <p className="text-xs text-text-secondary mb-1">Nombre completo</p>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Tu nombre completo"
                  className="w-full bg-transparent text-text-primary outline-none placeholder:text-text-secondary text-sm"
                />
              </div>
            )}
            <div className="bg-surface rounded-xl px-4 py-3">
              <p className="text-xs text-text-secondary mb-1">Correo electrónico</p>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
                className="w-full bg-transparent text-text-primary outline-none placeholder:text-text-secondary text-sm"
              />
            </div>
            <div className="bg-surface rounded-xl px-4 py-3 flex items-center">
              <div className="flex-1">
                <p className="text-xs text-text-secondary mb-1">Contraseña</p>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-transparent text-text-primary outline-none placeholder:text-text-secondary text-sm"
                />
              </div>
              <button onClick={() => setShowPassword(!showPassword)} className="text-text-secondary ml-2 flex-shrink-0">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {isRegister && (
              <>
                <div className="bg-surface rounded-xl px-4 py-3">
                  <p className="text-xs text-text-secondary mb-1">Confirmar contraseña</p>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-transparent text-text-primary outline-none placeholder:text-text-secondary text-sm"
                  />
                </div>
                <div className="bg-surface rounded-xl px-4 py-3">
                  <p className="text-xs text-text-secondary mb-1">Pregunta de seguridad</p>
                  <select
                    value={securityQuestion}
                    onChange={(e) => setSecurityQuestion(e.target.value)}
                    className="w-full bg-transparent text-text-primary outline-none text-sm"
                  >
                    <option>¿Cuál es el nombre de tu primera mascota?</option>
                    <option>¿En qué ciudad naciste?</option>
                    <option>¿Cuál fue tu primera escuela?</option>
                  </select>
                </div>
                <div className="bg-surface rounded-xl px-4 py-3">
                  <p className="text-xs text-text-secondary mb-1">Respuesta de seguridad</p>
                  <input
                    type="text"
                    value={securityAnswer}
                    onChange={(e) => setSecurityAnswer(e.target.value)}
                    placeholder="Tu respuesta"
                    className="w-full bg-transparent text-text-primary outline-none placeholder:text-text-secondary text-sm"
                  />
                </div>
              </>
            )}
            <div className="flex justify-end">
              <button onClick={() => setRecoveryMode(true)} className="text-sm" style={{ color: 'var(--brand)' }}>
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-surface rounded-xl px-4 py-3 flex items-center gap-2">
              <span className="text-sm text-text-secondary flex-shrink-0">🇪🇨 +593</span>
              <div className="w-px h-5 bg-border flex-shrink-0" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="98 765 4321"
                className="flex-1 bg-transparent text-text-primary outline-none placeholder:text-text-secondary text-sm"
              />
            </div>
            {!otpSent ? (
              <button
                onClick={sendOtp}
                disabled={loading}
                className="w-full py-3 rounded-xl border-2 text-sm font-medium transition-colors disabled:opacity-50"
                style={{ borderColor: 'var(--brand)', color: 'var(--brand)' }}
              >
                {loading ? 'Enviando...' : 'Enviar código OTP'}
              </button>
            ) : (
              <div className="bg-surface rounded-xl px-4 py-3">
                <p className="text-xs text-text-secondary mb-1">Código OTP</p>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="123456"
                  maxLength={6}
                  className="w-full bg-transparent text-text-primary outline-none placeholder:text-text-secondary text-sm tracking-widest"
                />
              </div>
            )}
          </div>
        )}

        {!recoveryMode && (
          <motion.button
            onClick={tab === 'email' ? loginWithEmail : verifyOtp}
            disabled={loading}
            className="w-full mt-5 py-4 rounded-2xl text-white shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ backgroundColor: 'var(--brand)' }}
            whileTap={{ scale: 0.98 }}
          >
            <Zap size={17} style={{ color: '#FFD400' }} fill="#FFD400" />
            {loading ? 'Procesando...' : isRegister ? 'Registrarse gratis' : `Ingresar como ${roles.find((r) => r.id === selectedRole)?.label}`}
            <ArrowRight size={16} />
          </motion.button>
        )} {/* end of !isSupabaseReady else block */}
          </>
        )}

        {isSupabaseReady && (
        <p className="text-center text-sm text-text-secondary mt-4">
          {recoveryMode ? (
            <button onClick={() => setRecoveryMode(false)} className="font-medium" style={{ color: 'var(--brand)' }}>
              Volver a inicio de sesión
            </button>
          ) : (
            <>
              ¿No tienes cuenta?{' '}
              <button
                type="button"
                onClick={() => setIsRegister((prev) => !prev)}
                className="cursor-pointer font-medium"
                style={{ color: 'var(--brand)' }}
              >
                {isRegister ? 'Volver a iniciar sesión' : 'Regístrate gratis'}
              </button>
            </>
          )}
        </p>
        )}

        <p className="text-center text-xs text-text-secondary mt-4">
          Al continuar aceptas nuestros{' '}
          <span className="underline cursor-pointer">Términos de uso</span> y{' '}
          <span className="underline cursor-pointer">Política de privacidad</span>
        </p>
      </motion.div>
    </div>
  );
}
