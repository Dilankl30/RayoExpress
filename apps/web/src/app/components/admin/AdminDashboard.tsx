import { Suspense, lazy, useState, useEffect, type ReactNode } from 'react';
import {
  TrendingUp, DollarSign, ShoppingCart, Users, Store, Bike,
  BarChart3, LogOut, RefreshCw, Download, Search,
  ChevronRight, Phone, Star, Clock,
  UserCheck, UserX, Trash2,
  CheckCircle, AlertTriangle, MapPinned, Mail, CalendarDays, X,
} from 'lucide-react';
import { getSupabase } from '../../../integrations/supabase/client';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { useAuth } from '../../../modules/auth/context/AuthContext';
import { getDriverHiringEnabled, setDriverHiringEnabled } from '../../../modules/app/application/app-config.service';
import { getAdminDashboardSummary } from '../../../modules/admin/application/admin-analytics.service';
import {
  searchUsers, toggleSuspend, deleteUser, getAllStores, toggleStoreStatus, getUserDetail,
  getAllDrivers, getRecentActivity,
  type AdminUser, type AdminStore, type AdminDriver, type ActivityItem, type UserDetail,
} from '../../../modules/admin/application/admin.service';
import type { AdminDashboardSummary, RecentOrder, RecentUser, DailyOrders } from '../../../modules/admin/application/admin-analytics.service';
import type { CoverageCityDraft, CoverageStorePoint } from './CoverageMapEditor';
import {
  buildCoverageZonesConfig,
  coverageZonesToLegacyArea,
  getActiveCoverageZone,
  getCoverageZoneForCity,
  isPointInAnyCoverageZone,
  isPointInCoverageZone,
  parseCoverageAreaConfig,
  parseCoverageZonesConfig,
  type CoverageZonesConfig,
} from '../../../shared/utils/coverage-area';
import { ErrorBoundary } from '../../../shared/components/ErrorBoundary';

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

const AdminApplications = lazy(() =>
  import('../../../modules/admin/ui/AdminApplications').then((module) => ({
    default: module.AdminApplications,
  })),
);

const CoverageMapEditor = lazy(() =>
  import('./CoverageMapEditor').then((module) => ({
    default: module.CoverageMapEditor,
  })),
);

function CoverageSectionFallback({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        <p className="font-semibold">Cobertura no pudo cargar</p>
        <p className="mt-1">
          Se detectó un error al abrir el editor de cobertura. Puedes reintentar sin salir del panel.
        </p>
        <p className="mt-2 font-mono text-[11px] text-red-600 break-words">{error.message}</p>
      </div>
      <button
        type="button"
        onClick={reset}
        className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold text-white"
        style={{ backgroundColor: 'var(--brand)' }}
      >
        Reintentar cobertura
      </button>
    </div>
  );
}

function CoverageMapErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary fallback={CoverageSectionFallback}>
      {children}
    </ErrorBoundary>
  );
}

function getRoleColor(role: string) {
  const roles = ['customer', 'store', 'driver', 'admin'];
  const index = roles.indexOf(role);
  return PIE_COLORS[index >= 0 ? index : 0];
}

type Tab = 'dashboard' | 'orders' | 'stores' | 'drivers' | 'users' | 'applications' | 'reports' | 'coverage';

const TABS: { key: Tab; label: string; icon: ReactNode }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: <BarChart3 size={16} /> },
  { key: 'orders', label: 'Pedidos', icon: <ShoppingCart size={16} /> },
  { key: 'stores', label: 'Tiendas', icon: <Store size={16} /> },
  { key: 'drivers', label: 'Repartidores', icon: <Bike size={16} /> },
  { key: 'users', label: 'Usuarios', icon: <Users size={16} /> },
  { key: 'applications', label: 'Solicitudes', icon: <UserCheck size={16} /> },
  { key: 'reports', label: 'Reportes', icon: <TrendingUp size={16} /> },
  { key: 'coverage', label: 'Cobertura', icon: <MapPinned size={16} /> },
];

const TZ_OPTS: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' };
const USER_PAGE_SIZE = 50;

function formatCurrency(n: number) { return n.toLocaleString('es-EC', { style: 'currency', currency: 'USD' }); }

function StatusBadge({ status }: { status: string }) {
  return <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[status] || 'bg-surface text-text-secondary'}`}>{STATUS_LABELS[status] || status}</span>;
}

function RoleBadge({ role }: { role: string }) {
  return <span className={`text-xs px-2 py-0.5 rounded-full ${ROLE_STYLES[role] || 'bg-surface text-text-secondary'}`}>{ROLE_LABELS[role] || role}</span>;
}

const DEFAULT_COVERAGE_CENTER: [number, number] = [-0.4632, -76.9892];

function isValidNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function normalizeCoveragePoint(value: unknown, fallback: [number, number]): [number, number] {
  if (Array.isArray(value) && value.length === 2 && isValidNumber(value[0]) && isValidNumber(value[1])) {
    return [value[0], value[1]];
  }

  return [fallback[0], fallback[1]];
}

function normalizeCoverageBoundary(value: unknown): [number, number][] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((point): point is [number, number] => Array.isArray(point) && point.length === 2 && isValidNumber(point[0]) && isValidNumber(point[1]))
    .map((point) => [point[0], point[1]] as [number, number]);
}

function createCoverageCityDraft(
  city: Partial<CoverageCityDraft> & Pick<CoverageCityDraft, 'id'>,
  fallbackCenter: [number, number] = DEFAULT_COVERAGE_CENTER,
): CoverageCityDraft {
  const shape = city.shape === 'polygon' ? 'polygon' : 'circle';
  const center = normalizeCoveragePoint(city.center, fallbackCenter);
  const boundary = normalizeCoverageBoundary(city.boundary);

  return {
    id: city.id,
    city_name: typeof city.city_name === 'string' && city.city_name.trim() ? city.city_name.trim() : 'Ciudad sin nombre',
    center,
    radius_km: isValidNumber(city.radius_km) && city.radius_km > 0 ? city.radius_km : 5,
    is_active: city.is_active !== false,
    shape,
    boundary: shape === 'polygon' ? boundary : [],
  };
}

function updateCoverageDraftCity(
  city: CoverageCityDraft,
  patch: Partial<CoverageCityDraft>,
): CoverageCityDraft {
  const nextShape = patch.shape ?? city.shape;
  const nextCenter = patch.center ? normalizeCoveragePoint(patch.center, city.center) : city.center;
  const nextBoundary = patch.boundary ? normalizeCoverageBoundary(patch.boundary) : city.boundary;

  return createCoverageCityDraft(
    {
      ...city,
      ...patch,
      city_name: typeof patch.city_name === 'string' ? patch.city_name : city.city_name,
      center: nextCenter,
      radius_km: isValidNumber(patch.radius_km) ? patch.radius_km : city.radius_km,
      is_active: typeof patch.is_active === 'boolean' ? patch.is_active : city.is_active,
      shape: nextShape,
      boundary: nextShape === 'polygon' ? nextBoundary : [],
    },
    city.center,
  );
}

function normalizeCoverageCoordinate(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeCoverageStorePoint(store: Partial<CoverageStorePoint> & { id: string; name: string; emoji?: string | null }): CoverageStorePoint {
  return {
    id: store.id,
    name: store.name,
    emoji: store.emoji ?? '🏬',
    latitude: normalizeCoverageCoordinate(store.latitude),
    longitude: normalizeCoverageCoordinate(store.longitude),
    city: typeof store.city === 'string' ? store.city : null,
    is_open: Boolean(store.is_open),
    inside: typeof store.inside === 'boolean' ? store.inside : undefined,
    distanceLabel: typeof store.distanceLabel === 'string' ? store.distanceLabel : undefined,
    zoneRadiusKm: normalizeCoverageCoordinate(store.zoneRadiusKm),
  };
}

function formatCoverageCoordinate(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '--';
  return value.toFixed(4);
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
  const [driverHiringEnabled, setDriverHiringEnabledState] = useState(true);

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
  const [usersPage, setUsersPage] = useState(0);
  const [usersHasMore, setUsersHasMore] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [selectedUserDetail, setSelectedUserDetail] = useState<UserDetail | null>(null);
  const [selectedUserLoading, setSelectedUserLoading] = useState(false);
  const [selectedUserError, setSelectedUserError] = useState<string | null>(null);

  // activity
  const [activity, setActivity] = useState<ActivityItem[]>([]);

  // coverage tab
  const [coverageZones, setCoverageZones] = useState<CoverageZonesConfig>(buildCoverageZonesConfig([
    { id: 'coca', city_name: 'Puerto Francisco de Orellana (El Coca)', center: [-0.4632, -76.9892], radius_km: 5, is_active: true, shape: 'circle', boundary: [] },
  ]));
  const [coverageDraft, setCoverageDraft] = useState<CoverageCityDraft[]>(
    coverageZones.cities.map((city) => createCoverageCityDraft({
      ...city,
      center: [city.center[0], city.center[1]] as [number, number],
      boundary: city.boundary?.map((point) => [point[0], point[1]] as [number, number]) ?? [],
      shape: city.shape ?? (city.boundary && city.boundary.length >= 3 ? 'polygon' : 'circle'),
    })),
  );
  const [selectedCoverageCityId, setSelectedCoverageCityId] = useState<string>(coverageZones.active_city_id ?? coverageZones.cities[0]?.id ?? '');
  const [coverageLoading, setCoverageLoading] = useState(false);
  const [savingCoverage, setSavingCoverage] = useState(false);
  const [coverageStores, setCoverageStores] = useState<CoverageStorePoint[]>([]);

  // ---- Load Coverage and Stores ----
  useEffect(() => {
    if (activeTab !== 'coverage') return;
    setCoverageLoading(true);

    const loadData = async () => {
      try {
        const supabase = getSupabase();

        const [storesRes, configRes] = await Promise.all([
          supabase.from('stores').select('id, name, emoji, latitude, longitude, city, is_open'),
          supabase.from('app_config').select('*').eq('key', 'coverage_zones').maybeSingle(),
        ]);

        if (storesRes.data) {
          setCoverageStores((storesRes.data as Array<Partial<CoverageStorePoint> & { id: string; name: string }>).map((store) => normalizeCoverageStorePoint({
            ...store,
            emoji: typeof store.emoji === 'string' ? store.emoji : undefined,
          })));
        }

        const parsedZones = parseCoverageZonesConfig(configRes.data?.value);
        const legacy = parseCoverageAreaConfig(configRes.data?.value);
        const zones = parsedZones ?? (legacy ? buildCoverageZonesConfig([{ id: 'default', city_name: legacy.city_name, center: legacy.center, radius_km: legacy.radius_km, is_active: true, shape: 'circle', boundary: [] }]) : null);

        if (zones) {
          setCoverageZones(zones);
          setCoverageDraft(zones.cities.map((city) => createCoverageCityDraft({
            ...city,
            center: [city.center[0], city.center[1]] as [number, number],
            boundary: city.boundary?.map((point) => [point[0], point[1]] as [number, number]) ?? [],
            shape: city.shape ?? (city.boundary && city.boundary.length >= 3 ? 'polygon' : 'circle'),
          })));
          setSelectedCoverageCityId(zones.active_city_id ?? zones.cities[0]?.id ?? '');
        }
      } catch (e) {
        console.error('Error loading coverage config:', e);
      } finally {
        setCoverageLoading(false);
      }
    };

    void loadData();
  }, [activeTab]);

  // ---- Load Dashboard ----
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const summary: AdminDashboardSummary = await getAdminDashboardSummary(period);
        const activeOrders = summary.kpis.activeOrders;
        const totalDrivers = summary.user_counts.drivers;
        const totalUsers = summary.user_counts.customers + summary.user_counts.stores + summary.user_counts.drivers + summary.user_counts.admins;
        const pendingOrders = summary.recent_orders.filter((order) => ['pending', 'accepted', 'preparing', 'picked_up', 'on_the_way', 'arrived'].includes(order.status)).length;
        setKpis({
          totalSales: summary.kpis.salesToday,
          totalOrders: activeOrders,
          activeStores: summary.kpis.activeStores,
          activeDrivers: summary.kpis.onlineDrivers,
          totalDrivers,
          totalUsers,
          avgOrderValue: activeOrders > 0 ? summary.kpis.salesToday / activeOrders : 0,
          conversionRate: 0,
          pendingOrders,
        });
        setMonthlySales(summary.monthly_sales);
        setDailyOrders(summary.daily_orders.map((o: DailyOrders) => ({ date: o.day, orders: o.orders })));
        setCategoryDist(summary.category_distribution);
        setRecentOrders(summary.recent_orders);
        setUsersByRole([
          { role: 'customer', count: summary.user_counts.customers },
          { role: 'store', count: summary.user_counts.stores },
          { role: 'driver', count: summary.user_counts.drivers },
          { role: 'admin', count: summary.user_counts.admins },
        ]);
        setRecentUsers(summary.recent_users);
      } catch { /* noop */ } finally { setLoading(false); }
    };
    load();
  }, [period]);

  useEffect(() => {
    getDriverHiringEnabled()
      .then(setDriverHiringEnabledState)
      .catch(() => setDriverHiringEnabledState(true));
  }, []);

  const handleToggleDriverHiring = async () => {
    const next = !driverHiringEnabled;
    setDriverHiringEnabledState(next);
    try {
      await setDriverHiringEnabled(next);
    } catch {
      setDriverHiringEnabledState(!next);
    }
  };

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
      setUsersPage(0);
      setUsersHasMore(true);
      setUsersLoading(true);
      searchUsers(userSearch, userRoleFilter || undefined, USER_PAGE_SIZE, 0)
        .then((result) => {
          setUsers(result);
          setUsersHasMore(result.length === USER_PAGE_SIZE);
        })
        .catch(() => {})
        .finally(() => setUsersLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [activeTab, userSearch, userRoleFilter]);

  const loadMoreUsers = async () => {
    const nextPage = usersPage + 1;
    setUsersLoading(true);
    try {
      const result = await searchUsers(userSearch, userRoleFilter || undefined, USER_PAGE_SIZE, nextPage * USER_PAGE_SIZE);
      setUsers((prev) => {
        const seen = new Set(prev.map((user) => user.id));
        const merged = [...prev];
        result.forEach((user) => {
          if (!seen.has(user.id)) {
            merged.push(user);
            seen.add(user.id);
          }
        });
        return merged;
      });
      setUsersPage(nextPage);
      setUsersHasMore(result.length === USER_PAGE_SIZE);
    } catch {
      // noop
    } finally {
      setUsersLoading(false);
    }
  };

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

  const handleOpenUserDetail = async (user: AdminUser) => {
    setSelectedUser(user);
    setSelectedUserDetail(null);
    setSelectedUserError(null);
    setSelectedUserLoading(true);

    try {
      const detail = await getUserDetail(user.id);
      setSelectedUserDetail(detail);
      if (!detail) setSelectedUserError('No se encontraron detalles para este usuario.');
    } catch (e) {
      setSelectedUserError(getErrorMessage(e));
    } finally {
      setSelectedUserLoading(false);
    }
  };

  const handleCloseUserDetail = () => {
    setSelectedUser(null);
    setSelectedUserDetail(null);
    setSelectedUserError(null);
    setSelectedUserLoading(false);
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

  // RENDER: Tab content

  const renderDashboard = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Ventas totales', value: formatCurrency(kpis.totalSales), icon: DollarSign, change: '+12.5%', color: '#22C55E', bg: '#F0FDF4' },
          { label: 'Pedidos totales', value: String(kpis.totalOrders), icon: ShoppingCart, change: '+8.2%', color: 'var(--brand)', bg: '#EDE9FE' },
          { label: 'Tiendas activas', value: String(kpis.activeStores), icon: Store, change: '+3.1%', color: '#F59E0B', bg: '#FFFBEB' },
          { label: 'Repartidores', value: `${kpis.activeDrivers}/${kpis.totalDrivers}`, icon: Users, change: kpis.activeDrivers > 0 ? `${Math.round(kpis.activeDrivers / Math.max(kpis.totalDrivers, 1) * 100)}% activos` : 'Sin actividad', color: '#3B82F6', bg: '#EFF6FF' },
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

      <div className="bg-card rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl bg-purple-100 text-brand flex items-center justify-center">
            <Bike size={20} />
          </div>
          <div>
            <p className="font-bold text-text-primary">Contratacion de repartidores</p>
            <p className="text-sm text-text-secondary">
              Controla si los clientes ven la opcion Trabajar con nosotros.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleToggleDriverHiring}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
            driverHiringEnabled ? 'bg-green-100 text-green-700' : 'bg-surface-hover text-text-secondary'
          }`}
        >
          {driverHiringEnabled ? 'Visible' : 'Oculto'}
        </button>
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
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-surface-hover text-xs font-bold text-text-secondary">
                    {order.store?.charAt(0)?.toUpperCase() || 'R'}
                  </div>
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
                    style={{ backgroundColor: getRoleColor(u.role) }}>
                    {u.full_name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                <p className="text-text-primary font-medium">{u.full_name || 'Sin nombre'}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-text-secondary">·</span>
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
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl" style={{ backgroundColor: '#FFFBEB' }}>{s.emoji || '🏬'}</div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-text-primary font-medium">{s.store_name}</p>
                  <p className="text-xs text-text-secondary">{s.owner_name} · {s.owner_email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleStore(s.store_id, !s.is_open)}
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${s.is_open ? 'bg-green-100 text-green-700' : 'bg-surface text-text-secondary'}`}
                >
                  {s.is_open ? 'Abierto' : 'Cerrado'}
                </button>
              </div>
              <div className="flex flex-wrap gap-3 mt-2 text-xs text-text-secondary">
                <span className="flex items-center gap-1"><ShoppingCart size={12} />{s.total_orders} pedidos</span>
                <span className="flex items-center gap-1"><DollarSign size={12} />{formatCurrency(s.total_revenue)}</span>
                <span className="flex items-center gap-1"><Store size={12} />{s.product_count} productos</span>
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
                <span className="flex items-center gap-1"><Phone size={12} />{d.phone || 'Sin teléfono'}</span>
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
            <div
              key={u.id}
              role="button"
              tabIndex={0}
              onClick={() => void handleOpenUserDetail(u)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  void handleOpenUserDetail(u);
                }
              }}
              className="flex items-center gap-3 bg-card rounded-2xl p-4 shadow-sm cursor-pointer transition hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brand/30"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-medium flex-shrink-0"
                style={{ backgroundColor: getRoleColor(u.role) }}>
                {u.full_name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-text-primary font-medium">{u.full_name || 'Sin nombre'}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-text-secondary">·</span>
                  <RoleBadge role={u.role} />
                  {u.is_suspended && <span className="text-xs px-1.5 py-0.5 rounded-full bg-danger-light text-danger">Suspendido</span>}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleToggleSuspend(u.id, !u.is_suspended);
                  }}
                  className={`p-2 rounded-lg ${u.is_suspended ? 'bg-success-light text-success hover:bg-green-100' : 'bg-danger-light text-danger hover:bg-red-100'}`}
                  title={u.is_suspended ? 'Reactivar' : 'Suspender'}
                >
                  {u.is_suspended ? <UserCheck size={16} /> : <UserX size={16} />}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteTarget(u);
                  }}
                  className="p-2 rounded-lg bg-surface-hover text-text-secondary hover:bg-red-100 hover:text-danger"
                  title="Eliminar cuenta"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
          {usersHasMore && (
            <button
              type="button"
              onClick={() => void loadMoreUsers()}
              className="w-full mt-2 rounded-2xl border border-border-light bg-card px-4 py-3 text-sm font-medium text-text-primary shadow-sm hover:bg-surface"
              disabled={usersLoading}
            >
              {usersLoading ? 'Cargando...' : 'Cargar mas usuarios'}
            </button>
          )}
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
          { label: 'Clientes', value: usersByRole.find(r => r.role === 'customer')?.count ?? 0, color: '#22C55E' },
          { label: 'Repartidores', value: usersByRole.find(r => r.role === 'driver')?.count ?? 0, color: '#3B82F6' },
          { label: 'Tiendas', value: usersByRole.find(r => r.role === 'store')?.count ?? 0, color: '#F59E0B' },
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

  const renderUserDetailModal = () => {
    if (!selectedUser) return null;
    const profile = selectedUserDetail?.profile ?? { ...selectedUser, avatar_url: null };
    const totalOrders = selectedUserDetail?.stats.total_orders ?? 0;
    const totalSpent = selectedUserDetail?.stats.total_spent ?? 0;
    const defaultAddresses = selectedUserDetail?.stats.default_addresses ?? 0;
    const lastOrderAt = selectedUserDetail?.stats.last_order_at ?? null;

    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={handleCloseUserDetail}>
        <div
          className="w-full max-w-3xl bg-card rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-4 p-5 border-b border-border-light">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wide text-text-secondary">Detalle de usuario</p>
              <h3 className="text-xl font-bold text-text-primary truncate">{profile.full_name || 'Sin nombre'}</h3>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <RoleBadge role={profile.role} />
                {profile.is_suspended && <span className="text-xs px-2 py-0.5 rounded-full bg-danger-light text-danger">Suspendido</span>}
                {!profile.is_suspended && <span className="text-xs px-2 py-0.5 rounded-full bg-success-light text-success">Activo</span>}
              </div>
            </div>
            <button
              type="button"
              onClick={handleCloseUserDetail}
              className="p-2 rounded-full bg-surface-hover text-text-secondary hover:bg-surface"
              aria-label="Cerrar detalle"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {selectedUserLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : selectedUserError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {selectedUserError}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    { label: 'Pedidos', value: totalOrders },
                    { label: 'Gastado', value: formatCurrency(totalSpent) },
                    { label: 'Direcciones', value: selectedUserDetail?.addresses.length ?? 0 },
                    { label: 'Principales', value: defaultAddresses },
                  ].map((item) => (
                    <div key={item.label} className="rounded-2xl bg-surface p-4 border border-border-light">
                      <p className="text-xs text-text-secondary">{item.label}</p>
                      <p className="text-lg font-bold text-text-primary mt-1">{item.value}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-border-light p-4">
                    <p className="text-sm font-semibold text-text-primary mb-3">Datos de contacto</p>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-start gap-3">
                        <Mail size={16} className="mt-0.5 text-text-secondary" />
                        <div>
                          <p className="text-text-secondary">Correo</p>
                          <p className="text-text-primary font-medium break-all">{profile.email || 'Sin correo'}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Phone size={16} className="mt-0.5 text-text-secondary" />
                        <div>
                          <p className="text-text-secondary">Teléfono</p>
                          <p className="text-text-primary font-medium">{profile.phone || 'Sin teléfono'}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <CalendarDays size={16} className="mt-0.5 text-text-secondary" />
                        <div>
                          <p className="text-text-secondary">Registro</p>
                          <p className="text-text-primary font-medium">
                            {profile.created_at ? new Date(profile.created_at).toLocaleString('es-EC', TZ_OPTS) : 'Sin fecha'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Clock size={16} className="mt-0.5 text-text-secondary" />
                        <div>
                          <p className="text-text-secondary">Último acceso</p>
                          <p className="text-text-primary font-medium">
                            {profile.last_sign_in ? new Date(profile.last_sign_in).toLocaleString('es-EC', TZ_OPTS) : 'Sin registro'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border-light p-4">
                    <p className="text-sm font-semibold text-text-primary mb-3">Acciones rápidas</p>
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const nextState = !profile.is_suspended;
                          void handleToggleSuspend(profile.id, nextState);
                          setSelectedUser((prev) => (prev ? { ...prev, is_suspended: nextState } : prev));
                          setSelectedUserDetail((prev) => (prev ? { ...prev, profile: { ...prev.profile, is_suspended: nextState } } : prev));
                        }}
                        className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium ${
                          profile.is_suspended ? 'bg-success text-white' : 'bg-danger text-white'
                        }`}
                      >
                        {profile.is_suspended ? <UserCheck size={16} /> : <UserX size={16} />}
                        {profile.is_suspended ? 'Reactivar usuario' : 'Suspender usuario'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteTarget(selectedUser);
                          handleCloseUserDetail();
                        }}
                        className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium bg-surface-hover text-danger"
                      >
                        <Trash2 size={16} />
                        Eliminar cuenta
                      </button>
                    </div>
                    {lastOrderAt && (
                      <p className="mt-3 text-xs text-text-secondary">
                        Último pedido: {new Date(lastOrderAt).toLocaleString('es-EC', TZ_OPTS)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-text-primary">Direcciones</p>
                    <span className="text-xs text-text-secondary">{selectedUserDetail?.addresses.length ?? 0} registradas</span>
                  </div>
                  {selectedUserDetail?.addresses.length ? (
                    <div className="space-y-2">
                      {selectedUserDetail.addresses.map((address) => (
                        <div key={address.id} className="rounded-2xl border border-border-light p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-text-primary">{address.title}</p>
                                {address.is_default && <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">Principal</span>}
                              </div>
                              <p className="text-sm text-text-secondary mt-1">{address.line1}</p>
                              {address.details && <p className="text-xs text-text-secondary mt-1">{address.details}</p>}
                            </div>
                            <MapPinned size={18} className="text-text-secondary flex-shrink-0" />
                          </div>
                          {(address.lat !== null || address.lng !== null) && (
                            <p className="text-xs text-text-secondary mt-3">
                              {address.lat !== null ? address.lat.toFixed(5) : '--'} · {address.lng !== null ? address.lng.toFixed(5) : '--'}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-text-secondary">No hay direcciones registradas.</p>
                  )}
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-semibold text-text-primary">Pedidos recientes</p>
                  {selectedUserDetail?.recent_orders.length ? (
                    <div className="space-y-2">
                      {selectedUserDetail.recent_orders.map((order) => (
                        <div key={order.id} className="rounded-2xl border border-border-light p-4 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{order.store_emoji || '🧾'}</span>
                              <p className="font-medium text-text-primary truncate">{order.store_name || 'Pedido sin tienda'}</p>
                            </div>
                            <p className="text-xs text-text-secondary mt-1">{order.delivery_address}</p>
                            <p className="text-xs text-text-secondary mt-1">
                              {new Date(order.created_at).toLocaleString('es-EC', TZ_OPTS)} · {order.items_count} items
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <StatusBadge status={order.status} />
                            <p className="font-bold text-text-primary mt-2">{formatCurrency(order.total)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-text-secondary">No hay pedidos recientes.</p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  const getErrorMessage = (e: unknown): string => {
    if (e instanceof Error && e.message) return e.message;
    if (typeof e === 'object' && e !== null && 'message' in e) {
      const message = (e as { message?: unknown }).message;
      if (typeof message === 'string') return message;
    }
    return 'Error desconocido';
  };

  const getCoverageCityDraft = (cityId: string | null | undefined) =>
    coverageDraft.find((city) => city.id === cityId)
    ?? coverageDraft.find((city) => city.is_active)
    ?? coverageDraft[0]
    ?? null;

  const handleAddCoverageCity = () => {
    const baseCity = coverageDraft.find((city) => city.id === selectedCoverageCityId)
      ?? coverageDraft.find((city) => city.is_active)
      ?? coverageDraft[0]
      ?? null;
    const id = `city-${Date.now()}`;
    const newCity = createCoverageCityDraft({
      id,
      city_name: `Nueva ciudad ${coverageDraft.length + 1}`,
      center: baseCity?.center ?? DEFAULT_COVERAGE_CENTER,
      radius_km: baseCity?.radius_km ?? 5,
      is_active: coverageDraft.length === 0,
      shape: baseCity?.shape ?? 'circle',
      boundary: baseCity?.boundary ?? [],
    }, baseCity?.center ?? DEFAULT_COVERAGE_CENTER);

    setCoverageDraft((prev) => [
      ...prev.map((city) => ({ ...city, is_active: prev.length === 0 ? false : city.is_active })),
      newCity,
    ]);
    setSelectedCoverageCityId(id);
  };

  const handleUpdateCoverageCity = (
    cityId: string,
    patch: Partial<CoverageCityDraft>,
  ) => {
    setCoverageDraft((prev) => prev.map((city) => (city.id === cityId ? updateCoverageDraftCity(city, patch) : city)));
    if (patch.is_active) setSelectedCoverageCityId(cityId);
  };

  const handleRemoveCoverageCity = (cityId: string) => {
    setCoverageDraft((prev) => {
      const next = prev.filter((city) => city.id !== cityId);
      if (next.length === 0) {
        setSelectedCoverageCityId('coca');
        return [
          {
            id: 'coca',
            city_name: 'Puerto Francisco de Orellana (El Coca)',
            center: [-0.4632, -76.9892],
            radius_km: 5,
            is_active: true,
            shape: 'circle',
            boundary: [],
          },
        ];
      }

      const activeId = next.find((city) => city.id !== cityId && city.is_active)?.id ?? next[0].id;
      setSelectedCoverageCityId(activeId);
      return next.map((city) => ({ ...city, is_active: city.id === activeId }));
    });
  };

  const handleSaveCoverage = async () => {
    setSavingCoverage(true);
    try {
      const activeId = selectedCoverageCityId || coverageDraft.find((city) => city.is_active)?.id || null;
      const nextZones = buildCoverageZonesConfig(
        coverageDraft.map((city) => createCoverageCityDraft(city)),
        activeId,
      );

      const legacyArea = coverageZonesToLegacyArea(nextZones);
      const supabase = getSupabase();
      const updatedAt = new Date().toISOString();

      const results = await Promise.all([
        supabase.from('app_config').upsert({
          key: 'coverage_zones',
          value: nextZones,
          updated_at: updatedAt,
        }),
        supabase.from('app_config').upsert({
          key: 'coverage_area',
          value: legacyArea,
          updated_at: updatedAt,
        }),
      ]);

      const failure = results.find((result) => result.error);
      if (failure?.error) throw failure.error;

      setCoverageZones(nextZones);
      setCoverageDraft(nextZones.cities.map((city) => createCoverageCityDraft({
        id: city.id,
        city_name: city.city_name,
        center: [city.center[0], city.center[1]] as [number, number],
        radius_km: city.radius_km,
        is_active: city.is_active,
        shape: city.shape ?? 'circle',
        boundary: city.boundary?.map((point) => [point[0], point[1]] as [number, number]) ?? [],
      })));
      setSelectedCoverageCityId(nextZones.active_city_id ?? nextZones.cities[0]?.id ?? '');
      alert('Cobertura guardada correctamente.');
    } catch (e) {
      console.error('Error saving coverage zones:', e);
      alert(`Error al guardar cobertura: ${getErrorMessage(e)}`);
    } finally {
      setSavingCoverage(false);
    }
  };

  const renderCoverage = () => {
    const selectedCity = getCoverageCityDraft(selectedCoverageCityId);
    if (coverageDraft.length > 0 && !selectedCity) {
      throw new Error('No se pudo resolver la ciudad seleccionada para cobertura.');
    }

    const draftCoverageZones = buildCoverageZonesConfig(
      coverageDraft.map((city) => createCoverageCityDraft(city)),
      selectedCoverageCityId || coverageDraft.find((city) => city.is_active)?.id || null,
    );
    const activeZone = getActiveCoverageZone(draftCoverageZones);

    const activeStores = coverageStores.map((store) => {
      const cityZone = getCoverageZoneForCity(store.city, draftCoverageZones);
      const zone = cityZone ?? activeZone;
      const coords = typeof store.latitude === 'number' && typeof store.longitude === 'number'
        ? [store.latitude, store.longitude] as [number, number]
        : null;
      const coverageMatch = coords ? isPointInAnyCoverageZone(coords[0], coords[1], draftCoverageZones) : null;
      const inside = coords && zone ? isPointInCoverageZone(coords[0], coords[1], zone) : false;
      const distanceLabel = coords && coverageMatch && coverageMatch.distanceKm !== null
        ? `${coverageMatch.distanceKm.toFixed(2)} km`
        : 'Sin coordenadas';

      return {
        ...store,
        zone,
        inside,
        distanceLabel,
      };
    });

    return (
      <div className="space-y-4">
        <div className="bg-card rounded-2xl p-4 shadow-sm border border-border-light">
          <h2 className="text-base font-bold text-text-primary mb-1">Cobertura por ciudad</h2>
          <p className="text-xs text-text-secondary">
            La cobertura se configura manualmente por ciudad. Puedes dibujar radios o polígonos y mantener una ciudad activa por zona.
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="bg-card rounded-2xl p-4 shadow-sm border border-border-light space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-text-primary">Ciudades</h3>
                <p className="text-[11px] text-text-secondary">
                  {coverageDraft.length} configuradas, {coverageDraft.filter((city) => city.is_active).length} activas
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddCoverageCity}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-white shadow-sm"
                style={{ backgroundColor: 'var(--brand)' }}
              >
                + Ciudad
              </button>
            </div>

            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
              {coverageDraft.map((city, index) => (
                <div
                  key={city.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedCoverageCityId(city.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') setSelectedCoverageCityId(city.id);
                  }}
                  className={`w-full rounded-2xl border p-3 text-left transition cursor-pointer ${selectedCoverageCityId === city.id ? 'border-purple-500 bg-purple-50' : 'border-border-light bg-surface hover:bg-surface-hover'}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <p className="text-xs font-semibold text-text-secondary">Ciudad {index + 1}</p>
                      <p className="text-sm font-semibold text-text-primary mt-0.5">{city.city_name || 'Ciudad sin nombre'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${city.is_active ? 'bg-green-100 text-green-700' : 'bg-surface text-text-secondary'}`}>
                        {city.is_active ? 'Activa' : 'Inactiva'}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleRemoveCoverageCity(city.id); }}
                        className="text-xs font-semibold text-red-500"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>

                  <div className="text-xs text-text-secondary">
                    {city.shape === 'polygon' ? `${city.boundary.length} puntos dibujados` : `${city.radius_km} km de radio`}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleSaveCoverage}
              disabled={savingCoverage}
              className="w-full py-3 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-1.5 shadow-md active:scale-98 transition-transform disabled:opacity-50"
              style={{ backgroundColor: 'var(--brand)' }}
            >
              {savingCoverage ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle size={16} />
                  Guardar cobertura
                </>
              )}
            </button>
          </div>

          <div className="xl:col-span-2 space-y-4">
            <div className="bg-card rounded-2xl p-4 shadow-sm border border-border-light">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-text-primary">Editor de cobertura</h3>
                  <p className="text-xs text-text-secondary">
                    {selectedCity ? `Editando ${selectedCity.city_name || 'ciudad sin nombre'}` : 'Selecciona una ciudad para dibujar su cobertura'}
                  </p>
                </div>
                <select
                  className="rounded-xl border border-border-light bg-white px-3 py-2 text-sm"
                  value={selectedCoverageCityId}
                  onChange={(e) => setSelectedCoverageCityId(e.target.value)}
                >
                  {coverageDraft.map((city) => (
                    <option key={city.id} value={city.id}>{city.city_name || 'Ciudad sin nombre'}</option>
                  ))}
                </select>
              </div>

              <CoverageMapErrorBoundary>
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center rounded-2xl border border-border-light bg-surface py-16">
                      <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                  }
                >
                  <CoverageMapEditor
                    key={selectedCity?.id || 'coverage-map'}
                    city={selectedCity}
                    stores={activeStores.map((store) => ({
                      id: store.id,
                      name: store.name,
                      emoji: store.emoji,
                      latitude: store.latitude,
                      longitude: store.longitude,
                      city: store.city,
                      is_open: store.is_open,
                      inside: store.inside,
                      distanceLabel: store.distanceLabel,
                      zoneRadiusKm: store.zone?.radius_km ?? null,
                    }))}
                    onChange={(patch) => {
                      if (!selectedCity) return;
                      handleUpdateCoverageCity(selectedCity.id, patch);
                    }}
                  />
                </Suspense>
              </CoverageMapErrorBoundary>
            </div>

            <div className="bg-card rounded-2xl p-4 shadow-sm border border-border-light">
              <div className="flex items-center justify-between border-b pb-2 mb-3">
                <h3 className="text-sm font-semibold text-text-primary">Datos de la ciudad seleccionada</h3>
              </div>

              {selectedCity ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={selectedCity.city_name}
                    onChange={(e) => handleUpdateCoverageCity(selectedCity.id, { city_name: e.target.value })}
                    className="w-full rounded-xl border border-border-light bg-white px-3 py-2 text-sm outline-none focus:border-purple-500"
                    placeholder="Nombre de ciudad"
                  />
                  <select
                    value={selectedCity.shape}
                    onChange={(e) => handleUpdateCoverageCity(selectedCity.id, { shape: e.target.value === 'polygon' ? 'polygon' : 'circle' })}
                    className="w-full rounded-xl border border-border-light bg-white px-3 py-2 text-sm outline-none focus:border-purple-500"
                  >
                    <option value="circle">Radio circular</option>
                    <option value="polygon">Polígono</option>
                  </select>
                  <input
                    type="number"
                    step="0.000001"
                    value={selectedCity.center[0]}
                    onChange={(e) => handleUpdateCoverageCity(selectedCity.id, { center: [Number(e.target.value), selectedCity.center[1]] })}
                    className="w-full rounded-xl border border-border-light bg-white px-3 py-2 text-sm outline-none focus:border-purple-500"
                    placeholder="Latitud"
                  />
                  <input
                    type="number"
                    step="0.000001"
                    value={selectedCity.center[1]}
                    onChange={(e) => handleUpdateCoverageCity(selectedCity.id, { center: [selectedCity.center[0], Number(e.target.value)] })}
                    className="w-full rounded-xl border border-border-light bg-white px-3 py-2 text-sm outline-none focus:border-purple-500"
                    placeholder="Longitud"
                  />
                  <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    value={selectedCity.radius_km}
                    onChange={(e) => handleUpdateCoverageCity(selectedCity.id, { radius_km: Number(e.target.value) })}
                    className="w-full rounded-xl border border-border-light bg-white px-3 py-2 text-sm outline-none focus:border-purple-500"
                    placeholder="Radio km"
                  />
                  <label className="inline-flex items-center gap-2 rounded-xl border border-border-light bg-surface px-3 py-2 text-sm font-medium text-text-primary">
                    <input
                      type="radio"
                      checked={selectedCity.is_active}
                      onChange={() => {
                        setCoverageDraft((prev) => prev.map((city) => ({ ...city, is_active: city.id === selectedCity.id })));
                        setSelectedCoverageCityId(selectedCity.id);
                      }}
                    />
                    Ciudad activa
                  </label>
                </div>
              ) : (
                <p className="text-sm text-text-secondary">Agrega o selecciona una ciudad para editar sus datos.</p>
              )}
            </div>

            <div className="bg-card rounded-2xl p-4 shadow-sm border border-border-light">
              <div className="flex items-center justify-between border-b pb-2 mb-3">
                <h3 className="text-sm font-semibold text-text-primary">Tiendas y cobertura</h3>
                <span className="text-xs text-text-secondary">{activeStores.length} tiendas registradas</span>
              </div>

              {coverageLoading ? (
                <div className="flex justify-center py-6">
                  <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : activeStores.length === 0 ? (
                <p className="text-xs text-text-secondary text-center py-6">No hay tiendas registradas para evaluar cobertura.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-text-secondary border-b border-border-light">
                        <th className="py-2 font-medium">Tienda</th>
                        <th className="py-2 font-medium">Ciudad</th>
                        <th className="py-2 font-medium">Estado</th>
                        <th className="py-2 font-medium">Cobertura</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-light">
                      {activeStores.map((store) => (
                        <tr key={store.id} className="hover:bg-surface/30">
                          <td className="py-3 font-medium text-text-primary">
                            <span className="mr-1">{store.emoji || '🏬'}</span>
                            {store.name}
                          </td>
                          <td className="py-3 text-text-secondary">
                            {store.city || 'Sin ciudad'}
                            <span className="block font-mono text-[9px] mt-0.5">
                              ({formatCoverageCoordinate(store.latitude)}, {formatCoverageCoordinate(store.longitude)})
                            </span>
                          </td>
                          <td className="py-3">
                            {store.zone ? (
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${store.inside ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {store.inside ? <CheckCircle size={10} /> : <AlertTriangle size={10} />}
                                {store.inside ? 'Dentro de cobertura' : 'Fuera de cobertura'}
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-surface text-text-secondary">
                                Sin zona asignada
                              </span>
                            )}
                          </td>
                          <td className="py-3 text-text-secondary">
                            {store.zone ? `${store.zone.radius_km} km` : 'N/A'}
                            <span className="block text-[10px] mt-0.5">{store.distanceLabel}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

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
        <div className="flex-1 overflow-y-auto p-4">
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-20">
                <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
              </div>
            }
          >
            <AdminApplications />
          </Suspense>
        </div>
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
        {activeTab === 'coverage' && renderCoverage()}
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
      {renderUserDetailModal()}
    </div>
  );
}

