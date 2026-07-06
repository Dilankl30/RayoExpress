import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Bike, CheckCircle, Clock, XCircle } from 'lucide-react';
import { useAuth } from '../../../modules/auth/context/AuthContext';
import { submitDriverApplication, getMyDriverApplication } from '../../../modules/delivery/application/driver-application.service';

export function DriverApplicationScreen() {
  const { user, navigate } = useAuth();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicleType, setVehicleType] = useState('moto');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [existing, setExisting] = useState<{ status: string } | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!user) return;
    getMyDriverApplication(user.id)
      .then((app) => { setExisting(app as { status: string } | null); })
      .catch(() => { /* no hay solicitud previa */ })
      .finally(() => setChecking(false));
  }, [user]);

  if (!user || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (existing) {
    return (
      <div className="min-h-screen bg-surface">
        <div className="bg-card border-b border-border px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate('home')} className="text-text-secondary">
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-bold text-text-primary">Solicitud de Repartidor</h1>
        </div>
        <div className="max-w-lg mx-auto px-4 py-12 text-center">
          {existing.status === 'pending' && (
            <div className="bg-warning-light rounded-2xl p-8 border border-amber-200">
              <Clock size={48} className="text-amber-500 mx-auto mb-4" />
              <h2 className="text-lg font-bold text-text-primary mb-2">Solicitud en revisión</h2>
              <p className="text-sm text-text-secondary">Estamos revisando tus datos. Te notificaremos cuando estés aprobado.</p>
            </div>
          )}
          {existing.status === 'approved' && (
            <div className="bg-success-light rounded-2xl p-8 border border-green-200">
              <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
              <h2 className="text-lg font-bold text-text-primary mb-2">¡Eres repartidor!</h2>
              <p className="text-sm text-text-secondary">Ya puedes recibir pedidos desde el panel de repartidor.</p>
            </div>
          )}
          {existing.status === 'rejected' && (
            <div className="bg-danger-light rounded-2xl p-8 border border-red-200">
              <XCircle size={48} className="text-red-500 mx-auto mb-4" />
              <h2 className="text-lg font-bold text-text-primary mb-2">Solicitud rechazada</h2>
              <p className="text-sm text-text-secondary">Comunícate con soporte para más información.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!fullName.trim()) return setError('Ingresa tu nombre completo');
    setError('');
    setLoading(true);
    try {
      await submitDriverApplication(user.id, { fullName, phone, vehicleType, vehiclePlate });
      setExisting({ status: 'pending' });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al enviar solicitud');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface">
      <div className="bg-card border-b border-border px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate('home')} className="text-text-secondary">
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-bold text-text-primary">Ser Repartidor</h1>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <div className="bg-purple-50 rounded-2xl p-5 border border-purple-100 flex items-start gap-3">
          <Bike className="text-purple-600 mt-1" size={20} />
          <div>
            <p className="text-sm font-semibold text-text-primary">¿Quieres repartir?</p>
            <p className="text-xs text-text-secondary">Regístrate como repartidor, completa tus datos y empieza a ganar dinero con RayoExpress.</p>
          </div>
        </div>

        {error && (
          <div className="bg-danger-light border border-red-200 rounded-xl px-4 py-3">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <div className="bg-card rounded-2xl p-5 space-y-4 shadow-sm border border-border">
          <div>
            <p className="text-xs text-text-secondary mb-1 font-medium">Nombre completo</p>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Tu nombre"
              className="w-full bg-surface rounded-xl px-4 py-3 text-text-primary outline-none text-sm"
            />
          </div>

          <div>
            <p className="text-xs text-text-secondary mb-1 font-medium">Teléfono</p>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+593 99 999 9999"
              className="w-full bg-surface rounded-xl px-4 py-3 text-text-primary outline-none text-sm"
            />
          </div>

          <div>
            <p className="text-xs text-text-secondary mb-1 font-medium">Tipo de vehículo</p>
            <select
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value)}
              className="w-full bg-surface rounded-xl px-4 py-3 text-text-primary outline-none text-sm"
            >
              <option value="moto">Moto</option>
              <option value="bicicleta">Bicicleta</option>
              <option value="auto">Auto</option>
              <option value="caminando">Caminando</option>
            </select>
          </div>

          <div>
            <p className="text-xs text-text-secondary mb-1 font-medium">Placa del vehículo</p>
            <input
              type="text"
              value={vehiclePlate}
              onChange={(e) => setVehiclePlate(e.target.value)}
              placeholder="ABC-1234"
              className="w-full bg-surface rounded-xl px-4 py-3 text-text-primary outline-none text-sm"
            />
          </div>

          <motion.button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-3 rounded-xl text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ backgroundColor: '#6D28D9' }}
            whileTap={{ scale: 0.98 }}
          >
            <Bike size={16} />
            {loading ? 'Enviando...' : 'Enviar solicitud'}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
