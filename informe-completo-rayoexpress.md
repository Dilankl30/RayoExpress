# Informe Completo — RayoExpress

**Fecha:** 2026-07-06
**Proyecto:** Plataforma de delivery multirol (cliente, repartidor, tienda, admin)
**Stack:** React 18 · TypeScript 5.7 · Vite 6 · Tailwind 4 · MUI 7 · Supabase · React Router 7 · Vitest · Playwright

---

## 1. Resumen del proyecto

RayoExpress es una plataforma de delivery con cuatro roles: **cliente**, **repartidor**, **tienda** y **administrador**. El repositorio original era una maqueta avanzada con datos hardcodeados y navegación manual por estado (`screen`). Se realizó una reestructuración completa hacia una **arquitectura modular por dominios**, se implementó el flujo completo del rol **CLIENTE** y se estableció una base de pruebas sólida.

---

## 2. Arquitectura implementada

### Estructura modular

```
src/
  app/                  → Composición: providers, router, layouts, componentes por rol
    components/
      auth/             → LoginScreen, DriverApplicationScreen, StoreApplicationScreen
      customer/         → 12 pantallas del flujo cliente (Home, Super, Promos, etc.)
      driver/           → DriverDashboard
      store/            → StoreDashboard
      admin/            → AdminDashboard
      public/           → LandingScreen
      shared/           → ProfileScreen (compartido entre roles)
      ui/               → Componentes shadcn/ui (button, card, dialog, etc.)
    layouts/            → ResponsiveLayout, BottomNav (5 tabs), DesktopSidebar
    router/             → React Router con AuthGuard y RoleGuard por rol
    providers/          → Proveedores globales (auth, cart, theme, notifications)
  modules/              → Lógica de negocio por dominio
    auth/               → Autenticación, AuthContext
    cart/               → Carrito, CartContext
    client/             → Servicios CLIENTE (addresses, favorites, profile)
    orders/             → Pedidos, máquina de estados (20 tests)
    payments/           → Pagos mockeados
    stores/             → Tiendas y productos
    delivery/           → Lógica de reparto
    notifications/      → Notificaciones, NotificationContext
    chat/               → Chat por pedido
    admin/              → Panel de administración
    audit/              → Auditoría
  shared/               → Código reusable
    lib/                → mockData (CRUD en memoria), supabase client
    types/              → Address, Promotion, Order, CartItem, etc.
    utils/              → formatters, validators
    validation/         → Esquemas de validación (27 tests)
    auth/               → rate-limiter (4 tests)
  integrations/
    supabase/           → Cliente Supabase centralizado
  test/                 → Configuración global de tests
```

### Reglas de dependencia

- `app/` compone providers, rutas y layouts.
- `modules/*` contiene la funcionalidad de negocio.
- `shared/*` contiene piezas reutilizables sin depender de dominios.
- Ningún componente visual llama directamente a Supabase.

---

## 3. Flujo CLIENTE completado (12 pantallas)

| Pantalla | Archivo | Features |
|---|---|---|
| **HomeScreen** | `customer/HomeScreen.tsx` | Tiendas, categorías, productos, tarjeta de pedido activo, buscador/filtros, estados loading/empty/error |
| **SuperScreen** | `customer/SuperScreen.tsx` | Productos tipo supermercado con categorías, loading/empty/error |
| **PromotionsScreen** | `customer/PromotionsScreen.tsx` | Promociones con badges, cards expandibles, loading/empty |
| **StoreListScreen** | `customer/StoreListScreen.tsx` | Lista de tiendas con filtros, loading/empty |
| **StoreDetailScreen** | `customer/StoreDetailScreen.tsx` | Detalle de tienda con productos |
| **CartScreen** | `customer/CartScreen.tsx` | Carrito con items, totales, botón checkout |
| **OrdersScreen** | `customer/OrdersScreen.tsx` | Lista de pedidos + filter bottom sheet + historial, loading/empty/error |
| **FavoritesScreen** | `customer/FavoritesScreen.tsx` | Tabs Tiendas/Productos, toggle favorito, empty state con CTA |
| **AddressesScreen** | `customer/AddressesScreen.tsx` | CRUD direcciones, default, dialog modal, loading/empty |
| **PersonalInfoScreen** | `customer/PersonalInfoScreen.tsx` | Editar nombre/teléfono con validación |
| **NotificationSettingsScreen** | `customer/NotificationSettingsScreen.tsx` | Configuración de notificaciones |
| **WalletScreen** | `customer/WalletScreen.tsx` | Billetera/saldo, historial de transacciones |

### Navegación CLIENTE

- **BottomNav** con 5 tabs: Inicio, Súper, Promos, Pedidos, Mi perfil
- Ruta `/super` para la sección Súper
- **ResponsiveLayout**: BottomNav en mobile, DesktopSidebar en desktop (sidebar retorna `null` para cliente)
- **ProfileScreen**: menú con acceso a Favoritos, Direcciones, Info personal, Notificaciones, Billetera

---

## 4. Tests — 142 pasando, 18 archivos, 0 fallos

### Suites de componentes (8 archivos, 28 tests)

| Archivo | Tests | Status |
|---|---|---|
| `LoginScreen.test.tsx` | 5 | ✅ |
| `HomeScreen.test.tsx` | 3 | ✅ |
| `FavoritesScreen.test.tsx` | 3 | ✅ |
| `AddressesScreen.test.tsx` | 3 | ✅ |
| `OrdersScreen.test.tsx` | 3 | ✅ |
| `PersonalInfoScreen.test.tsx` | 3 | ✅ |
| `CartScreen.test.tsx` | 3 | ✅ |
| `WalletScreen.test.tsx` | 3 | ✅ |

### Suites de módulos (10 archivos, 114 tests)

| Archivo | Tests |
|---|---|
| `order-status.machine.test.ts` | 20 |
| `order-service.test.ts` | 14 |
| `CartContext.test.tsx` | 15 |
| `AuthContext.test.tsx` | 9 |
| `formatters.test.ts` | 10 |
| `validation.test.ts` | 27 |
| `payment-service.test.ts` | 9 |
| `store-service.test.ts` | 5 |
| `auth-service.test.ts` | 3 |
| `rate-limiter.test.ts` | 4 |

### Problemas resueltos en tests

1. **Tests flaky** — 4 archivos (FavoritesScreen, AddressesScreen, PersonalInfoScreen, OrdersScreen) fallaban intermitentemente por:
   - **Causa raíz**: `user: { id: 'u1' }` como objeto inline creaba una nueva referencia en cada render, causando que `useEffect([user])` entrara en bucle infinito de re-renders.
   - **Solución**: Refactorizar todos los mocks para usar `vi.hoisted()` con una referencia estable `mockUser`.

2. **Patrón correcto para mocks**:
   ```
   const mockUser = vi.hoisted(() => ({ id: 'u1', ... }));
   vi.mock('...', () => ({ useAuth: () => ({ user: mockUser }) }));
   ```

3. **afterEach(cleanup)** reemplazó a `vi.clearAllMocks()` para evitar romper las implementaciones de mock entre tests.

4. **waitFor** para aserciones después de handlers async (`handleSave`, etc.).

---

## 5. Comandos de calidad — todos verdes

| Comando | Resultado |
|---|---|
| `npm run build` (Vite build) | ✅ Sin errores |
| `npm run typecheck` (tsc --noEmit) | ✅ Sin errores |
| `npm run lint` (ESLint) | ✅ Solo warnings pre-existentes de `@typescript-eslint/no-explicit-any`, 0 errores |
| `npm run test` (Vitest) | ✅ 142/142 tests, 18 archivos |
| `npm run format` (Prettier) | ✅ |

---

## 6. Servicios mock implementados

En `shared/lib/mockData.ts`:

- **Addresses CRUD**: `getAddresses()`, `addAddress()`, `updateAddress()`, `deleteAddress()`, `setDefaultAddress()`
- **Favorites**: `getFavorites()`, `addFavorite()`, `removeFavorite()`
- **Profile**: `getProfile()`, `updateProfile()`
- **Promotions**: `getPromotions()`
- **Store list**: `getStores()`, `getStoreById()`
- Modo mock activado via `VITE_MOCK_MODE=true` + `isSupabaseReady`

En `modules/client/application/client-service.ts`:
- Cliente servicio con fallback a mock data

---

## 7. Estado actual del repositorio

### Lo que funciona (CLIENTE)
- Login email/code OTP + Google OAuth
- Navegación completa con React Router + AuthGuard + RoleGuard
- 12 pantallas del flujo cliente con estados loading/empty/error
- BottomNav con 5 tabs
- CRUD de direcciones
- Favoritos (tiendas y productos)
- Edición de perfil
- Lista de pedidos con filtros
- Carrito de compras
- Tema oscuro/claro
- Notificaciones

### Lo que falta (próximas fases)
- Dashboard de repartidor (rutas, entregas en tiempo real)
- Dashboard de tienda (gestión de productos, pedidos entrantes)
- Dashboard de admin (reportes, aprobaciones, auditoría)
- Conexión real a Supabase (actualmente en mock mode)
- Tests E2E con Playwright
- Code splitting por rutas
- Optimización de bundle (actualmente ~840kB)

---

## 8. Línea de tiempo de commits

| Commit | Descripción |
|---|---|
| `333ecd9` | Refactor: arquitectura modular por dominios + tooling de calidad |
| `185b561` | Arquitectura modular completa + Fases 1-9 |
| `75b0265` | Aprobación tiendas/repartidores + storage + dashboards + migraciones |
| `cef8555` | Tema oscuro/claro con ThemeProvider + CSS variables |
| `9c5846d` | ThemeToggle en sidebar |
| `663a057` / `ef7405d` | Flujo completo de cliente (merge a main) |
| `f8be167` | Auditoría, tests, CI/CD, rate limiting, RLS, Google OAuth |
| `36f9601` | Login sin contraseña (OTP) |
| `68cf3f6` | Rediseño pantallas de autenticación |
| `3330a38` | Configuración real de autenticación |
| `e14c6ec` | Fix persistencia PersonalInfoScreen + tests + aria-labels |

---

## 9. Reporte de archivos modificados (última sesión)

```
19 archivos cambiados, 1476 inserciones, 715 eliminaciones

 src/app/components/customer/AddressesScreen.tsx            | +244/-110
 src/app/components/customer/FavoritesScreen.tsx            | +172/-70
 src/app/components/customer/HomeScreen.tsx                 | +237/-130
 src/app/components/customer/NotificationSettingsScreen.tsx | +125/-60
 src/app/components/customer/OrdersScreen.tsx               | +316/-120
 src/app/components/customer/PersonalInfoScreen.tsx         | +127/-55
 src/app/components/customer/PromotionsScreen.tsx           | +233/-50
 src/app/components/customer/__tests__/AddressesScreen.test | +66/-20
 src/app/components/customer/__tests__/FavoritesScreen.test | +75/-25
 src/app/components/customer/__tests__/OrdersScreen.test    | +48/-15
 src/app/components/customer/__tests__/PersonalInfoScreen   | +59/-20
 src/app/components/shared/ProfileScreen.tsx                | +149/-80
 src/app/layouts/BottomNav.tsx                              | +33/-15
 src/app/layouts/DesktopSidebar.tsx                         | +125/-60
 src/app/layouts/ResponsiveLayout.tsx                       | +29/-10
 src/app/router/index.tsx                                   | +8/-4
 src/shared/lib/mockData.ts                                 | +80/-0
 src/shared/types/index.ts                                  | +62/-0
 tsconfig.json                                              | +3/-1
```

---

## 10. Próximos pasos

1. **Dashboard de repartidor** — rutas, entregas, navegación
2. **Dashboard de admin** — reportes, gestión de usuarios/tiendas
3. **Dashboard de tienda** — gestión de tienda/proveedor
4. **Supabase real** — migrar de mock mode a base de datos real
5. **E2E con Playwright** — pruebas end-to-end
6. **Nueva funcionalidad** — lo que el usuario solicite
