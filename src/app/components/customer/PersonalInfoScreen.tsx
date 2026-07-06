import { useState } from 'react';
import { ArrowLeft, User } from 'lucide-react';
import { useAuth } from '../../../modules/auth/context/AuthContext';
import { updateProfile } from '../../../modules/client/application/client-service';

export function PersonalInfoScreen() {
  const { navigate, user, setUser } = useAuth();
  const [firstName, setFirstName] = useState(user?.full_name?.split(' ')[0] || '');
  const [lastName, setLastName] = useState(user?.full_name?.split(' ').slice(1).join(' ') || '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const canSave = firstName.trim().length > 0 && lastName.trim().length > 0;

  const handleSave = async () => {
    if (!user || !canSave) return;
    setSaving(true);
    setError('');
    try {
      const fullName = `${firstName} ${lastName}`.trim();
      await updateProfile(user.id, { full_name: fullName, phone: phone || undefined });
      setUser({ ...user, full_name: fullName, phone: phone || null });
      navigate('profile');
    } catch {
      setError('Error al guardar. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface pb-24">
      <div className="pt-10 pb-4 px-4 flex items-center gap-3" style={{ background: 'linear-gradient(160deg, var(--brand), var(--brand-dark))' }}>
        <button onClick={() => navigate('profile')} aria-label="Volver" className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
          <ArrowLeft size={18} className="text-white" />
        </button>
        <h2 className="text-white font-bold text-lg">Mis datos personales</h2>
      </div>

      <div className="px-4 mt-4">
        <div className="bg-card rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'var(--brand-light)' }}>
              <User size={28} style={{ color: 'var(--brand)' }} />
            </div>
            <div>
              <p className="text-text-primary font-medium">Foto de perfil</p>
              <p className="text-xs text-text-secondary">Toca para cambiar</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-text-secondary mb-1 block">Nombre(s)</label>
              <input
                aria-label="Nombre"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Tu nombre"
                className="w-full bg-surface rounded-xl px-4 py-3 text-sm outline-none text-text-primary placeholder:text-text-secondary"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-text-secondary mb-1 block">Apellido(s)</label>
              <input
                aria-label="Apellido"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Tus apellidos"
                className="w-full bg-surface rounded-xl px-4 py-3 text-sm outline-none text-text-primary placeholder:text-text-secondary"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-text-secondary mb-1 block">Teléfono</label>
              <input
                aria-label="Teléfono"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+593 99 999 9999"
                className="w-full bg-surface rounded-xl px-4 py-3 text-sm outline-none text-text-primary placeholder:text-text-secondary"
              />
            </div>
          </div>

          {error && (
            <div className="mt-4 bg-red-50 rounded-xl px-4 py-3">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}
        </div>

        <button
          onClick={handleSave}
          disabled={!canSave || saving}
          className="w-full mt-6 py-4 rounded-2xl text-white font-semibold shadow-lg disabled:opacity-50"
          style={{ backgroundColor: 'var(--brand)' }}
        >
          {saving ? 'Guardando...' : 'Guardar datos'}
        </button>
      </div>
    </div>
  );
}
