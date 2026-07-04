import { useState } from 'react';
import { motion } from 'motion/react';
import { User, Save, ArrowLeft, Camera } from 'lucide-react';
import { useAuth } from '../../../modules/auth/context/AuthContext';
import { updateProfile } from '../../../modules/auth/application/update-profile.use-case';
import { uploadFileWithUpsert, getPublicUrl } from '../../../shared/storage/storage.service';
import { isSupabaseReady } from '../../../integrations/supabase/client';

export function ProfileScreen() {
  const { user, setUser, navigate, logout } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  if (!user) return null;

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      if (isSupabaseReady) {
        await updateProfile(user.id, { full_name: fullName, phone });
      }
      setUser({ ...user, full_name: fullName, phone });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async () => {
    if (!isSupabaseReady) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setSaving(true);
      try {
        const { path } = await uploadFileWithUpsert('avatars', user.id, file);
        const avatarUrl = await getPublicUrl('avatars', path);
        await updateProfile(user.id, { avatar_url: avatarUrl });
        setUser({ ...user, avatar_url: avatarUrl });
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error al subir imagen');
      } finally {
        setSaving(false);
      }
    };
    input.click();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate('home')} className="text-gray-600">
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-bold text-gray-900">Mi Perfil</h1>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <motion.div
          className="flex flex-col items-center"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-purple-100 flex items-center justify-center text-4xl overflow-hidden">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="text-purple-600" size={36} />
              )}
            </div>
            {isSupabaseReady && (
              <button
                onClick={handleAvatarUpload}
                className="absolute bottom-0 right-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center shadow-lg"
              >
                <Camera size={14} />
              </button>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-2 capitalize">{user.role}</p>
        </motion.div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {saved && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
            <p className="text-green-600 text-sm">Perfil actualizado</p>
          </div>
        )}

        <div className="bg-white rounded-2xl p-5 space-y-4 shadow-sm border border-gray-100">
          <div>
            <p className="text-xs text-gray-400 mb-1 font-medium">Nombre completo</p>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Tu nombre"
              className="w-full bg-gray-50 rounded-xl px-4 py-3 text-gray-900 outline-none text-sm"
            />
          </div>

          <div>
            <p className="text-xs text-gray-400 mb-1 font-medium">Teléfono</p>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+593 99 999 9999"
              className="w-full bg-gray-50 rounded-xl px-4 py-3 text-gray-900 outline-none text-sm"
            />
          </div>

          <div>
            <p className="text-xs text-gray-400 mb-1 font-medium">Correo</p>
            <p className="w-full bg-gray-50 rounded-xl px-4 py-3 text-gray-500 text-sm">
              {user.id.startsWith('mock-') ? 'demo@rayoexpress.com' : 'Correo registrado'}
            </p>
          </div>

          <motion.button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 rounded-xl text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ backgroundColor: '#6D28D9' }}
            whileTap={{ scale: 0.98 }}
          >
            <Save size={16} />
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </motion.button>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <button
            onClick={logout}
            className="w-full py-3 rounded-xl text-red-500 font-medium border border-red-200 hover:bg-red-50 transition-colors text-sm"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}
