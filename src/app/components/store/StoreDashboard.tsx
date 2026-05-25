import { useState } from 'react';
import { motion } from 'motion/react';
import {
  Bell, TrendingUp, Package, ShoppingBag, Users,
  Clock, CheckCircle, AlertCircle, Plus, Settings,
  BarChart2, Star, Zap, ArrowLeft,
} from 'lucide-react';
import type { Screen } from '../../types';
import logo from '../../../imports/image-1.png';

interface StoreDashboardProps {
  onNavigate: (screen: Screen) => void;
}

const pendingOrders = [
  { id: 'ORD-2849', client: 'Juan P.', items: 2, total: 12.50, time: '5 min', status: 'new' },
  { id: 'ORD-2848', client: 'Ana G.', items: 4, total: 28.00, time: '12 min', status: 'preparing' },
  { id: 'ORD-2845', client: 'Luis M.', items: 1, total: 6.99, time: '18 min', status: 'ready' },
];

const topProducts = [
  { name: 'Combo Whopper', emoji: '🍔', sold: 47, revenue: '$422.53' },
  { name: 'Papas Grandes', emoji: '🍟', sold: 39, revenue: '$116.61' },
  { name: 'Combo Doble BK', emoji: '🍔', sold: 28, revenue: '$419.72' },
  { name: 'Nuggets x6', emoji: '🍗', sold: 24, revenue: '$119.76' },
];

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  new: { bg: '#DBEAFE', text: '#1D4ED8', label: 'Nuevo' },
  preparing: { bg: '#FEF3C7', text: '#D97706', label: 'Preparando' },
  ready: { bg: '#D1FAE5', text: '#065F46', label: 'Listo' },
};

export function StoreDashboard({ onNavigate }: StoreDashboardProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'orders' | 'catalog' | 'settings'>('dashboard');
  const [isOpen, setIsOpen] = useState(true);
  const [orderStatuses, setOrderStatuses] = useState<Record<string, string>>(
    Object.fromEntries(pendingOrders.map((o) => [o.id, o.status]))
  );

  const advanceStatus = (id: string) => {
    const flow = ['new', 'preparing', 'ready', 'delivered'];
    setOrderStatuses((prev) => {
      const curr = prev[id];
      const next = flow[flow.indexOf(curr) + 1];
      return next ? { ...prev, [id]: next } : prev;
    });
  };

  const tabs = [
    { id: 'dashboard', label: 'Resumen', icon: BarChart2 },
    { id: 'orders', label: 'Pedidos', icon: Package },
    { id: 'catalog', label: 'Catálogo', icon: ShoppingBag },
    { id: 'settings', label: 'Config', icon: Settings },
  ] as const;

  return (
    <div className="min-h-screen bg-gray-50 max-w-md mx-auto flex flex-col">
      {/* Header */}
      <div
        className="pt-10 pb-5 px-4"
        style={{ background: 'linear-gradient(160deg, #6D28D9, #4C1D95)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <img src={logo} alt="Rayo" className="w-8 h-8 object-contain rounded-lg" />
            <div>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>Panel de tienda</p>
              <p className="text-white font-medium">Burger King · Amazonas</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="relative">
              <Bell size={22} className="text-white" />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FFD400', fontSize: 9, color: '#111827' }}>3</span>
            </button>
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full cursor-pointer"
              style={{ backgroundColor: isOpen ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)' }}
              onClick={() => setIsOpen(!isOpen)}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: isOpen ? '#22C55E' : '#EF4444' }}
              />
              <span style={{ color: isOpen ? '#86EFAC' : '#FCA5A5', fontSize: 12 }}>
                {isOpen ? 'Abierto' : 'Cerrado'}
              </span>
            </div>
          </div>
        </div>

        {/* Today quick stats */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Ventas hoy', value: '$347.20', icon: '💰' },
            { label: 'Pedidos', value: '24', icon: '📦' },
            { label: 'Activos', value: '3', icon: '⏳' },
          ].map((s) => (
            <div key={s.label} className="bg-white/10 rounded-xl px-3 py-2.5 text-center">
              <p style={{ fontSize: 16 }}>{s.icon}</p>
              <p className="text-white font-bold text-sm">{s.value}</p>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10 }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-24">
        {activeTab === 'dashboard' && (
          <>
            {/* KPI cards */}
            <div className="px-4 pt-4 grid grid-cols-2 gap-3">
              {[
                { label: 'Ventas del mes', value: '$4,287.50', change: '+18%', up: true },
                { label: 'Clientes únicos', value: '312', change: '+7%', up: true },
                { label: 'Ticket promedio', value: '$14.45', change: '+3%', up: true },
                { label: 'Calificación', value: '4.8 ⭐', change: '+0.1', up: true },
              ].map((kpi) => (
                <div key={kpi.label} className="bg-white rounded-2xl p-4 shadow-sm">
                  <p className="text-xs text-gray-400 mb-1">{kpi.label}</p>
                  <p className="font-bold text-gray-900">{kpi.value}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp size={11} style={{ color: kpi.up ? '#22C55E' : '#EF4444' }} />
                    <span style={{ fontSize: 11, color: kpi.up ? '#22C55E' : '#EF4444' }}>{kpi.change} este mes</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Active orders */}
            <div className="mx-4 mt-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-gray-900 font-medium text-sm">Pedidos activos</p>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ backgroundColor: '#EDE9FE', color: '#6D28D9' }}
                >
                  {pendingOrders.filter((o) => orderStatuses[o.id] !== 'delivered').length} pendientes
                </span>
              </div>
              <div className="space-y-2">
                {pendingOrders.map((order) => {
                  const st = orderStatuses[order.id] || order.status;
                  const stInfo = statusColors[st] || statusColors.new;
                  return (
                    <div key={order.id} className="bg-white rounded-2xl p-3 shadow-sm flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: stInfo.bg }}
                      >
                        {st === 'new' ? <AlertCircle size={18} style={{ color: stInfo.text }} /> :
                          st === 'preparing' ? <Clock size={18} style={{ color: stInfo.text }} /> :
                            <CheckCircle size={18} style={{ color: stInfo.text }} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900">{order.id}</p>
                          <span
                            className="text-xs px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: stInfo.bg, color: stInfo.text }}
                          >
                            {stInfo.label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">{order.client} · {order.items} productos · ${order.total.toFixed(2)}</p>
                      </div>
                      {st !== 'ready' && st !== 'delivered' && (
                        <button
                          onClick={() => advanceStatus(order.id)}
                          className="px-3 py-1.5 rounded-xl text-xs text-white flex-shrink-0"
                          style={{ backgroundColor: '#6D28D9' }}
                        >
                          Avanzar
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top Products */}
            <div className="mx-4 mt-4">
              <p className="text-gray-900 font-medium text-sm mb-3">Productos más vendidos</p>
              <div className="space-y-2">
                {topProducts.map((p, i) => (
                  <div key={p.name} className="bg-white rounded-2xl p-3 shadow-sm flex items-center gap-3">
                    <span className="text-gray-400 font-bold w-5 text-center text-sm">#{i + 1}</span>
                    <span style={{ fontSize: 22 }}>{p.emoji}</span>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900 font-medium">{p.name}</p>
                      <p className="text-xs text-gray-400">{p.sold} vendidos</p>
                    </div>
                    <p className="text-sm font-bold" style={{ color: '#22C55E' }}>{p.revenue}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {activeTab === 'orders' && (
          <div className="px-4 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-gray-900">Todos los pedidos</h3>
              <div className="flex gap-2">
                {['Todos', 'Activos', 'Completados'].map((f) => (
                  <button key={f} className="text-xs px-3 py-1.5 rounded-full bg-gray-100 text-gray-600">{f}</button>
                ))}
              </div>
            </div>
            {[...pendingOrders, ...pendingOrders.map((o) => ({ ...o, id: o.id + 'x', status: 'delivered' }))].map((order) => {
              const st = orderStatuses[order.id] || order.status;
              const stInfo = statusColors[st] || { bg: '#D1FAE5', text: '#065F46', label: 'Entregado' };
              return (
                <div key={order.id} className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-gray-900 font-medium text-sm">{order.id}</p>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: stInfo.bg, color: stInfo.text }}
                    >
                      {stInfo.label}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{order.client} · {order.items} productos</p>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-gray-400">Hace {order.time}</p>
                    <p className="font-bold text-sm" style={{ color: '#6D28D9' }}>${order.total.toFixed(2)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'catalog' && (
          <div className="px-4 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-gray-900">Mi catálogo</h3>
              <button
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-sm"
                style={{ backgroundColor: '#6D28D9' }}
              >
                <Plus size={14} />
                Nuevo
              </button>
            </div>
            {['Combos', 'Hamburguesas', 'Bebidas', 'Postres'].map((cat) => (
              <div key={cat} className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">{cat}</p>
                <div className="space-y-2">
                  {[1, 2].map((j) => (
                    <div key={j} className="bg-white rounded-2xl p-3 shadow-sm flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: '#F3F4F6', fontSize: 24 }}
                      >
                        🍔
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">Producto {cat} {j}</p>
                        <p className="text-xs text-gray-400">Stock: 25 · $8.99</p>
                      </div>
                      <div className="flex gap-1">
                        <button className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                          <Settings size={13} className="text-gray-500" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="px-4 pt-4 space-y-3">
            {[
              ['Información de la tienda', '🏪'],
              ['Horarios de atención', '🕐'],
              ['Zona de cobertura', '📍'],
              ['Métodos de pago aceptados', '💳'],
              ['Notificaciones', '🔔'],
              ['Integración Rayo Express', '⚡'],
              ['Cerrar sesión', '🚪'],
            ].map(([label, icon]) => (
              <button
                key={label}
                onClick={() => label === 'Cerrar sesión' && onNavigate('login')}
                className="w-full bg-white rounded-2xl px-4 py-4 flex items-center gap-3 shadow-sm text-left"
              >
                <span style={{ fontSize: 20 }}>{icon}</span>
                <span className="flex-1 text-gray-700 font-medium">{label}</span>
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2">
                  <polyline points="9,18 15,12 9,6" />
                </svg>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex items-center justify-around px-2 py-2 z-40 max-w-md mx-auto"
        style={{ boxShadow: '0 -4px 20px rgba(0,0,0,0.08)' }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex flex-col items-center gap-0.5 flex-1 py-1 relative"
            >
              <Icon size={22} style={{ color: isActive ? '#6D28D9' : '#9CA3AF' }} strokeWidth={isActive ? 2.5 : 1.8} />
              <span style={{ fontSize: 10, color: isActive ? '#6D28D9' : '#9CA3AF' }}>{tab.label}</span>
              {isActive && (
                <div className="absolute -top-px left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full" style={{ backgroundColor: '#6D28D9' }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
