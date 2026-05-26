import { useState } from 'react';
import { motion } from 'motion/react';
import { Eye, EyeOff, Phone, Mail, Zap, ArrowRight, ShieldCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Role } from '../../types';
import logo from '../../../imports/image-1.png';

interface LoginScreenProps {
  onLogin: (role: Role) => Promise<void>;
}

const roles: { id: Role; label: string; icon: string; desc: string }[] = [
  { id: 'customer', label: 'Cliente', icon: '👤', desc: 'Pide lo que quieras' },
  { id: 'driver', label: 'Repartidor', icon: '🛵', desc: 'Reparte y gana' },
  { id: 'store', label: 'Tienda', icon: '🏪', desc: 'Vende más' },
  { id: 'admin', label: 'Admin', icon: '⚡', desc: 'Administra todo' },
];

const recoveryQuestions = [
  '¿Nombre de tu primera mascota?',
  '¿Ciudad donde naciste?',
  '¿Nombre de tu escuela primaria?',
];

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [tab, setTab] = useState<'email' | 'phone'>('email');
  const [selectedRole, setSelectedRole] = useState<Role>('customer');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState(recoveryQuestions[0]);
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [isRegister, setIsRegister] = useState(false);

  const passwordIsStrong = (value: string) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/.test(value);

  const loginWithProvider = async (provider: 'google' | 'facebook') => {
    if (!supabase) return alert('Configura Supabase en .env');
    await supabase.auth.signInWithOAuth({ provider });
  };

  const loginWithEmail = async () => {
    if (!supabase) return alert('Configura Supabase en .env');

    if (isRegister) {
      if (!fullName.trim()) return alert('Ingresa tu nombre completo.');
      if (!passwordIsStrong(password)) return alert('La contraseña debe tener 8+ caracteres, mayúscula, minúscula, número y símbolo.');
      if (password !== confirmPassword) return alert('Las contraseñas no coinciden.');
      if (!securityAnswer.trim()) return alert('Responde la pregunta de seguridad.');

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: selectedRole,
            full_name: fullName,
            recovery_question: securityQuestion,
            recovery_answer: securityAnswer.trim(),
          },
        },
      });
      if (error) return alert(error.message);
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return alert(error.message);
    }

    await onLogin(selectedRole);
  };

  const sendOtp = async () => {
    if (!supabase) return alert('Configura Supabase en .env');
    const { error } = await supabase.auth.signInWithOtp({ phone: `+593${phone.replace(/\D/g, '')}` });
    if (error) return alert(error.message);
    setOtpSent(true);
  };

  const verifyOtp = async () => {
    if (!supabase) return alert('Configura Supabase en .env');
    const { error } = await supabase.auth.verifyOtp({ phone: `+593${phone.replace(/\D/g, '')}`, token: otp, type: 'sms' });
    if (error) return alert(error.message);
    await onLogin(selectedRole);
  };

  const resetPassword = async () => {
    if (!email) return alert('Ingresa tu correo para recuperar contraseña.');
    if (!supabase) return alert('Configura Supabase en .env');
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) return alert(error.message);
    alert('Correo de recuperación enviado.');
  };

  return (
    <div className="min-h-screen flex flex-col max-w-md lg:max-w-6xl mx-auto relative overflow-hidden" style={{ background: 'linear-gradient(160deg, #6D28D9 0%, #4C1D95 100%)' }}>
      <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #FFD400, transparent)', transform: 'translate(30%, -30%)' }} />
      <div className="absolute top-20 left-0 w-32 h-32 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #ffffff, transparent)', transform: 'translate(-40%, 0)' }} />

      <div className="flex flex-col items-center pt-12 pb-2 px-6 relative z-10">
        <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5, type: 'spring' }}>
          <img src={logo} alt="Rayo Express" className="w-24 h-24 object-contain rounded-2xl" />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="text-center mt-2">
          <p className="text-white/60 text-sm tracking-widest uppercase">Tu delivery de confianza</p>
        </motion.div>
      </div>

      <motion.div className="flex-1 bg-white rounded-t-3xl px-5 pt-6 pb-8 relative z-10" initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4, duration: 0.5, type: 'spring' }}>
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {roles.map((r) => (
            <button key={r.id} onClick={() => setSelectedRole(r.id)} className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm whitespace-nowrap flex-shrink-0 transition-all ${selectedRole === r.id ? 'text-white shadow-md' : 'bg-gray-100 text-gray-600'}`} style={selectedRole === r.id ? { backgroundColor: '#6D28D9' } : {}}>
              <span>{r.icon}</span><span>{r.label}</span>
            </button>
          ))}
        </div>

        <h2 className="text-gray-900 mb-1">{isRegister ? 'Crear cuenta segura' : 'Iniciar sesión'}</h2>
        <p className="text-gray-400 text-sm mb-5">{isRegister ? 'Registro seguro con validación y recuperación' : roles.find((r) => r.id === selectedRole)?.desc}</p>

        <div className="flex gap-3 mb-5">
          <button onClick={() => loginWithProvider('google')} className="flex-1 flex items-center justify-center gap-2 border border-gray-200 rounded-xl py-3 hover:bg-gray-50 transition-colors text-sm text-gray-600">Google</button>
          <button onClick={() => loginWithProvider('facebook')} className="flex-1 flex items-center justify-center gap-2 border border-gray-200 rounded-xl py-3 hover:bg-gray-50 transition-colors text-sm text-gray-600">Facebook</button>
        </div>

        <div className="flex items-center gap-3 mb-5"><div className="flex-1 h-px bg-gray-200" /><span className="text-gray-400 text-xs">o continúa con</span><div className="flex-1 h-px bg-gray-200" /></div>

        <div className="flex bg-gray-100 rounded-xl p-1 mb-4">
          <button onClick={() => setTab('email')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm transition-all ${tab === 'email' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}><Mail size={14} />Email</button>
          <button onClick={() => setTab('phone')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm transition-all ${tab === 'phone' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}><Phone size={14} />Teléfono</button>
        </div>

        {tab === 'email' ? (
          <div className="space-y-3">
            {isRegister && (
              <div className="bg-gray-50 rounded-xl px-4 py-3">
                <p className="text-xs text-gray-400 mb-1">Nombre completo</p>
                <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nombres y apellidos" className="w-full bg-transparent text-gray-900 outline-none placeholder:text-gray-400 text-sm" />
              </div>
            )}
            <div className="bg-gray-50 rounded-xl px-4 py-3"><p className="text-xs text-gray-400 mb-1">Correo electrónico</p><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@ejemplo.com" className="w-full bg-transparent text-gray-900 outline-none placeholder:text-gray-400 text-sm" /></div>
            <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center"><div className="flex-1"><p className="text-xs text-gray-400 mb-1">Contraseña</p><input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full bg-transparent text-gray-900 outline-none placeholder:text-gray-400 text-sm" /></div><button onClick={() => setShowPassword(!showPassword)} className="text-gray-400 ml-2 flex-shrink-0">{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div>

            {isRegister && (
              <>
                <div className="bg-gray-50 rounded-xl px-4 py-3"><p className="text-xs text-gray-400 mb-1">Confirmar contraseña</p><input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" className="w-full bg-transparent text-gray-900 outline-none placeholder:text-gray-400 text-sm" /></div>
                <div className="bg-gray-50 rounded-xl px-4 py-3"><p className="text-xs text-gray-400 mb-1">Pregunta de recuperación</p><select value={securityQuestion} onChange={(e) => setSecurityQuestion(e.target.value)} className="w-full bg-transparent text-gray-900 outline-none text-sm"><option>{recoveryQuestions[0]}</option><option>{recoveryQuestions[1]}</option><option>{recoveryQuestions[2]}</option></select></div>
                <div className="bg-gray-50 rounded-xl px-4 py-3"><p className="text-xs text-gray-400 mb-1">Respuesta de recuperación</p><input value={securityAnswer} onChange={(e) => setSecurityAnswer(e.target.value)} placeholder="Tu respuesta" className="w-full bg-transparent text-gray-900 outline-none placeholder:text-gray-400 text-sm" /></div>
                <div className="bg-green-50 rounded-xl px-3 py-2 flex items-center gap-2"><ShieldCheck size={14} className="text-green-600" /><p className="text-xs text-green-700">Contraseña segura: 8+ caracteres, mayúscula, minúscula, número y símbolo.</p></div>
              </>
            )}

            <div className="flex justify-end"><button onClick={resetPassword} className="text-sm" style={{ color: '#6D28D9' }}>¿Olvidaste tu contraseña?</button></div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center gap-2"><span className="text-sm text-gray-600 flex-shrink-0">🇪🇨 +593</span><div className="w-px h-5 bg-gray-200 flex-shrink-0" /><input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98 765 4321" className="flex-1 bg-transparent text-gray-900 outline-none placeholder:text-gray-400 text-sm" /></div>
            {!otpSent ? <button onClick={sendOtp} className="w-full py-3 rounded-xl border-2 text-sm font-medium transition-colors" style={{ borderColor: '#6D28D9', color: '#6D28D9' }}>Enviar código OTP</button> : <div className="bg-gray-50 rounded-xl px-4 py-3"><p className="text-xs text-gray-400 mb-1">Código OTP</p><input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="123456" maxLength={6} className="w-full bg-transparent text-gray-900 outline-none placeholder:text-gray-400 text-sm tracking-widest" /></div>}
          </div>
        )}

        <motion.button onClick={tab === 'email' ? loginWithEmail : verifyOtp} className="w-full mt-5 py-4 rounded-2xl text-white shadow-lg flex items-center justify-center gap-2" style={{ backgroundColor: '#6D28D9' }} whileTap={{ scale: 0.98 }} whileHover={{ backgroundColor: '#5B21B6' }}>
          <Zap size={17} style={{ color: '#FFD400' }} fill="#FFD400" />{isRegister ? 'Crear cuenta segura' : `Ingresar como ${roles.find((r) => r.id === selectedRole)?.label}`}<ArrowRight size={16} />
        </motion.button>

        <p className="text-center text-sm text-gray-500 mt-4">{isRegister ? '¿Ya tienes cuenta?' : '¿No tienes cuenta?'}{' '}<button type="button" onClick={() => setIsRegister((p) => !p)} className="cursor-pointer font-medium" style={{ color: '#6D28D9' }}>{isRegister ? 'Inicia sesión' : 'Regístrate gratis'}</button></p>

        <p className="text-center text-xs text-gray-400 mt-4">Al continuar aceptas nuestros <span className="underline cursor-pointer">Términos de uso</span> y <span className="underline cursor-pointer">Política de privacidad</span></p>
      </motion.div>
    </div>
  );
}
