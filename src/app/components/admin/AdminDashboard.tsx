import { useState, useEffect } from 'react';
import {
  TrendingUp, DollarSign, ShoppingCart, Users,
  BarChart3, LogOut, RefreshCw, Download, Store,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { useAuth } from '../../../modules/auth/context/AuthContext';
import {
  getAdminKPIs, getMonthlySales, getDailyOrders,
  getCategoryDistribution, getRecentOrders, getUserCountsByRole, getRecentUsers,
} from '../../../modules/admin/application/admin-analytics.service';
import { AdminApplications } from '../../../modules/admin/ui/AdminApplications';
import type { RecentOrder, RecentUser } from '../../../modules/admin/application/admin-analytics.service';

const PIE_COLORS = ['#6D28D9', '#22C55E', '#F59E0B', '#3B82F6', '#EF4444'];

type Tab = 'dashboard' | 'orders' | 'stores' | 'users' | 'reports' | 'applications';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: '📊' },
  { key: 'orders', label: 'Pedidos', icon: '📋' },
  { key: 'stores', label: 'Tiendas', icon: '🏪' },
  { key: 'users', label: 'Usuarios', icon: '👥' },
  { key: 'applications', label: 'Solicitudes', icon: '📝' },
  { key: 'reports', label: 'Reportes', icon: '📈' },
];

export function AdminDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [period, setPeriod] = useState('7d');
  const [kpis, setKpis] = useState({ totalSales: 0, totalOrders: 0, activeStores: 0, activeDrivers: 0, totalDrivers: 0, totalUsers: 0, avgOrderValue: 0, conversionRate: 0, pendingOrders: 0 });
  const [monthlySales, setMonthlySales] = useState<{ month: string; sales: number }[]>([]);
  const [dailyOrders, setDailyOrders] = useState<{ date: string; orders: number }[]>([]);
  const [categoryDist, setCategoryDist] = useState<{ name: string; value: number }[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [usersByRole, setUsersByRole] = useState<{ role: string; count: number }[]>([]);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [k, ms, dO, cD, rO, uR, rU] = await Promise.all([
          getAdminKPIs(),
          getMonthlySales(),
          getDailyOrders(),
          getCategoryDistribution(),
          getRecentOrders(),
          getUserCountsByRole(),
          getRecentUsers(),
        ]);
        setKpis({
          totalSales: k.salesToday,
          totalOrders: k.activeOrders,
          activeStores: k.activeStores,
          activeDrivers: k.onlineDrivers,
          totalDrivers: k.onlineDrivers,
          totalUsers: k.activeCustomers,
          avgOrderValue: k.activeOrders > 0 ? k.salesToday / k.activeOrders : 0,
          conversionRate: 0,
          pendingOrders: 0,
        });
        setMonthlySales(ms);
        setDailyOrders(dO);
        setCategoryDist(cD);
        setRecentOrders(rO);
        setUsersByRole([
          { role: 'customer', count: uR.customers },
          { role: 'store', count: uR.stores },
          { role: 'driver', count: uR.drivers },
          { role: 'admin', count: uR.admins },
        ]);
        setRecentUsers(rU);
      } catch {
        /* noop */
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [period]);

  if (activeTab === 'applications') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col pb-16 lg:pb-0">
        <header className="bg-white border-b border-gray-200 px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">Panel de control</p>
              <h1 className="text-lg font-bold text-gray-900">Solicitudes pendientes</h1>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={logout} className="p-2 rounded-lg hover:bg-red-50 text-red-400">
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </header>
        <div className="flex gap-1 px-4 py-3 bg-white border-b border-gray-100 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap ${activeTab === t.key ? 'text-white shadow-md' : 'text-gray-600 bg-gray-100'}`}
              style={activeTab === t.key ? { backgroundColor: '#6D28D9' } : {}}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <AdminApplications />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-16 lg:pb-0">
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400">Panel de control</p>
            <h1 className="text-lg font-bold text-gray-900">Admin Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="text-sm border rounded-lg px-3 py-1.5 text-gray-600 bg-white"
            >
              <option value="24h">Últimas 24h</option>
              <option value="7d">Últimos 7 días</option>
              <option value="30d">Últimos 30 días</option>
              <option value="90d">Últimos 90 días</option>
            </select>
            <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
              <RefreshCw size={18} />
            </button>
            <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
              <Download size={18} />
            </button>
            <button onClick={logout} className="p-2 rounded-lg hover:bg-red-50 text-red-400">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <div className="flex gap-1 px-4 py-3 bg-white border-b border-gray-100 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap ${activeTab === t.key ? 'text-white shadow-md' : 'text-gray-600 bg-gray-100'}`}
            style={activeTab === t.key ? { backgroundColor: '#6D28D9' } : {}}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Ventas totales', value: `$${kpis.totalSales.toFixed(2)}`, icon: DollarSign, change: '+12.5%', color: '#22C55E', bg: '#F0FDF4' },
            { label: 'Pedidos totales', value: String(kpis.totalOrders), icon: ShoppingCart, change: '+8.2%', color: '#6D28D9', bg: '#EDE9FE' },
            { label: 'Tiendas activas', value: String(kpis.activeStores), icon: Store, change: '+3.1%', color: '#F59E0B', bg: '#FFFBEB' },
            { label: 'Repartidores', value: `${kpis.activeDrivers}/${kpis.totalDrivers}`, icon: Users, change: kpis.activeDrivers > 0 ? `${Math.round(kpis.activeDrivers / (kpis.totalDrivers || 1) * 100)}% activos` : '—', color: '#3B82F6', bg: '#EFF6FF' },
          ].map((kpi) => {
            const Icon = kpi.icon;
            return (
              <div key={kpi.label} className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex justify-between mb-2">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: kpi.bg }}>
                    <Icon size={18} style={{ color: kpi.color }} />
                  </div>
                  <span className="text-xs font-medium" style={{ color: kpi.change.startsWith('+') ? '#22C55E' : '#6B7280' }}>{kpi.change}</span>
                </div>
                <p className="font-bold text-gray-900 text-lg">{kpi.value}</p>
                <p className="text-xs text-gray-400">{kpi.label}</p>
              </div>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-gray-900">Ventas mensuales</p>
              <BarChart3 size={16} className="text-gray-400" />
            </div>
            {monthlySales.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={monthlySales}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="sales" fill="#6D28D9" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-gray-400 text-center py-8">Sin datos de ventas mensuales</p>
            )}
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-gray-900">Pedidos diarios</p>
              <TrendingUp size={16} className="text-gray-400" />
            </div>
            {dailyOrders.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={dailyOrders}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="orders" stroke="#6D28D9" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-gray-400 text-center py-8">Sin datos de pedidos diarios</p>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-gray-900">Categorías populares</p>
            </div>
            {categoryDist.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={categoryDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {categoryDist.map((_, i) => (
                      <Cell key={`cell-${i}`} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-gray-400 text-center py-8">Sin datos de categorías</p>
            )}
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-gray-900">Usuarios por rol</p>
            </div>
            {usersByRole.length > 0 ? (
              <div className="space-y-3">
                {usersByRole.map((r, i) => (
                  <div key={r.role}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-600 capitalize">{r.role}</span>
                      <span className="text-gray-900 font-medium">{r.count}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{ width: `${(r.count / Math.max(...usersByRole.map((x) => x.count)) * 100)}%`, backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 text-center py-8">Sin datos de usuarios</p>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-4 pb-8">
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-gray-900">Pedidos recientes</p>
              <span className="text-xs text-gray-400">{recentOrders.length} pedidos</span>
            </div>
            {recentOrders.length > 0 ? (
              <div className="space-y-2">
                {recentOrders.slice(0, 10).map((order) => (
                  <div key={order.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#F9FAFB', fontSize: 16 }}>
                      {order.store_emoji || '📦'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <p className="text-sm text-gray-900 truncate">{order.store_name || order.id.slice(0, 8)}</p>
                        <p className="text-sm font-medium" style={{ color: '#22C55E' }}>${order.amount.toFixed(2)}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                          order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                          order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>{order.status}</span>
                        <span className="text-xs text-gray-400">{new Date(order.created_at).toLocaleDateString('es-EC')}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 text-center py-6">Sin pedidos recientes</p>
            )}
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-gray-900">Usuarios recientes</p>
              <span className="text-xs text-gray-400">{recentUsers.length} usuarios</span>
            </div>
            {recentUsers.length > 0 ? (
              <div className="space-y-2">
                {recentUsers.slice(0, 10).map((u) => (
                  <div key={u.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-medium"
                      style={{ backgroundColor: PIE_COLORS[['customer', 'store_owner', 'driver', 'admin'].indexOf(u.role) >= 0 ? ['customer', 'store_owner', 'driver', 'admin'].indexOf(u.role) : 0] }}>
                      {u.full_name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 truncate">{u.full_name || 'Usuario'}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-400">{u.email || '—'}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 capitalize">{u.role}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 text-center py-6">Sin usuarios recientes</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
