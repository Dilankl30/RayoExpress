import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, XCircle, Store, Bike, User, Mail, Calendar, Eye, FileText, ShieldCheck } from 'lucide-react';
import {
  getPendingStoreApplications, getPendingDriverApplications,
  approveStoreApplication, rejectStoreApplication,
  approveDriverApplication, rejectDriverApplication,
  verifyDriverDocuments, signDriverContract,
  getDriverApplicationById,
  type PendingStoreApp, type PendingDriverApp,
} from '../application/admin-application.service';

export function AdminApplications() {
  const [tab, setTab] = useState<'stores' | 'drivers'>('stores');
  const [storeApps, setStoreApps] = useState<PendingStoreApp[]>([]);
  const [driverApps, setDriverApps] = useState<PendingDriverApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionTarget, setActionTarget] = useState<{ type: 'store' | 'driver'; id: string; name: string; action: 'approve' | 'reject' | 'verify' | 'sign' } | null>(null);
  const [modalMode, setModalMode] = useState<'approve' | 'reject' | 'verify' | 'sign' | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [docViewApp, setDocViewApp] = useState<PendingDriverApp | null>(null);
  const [docViewLoading, setDocViewLoading] = useState(false);

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

  const handleAction = async () => {
    if (!actionTarget) return;
    setSubmitting(true);
    try {
      const { type, id, action } = actionTarget;
      if (type === 'store') {
        if (action === 'approve') await approveStoreApplication(id);
        else await rejectStoreApplication(id, reason.trim());
      } else {
        if (action === 'verify') await verifyDriverDocuments(id);
        else if (action === 'sign') await signDriverContract(id);
        else if (action === 'approve') await approveDriverApplication(id);
        else await rejectDriverApplication(id, reason.trim());
      }
      setModalMode(null);
      setActionTarget(null);
      setReason('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al procesar solicitud');
    } finally {
      setSubmitting(false);
    }
  };

  const openModal = (action: 'approve' | 'reject' | 'verify' | 'sign', type: 'store' | 'driver', id: string, name: string) => {
    setActionTarget({ type, id, name, action });
    setModalMode(action);
    setReason('');
  };

  const openDocView = async (app: PendingDriverApp) => {
    setDocViewLoading(true);
    try {
      const full = await getDriverApplicationById(app.id);
      setDocViewApp(full || app);
    } catch {
      setDocViewApp(app);
    } finally {
      setDocViewLoading(false);
    }
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-warning-light text-warning',
      docs_verified: 'bg-blue-100 text-blue-700',
      approved: 'bg-success-light text-green-700',
      rejected: 'bg-danger-light text-danger',
    };
    const labels: Record<string, string> = {
      pending: 'Pendiente',
      docs_verified: 'Documentos verificados',
      approved: 'Aprobado',
      rejected: 'Rechazado',
    };
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${styles[status] || 'bg-surface text-text-secondary'}`}>
        {labels[status] || status}
      </span>
    );
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
        <div className="bg-danger-light border border-red-200 text-danger text-sm rounded-xl px-4 py-3 mb-4">
          {error}
          <button onClick={() => setError(null)} className="float-right font-bold">&times;</button>
        </div>
      )}

      <div className="flex gap-1 mb-4">
        <button
          onClick={() => setTab('stores')}
          className={`px-4 py-2 rounded-xl text-sm font-medium ${tab === 'stores' ? 'text-white shadow-md' : 'text-text-secondary bg-surface-hover'}`}
          style={tab === 'stores' ? { backgroundColor: 'var(--brand)' } : {}}
        >
          Tiendas {storeApps.length > 0 && <span className="ml-1 text-xs bg-card text-brand px-1.5 py-0.5 rounded-full">{storeApps.length}</span>}
        </button>
        <button
          onClick={() => setTab('drivers')}
          className={`px-4 py-2 rounded-xl text-sm font-medium ${tab === 'drivers' ? 'text-white shadow-md' : 'text-text-secondary bg-surface-hover'}`}
          style={tab === 'drivers' ? { backgroundColor: 'var(--brand)' } : {}}
        >
          Repartidores {driverApps.length > 0 && <span className="ml-1 text-xs bg-card text-brand px-1.5 py-0.5 rounded-full">{driverApps.length}</span>}
        </button>
      </div>

      {tab === 'stores' && (
        storeApps.length === 0 ? (
          <div className="bg-card rounded-2xl p-10 shadow-sm text-center">
            <Store size={40} className="mx-auto text-text-secondary" />
            <p className="text-text-secondary text-sm mt-3">No hay solicitudes de tienda pendientes</p>
          </div>
        ) : (
          <div className="space-y-3">
            {storeApps.map((app) => (
              <div key={app.id} className="bg-card rounded-2xl p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#EDE9FE' }}>
                    <Store size={20} style={{ color: 'var(--brand)' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-text-primary font-medium">{app.store_name}</p>
                        {app.description && <p className="text-xs text-text-secondary mt-0.5">{app.description}</p>}
                      </div>
                      {statusBadge(app.status)}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-text-secondary">
                      <span className="flex items-center gap-1"><User size={12} />{app.applicant?.full_name || '—'}</span>
                      <span className="flex items-center gap-1"><Mail size={12} />—</span>
                      <span className="flex items-center gap-1"><Calendar size={12} />{new Date(app.created_at).toLocaleDateString('es-EC')}</span>
                    </div>
                    {app.address && <p className="text-xs text-text-secondary mt-1">{app.address}</p>}
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => openModal('approve', 'store', app.id, app.store_name)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-white"
                        style={{ backgroundColor: 'var(--success)' }}
                      >
                        <CheckCircle size={14} /> Aprobar
                      </button>
                      <button
                        onClick={() => openModal('reject', 'store', app.id, app.store_name)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-danger border border-red-200"
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
          <div className="bg-card rounded-2xl p-10 shadow-sm text-center">
            <Bike size={40} className="mx-auto text-text-secondary" />
            <p className="text-text-secondary text-sm mt-3">No hay solicitudes de repartidor pendientes</p>
          </div>
        ) : (
          <div className="space-y-3">
            {driverApps.map((app) => (
              <div key={app.id} className="bg-card rounded-2xl p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#EDE9FE' }}>
                    <Bike size={20} style={{ color: 'var(--brand)' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-text-primary font-medium">{app.full_name}</p>
                        {app.vehicle_type && app.vehicle_plate && (
                          <p className="text-xs text-text-secondary mt-0.5">{app.vehicle_type} · {app.vehicle_plate}</p>
                        )}
                      </div>
                      {statusBadge(app.status)}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-text-secondary">
                      <span className="flex items-center gap-1"><User size={12} />{app.applicant?.full_name || app.full_name}</span>
                      <span className="flex items-center gap-1"><Mail size={12} />{app.applicant?.email || app.email || '—'}</span>
                      <span className="flex items-center gap-1"><Calendar size={12} />{new Date(app.created_at).toLocaleDateString('es-EC')}</span>
                    </div>
                    <div className="flex gap-2 mt-3">
                      {app.status === 'pending' && (
                        <>
                          <button
                            onClick={() => openDocView(app)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-text-secondary border border-border"
                          >
                            <Eye size={14} /> Ver documentos
                          </button>
                          <button
                            onClick={() => openModal('verify', 'driver', app.id, app.full_name)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-white"
                            style={{ backgroundColor: '#6D28D9' }}
                          >
                            <ShieldCheck size={14} /> Verificar documentos
                          </button>
                          <button
                            onClick={() => openModal('reject', 'driver', app.id, app.full_name)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-danger border border-red-200"
                          >
                            <XCircle size={14} /> Rechazar
                          </button>
                        </>
                      )}
                      {app.status === 'docs_verified' && (
                        <>
                          <button
                            onClick={() => openDocView(app)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-text-secondary border border-border"
                          >
                            <Eye size={14} /> Ver documentos
                          </button>
                          <button
                            onClick={() => openModal('sign', 'driver', app.id, app.full_name)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-white"
                            style={{ backgroundColor: 'var(--success)' }}
                          >
                            <FileText size={14} /> Contrato firmado
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      <AnimatePresence>
        {docViewApp && (
          <motion.div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setDocViewApp(null)}
          >
            <motion.div
              className="bg-card rounded-2xl p-5 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-text-primary">Documentos de {docViewApp.full_name}</h2>
                <button onClick={() => setDocViewApp(null)} className="text-text-secondary text-lg">&times;</button>
              </div>
              {docViewLoading ? (
                <div className="flex justify-center py-8">
                  <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="space-y-4">
                  {[
                    { label: 'Cédula frente', url: docViewApp.id_card_front_url },
                    { label: 'Cédula dorso', url: docViewApp.id_card_back_url },
                    { label: 'Papeles de la motocicleta', url: docViewApp.motorcycle_docs_url },
                    { label: 'Licencia de conducir', url: docViewApp.license_url },
                    { label: 'Contrato firmado', url: docViewApp.contract_url },
                  ].map((doc) => (
                    <div key={doc.label}>
                      <p className="text-xs font-medium text-text-secondary mb-1">{doc.label}</p>
                      {doc.url ? (
                        doc.url.startsWith('blob:') ? (
                          <div className="bg-surface rounded-xl p-3 text-sm text-text-secondary border border-border">
                            Documento disponible solo en la sesión del solicitante
                          </div>
                        ) : doc.url.match(/\.(pdf)$/i) ? (
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 bg-surface rounded-xl px-4 py-3 text-sm text-brand border border-border hover:bg-surface-hover"
                          >
                            <FileText size={16} />
                            Ver PDF
                          </a>
                        ) : (
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <img
                              src={doc.url}
                              alt={doc.label}
                              className="w-full rounded-xl border border-border object-cover max-h-48"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                              }}
                            />
                            <span className="hidden text-xs text-danger mt-1 block">
                              No se pudo cargar la imagen. <a href={doc.url} target="_blank" rel="noopener noreferrer" className="underline">Abrir enlace</a>
                            </span>
                          </a>
                        )
                      ) : (
                        <div className="bg-surface rounded-xl p-3 text-sm text-text-secondary border border-border">
                          No disponible
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {modalMode && actionTarget && (
          <motion.div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-card rounded-2xl p-5 w-full max-w-sm shadow-xl"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              {modalMode === 'verify' ? (
                <>
                  <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-3" style={{ backgroundColor: '#EDE9FE' }}>
                    <ShieldCheck size={28} style={{ color: 'var(--brand)' }} />
                  </div>
                  <p className="text-text-primary font-bold text-center text-lg">Verificar documentos</p>
                  <p className="text-sm text-text-secondary text-center mt-1">
                    ¿Los documentos de <strong>{actionTarget.name}</strong> son correctos?
                  </p>
                  <p className="text-xs text-text-secondary text-center mt-2">
                    Si los documentos son correctos, se le notificará que se acerque a la agencia a firmar el contrato.
                  </p>
                  <div className="flex gap-3 mt-5">
                    <button
                      onClick={() => { setModalMode(null); setActionTarget(null); }}
                      className="flex-1 py-3 rounded-xl text-text-secondary border border-border text-sm font-medium"
                      disabled={submitting}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleAction}
                      disabled={submitting}
                      className="flex-1 py-3 rounded-xl text-white text-sm font-medium flex items-center justify-center gap-1"
                      style={{ backgroundColor: '#6D28D9' }}
                    >
                      {submitting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <ShieldCheck size={16} />}
                      {submitting ? 'Verificando...' : 'Sí, verificar documentos'}
                    </button>
                  </div>
                </>
              ) : modalMode === 'sign' ? (
                <>
                  <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-3" style={{ backgroundColor: '#F0FDF4' }}>
                    <FileText size={28} style={{ color: 'var(--success)' }} />
                  </div>
                  <p className="text-text-primary font-bold text-center text-lg">Firmar contrato</p>
                  <p className="text-sm text-text-secondary text-center mt-1">
                    Confirmar que <strong>{actionTarget.name}</strong> firmó el contrato en la agencia
                  </p>
                  <p className="text-xs text-text-secondary text-center mt-2">
                    Se activará su cuenta como repartidor y podrá comenzar a recibir pedidos.
                  </p>
                  <div className="flex gap-3 mt-5">
                    <button
                      onClick={() => { setModalMode(null); setActionTarget(null); }}
                      className="flex-1 py-3 rounded-xl text-text-secondary border border-border text-sm font-medium"
                      disabled={submitting}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleAction}
                      disabled={submitting}
                      className="flex-1 py-3 rounded-xl text-white text-sm font-medium flex items-center justify-center gap-1"
                      style={{ backgroundColor: 'var(--success)' }}
                    >
                      {submitting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <FileText size={16} />}
                      {submitting ? 'Firmando...' : 'Confirmar contrato firmado'}
                    </button>
                  </div>
                </>
              ) : modalMode === 'approve' ? (
                <>
                  <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-3" style={{ backgroundColor: '#F0FDF4' }}>
                    <CheckCircle size={28} style={{ color: 'var(--success)' }} />
                  </div>
                  <p className="text-text-primary font-bold text-center text-lg">Aprobar solicitud</p>
                  <p className="text-sm text-text-secondary text-center mt-1">
                    ¿Estás seguro de aprobar <strong>{actionTarget.name}</strong>?
                  </p>
                  <p className="text-xs text-text-secondary text-center mt-2">
                    {actionTarget.type === 'store'
                      ? 'Se creará la tienda, se actualizará el rol del usuario y se le notificará.'
                      : 'Se creará el perfil de repartidor, se actualizará el rol del usuario y se le notificará.'}
                  </p>
                  <div className="flex gap-3 mt-5">
                    <button
                      onClick={() => { setModalMode(null); setActionTarget(null); }}
                      className="flex-1 py-3 rounded-xl text-text-secondary border border-border text-sm font-medium"
                      disabled={submitting}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleAction}
                      disabled={submitting}
                      className="flex-1 py-3 rounded-xl text-white text-sm font-medium flex items-center justify-center gap-1"
                      style={{ backgroundColor: 'var(--success)' }}
                    >
                      {submitting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <CheckCircle size={16} />}
                      {submitting ? 'Aprobando...' : 'Aprobar'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-3" style={{ backgroundColor: '#FEF2F2' }}>
                    <XCircle size={28} style={{ color: 'var(--danger)' }} />
                  </div>
                  <p className="text-text-primary font-bold text-center text-lg">Rechazar solicitud</p>
                  <p className="text-sm text-text-secondary text-center mt-1">
                    Rechazar <strong>{actionTarget.name}</strong>
                  </p>
                  <textarea
                    className="w-full border border-border rounded-xl px-3 py-2.5 text-sm mt-4 resize-none"
                    rows={3}
                    placeholder="Motivo del rechazo (obligatorio)"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    autoFocus
                  />
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={() => { setModalMode(null); setActionTarget(null); setReason(''); }}
                      className="flex-1 py-3 rounded-xl text-text-secondary border border-border text-sm font-medium"
                      disabled={submitting}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleAction}
                      disabled={submitting || !reason.trim()}
                      className="flex-1 py-3 rounded-xl text-white text-sm font-medium flex items-center justify-center gap-1 disabled:opacity-50"
                      style={{ backgroundColor: 'var(--danger)' }}
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
