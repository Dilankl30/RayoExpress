import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { NotificationBell } from '../../../modules/notifications/ui/NotificationBell';
import { CatalogManager } from '../../../modules/stores/ui/CatalogManager';
import { StoreSettings } from '../../../modules/stores/ui/StoreSettings';
import { getStoreInfo } from '../../../modules/stores/application/store-settings.service';
import { toggleStoreOpen } from '../../../modules/stores/application/store-settings.service';
import { PaymentVerification } from '../../../modules/payments/ui/PaymentVerification';
import { FinancialReport } from '../../../modules/payments/ui/FinancialReport';

export function StoreDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'orders' | 'catalog' | 'payments' | 'reports' | 'settings'>('dashboard');
  const [storeId, setStoreId] = useState<string | null>(null);
  const [storeName, setStoreName] = useState('Mi Tienda');
  const [isOpen, setIsOpen] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const mockStoreId = 'store-1';
        setStoreId(mockStoreId);
        const info = await getStoreInfo(mockStoreId);
        if (info) {
          setStoreName(info.name);
          setIsOpen(info.is_open);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleToggleOpen = async () => {
    const next = !isOpen;
    setIsOpen(next);
    if (storeId) await toggleStoreOpen(storeId, next);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-16 lg:pb-0">
      <div className="pt-10 pb-5 px-4" style={{ background: 'linear-gradient(160deg, #6D28D9, #4C1D95)' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>Panel de tienda</p>
            <p className="text-white font-medium">{storeName}</p>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full cursor-pointer"
              style={{ backgroundColor: isOpen ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)' }}
              onClick={handleToggleOpen}
            >
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: isOpen ? '#22C55E' : '#EF4444' }} />
              <span style={{ color: isOpen ? '#86EFAC' : '#FCA5A5', fontSize: 12 }}>
                {isOpen ? 'Abierto' : 'Cerrado'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-1 px-4 py-3 bg-white border-b border-gray-100 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {(['dashboard', 'orders', 'catalog', 'payments', 'reports', 'settings'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === tab ? 'text-white shadow-md' : 'text-gray-600 bg-gray-100'
            }`}
            style={activeTab === tab ? { backgroundColor: '#6D28D9' } : {}}
          >
            {tab === 'dashboard' ? '📊 Dashboard' : tab === 'orders' ? '📋 Pedidos' : tab === 'catalog' ? '📦 Catálogo' : tab === 'payments' ? '💳 Pagos' : tab === 'reports' ? '📈 Reportes' : '⚙️ Config'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'dashboard' && (
          <div className="px-4 pt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Ventas hoy', value: '$347.20', icon: '💰' },
                { label: 'Pedidos activos', value: '3', icon: '⏳' },
                { label: 'Productos', value: '24', icon: '📦' },
                { label: 'Calificación', value: '4.8 ⭐', icon: '⭐' },
              ].map((s) => (
                <div key={s.label} className="bg-white rounded-2xl p-4 shadow-sm">
                  <p style={{ fontSize: 20 }}>{s.icon}</p>
                  <p className="font-bold text-gray-900 text-lg">{s.value}</p>
                  <p className="text-xs text-gray-400">{s.label}</p>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium text-gray-900">Estado de la tienda</p>
                <button
                  onClick={handleToggleOpen}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium ${isOpen ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                >
                  {isOpen ? '🟢 Abierto' : '🔴 Cerrado'}
                </button>
              </div>
              <p className="text-xs text-gray-400">Toca para cambiar el estado</p>
            </div>
            <button
              onClick={logout}
              className="w-full py-3 rounded-xl text-red-500 font-medium border border-red-200 hover:bg-red-50 transition-colors text-sm"
            >
              Cerrar sesión
            </button>
          </div>
        )}

        {activeTab === 'catalog' && storeId && <CatalogManager storeId={storeId} />}

        {activeTab === 'payments' && storeId && user && (
          <div className="px-4 pt-4">
            <h3 className="text-gray-900 font-semibold mb-3">Verificación de pagos</h3>
            <PaymentVerification storeId={storeId} userId={user.id} />
          </div>
        )}

        {activeTab === 'reports' && storeId && (
          <div className="px-4 pt-4">
            <h3 className="text-gray-900 font-semibold mb-3">Reporte financiero</h3>
            <FinancialReport storeId={storeId} />
          </div>
        )}

        {activeTab === 'settings' && storeId && <StoreSettings storeId={storeId} />}
      </div>
    </div>
  );
}
