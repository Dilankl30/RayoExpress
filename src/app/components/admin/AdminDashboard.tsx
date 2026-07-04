import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import {
  Bell, TrendingUp, Users, Store, Bike, Package, DollarSign,
  Settings, BarChart2, Map, Shield, Zap, ArrowUpRight, ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import logo from '../../../imports/image-1.png';

const salesData = [
  { month: 'Ene', sales: 12400, orders: 420 },
  { month: 'Feb', sales: 14200, orders: 512 },
  { month: 'Mar', sales: 13800, orders: 489 },
  { month: 'Abr', sales: 16900, orders: 631 },
  { month: 'May', sales: 18200, orders: 720 },
  { month: 'Jun', sales: 19800, orders: 798 },
  { month: 'Jul', sales: 21500, orders: 865 },
];

const categoryData = [
  { name: 'Restaurantes', value: 45, color: '#6D28D9' },
  { name: 'Súper', value: 25, color: '#FFD400' },
  { name: 'Farmacias', value: 15, color: '#3B82F6' },
  { name: 'Otros', value: 15, color: '#E5E7EB' },
];

const dailyOrders = [
  { day: 'L', orders: 89 },
  { day: 'M', orders: 112 },
  { day: 'X', orders: 98 },
  { day: 'J', orders: 127 },
  { day: 'V', orders: 145 },
  { day: 'S', orders: 162 },
  { day: 'D', orders: 74 },
];

const recentOrders = [
  { id: 'ORD-2849', client: 'Juan Pérez', store: 'Burger King', amount: '$12.50', status: 'delivered', time: '2 min' },
  { id: 'ORD-2848', client: 'Ana García', store: 'KFC', amount: '$28.00', status: 'on_way', time: '8 min' },
  { id: 'ORD-2847', client: 'Luis Mora', store: 'Subway', amount: '$15.99', status: 'preparing', time: '12 min' },
  { id: 'ORD-2846', client: 'Sara López', store: 'Pizza Hut', amount: '$22.50', status: 'delivered', time: '15 min' },
  { id: 'ORD-2845', client: 'Carlos V.', store: 'Fybeca', amount: '$45.00', status: 'cancelled', time: '20 min' },
];

const statusInfo: Record<string, { bg: string; text: string; label: string }> = {
  delivered: { bg: '#D1FAE5', text: '#065F46', label: 'Entregado' },
  on_way: { bg: '#DBEAFE', text: '#1E40AF', label: 'En camino' },
  preparing: { bg: '#FEF3C7', text: '#92400E', label: 'Preparando' },
  cancelled: { bg: '#FEE2E2', text: '#991B1B', label: 'Cancelado' },
};

export function AdminDashboard() {
  const { navigate, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'map' | 'settings'>('dashboard');

  const kpis = [
    { label: 'Ventas hoy', value: '$3,847', change: '+12%', icon: DollarSign, color: '#22C55E', bg: '#F0FDF4' },
    { label: 'Pedidos activos', value: '38', change: '+5', icon: Package, color: '#6D28D9', bg: '#EDE9FE' },
    { label: 'Clientes activos', value: '1,284', change: '+8%', icon: Users, color: '#3B82F6', bg: '#EFF6FF' },
    { label: 'Tiendas activas', value: '47', change: '+2', icon: Store, color: '#F59E0B', bg: '#FFFBEB' },
    { label: 'Repartidores online', value: '23', change: '+4', icon: Bike, color: '#EC4899', bg: '#FDF2F8' },
    { label: 'Ingresos plataforma', value: '$384', change: '+10%', icon: TrendingUp, color: '#06B6D4', bg: '#F0FDFA' },
  ];

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart2 },
    { id: 'users', label: 'Usuarios', icon: Users },
    { id: 'map', label: 'Mapa', icon: Map },
    { id: 'settings', label: 'Config', icon: Settings },
  ] as const;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-16 lg:pb-0">
      <div className="pt-10 pb-5 px-4" style={{ background: 'linear-gradient(160deg, #6D28D9, #4C1D95)' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <img src={logo} alt="Rayo" className="w-8 h-8 object-contain rounded-lg" />
            <div>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>Panel Administrador</p>
              <p className="text-white font-medium">RAYO EXPRESS</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="relative">
              <Bell size={22} className="text-white" />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FFD400', fontSize: 9, color: '#111827' }}>
                7
              </span>
            </button>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ backgroundColor: 'rgba(255,212,0,0.2)' }}>
              <Shield size={12} style={{ color: '#FFD400' }} />
              <span style={{ color: '#FFD400', fontSize: 11 }}>Admin</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {[
            { label: 'Pedidos hoy', value: '287', emoji: '📦' },
            { label: 'Ventas', value: '$3.8K', emoji: '💰' },
            { label: 'Online', value: '23 🛵', emoji: '' },
          ].map((s) => (
            <div key={s.label} className="flex-1 bg-white/10 rounded-xl px-3 py-2 text-center">
              <p className="text-white font-bold text-sm">{s.value}</p>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10 }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-24">
        {activeTab === 'dashboard' && (
          <>
            <div className="px-4 pt-4 grid grid-cols-2 gap-3">
              {kpis.map((kpi) => {
                const Icon = kpi.icon;
                return (
                  <motion.div key={kpi.label} className="bg-white rounded-2xl p-4 shadow-sm" whileTap={{ scale: 0.97 }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-2" style={{ backgroundColor: kpi.bg }}>
                      <Icon size={18} style={{ color: kpi.color }} />
                    </div>
                    <p className="font-bold text-gray-900">{kpi.value}</p>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-xs text-gray-400">{kpi.label}</p>
                      <div className="flex items-center gap-0.5" style={{ color: '#22C55E' }}>
                        <ArrowUpRight size={10} />
                        <span style={{ fontSize: 10 }}>{kpi.change}</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div className="mx-4 mt-4 bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <p className="text-gray-900 font-medium text-sm">Ventas mensuales</p>
                <div className="flex items-center gap-1" style={{ color: '#22C55E' }}>
                  <TrendingUp size={13} />
                  <span className="text-xs">+73% vs año anterior</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={140}>
                <AreaChart data={salesData}>
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6D28D9" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6D28D9" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} formatter={(v: number) => [`$${v.toLocaleString()}`, 'Ventas']} />
                  <Area type="monotone" dataKey="sales" stroke="#6D28D9" strokeWidth={2.5} fill="url(#salesGrad)" dot={{ r: 3, fill: '#6D28D9', stroke: 'white', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="mx-4 mt-3 grid grid-cols-2 gap-3">
              <div className="bg-white rounded-2xl p-3 shadow-sm">
                <p className="text-gray-900 font-medium text-sm mb-3">Pedidos diarios</p>
                <ResponsiveContainer width="100%" height={100}>
                  <BarChart data={dailyOrders} barSize={12}>
                    <XAxis dataKey="day" tick={{ fontSize: 9, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', fontSize: 11 }} />
                    <Bar dataKey="orders" fill="#6D28D9" radius={[4, 4, 0, 0]}>
                      {dailyOrders.map((_, i) => (
                        <Cell key={i} fill={i === 5 ? '#FFD400' : '#EDE9FE'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-2xl p-3 shadow-sm">
                <p className="text-gray-900 font-medium text-sm mb-2">Por categoría</p>
                <div className="flex flex-col items-center">
                  <PieChart width={90} height={80}>
                    <Pie data={categoryData} cx={45} cy={40} innerRadius={22} outerRadius={38} dataKey="value" strokeWidth={0}>
                      {categoryData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                  <div className="space-y-1 w-full mt-1">
                    {categoryData.map((cat) => (
                      <div key={cat.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                          <span style={{ fontSize: 9, color: '#6B7280' }}>{cat.name}</span>
                        </div>
                        <span style={{ fontSize: 9, color: '#111827', fontWeight: 600 }}>{cat.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mx-4 mt-4">
              <p className="text-gray-900 font-medium text-sm mb-3">Pedidos recientes</p>
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                {recentOrders.map((order, i) => {
                  const si = statusInfo[order.status];
                  return (
                    <div key={order.id} className={`px-4 py-3 flex items-center gap-3 ${i > 0 ? 'border-t border-gray-50' : ''}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900 truncate">{order.client}</p>
                          <span className="text-xs text-gray-400 flex-shrink-0">{order.time}</span>
                        </div>
                        <p className="text-xs text-gray-400">{order.id} · {order.store}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-gray-900">{order.amount}</p>
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: si.bg, color: si.text }}>
                          {si.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {activeTab === 'users' && (
          <div className="px-4 pt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3 mb-2">
              {[
                { label: 'Clientes', value: '8,247', icon: '👤', color: '#3B82F6' },
                { label: 'Tiendas', value: '234', icon: '🏪', color: '#F59E0B' },
                { label: 'Repartidores', value: '89', icon: '🛵', color: '#6D28D9' },
                { label: 'Admins', value: '5', icon: '⚡', color: '#EC4899' },
              ].map((u) => (
                <div key={u.label} className="bg-white rounded-2xl p-4 shadow-sm">
                  <p style={{ fontSize: 24 }}>{u.icon}</p>
                  <p className="font-bold text-gray-900 mt-1">{u.value}</p>
                  <p className="text-xs text-gray-500">{u.label}</p>
                </div>
              ))}
            </div>

            <p className="text-gray-900 font-medium text-sm">Usuarios recientes</p>
            {[
              { name: 'María García', role: 'Cliente', status: 'active', time: 'hace 2 min' },
              { name: 'Carlos Andrade', role: 'Repartidor', status: 'active', time: 'hace 5 min' },
              { name: 'Burger King Q', role: 'Tienda', status: 'active', time: 'hace 8 min' },
              { name: 'Juan Morales', role: 'Cliente', status: 'suspended', time: 'hace 1h' },
              { name: 'Pizza Express', role: 'Tienda', status: 'pending', time: 'hace 2h' },
            ].map((user) => (
              <div key={user.name} className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#EDE9FE', fontSize: 18 }}>
                  {user.role === 'Cliente' ? '👤' : user.role === 'Repartidor' ? '🛵' : '🏪'}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-400">{user.role} · {user.time}</p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0" style={{
                  backgroundColor: user.status === 'active' ? '#D1FAE5' : user.status === 'suspended' ? '#FEE2E2' : '#FEF3C7',
                  color: user.status === 'active' ? '#065F46' : user.status === 'suspended' ? '#991B1B' : '#92400E',
                }}>
                  {user.status === 'active' ? 'Activo' : user.status === 'suspended' ? 'Suspendido' : 'Pendiente'}
                </span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'map' && (
          <div className="px-4 pt-4">
            <p className="text-gray-900 font-medium text-sm mb-3">Mapa global en vivo</p>
            <div className="rounded-2xl overflow-hidden shadow-sm" style={{ backgroundColor: '#E8F0E8', height: 320, position: 'relative' }}>
              <svg className="absolute inset-0 w-full h-full opacity-25" viewBox="0 0 100 100">
                {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((v) => (
                  <g key={v}>
                    <line x1={v} y1="0" x2={v} y2="100" stroke="#6D28D9" strokeWidth="0.3" />
                    <line x1="0" y1={v} x2="100" y2={v} stroke="#6D28D9" strokeWidth="0.3" />
                  </g>
                ))}
              </svg>
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
                <path d="M0 50 Q30 45 50 55 Q70 65 100 55" stroke="white" strokeWidth="4" fill="none" />
                <path d="M0 30 Q20 28 40 35 Q60 42 100 35" stroke="white" strokeWidth="3" fill="none" />
                <path d="M20 0 Q22 40 25 100" stroke="white" strokeWidth="3" fill="none" />
                <path d="M50 0 Q52 35 55 100" stroke="white" strokeWidth="3" fill="none" />
                <path d="M80 0 Q82 40 85 100" stroke="white" strokeWidth="3" fill="none" />
              </svg>

              {[
                { x: 15, y: 40, label: 'Carlos' },
                { x: 35, y: 60, label: 'Miguel' },
                { x: 55, y: 30, label: 'Pedro' },
                { x: 72, y: 70, label: 'José' },
                { x: 85, y: 45, label: 'Alex' },
              ].map((driver) => (
                <motion.div
                  key={driver.label}
                  className="absolute flex flex-col items-center"
                  style={{ left: `${driver.x}%`, top: `${driver.y}%`, transform: 'translate(-50%, -50%)' }}
                  animate={{ y: [0, -3, 0] }}
                  transition={{ repeat: Infinity, duration: 2, delay: Math.random() * 2 }}
                >
                  <div className="w-7 h-7 rounded-full flex items-center justify-center shadow-md border-2 border-white" style={{ backgroundColor: '#6D28D9', fontSize: 12 }}>
                    🛵
                  </div>
                </motion.div>
              ))}

              {[
                { x: 30, y: 25, emoji: '🍔' },
                { x: 60, y: 65, emoji: '🛒' },
                { x: 80, y: 30, emoji: '💊' },
              ].map((store, i) => (
                <div key={i} className="absolute flex flex-col items-center" style={{ left: `${store.x}%`, top: `${store.y}%`, transform: 'translate(-50%, -50%)' }}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center shadow-md border-2 border-white" style={{ backgroundColor: '#22C55E', fontSize: 12 }}>
                    {store.emoji}
                  </div>
                </div>
              ))}

              <div className="absolute top-3 left-3 bg-white/90 rounded-xl px-3 py-2 shadow">
                <p className="text-xs font-bold text-gray-900">🟢 23 repartidores online</p>
                <p className="text-xs text-gray-500">38 pedidos activos</p>
              </div>
            </div>

            <div className="flex gap-2 mt-3">
              {[
                { emoji: '🛵', label: 'Repartidores', count: 23, color: '#EDE9FE', text: '#6D28D9' },
                { emoji: '📦', label: 'Pedidos', count: 38, color: '#DBEAFE', text: '#1D4ED8' },
                { emoji: '🏪', label: 'Tiendas', count: 47, color: '#D1FAE5', text: '#065F46' },
              ].map((item) => (
                <div key={item.label} className="flex-1 rounded-xl p-2.5 text-center" style={{ backgroundColor: item.color }}>
                  <p style={{ fontSize: 18 }}>{item.emoji}</p>
                  <p className="font-bold text-sm" style={{ color: item.text }}>{item.count}</p>
                  <p style={{ fontSize: 10, color: item.text }}>{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="px-4 pt-4 space-y-3">
            <p className="text-gray-900 font-medium text-sm">Configuración de la plataforma</p>
            {[
              ['Costo por km', '⚙️', '$0.35/km'],
              ['Comisión plataforma', '💰', '10%'],
              ['IVA configurado', '📊', '12%'],
              ['Métodos de pago', '💳', '6 activos'],
              ['Notificaciones push', '🔔', 'Activo'],
              ['SMS', '📱', 'Desactivado'],
              ['Cupones y promociones', '🎫', '8 activos'],
              ['Gestión de zonas', '🗺️', '5 zonas'],
            ].map(([label, icon, value]) => (
              <div key={label} className="bg-white rounded-2xl px-4 py-3.5 shadow-sm flex items-center gap-3">
                <span style={{ fontSize: 20 }}>{icon}</span>
                <span className="flex-1 text-gray-700 font-medium text-sm">{label}</span>
                <span className="text-sm text-gray-500">{value}</span>
                <ChevronRight size={14} className="text-gray-300" />
              </div>
            ))}
            <button
              onClick={logout}
              className="w-full bg-red-50 rounded-2xl px-4 py-3.5 flex items-center gap-3 text-left"
            >
              <span style={{ fontSize: 20 }}>🚪</span>
              <span className="text-red-600 font-medium text-sm">Cerrar sesión</span>
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
