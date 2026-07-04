import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, XCircle, Clock, Store, Bike, User, Mail, Calendar } from 'lucide-react';
import {
  getPendingStoreApplications, getPendingDriverApplications,
  approveStoreApplication, rejectStoreApplication,
  approveDriverApplication, rejectDriverApplication,
  type PendingStoreApp, type PendingDriverApp,
} from '../application/admin-application.service';

export function AdminApplications() {
  const [tab, setTab] = useState<'stores' | 'drivers'>('stores');
  const [storeApps, setStoreApps] = useState<PendingStoreApp[]>([]);
  const [driverApps, setDriverApps] = useState<PendingDriverApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionTarget, setActionTarget] = useState<{ type: 'store' | 'driver'; id: string; name: string } | null>(null);
  const [modalMode, setModalMode] = useState<'approve' | 'reject' | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, d] = await Promise.all([
        getPendingStoreApplications(),
        getPendingDriverApplications(),
      ]);
      setStoreApps(s);
      setDriverApps(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar solicitudes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleApprove = async () => {
    if (!actionTarget) return;
    setSubmitting(true);
    try {
      if (actionTarget.type === 'store') {
        await approveStoreApplication(actionTarget.id);
      } else {
        await approveDriverApplication(actionTarget.id);
      }
      setModalMode(null);
      setActionTarget(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al aprobar');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!actionTarget || !reason.trim()) return;
    setSubmitting(true);
    try {
      if (actionTarget.type === 'store') {
        await rejectStoreApplication(actionTarget.id, reason.trim());
      } else {
        await rejectDriverApplication(actionTarget.id, reason.trim());
      }
      setModalMode(null);
      setActionTarget(null);
      setReason('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al rechazar');
    } finally {
      setSubmitting(false);
    }
  };

  const openModal = (mode: 'approve' | 'reject', type: 'store' | 'driver', id: string, name: string) => {
    setActionTarget({ type, id, name });
    setModalMode(mode);
    setReason('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">
          {error}
          <button onClick={() => setError(null)} className="float-right font-bold">&times;</button>
        </div>
      )}

      <div className="flex gap-1 mb-4">
        <button
          onClick={() => setTab('stores')}
          className={`px-4 py-2 rounded-xl text-sm font-medium ${tab === 'stores' ? 'text-white shadow-md' : 'text-gray-600 bg-gray-100'}`}
          style={tab === 'stores' ? { backgroundColor: '#6D28D9' } : {}}
        >
          🏪 Tiendas {storeApps.length > 0 && <span className="ml-1 text-xs bg-white text-purple-700 px-1.5 py-0.5 rounded-full">{storeApps.length}</span>}
        </button>
        <button
          onClick={() => setTab('drivers')}
          className={`px-4 py-2 rounded-xl text-sm font-medium ${tab === 'drivers' ? 'text-white shadow-md' : 'text-gray-600 bg-gray-100'}`}
          style={tab === 'drivers' ? { backgroundColor: '#6D28D9' } : {}}
        >
          🛵 Repartidores {driverApps.length > 0 && <span className="ml-1 text-xs bg-white text-purple-700 px-1.5 py-0.5 rounded-full">{driverApps.length}</span>}
        </button>
      </div>

      {tab === 'stores' && (
        storeApps.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 shadow-sm text-center">
            <Store size={40} className="mx-auto text-gray-300" />
            <p className="text-gray-500 text-sm mt-3">No hay solicitudes de tienda pendientes</p>
          </div>
        ) : (
          <div className="space-y-3">
            {storeApps.map((app) => (
              <div key={app.id} className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#EDE9FE' }}>
                    <Store size={20} style={{ color: '#6D28D9' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-gray-900 font-medium">{app.store_name}</p>
                        {app.description && <p className="text-xs text-gray-500 mt-0.5">{app.description}</p>}
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 flex-shrink-0">Pendiente</span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><User size={12} />{app.applicant?.full_name || '—'}</span>
                      <span className="flex items-center gap-1"><Mail size={12} />{app.applicant?.email || '—'}</span>
                      <span className="flex items-center gap-1"><Calendar size={12} />{new Date(app.created_at).toLocaleDateString('es-EC')}</span>
                    </div>
                    {app.address && <p className="text-xs text-gray-400 mt-1">{app.address}</p>}
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => openModal('approve', 'store', app.id, app.store_name)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-white"
                        style={{ backgroundColor: '#22C55E' }}
                      >
                        <CheckCircle size={14} /> Aprobar
                      </button>
                      <button
                        onClick={() => openModal('reject', 'store', app.id, app.store_name)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 border border-red-200"
                      >
                        <XCircle size={14} /> Rechazar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'drivers' && (
        driverApps.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 shadow-sm text-center">
            <Bike size={40} className="mx-auto text-gray-300" />
            <p className="text-gray-500 text-sm mt-3">No hay solicitudes de repartidor pendientes</p>
          </div>
        ) : (
          <div className="space-y-3">
            {driverApps.map((app) => (
              <div key={app.id} className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#EDE9FE' }}>
                    <Bike size={20} style={{ color: '#6D28D9' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-gray-900 font-medium">{app.full_name}</p>
                        {app.vehicle_type && app.vehicle_plate && (
                          <p className="text-xs text-gray-500 mt-0.5">{app.vehicle_type} · {app.vehicle_plate}</p>
                        )}
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 flex-shrink-0">Pendiente</span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><User size={12} />{app.applicant?.full_name || app.full_name}</span>
                      <span className="flex items-center gap-1"><Mail size={12} />{app.applicant?.email || '—'}</span>
                      <span className="flex items-center gap-1"><Calendar size={12} />{new Date(app.created_at).toLocaleDateString('es-EC')}</span>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => openModal('approve', 'driver', app.id, app.full_name)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-white"
                        style={{ backgroundColor: '#22C55E' }}
                      >
                        <CheckCircle size={14} /> Aprobar
                      </button>
                      <button
                        onClick={() => openModal('reject', 'driver', app.id, app.full_name)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 border border-red-200"
                      >
                        <XCircle size={14} /> Rechazar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      <AnimatePresence>
        {modalMode && actionTarget && (
          <motion.div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              {modalMode === 'approve' ? (
                <>
                  <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-3" style={{ backgroundColor: '#F0FDF4' }}>
                    <CheckCircle size={28} style={{ color: '#22C55E' }} />
                  </div>
                  <p className="text-gray-900 font-bold text-center text-lg">Aprobar solicitud</p>
                  <p className="text-sm text-gray-500 text-center mt-1">
                    ¿Estás seguro de aprobar <strong>{actionTarget.name}</strong>?
                  </p>
                  <p className="text-xs text-gray-400 text-center mt-2">
                    {actionTarget.type === 'store'
                      ? 'Se creará la tienda, se actualizará el rol del usuario y se le notificará.'
                      : 'Se creará el perfil de repartidor, se actualizará el rol del usuario y se le notificará.'}
                  </p>
                  <div className="flex gap-3 mt-5">
                    <button
                      onClick={() => { setModalMode(null); setActionTarget(null); }}
                      className="flex-1 py-3 rounded-xl text-gray-600 border border-gray-200 text-sm font-medium"
                      disabled={submitting}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleApprove}
                      disabled={submitting}
                      className="flex-1 py-3 rounded-xl text-white text-sm font-medium flex items-center justify-center gap-1"
                      style={{ backgroundColor: '#22C55E' }}
                    >
                      {submitting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <CheckCircle size={16} />}
                      {submitting ? 'Aprobando...' : 'Aprobar'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-3" style={{ backgroundColor: '#FEF2F2' }}>
                    <XCircle size={28} style={{ color: '#EF4444' }} />
                  </div>
                  <p className="text-gray-900 font-bold text-center text-lg">Rechazar solicitud</p>
                  <p className="text-sm text-gray-500 text-center mt-1">
                    Rechazar <strong>{actionTarget.name}</strong>
                  </p>
                  <textarea
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mt-4 resize-none"
                    rows={3}
                    placeholder="Motivo del rechazo (obligatorio)"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    autoFocus
                  />
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={() => { setModalMode(null); setActionTarget(null); setReason(''); }}
                      className="flex-1 py-3 rounded-xl text-gray-600 border border-gray-200 text-sm font-medium"
                      disabled={submitting}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleReject}
                      disabled={submitting || !reason.trim()}
                      className="flex-1 py-3 rounded-xl text-white text-sm font-medium flex items-center justify-center gap-1 disabled:opacity-50"
                      style={{ backgroundColor: '#EF4444' }}
                    >
                      {submitting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <XCircle size={16} />}
                      {submitting ? 'Rechazando...' : 'Rechazar'}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
