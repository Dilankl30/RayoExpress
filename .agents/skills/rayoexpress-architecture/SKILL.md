---
name: rayoexpress-architecture
description: Arquitectura y estructura del proyecto RayoExpress. Usar cuando se necesite entender la estructura del código, crear nuevos módulos, rutas, componentes, o tomar decisiones de arquitectura.
---

# Skill: Arquitectura - RayoExpress

## Stack Tecnológico

| Tecnología | Versión | Uso |
|------------|---------|-----|
| React | 19 | Framework UI |
| TypeScript | 5.x | Tipado estático |
| Vite | 6.x | Bundler y dev server |
| Capacitor | 7.x | Apps nativas (Android/iOS) |
| Supabase | - | Backend (Auth, DB, Storage) |
| Leaflet | 1.9 | Mapas interactivos |
| Recharts | - | Gráficos |
| Framer Motion | - | Animaciones (`motion/react`) |
| Tailwind CSS | - | Estilos utilitarios |
| Lucide React | - | Iconos |

## Estructura de Directorios

```
src/
├── app/                          # Capa de presentación
│   ├── components/               # Pantallas organizadas por rol
│   │   ├── admin/                # AdminDashboard.tsx
│   │   ├── auth/                 # LoginScreen, StoreApplicationScreen, DriverApplicationScreen
│   │   ├── customer/             # HomeScreen, TrackingScreen, LocationDialog, CartScreen, etc.
│   │   ├── driver/               # DriverDashboard.tsx
│   │   ├── store/                # StoreDashboard.tsx
│   │   └── public/               # LandingScreen, NotFoundScreen
│   └── router/
│       └── index.tsx             # Enrutador con rutas basadas en roles
│
├── modules/                      # Lógica de negocio (DDD-lite)
│   ├── admin/
│   │   ├── application/          # admin.service.ts, admin-analytics.service.ts
│   │   └── ui/                   # AdminApplications.tsx
│   ├── auth/
│   │   ├── application/          # auth.service.ts
│   │   └── context/              # AuthContext.tsx (Provider global)
│   ├── client/
│   │   └── application/          # client-service.ts (direcciones, favoritos, pedidos)
│   ├── driver/
│   │   └── application/          # driver.service.ts
│   └── stores/
│       ├── application/          # store-service.ts (catálogo, inventario)
│       └── ui/                   # CatalogManager.tsx, StoreSettings.tsx
│
├── shared/                       # Código compartido
│   ├── types/                    # index.ts (Address, Product, Order, Store, etc.)
│   ├── lib/                      # city.ts (geocoding), helpers
│   └── hooks/                    # Hooks compartidos
│
├── integrations/
│   └── supabase/
│       └── client.ts             # getSupabase(), isSupabaseReady
│
├── main.tsx                      # Entry point
└── App.tsx                       # Componente raíz
```

## Sistema de Autenticación

```
Supabase Auth (Google OAuth) → profiles.role → Router basado en rol
```

| Rol | Dashboard | Ruta |
|-----|-----------|------|
| `customer` | HomeScreen | `/` |
| `store` | StoreDashboard | `/store` |
| `driver` | DriverDashboard | `/driver` |
| `admin` | AdminDashboard | `/admin` |

- **AuthContext** (`src/modules/auth/context/AuthContext.tsx`): Proveedor global que maneja sesión, login, logout y rol del usuario.
- **Router** (`src/app/router/index.tsx`): Redirecciona según el rol del usuario autenticado.

## Patrones Arquitectónicos

### 1. Capa de Servicio
Toda la lógica de negocio va en `modules/*/application/*.service.ts`:

```typescript
// modules/stores/application/store-service.ts
export async function getStores(): Promise<Store[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.from('stores').select('*');
  if (error) throw error;
  return data ?? [];
}
```

### 2. Componentes de Pantalla
Las pantallas van en `app/components/<role>/`:

```typescript
// app/components/customer/HomeScreen.tsx
export function HomeScreen() {
  const [stores, setStores] = useState<Store[]>([]);
  // ...
}
```

### 3. Tipos Compartidos
Los tipos van en `shared/types/index.ts`:

```typescript
export interface Store {
  id: string;
  name: string;
  emoji: string;
  // ...
}
```

## Crear un Nuevo Módulo

1. Crear directorio: `src/modules/mi-modulo/`
2. Crear servicio: `src/modules/mi-modulo/application/mi-modulo.service.ts`
3. Crear UI (si aplica): `src/modules/mi-modulo/ui/MiComponente.tsx`
4. Crear pantalla: `src/app/components/<role>/MiScreen.tsx`
5. Agregar ruta en `src/app/router/index.tsx`
6. Crear migración SQL si se necesitan tablas nuevas

## Archivos de Configuración

| Archivo | Propósito |
|---------|-----------|
| `vite.config.ts` | Configuración de Vite (build, plugins) |
| `tsconfig.json` | Configuración de TypeScript |
| `capacitor.config.ts` | Configuración de Capacitor (appId, plugins) |
| `vercel.json` | Configuración de despliegue Vercel |
| `package.json` | Dependencias y scripts |
| `playwright.config.ts` | Configuración de tests E2E |

## Repositorio

- **GitHub**: https://github.com/Dilankl30/RayoExpress.git
- **Branch**: `main`
