import { useState, useEffect } from 'react';
import {
  TrendingUp, DollarSign, ShoppingCart, Users, Store, Bike,
  BarChart3, LogOut, RefreshCw, Download, Search,
  ChevronRight, Phone, Star, Clock,
  UserCheck, UserX, ToggleLeft, ToggleRight, Trash2,
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
import {
  searchUsers, toggleSuspend, deleteUser, getAllStores, toggleStoreStatus,
  getAllDrivers, getRecentActivity,
  type AdminUser, type AdminStore, type AdminDriver, type ActivityItem,
} from '../../../modules/admin/application/admin.service';
import { AdminApplications } from '../../../modules/admin/ui/AdminApplications';
import type { RecentOrder, RecentUser, DailyOrders } from '../../../modules/admin/application/admin-analytics.service';

const PIE_COLORS = ['var(--brand)', '#22C55E', '#F59E0B', '#3B82F6', '#EF4444'];
const STATUS_STYLES: Record<string, string> = {
  delivered: 'bg-success-light text-success', cancelled: 'bg-danger-light text-danger',
  pending: 'bg-warning-light text-warning', preparing: 'bg-blue-100 text-blue-700',
  in_transit: 'bg-purple-100 text-purple-700',
};
const STATUS_LABELS: Record<string, string> = {
  delivered: 'Entregado', cancelled: 'Cancelado', pending: 'Pendiente',
  preparing: 'Preparando', in_transit: 'En camino',
};
const ROLE_STYLES: Record<string, string> = {
  customer: 'bg-purple-100 text-purple-700', driver: 'bg-blue-100 text-blue-700',
  store: 'bg-green-100 text-green-700', admin: 'bg-red-100 text-red-700',
};
const ROLE_LABELS: Record<string, string> = {
  customer: 'Cliente', driver: 'Repartidor', store: 'Tienda', admin: 'Admin',
};

type Tab = 'dashboard' | 'orders' | 'stores' | 'drivers' | 'users' | 'applications' | 'reports';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: '📊' },
  { key: 'orders', label: 'Pedidos', icon: '📋' },
  { key: 'stores', label: 'Tiendas', icon: '🏪' },
  { key: 'drivers', label: 'Repartidores', icon: '🚴' },
  { key: 'users', label: 'Usuarios', icon: '👥' },
  { key: 'applications', label: 'Solicitudes', icon: '📝' },
  { key: 'reports', label: 'Reportes', icon: '📈' },
];

const TZ_OPTS: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' };

function formatCurrency(n: number) { return n.toLocaleString('es-EC', { style: 'currency', currency: 'USD' }); }

function StatusBadge({ status }: { status: string }) {
  return <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[status] || 'bg-surface text-text-secondary'}`}>{STATUS_LABELS[status] || status}</span>;
}

function RoleBadge({ role }: { role: string }) {
  return <span className={`text-xs px-2 py-0.5 rounded-full ${ROLE_STYLES[role] || 'bg-surface text-text-secondary'}`}>{ROLE_LABELS[role] || role}</span>;
}

export function AdminDashboard() {
  const { logout } = useAuth();
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

  // stores tab
  const [stores, setStores] = useState<AdminStore[]>([]);
  const [storesLoading, setStoresLoading] = useState(false);

  // drivers tab
  const [drivers, setDrivers] = useState<AdminDriver[]>([]);
  const [driversLoading, setDriversLoading] = useState(false);

  // users tab
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);

  // activity
  const [activity, setActivity] = useState<ActivityItem[]>([]);

  // ---- Load Dashboard ----
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [k, ms, dO, cD, rO, uR, rU] = await Promise.all([
          getAdminKPIs(), getMonthlySales(), getDailyOrders(),
          getCategoryDistribution(), getRecentOrders(), getUserCountsByRole(), getRecentUsers(),
        ]);
        setKpis({
          totalSales: k.salesToday, totalOrders: k.activeOrders, activeStores: k.activeStores,
          activeDrivers: k.onlineDrivers, totalDrivers: k.onlineDrivers, totalUsers: k.activeCustomers,
          avgOrderValue: k.activeOrders > 0 ? k.salesToday / k.activeOrders : 0, conversionRate: 0, pendingOrders: 0,
        });
        setMonthlySales(ms);
        setDailyOrders(dO.map((o: DailyOrders) => ({ date: o.day, orders: o.orders })));
        setCategoryDist(cD);
        setRecentOrders(rO);
        setUsersByRole([{ role: 'customer', count: uR.customers }, { role: 'store', count: uR.stores }, { role: 'driver', count: uR.drivers }, { role: 'admin', count: uR.admins }]);
        setRecentUsers(rU);
      } catch { /* noop */ } finally { setLoading(false); }
    };
    load();
  }, [period]);

  // ---- Load Stores ----
  useEffect(() => {
    if (activeTab !== 'stores') return;
    setStoresLoading(true);
    getAllStores().then(setStores).catch(() => {}).finally(() => setStoresLoading(false));
  }, [activeTab]);

  // ---- Load Drivers ----
  useEffect(() => {
    if (activeTab !== 'drivers') return;
    setDriversLoading(true);
    getAllDrivers().then(setDrivers).catch(() => {}).finally(() => setDriversLoading(false));
  }, [activeTab]);

  // ---- Load Users ----
  useEffect(() => {
    if (activeTab !== 'users') return;
    const t = setTimeout(() => {
      setUsersLoading(true);
      searchUsers(userSearch, userRoleFilter || undefined).then(setUsers).catch(() => {}).finally(() => setUsersLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [activeTab, userSearch, userRoleFilter]);

  // ---- Load Reports (activity) ----
  useEffect(() => {
    if (activeTab !== 'reports') return;
    getRecentActivity(50).then(setActivity).catch(() => {});
  }, [activeTab]);

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    try {
      await deleteUser(deleteTarget.id);
      setUsers(prev => prev.filter(u => u.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch { /* noop */ }
  };

  const handleToggleSuspend = async (userId: string, suspended: boolean) => {
    try {
      await toggleSuspend(userId, suspended);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_suspended: suspended } : u));
    } catch { /* noop */ }
  };

  const handleToggleStore = async (storeId: string, isOpen: boolean) => {
    try {
      await toggleStoreStatus(storeId, isOpen);
      setStores(prev => prev.map(s => s.store_id === storeId ? { ...s, is_open: isOpen } : s));
    } catch { /* noop */ }
  };

  // ──────────────────── RENDER: Tab content ────────────────────

  const renderDashboard = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Ventas totales', value: formatCurrency(kpis.totalSales), icon: DollarSign, change: '+12.5%', color: '#22C55E', bg: '#F0FDF4' },
          { label: 'Pedidos totales', value: String(kpis.totalOrders), icon: ShoppingCart, change: '+8.2%', color: 'var(--brand)', bg: '#EDE9FE' },
          { label: 'Tiendas activas', value: String(kpis.activeStores), icon: Store, change: '+3.1%', color: '#F59E0B', bg: '#FFFBEB' },
          { label: 'Repartidores', value: `${kpis.activeDrivers}/${kpis.totalDrivers}`, icon: Users, change: kpis.activeDrivers > 0 ? `${Math.round(kpis.activeDrivers / Math.max(kpis.totalDrivers, 1) * 100)}% activos` : '—', color: '#3B82F6', bg: '#EFF6FF' },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="bg-card rounded-2xl p-4 shadow-sm">
              <div className="flex justify-between mb-2">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: kpi.bg }}><Icon size={18} style={{ color: kpi.color }} /></div>
                <span className="text-xs font-medium" style={{ color: kpi.change.startsWith('+') ? '#22C55E' : '#6B7280' }}>{kpi.change}</span>
              </div>
              <p className="font-bold text-text-primary text-lg">{kpi.value}</p>
              <p className="text-xs text-text-secondary">{kpi.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-card rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-text-primary">Ventas mensuales</p>
            <BarChart3 size={16} className="text-text-secondary" />
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
          ) : <p className="text-xs text-text-secondary text-center py-8">Sin datos de ventas mensuales</p>}
        </div>
        <div className="bg-card rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-text-primary">Pedidos diarios</p>
            <TrendingUp size={16} className="text-text-secondary" />
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
          ) : <p className="text-xs text-text-secondary text-center py-8">Sin datos de pedidos diarios</p>}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-card rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-text-primary">Categorías populares</p>
          </div>
          {categoryDist.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={categoryDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {categoryDist.map((_, i) => <Cell key={`cell-${i}`} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-xs text-text-secondary text-center py-8">Sin datos de categorías</p>}
        </div>
        <div className="bg-card rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-text-primary">Usuarios por rol</p>
          </div>
          {usersByRole.length > 0 ? (
            <div className="space-y-3">
              {usersByRole.map((r, i) => (
                <div key={r.role}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-text-secondary capitalize">{r.role}</span>
                    <span className="text-text-primary font-medium">{r.count}</span>
                  </div>
                  <div className="w-full bg-surface-hover rounded-full h-2">
                    <div className="h-2 rounded-full transition-all" style={{ width: `${r.count / Math.max(...usersByRole.map(x => x.count)) * 100}%`, backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-xs text-text-secondary text-center py-8">Sin datos de usuarios</p>}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 pb-8">
        <div className="bg-card rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-text-primary">Pedidos recientes</p>
            <span className="text-xs text-text-secondary">{recentOrders.length} pedidos</span>
          </div>
          {recentOrders.length > 0 ? (
            <div className="space-y-2">
              {recentOrders.slice(0, 10).map((order) => (
                <div key={order.id} className="flex items-center gap-3 py-2 border-b border-border-light last:border-0">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#F9FAFB', fontSize: 16 }}>📦</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <p className="text-sm text-text-primary truncate">{order.store || order.id.slice(0, 8)}</p>
                      <p className="text-sm font-medium" style={{ color: '#22C55E' }}>{formatCurrency(order.amount)}</p>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <StatusBadge status={order.status} />
                      <span className="text-xs text-text-secondary">{new Date(order.created_at).toLocaleDateString('es-EC')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-xs text-text-secondary text-center py-6">Sin pedidos recientes</p>}
        </div>
        <div className="bg-card rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-text-primary">Usuarios recientes</p>
            <span className="text-xs text-text-secondary">{recentUsers.length} usuarios</span>
          </div>
          {recentUsers.length > 0 ? (
            <div className="space-y-2">
              {recentUsers.slice(0, 10).map((u) => (
                <div key={u.id} className="flex items-center gap-3 py-2 border-b border-border-light last:border-0">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-medium"
                    style={{ backgroundColor: PIE_COLORS[['customer', 'store_owner', 'driver', 'admin'].indexOf(u.role) >= 0 ? ['customer', 'store_owner', 'driver', 'admin'].indexOf(u.role) : 0] }}>
                    {u.full_name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary truncate">{u.full_name || 'Usuario'}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-text-secondary">—</span>
                      <RoleBadge role={u.role} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-xs text-text-secondary text-center py-6">Sin usuarios recientes</p>}
        </div>
      </div>
    </div>
  );

  const renderOrders = () => (
    <div className="space-y-2">
      {recentOrders.length > 0 ? recentOrders.map((order) => (
        <div key={order.id} className="bg-card rounded-2xl p-4 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-text-primary font-medium truncate max-w-[200px]">{order.store || 'Tienda'}</p>
              <p className="text-xs text-text-secondary">{order.id.slice(0, 12)}</p>
            </div>
            <p className="text-sm font-medium" style={{ color: '#22C55E' }}>{formatCurrency(order.amount)}</p>
          </div>
          <div className="flex items-center gap-3 text-xs text-text-secondary">
            <StatusBadge status={order.status} />
            <span className="flex items-center gap-1"><Clock size={12} />{new Date(order.created_at).toLocaleDateString('es-EC', TZ_OPTS)}</span>
          </div>
        </div>
      )) : <p className="text-xs text-text-secondary text-center py-10">Sin pedidos</p>}
    </div>
  );

  const renderStores = () => (
    <div className="space-y-2">
      {storesLoading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : stores.length > 0 ? stores.map((s) => (
        <div key={s.store_id} className="bg-card rounded-2xl p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl" style={{ backgroundColor: '#FFFBEB' }}>{s.emoji || '🏪'}</div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-text-primary font-medium">{s.store_name}</p>
                  <p className="text-xs text-text-secondary">{s.owner_name} · {s.owner_email}</p>
                </div>
                <button
                  onClick={() => handleToggleStore(s.store_id, !s.is_open)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium ${s.is_open ? 'bg-success-light text-success' : 'bg-surface-hover text-text-secondary'}`}
                >
                  {s.is_open ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                  {s.is_open ? 'Abierto' : 'Cerrado'}
                </button>
              </div>
              <div className="flex flex-wrap gap-3 mt-2 text-xs text-text-secondary">
                <span className="flex items-center gap-1"><ShoppingCart size={12} />{s.total_orders} pedidos</span>
                <span className="flex items-center gap-1"><DollarSign size={12} />{formatCurrency(s.total_revenue)}</span>
                <span className="flex items-center gap-1"><Store size={12} />{s.product_count} productos</span>
                <span className="flex items-center gap-1">{s.is_open ? '🟢' : '🔴'} {s.is_open ? 'Abierto' : 'Cerrado'}</span>
              </div>
            </div>
            <ChevronRight size={16} className="text-text-secondary flex-shrink-0 mt-2" />
          </div>
        </div>
      )) : <p className="text-xs text-text-secondary text-center py-10">Sin tiendas registradas</p>}
    </div>
  );

  const renderDrivers = () => (
    <div className="space-y-2">
      {driversLoading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : drivers.length > 0 ? drivers.map((d) => (
        <div key={d.driver_id} className="bg-card rounded-2xl p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: d.is_online ? '#F0FDF4' : '#F3F4F6' }}>
              <Bike size={20} style={{ color: d.is_online ? '#22C55E' : '#9CA3AF' }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-text-primary font-medium">{d.full_name}</p>
                  <p className="text-xs text-text-secondary">{d.vehicle_type} · {d.vehicle_plate || 'sin placa'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${d.is_online ? 'bg-success-light text-success' : 'bg-surface-hover text-text-secondary'}`}>
                    {d.is_online ? 'En línea' : 'Desconectado'}
                  </span>
                  {d.is_suspended && <span className="text-xs px-2 py-0.5 rounded-full bg-danger-light text-danger">Suspendido</span>}
                </div>
              </div>
              <div className="flex flex-wrap gap-3 mt-2 text-xs text-text-secondary">
                <span className="flex items-center gap-1"><Star size={12} />{d.avg_rating.toFixed(1)}</span>
                <span className="flex items-center gap-1"><ShoppingCart size={12} />{d.total_deliveries} entregas</span>
                <span className="flex items-center gap-1"><DollarSign size={12} />{formatCurrency(d.total_earned)}</span>
                <span className="flex items-center gap-1"><Phone size={12} />{d.phone || '—'}</span>
              </div>
            </div>
          </div>
        </div>
      )) : <p className="text-xs text-text-secondary text-center py-10">Sin repartidores</p>}
    </div>
  );

  const renderUsers = () => (
    <div>
      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            type="text" placeholder="Buscar por nombre o email..."
            value={userSearch} onChange={(e) => setUserSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-border text-sm bg-card"
          />
        </div>
        <select
          value={userRoleFilter} onChange={(e) => setUserRoleFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-border text-sm bg-card text-text-secondary"
        >
          <option value="">Todos</option>
          <option value="customer">Clientes</option>
          <option value="driver">Repartidores</option>
          <option value="store">Tiendas</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      {usersLoading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : users.length > 0 ? (
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.id} className="flex items-center gap-3 bg-card rounded-2xl p-4 shadow-sm">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-medium flex-shrink-0"
                style={{ backgroundColor: PIE_COLORS[['customer', 'driver', 'store', 'admin'].indexOf(u.role) >= 0 ? ['customer', 'driver', 'store', 'admin'].indexOf(u.role) : 0] }}>
                {u.full_name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-text-primary font-medium">{u.full_name || '—'}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-text-secondary">{u.email || '—'}</span>
                  <span className="text-xs text-text-secondary">·</span>
                  <RoleBadge role={u.role} />
                  {u.is_suspended && <span className="text-xs px-1.5 py-0.5 rounded-full bg-danger-light text-danger">Suspendido</span>}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleToggleSuspend(u.id, !u.is_suspended)}
                  className={`p-2 rounded-lg ${u.is_suspended ? 'bg-success-light text-success hover:bg-green-100' : 'bg-danger-light text-danger hover:bg-red-100'}`}
                  title={u.is_suspended ? 'Reactivar' : 'Suspender'}
                >
                  {u.is_suspended ? <UserCheck size={16} /> : <UserX size={16} />}
                </button>
                <button
                  onClick={() => setDeleteTarget(u)}
                  className="p-2 rounded-lg bg-surface-hover text-text-secondary hover:bg-red-100 hover:text-danger"
                  title="Eliminar cuenta"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-card rounded-2xl p-10 text-center shadow-sm">
          <Search size={32} className="mx-auto text-text-secondary" />
          <p className="text-text-secondary text-sm mt-3">{userSearch ? 'Sin resultados' : 'Sin usuarios registrados'}</p>
        </div>
      )}
    </div>
  );

  const renderReports = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {[
          { label: 'Total usuarios', value: usersByRole.reduce((a, r) => a + r.count, 0), color: '#6D28D9' },
          { label: 'Clientes', value: (usersByRole.find(r => r.role === 'customer')?.count ?? 0), color: '#22C55E' },
          { label: 'Repartidores', value: (usersByRole.find(r => r.role === 'driver')?.count ?? 0), color: '#3B82F6' },
          { label: 'Tiendas', value: (usersByRole.find(r => r.role === 'store')?.count ?? 0), color: '#F59E0B' },
          { label: 'Ventas totales', value: formatCurrency(kpis.totalSales), color: '#22C55E' },
          { label: 'Valor promedio', value: formatCurrency(kpis.avgOrderValue), color: '#6D28D9' },
        ].map((s) => (
          <div key={s.label} className="bg-card rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-text-secondary">{s.label}</p>
            <p className="text-lg font-bold text-text-primary mt-1" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium text-text-primary">Actividad reciente (plataforma)</p>
          <Download size={16} className="text-text-secondary" />
        </div>
        {activity.length > 0 ? (
          <div className="space-y-2">
            {activity.map((a, i) => (
              <div key={`${a.type}-${a.id}-${i}`} className="flex items-center gap-3 py-2 border-b border-border-light last:border-0 text-sm">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${a.type === 'order' ? 'bg-green-400' : a.type === 'driver_application' ? 'bg-blue-400' : 'bg-yellow-400'}`} />
                 <div className="flex flex-col leading-tight">
                   <span className="text-text-primary font-medium">{a.user_name || 'Sistema'}</span>
                   <span className="text-text-secondary text-xs">{a.action}</span>
                 </div>
                <span className="text-text-secondary ml-auto text-xs">{new Date(a.created_at).toLocaleDateString('es-EC', TZ_OPTS)}</span>
              </div>
            ))}
          </div>
        ) : <p className="text-xs text-text-secondary text-center py-6">Sin actividad reciente</p>}
      </div>
    </div>
  );

  // ──────────────────── MAIN RENDER ────────────────────

  if (activeTab === 'applications') {
    return (
      <div className="min-h-screen bg-surface flex flex-col pb-16 lg:pb-0">
        <header className="bg-card border-b border-border px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-text-secondary">Panel de control</p>
              <h1 className="text-lg font-bold text-text-primary">Solicitudes pendientes</h1>
            </div>
            <button onClick={logout} className="p-2 rounded-lg hover:bg-danger-light text-red-400"><LogOut size={18} /></button>
          </div>
        </header>
        <div className="flex gap-1 px-4 py-3 bg-card border-b border-border-light overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap ${activeTab === t.key ? 'text-white shadow-md' : 'text-text-secondary bg-surface-hover'}`}
              style={activeTab === t.key ? { backgroundColor: 'var(--brand)' } : {}}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-4"><AdminApplications /></div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col pb-16 lg:pb-0">
      <header className="bg-card border-b border-border px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-text-secondary">Panel de control</p>
            <h1 className="text-lg font-bold text-text-primary">Admin Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <select aria-label="Periodo" value={period} onChange={(e) => setPeriod(e.target.value)}
              className="text-sm border rounded-lg px-3 py-1.5 text-text-secondary bg-card">
              <option value="24h">Últimas 24h</option>
              <option value="7d">Últimos 7 días</option>
              <option value="30d">Últimos 30 días</option>
              <option value="90d">Últimos 90 días</option>
            </select>
            <button className="p-2 rounded-lg hover:bg-surface-hover text-text-secondary" aria-label="Actualizar"><RefreshCw size={18} /></button>
            <button className="p-2 rounded-lg hover:bg-surface-hover text-text-secondary" aria-label="Descargar"><Download size={18} /></button>
            <button onClick={logout} className="p-2 rounded-lg hover:bg-danger-light text-red-400" aria-label="Cerrar sesión"><LogOut size={18} /></button>
          </div>
        </div>
      </header>

      <div className="flex gap-1 px-4 py-3 bg-card border-b border-border-light overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap ${activeTab === t.key ? 'text-white shadow-md' : 'text-text-secondary bg-surface-hover'}`}
            style={activeTab === t.key ? { backgroundColor: 'var(--brand)' } : {}}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'orders' && renderOrders()}
        {activeTab === 'stores' && renderStores()}
        {activeTab === 'drivers' && renderDrivers()}
        {activeTab === 'users' && renderUsers()}
        {activeTab === 'reports' && renderReports()}
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setDeleteTarget(null)}>
          <div className="bg-card rounded-2xl p-5 w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-3" style={{ backgroundColor: '#FEF2F2' }}>
              <Trash2 size={28} style={{ color: 'var(--danger)' }} />
            </div>
            <p className="text-text-primary font-bold text-center text-lg">Eliminar cuenta</p>
            <p className="text-sm text-text-secondary text-center mt-1">
              ¿Eliminar la cuenta de <strong>{deleteTarget.full_name}</strong>?
            </p>
            <p className="text-xs text-text-secondary text-center mt-2">
              Se eliminará permanentemente el perfil y todos sus datos asociados. Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-3 rounded-xl text-text-secondary border border-border text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteUser}
                className="flex-1 py-3 rounded-xl text-white text-sm font-medium flex items-center justify-center gap-1"
                style={{ backgroundColor: 'var(--danger)' }}
              >
                <Trash2 size={16} /> Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
