import { useState } from 'react';
import { X, Check } from 'lucide-react';
import { createOrderAdmin, type AdminCreateOrderParams } from '../application/admin-orders.service';
import { MessageGenerator } from './MessageGenerator';

export function CreateOrderModal({ onClose, onOrderCreated }: { onClose: () => void; onOrderCreated?: () => void }) {
  const [step, setStep] = useState<'form' | 'messages'>('form');
  const [result, setResult] = useState<{
    trackingCode: string;
    messageClient: string;
    messageDriver: string;
    total: number;
    orderId: string;
    orderDescription: string;
    productTotal: number;
    serviceFee: number;
    customerName: string;
    customerPhone: string;
    deliveryAddress: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<AdminCreateOrderParams>({
    customerName: '',
    customerPhone: '',
    deliveryAddress: '',
    deliveryReference: '',
    orderDescription: '',
    storeName: '',
    storeAddress: '',
    productTotal: 0,
    serviceFee: 0,
    otherCharges: 0,
    discountAmount: 0,
    paymentMethod: 'cash',
  });

  const handleChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const total = Number(formData.productTotal) + Number(formData.serviceFee) + Number(formData.otherCharges || 0) - Number(formData.discountAmount || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const r = await createOrderAdmin({
        ...formData,
        customerName: formData.customerName || 'Cliente',
        customerPhone: formData.customerPhone || '',
        paymentMethod: formData.paymentMethod as 'cash' | 'transfer',
        otherCharges: Number(formData.otherCharges) || 0,
        discountAmount: Number(formData.discountAmount) || 0,
      });
      setResult({
        trackingCode: r.trackingCode,
        messageClient: r.messageClient,
        messageDriver: r.messageDriver,
        total: r.total,
        orderId: r.orderId,
        orderDescription: formData.orderDescription,
        productTotal: formData.productTotal,
        serviceFee: formData.serviceFee,
        customerName: formData.customerName || 'Cliente',
        customerPhone: formData.customerPhone || '',
        deliveryAddress: formData.deliveryAddress,
      });
      setStep('messages');
      onOrderCreated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear el pedido');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl bg-card rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-border-light">
          <div>
            <h2 className="text-xl font-bold text-text-primary">Nuevo Pedido</h2>
            <p className="text-xs text-text-secondary">Registro manual después de confirmar por WhatsApp</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-full bg-surface-hover text-text-secondary hover:bg-surface">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700 mb-4">{error}</div>
          )}

          {step === 'form' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Nombre del Cliente *</label>
                  <input type="text" required value={formData.customerName} onChange={(e) => handleChange('customerName', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border text-sm bg-surface text-text-primary focus:ring-2 focus:ring-brand/30 outline-none"
                    placeholder="Juan Pérez" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Teléfono</label>
                  <input type="tel" value={formData.customerPhone} onChange={(e) => handleChange('customerPhone', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border text-sm bg-surface text-text-primary focus:ring-2 focus:ring-brand/30 outline-none"
                    placeholder="0999999999" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Dirección de Entrega *</label>
                <textarea required value={formData.deliveryAddress} onChange={(e) => handleChange('deliveryAddress', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border text-sm bg-surface text-text-primary focus:ring-2 focus:ring-brand/30 outline-none" rows={2}
                  placeholder="Av. Principal #123, sector..." />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Referencia (opcional)</label>
                <input type="text" value={formData.deliveryReference || ''} onChange={(e) => handleChange('deliveryReference', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border text-sm bg-surface text-text-primary focus:ring-2 focus:ring-brand/30 outline-none"
                  placeholder="Puerta verde, con clave..." />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Descripción del Pedido *</label>
                <textarea required value={formData.orderDescription} onChange={(e) => handleChange('orderDescription', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border text-sm bg-surface text-text-primary focus:ring-2 focus:ring-brand/30 outline-none" rows={3}
                  placeholder="2 hamburguesas especiales, 1 papas grandes, 2 gaseosas" />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Tienda / Restaurante *</label>
                <input type="text" required value={formData.storeName} onChange={(e) => handleChange('storeName', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border text-sm bg-surface text-text-primary focus:ring-2 focus:ring-brand/30 outline-none"
                  placeholder="Pizzería Napoli" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Valor Productos *</label>
                  <input type="number" step="0.01" required min="0" value={formData.productTotal} onChange={(e) => handleChange('productTotal', Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-border text-sm bg-surface text-text-primary focus:ring-2 focus:ring-brand/30 outline-none"
                    placeholder="20.00" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Servicio RayoExpress *</label>
                  <input type="number" step="0.01" required min="0" value={formData.serviceFee} onChange={(e) => handleChange('serviceFee', Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-border text-sm bg-surface text-text-primary focus:ring-2 focus:ring-brand/30 outline-none"
                    placeholder="4.00" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Otros cargos</label>
                  <input type="number" step="0.01" min="0" value={formData.otherCharges || 0} onChange={(e) => handleChange('otherCharges', Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-border text-sm bg-surface text-text-primary focus:ring-2 focus:ring-brand/30 outline-none"
                    placeholder="0.00" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Descuento</label>
                <input type="number" step="0.01" min="0" value={formData.discountAmount || 0} onChange={(e) => handleChange('discountAmount', Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-border text-sm bg-surface text-text-primary focus:ring-2 focus:ring-brand/30 outline-none"
                  placeholder="0.00" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Método de Pago</label>
                  <select value={formData.paymentMethod} onChange={(e) => handleChange('paymentMethod', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border text-sm bg-surface text-text-primary focus:ring-2 focus:ring-brand/30 outline-none">
                    <option value="cash">Efectivo</option>
                    <option value="transfer">Transferencia</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Repartidor (opcional)</label>
                  <input type="text" value="" readOnly
                    className="w-full px-3 py-2 rounded-xl border border-border text-sm bg-surface text-text-secondary focus:ring-2 focus:ring-brand/30 outline-none"
                    placeholder="Juan Carlos" />
                </div>
              </div>

              <div className="bg-surface rounded-xl p-4 border border-border-light">
                <div className="flex justify-between items-center">
                  <span className="text-text-secondary text-sm">Total</span>
                  <span className="text-xl font-bold" style={{ color: 'var(--brand)' }}>${total.toFixed(2)}</span>
                </div>
              </div>

              <button type="submit" disabled={saving}
                className="w-full py-3 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ backgroundColor: 'var(--brand)' }}>
                {saving ? 'Creando...' : <><Check size={18} /> CONFIRMAR PEDIDO</>}
              </button>
            </form>
          ) : (
            <div>
              <div className="bg-card rounded-2xl p-4 shadow-sm border border-border-light mb-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#F0FDF4' }}>
                    <Check size={24} style={{ color: '#22C55E' }} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-text-primary">Pedido Confirmado</h3>
                    <p className="text-sm text-text-secondary">Código: <span className="font-mono font-bold" style={{ color: 'var(--brand)' }}>{result?.trackingCode}</span></p>
                  </div>
                </div>
              </div>
              <MessageGenerator
                trackingCode={result?.trackingCode || ''}
                orderDescription={result?.orderDescription || ''}
                productTotal={result?.productTotal || 0}
                serviceFee={result?.serviceFee || 0}
                total={result?.total || 0}
                customerName={result?.customerName}
                customerPhone={result?.customerPhone}
                deliveryAddress={result?.deliveryAddress}
              />
              <div className="flex gap-3 mt-4">
                <button type="button" onClick={() => { setStep('form'); setResult(null); }}
                  className="flex-1 py-2 rounded-xl border border-border text-text-secondary text-sm font-medium">
                  ← Nuevo pedido
                </button>
                {onOrderCreated && (
                  <button type="button" onClick={() => { onOrderCreated(); onClose(); }}
                    className="flex-1 py-2 rounded-xl text-white text-sm font-medium"
                    style={{ backgroundColor: 'var(--brand)' }}>
                    Cerrar
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
