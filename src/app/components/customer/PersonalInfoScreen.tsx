import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../../../modules/auth/context/AuthContext';

const PERSONAL_INFO_KEY = 'rayoexpress-personal-info';

function loadPersonalInfo() {
  try { return JSON.parse(localStorage.getItem(PERSONAL_INFO_KEY) || '{}'); } catch { return {}; }
}

function savePersonalInfo(data: Record<string, string>) {
  try { localStorage.setItem(PERSONAL_INFO_KEY, JSON.stringify({ ...loadPersonalInfo(), ...data })); } catch { /* noop */ }
}

export function PersonalInfoScreen() {
  const { navigate, user, setUser } = useAuth();
  const saved = loadPersonalInfo();
  const [firstName, setFirstName] = useState(user?.full_name?.split(' ')[0] || '');
  const [lastName, setLastName] = useState(user?.full_name?.split(' ').slice(1).join(' ') || '');
  const [nickname, setNickname] = useState(saved.nickname || '');
  const [birthDate, setBirthDate] = useState(saved.birthDate || '');
  const [gender, setGender] = useState(saved.gender || '');
  const canSave = firstName.trim() && lastName.trim();

  const save = () => {
    if (!user || !canSave) return;
    setUser({ ...user, full_name: `${firstName} ${lastName}`.trim() });
    savePersonalInfo({ nickname, birthDate, gender });
    navigate('profile');
  };

  return (
    <div className="min-h-screen bg-white px-4 pt-10 pb-28">
      <header className="flex items-center mb-10">
        <button onClick={() => navigate('profile')} className="w-10 h-10 flex items-center justify-center"><ArrowLeft size={24} /></button>
        <h1 className="flex-1 text-center text-2xl font-bold text-[#12001f] pr-10">Mis datos personales</h1>
      </header>
      <h2 className="text-2xl font-bold text-[#12001f] mb-5">Como te llamas?</h2>
      <div className="space-y-4">
        <input aria-label="Nombre" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Nombre(s)" className="w-full rounded-2xl border border-gray-200 px-4 py-4 outline-none" />
        <input aria-label="Apellido" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Apellido(s)" className="w-full rounded-2xl border border-gray-200 px-4 py-4 outline-none" />
        <input aria-label="Apodo" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="Apodo (opcional)" className="w-full rounded-2xl border border-gray-200 px-4 py-4 outline-none" />
      </div>
      <h2 className="text-2xl font-bold text-[#12001f] mt-8 mb-5">Cuando naciste?</h2>
      <input aria-label="Fecha de nacimiento" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} placeholder="DD/MM/AAAA" className="w-full rounded-2xl border border-gray-200 px-4 py-4 outline-none" />
      <h2 className="text-2xl font-bold text-[#12001f] mt-8 mb-5">Con que genero te identificas?</h2>
      <div className="flex flex-wrap gap-2">
        {['Femenino', 'Masculino', 'No binario', 'Prefiero no decirlo'].map((item) => (
          <button key={item} onClick={() => setGender(item)} className="px-4 py-3 rounded-full font-bold" style={{ background: gender === item ? '#12001f' : '#F3F3F5', color: gender === item ? 'white' : '#12001f' }}>{item}</button>
        ))}
      </div>
      <div className="fixed left-0 right-0 bottom-0 px-4 pb-7 pt-4 bg-gradient-to-t from-white via-white to-white/0">
        <button onClick={save} disabled={!canSave} className="w-full py-4 rounded-full text-white font-bold disabled:opacity-40" style={{ background: '#E90057' }}>Guardar datos</button>
      </div>
    </div>
  );
}
