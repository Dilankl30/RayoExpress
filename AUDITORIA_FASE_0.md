# RAYOEXPRESS — AUDITORÍA FASE 0: ANÁLISIS COMPLETO DEL REPOSITORIO EXISTENTE

---

## 1. ARQUITECTURA ACTUAL

### Stack Tecnológico
- **Frontend**: React 18 + TypeScript + Vite 6 + Tailwind CSS 4 + Radix UI
- **Backend**: Serverless functions (apps/api) para webhooks, callbacks, operaciones privilegiadas
- **Base de datos**: Supabase (PostgreSQL + Auth + Realtime + Storage)
- **Monorepo**: pnpm workspace con `apps/web` y `apps/api`
- **Mobile**: Capacitor para iOS/Android
- **Testing**: Vitest (unit/integration) + Playwright (E2E)
- **Deploy**: Vercel (Frontend + API) + Supabase (Data)

### Estructura del Proyecto
```
/tmp/RayoExpress/
├── apps/
│   ├── web/                 # Frontend React (SPA + PWA)
│   │   ├── src/
│   │   │   ├── app/                    # App shell, layouts, router, components
│   │   │   ├── modules/                # Feature modules (domain-driven)
│   │   │   │   ├── admin/              # Panel administrativo
│   │   │   │   ├── auth/               # Autenticación
│   │   │   │   ├── cart/               # Carrito
│   │   │   │   ├── chat/               # Chat pedido
│   │   │   │   ├── client/             # Cliente
│   │   │   │   ├── delivery/           # Repartidor
│   │   │   │   ├── marketing/          # Publicidad
│   │   │   │   ├── notifications/      # Notificaciones
│   │   │   │   ├── orders/             # Pedidos (core)
│   │   │   │   ├── payments/           # Pagos
│   │   │   │   └── stores/             # Tiendas
│   │   │   ├── shared/                 # Shared utilities, types, components
│   │   │   └── integrations/supabase/  # Cliente Supabase
│   └── api/                 # Backend serverless (webhooks, signed uploads, etc.)
├── supabase/
│   ├── migrations/          # 40+ migraciones SQL ordenadas
│   ├── schema.sql           # Entry point
│   └── reset_and_recreate.sql
├── docs/architecture.md     # Documentación arquitectura
└── package.json             # Workspace root
```

### Modelo de Despliegue
- Frontend: Vercel Project A
- Backend API: Vercel Project B
- Data: Supabase (single source of truth)

### Reglas de Seguridad
- No secretos en código cliente
- RLS habilitado en TODAS las tablas de negocio
- Operaciones sensibles via backend API
- Storage con signed URLs o políticas server-issued

---

## 2. FUNCIONALIDADES ACTUALES

### Cliente (Customer App) — **YA IMPLEMENTADO Y COMPLEJO**
- Landing page pública con banners, categorías, tiendas destacadas
- Autenticación (email/password + mock para demo)
- Explorar tiendas y productos (StoreDetailScreen)
- Carrito de compras completo (CartScreen)
- Checkout con precios, cupones, propinas, dirección
- **Seguimiento de pedidos con mapa en tiempo real** (TrackingScreen.tsx) — *Candidato a reutilizar*
- Historial de pedidos
- Chat en tiempo real con repartidor (OrderChat)
- Favoritos, direcciones, perfil, notificaciones
- Promociones y cupones

### Repartidor (Driver App) — **YA IMPLEMENTADO**
- Dashboard con pedidos disponibles/asignados
- Tomar pedidos (claim) via RPC `driver_claim_order`
- Navegación y tracking GPS en tiempo real
- Subida de evidencia de entrega (foto + notas)
- Ganancias (hoy/semana/mes), historial semanal
- Perfil, vehículo, rating

### Tienda (Store App) — **YA IMPLEMENTADO**
- Dashboard con pedidos entrantes
- Gestión de catálogo (productos, categorías, inventario)
- Promociones y cupones
- Configuración de tienda (horarios, cobertura, delivery fee)
- Analytics básicos

### Administrador (Admin App) — **YA IMPLEMENTADO Y ROBUSTO**
- **Dashboard** con KPIs, gráficos (ventas mensuales, pedidos diarios, categorías, usuarios por rol)
- **Pedidos**: listado reciente con filtros
- **Tiendas**: listado, toggle abierto/cerrado, stats
- **Repartidores**: listado, stats (entregas, ganancias, rating), online/offline
- **Usuarios**: búsqueda, paginación, suspender/activar, eliminar, detalle completo
- **Solicitudes**: aprobación de tiendas y repartidores
- **Reportes**: actividad de plataforma
- **Cobertura**: editor de zonas de cobertura (mapa interactivo)
- **Publicidad**: gestor de banners en home
- **Configuración**: precios checkout (delivery fee, tax), contratación repartidores

---

## 3. TABLAS EXISTENTES (ESQUEMA PRINCIPAL)

### Core / Usuarios
| Tabla | Descripción | RLS |
|-------|-------------|-----|
| `profiles` | Extiende auth.users (role, full_name, phone, avatar, is_suspended) | ✅ |
| `customers` | Perfil cliente (default_address) | ✅ |
| `drivers` | Perfil repartidor (is_online, approved, rating, vehicle_type, vehicle_plate) | ✅ |
| `driver_documents` | Documentos para verificación | ✅ |
| `password_recovery_questions` | Preguntas de recuperación | ✅ |

### Tiendas y Catálogo
| Tabla | Descripción |
|-------|-------------|
| `stores` | Tiendas (owner_id, name, emoji, cover_color, is_open, min_order, delivery_fee, coverage_area, lat/lng, city, photo_url) |
| `categories` | Categorías (name, emoji, bg_color) |
| `products` | Productos (store_id, category_id, name, price, emoji, image_url, is_active) |
| `inventory` | Stock por producto (quantity, low_stock_threshold) |
| `promotions` | Cupones/promos (code, discount_type, discount_value, min_order, max_uses, dates) |
| `store_schedules` | Horarios por día de semana |

### Pedidos — **NÚCLEO DEL SISTEMA**
| Tabla | Descripción |
|-------|-------------|
| `orders` | **Tabla principal**: customer_id, store_id, driver_id, status, payment_method, subtotal, delivery_fee, discount, tax, tip, total, delivery_address, customer_delivery_code, notes |
| `order_items` | Items del pedido (product_id, product_name, product_emoji, quantity, unit_price, subtotal generated) |
| `order_status_history` | Auditoría de cambios de estado (order_id, status, changed_by, created_at) |
| `payments` | Pagos por pedido (method, amount, receipt_url, verified, verified_by) |
| `payment_transactions` | Transacciones externas (provider, provider_reference, status) |
| `delivery_codes` | **Códigos de seguimiento** (order_id unique, code, created_by) — *¡Ya existe!* |
| `delivery_evidence` | Evidencia de entrega (driver_id, image_url, notes) |

### Comunicación y Tracking
| Tabla | Descripción |
|-------|-------------|
| `chats` | Chat por pedido (customer_id, driver_id) |
| `messages` | Mensajes del chat |
| `notifications` | Notificaciones por usuario |
| `locations` | **Tracking GPS tiempo real** (user_id, order_id, lat, lng, created_at) — *¡Ya existe!* |

### Configuración y Auditoría
| Tabla | Descripción |
|-------|-------------|
| `app_config` | Configuración clave-valor (coverage_zones, checkout_pricing, etc.) |
| `audit_log` | Log de auditoría (user_id, action, entity_type, entity_id, details) |

---

## 4. ROLES EXISTENTES

| Role | Descripción | Acceso Web |
|------|-------------|------------|
| `customer` | Cliente final | Landing, Home, Explore, StoreDetail, Cart, Tracking, Orders, Promotions, Favorites, Addresses, PersonalInfo, NotificationSettings, Profile |
| `driver` | Repartidor | DriverDashboard, Profile |
| `store` | Dueño tienda | StoreAdmin, Profile |
| `admin` | Administrador | AdminDashboard (completo), Profile |

**Nota**: El sistema usa `app_role` enum en `profiles.role`. RLS policies filtran por role.

---

## 5. QUÉ PODEMOS REUTILIZAR (ALINEADO CON NUEVOS REQUERIMIENTOS)

| Componente/Feature | Estado | Comentario |
|-------------------|--------|------------|
| **TrackingScreen.tsx** | ✅ EXISTE | Mapa Leaflet + realtime driver location + progress bar + ETA + chat. **Base perfecta para `/seguimiento` público** |
| **delivery_codes table** | ✅ EXISTE | Tabla para códigos de seguimiento (order_id unique, code). **Úsala tal cual** |
| **locations table + realtime** | ✅ EXISTE | GPS driver en tiempo real via Supabase Realtime. **Reutilizar para Fase 4** |
| **order_status_history** | ✅ EXISTE | Auditoría de estados. **Extender para nuevos estados** |
| **orders table** | ✅ EXISTE | Campos: subtotal, delivery_fee, discount, tax, tip, total. **Añadir: product_total, service_fee, driver_advance, payment_status** |
| **payments table** | ✅ EXISTE | Registrar pagos. **Extender: payment_status (pending/paid), receiving_account_id** |
| **AdminDashboard Orders tab** | ✅ EXISTE | Listado pedidos con filtros. **Adaptar para nuevo flujo manual** |
| **AdminDashboard Drivers tab** | ✅ EXISTE | Stats por repartidor. **Base para liquidaciones (Fase 7)** |
| **RPC admin_get_dashboard_summary** | ✅ EXISTE | KPIs admin. **Extender para resumen económico diario** |
| **Auth + RLS + Roles** | ✅ EXISTE | Sistema robusto. **Mantener, solo ajustar policies para nuevas tablas** |
| **Mock data fallback** | ✅ EXISTE | `isSupabaseReady` + mockData para desarrollo sin BD. **Mantener patrón** |

---

## 6. QUÉ DEBEMOS MODIFICAR

### 6.1 Esquema de Base de Datos (Migraciones Nuevas)

**Tabla `orders` — AÑADIR COLUMNAS:**
```sql
-- Separar valor productos vs servicio (requerimiento #8, #31, #32)
ALTER TABLE public.orders ADD COLUMN product_total numeric(10,2) DEFAULT 0;  -- $20 productos
ALTER TABLE public.orders ADD COLUMN service_fee numeric(10,2) DEFAULT 0;     -- $4 servicio
ALTER TABLE public.orders ADD COLUMN other_charges numeric(10,2) DEFAULT 0;   -- Otros cargos opcional
ALTER TABLE public.orders ADD COLUMN discount_amount numeric(10,2) DEFAULT 0; -- Descuento opcional

-- Pago del cliente independiente del estado del pedido (requerimiento #23, #49)
ALTER TABLE public.orders ADD COLUMN payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending','paid'));

-- Cuenta receptora para transferencias (requerimiento #25, #26)
ALTER TABLE public.orders ADD COLUMN receiving_account_id uuid REFERENCES public.bank_accounts(id);

-- Adelanto del repartidor para liquidaciones (requerimiento #29)
ALTER TABLE public.orders ADD COLUMN driver_advance numeric(10,2) DEFAULT 0;

-- Referencia del código de seguimiento visible (RE-000123)
ALTER TABLE public.orders ADD COLUMN tracking_code text UNIQUE;
```

**NUEVA TABLA `bank_accounts` (requerimiento #25):**
```sql
CREATE TABLE public.bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,                    -- "Cuenta Admin", "Cuenta Repartidor Juan"
  bank_name text NOT NULL,               -- "Pichincha", "Banco Guayaquil"
  account_type text NOT NULL,            -- "corriente", "ahorros"
  account_number text NOT NULL,          -- Últimos 4 dígitos o alias
  holder_name text NOT NULL,             -- Titular
  holder_id text,                        -- Cédula/RUC
  is_active boolean DEFAULT true,
  is_default boolean DEFAULT false,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**NUEVA TABLA `driver_liquidations` (requerimiento #35, #37):**
```sql
CREATE TABLE public.driver_liquidations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES public.drivers(id),
  period_start date NOT NULL,
  period_end date NOT NULL,
  total_service_fees numeric(10,2) NOT NULL,  -- Sum of service_fee for driver's delivered orders
  driver_share numeric(10,2) NOT NULL,        -- 75% of service_fees
  admin_share numeric(10,2) NOT NULL,         -- 25% of service_fees
  total_advances numeric(10,2) DEFAULT 0,     -- Sum of driver_advance
  payments_received numeric(10,2) DEFAULT 0,  -- Pagos que el repartidor entregó al admin
  previous_balance numeric(10,2) DEFAULT 0,   -- Saldo pendiente período anterior
  net_payable numeric(10,2) NOT NULL,         -- driver_share - total_advances + previous_balance + payments_received
  status text DEFAULT 'pending' CHECK (status IN ('pending','paid','cancelled')),
  paid_at timestamptz,
  paid_by uuid REFERENCES public.profiles(id),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (driver_id, period_start, period_end)
);
```

**Modificar `order_status` enum** (requerimiento #14):
```sql
-- Estados actuales: pending, accepted, preparing, picked_up, on_the_way, arrived, delivered, cancelled, refunded
-- NUEVOS estados requeridos: confirmed, preparing, ready, picked_up, on_the_way, arrived, delivered, cancelled
-- Mapeo: pending→confirmed, accepted→preparing, preparing→ready
-- Eliminar: accepted, refunded (no necesarios en nuevo flujo)
```

### 6.2 Frontend — Rutas y Pantallas

| Cambio | Descripción |
|--------|-------------|
| **Nueva ruta pública** `/seguimiento` | Sin autenticación, solo input código + botón consultar |
| **Nueva pantalla** `PublicTrackingScreen` | Versión simplificada de `TrackingScreen` sin auth, sin chat, solo lectura |
| **AdminDashboard → Pedidos** | Cambiar formulario creación: manual, simple, sin catálogo ni carrito |
| **AdminDashboard → Nueva pestaña "Pagos"** | Filtros: pendientes de pago, pagados, cuentas bancarias |
| **AdminDashboard → Nueva pestaña "Liquidaciones"** | Resumen diario + detalle por repartidor |
| **Eliminar/ocultar** | Carrito, checkout complejo, catálogo productos en admin, registro cliente/tienda/repartidor desde web |

### 6.3 Lógica de Negocio

| Cambio | Descripción |
|--------|-------------|
| **Creación pedido admin** | Formulario manual: cliente (nombre, teléfono, dirección), detalle texto libre, restaurante texto libre, product_total, service_fee, other_charges, discount → total calculado |
| **Generación código** | Formato `RE-XXXXXX` (secuencial) + `tracking_code` en orders + entry en `delivery_codes` |
| **Generador mensajes WhatsApp** | Botón "Copiar mensaje cliente" + "Copiar mensaje repartidor" (requerimiento #41) |
| **Estados simplificados** | `confirmed` → `preparing` → `ready` → `picked_up` → `on_the_way` → `arrived` → `delivered` / `cancelled` |
| **Payment status independiente** | `payment_status`: `pending` | `paid` (separado de `order_status`) |
| **Liquidación 25/75** | Solo sobre `service_fee`, NO sobre `product_total` (requerimiento #31, #32) |

---

## 7. QUÉ DEBEMOS CREAR (NUEVO)

### 7.1 Base de Datos (Migraciones)
1. **Migración: `alter_orders_add_financial_fields.sql`** — Columnas financieras en orders
2. **Migración: `create_bank_accounts.sql`** — Tabla cuentas bancarias
3. **Migración: `create_driver_liquidations.sql`** — Tabla liquidaciones
4. **Migración: `update_order_status_enum.sql`** — Actualizar enum order_status
5. **Migración: `add_tracking_code_index.sql`** — Índice + trigger para tracking_code auto-generado
6. **Migración: `rls_bank_accounts_liquidations.sql`** — Policies RLS nuevas tablas

### 7.2 Frontend — Pantallas Públicas
1. **`PublicTrackingScreen.tsx`** — `/seguimiento` (código input → muestra pedido)
2. **`OrderDetailPublic.tsx`** — Vista detalle pedido (estado, progreso, mapa, repartidor, totales)

### 7.3 Frontend — Admin Panel
1. **`CreateOrderModal.tsx`** — Formulario crear pedido manual (cliente, detalle, restaurante, precios)
2. **`OrderDetailAdmin.tsx`** — Detalle completo admin (cliente, pedido, totales, servicio, repartidor, estado, pago, cuenta, adelanto, historial)
3. **`PaymentManagement.tsx`** — Pestaña pagos: pendientes, pagados, cuentas bancarias
4. **`LiquidationDashboard.tsx`** — Resumen diario + liquidación por repartidor
5. **`MessageGenerator.tsx`** — Generar + copiar mensaje cliente / repartidor

### 7.4 Servicios / Lógica
1. **`tracking-public.service.ts`** — Buscar pedido por tracking_code (público, rate-limited)
2. **`admin-orders.service.ts`** — Crear pedido manual, actualizar estado, generar código, mensaje WhatsApp
3. **`payment.service.ts`** — Marcar pago recibido (efectivo/transferencia), asociar cuenta
4. **`liquidation.service.ts`** — Calcular liquidaciones diarias/por repartidor, generar reporte
5. **`bank-account.service.ts`** — CRUD cuentas bancarias

### 7.5 Realtime / UX
1. **Suscripción realtime en PublicTrackingScreen** — Actualización automática estado + GPS sin refresh
2. **Progress bar component** — Estados: ✓ confirmed → ✓ preparing → ✓ ready → ✓ picked_up → ● on_the_way → ○ arrived → ○ delivered

---

## 8. MODELO DE DATOS PROPUESTO (RESUMEN)

```
┌─────────────────────────────────────────────────────────────────┐
│                        profiles (auth.users)                     │
│  id, role, full_name, phone, avatar_url, is_suspended           │
└──────────────────────────┬──────────────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│  customers    │  │   drivers     │  │    stores     │
│  (default_addr)│  │ (vehicle,     │  │  (owner_id,   │
└───────────────┘  │  rating,      │  │   coverage,   │
                   │  approved)    │  │   lat/lng)    │
                   └───────────────┘  └───────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                            orders                                │
│  id, customer_id, store_id, driver_id,                          │
│  status (confirmed|preparing|ready|picked_up|on_the_way|        │
│         arrived|delivered|cancelled),                           │
│  payment_status (pending|paid),                                 │
│  product_total, service_fee, other_charges, discount_amount,    │
│  total, delivery_address, tracking_code (RE-000123),            │
│  receiving_account_id, driver_advance, notes,                   │
│  created_at, updated_at                                         │
└──────────────────────────┬──────────────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│  order_items  │  │order_status_  │  │  payments     │
│  (descripción │  │  history      │  │  (method,     │
│   texto libre)│  │  (auditoría)  │  │   amount,     │
└───────────────┘  └───────────────┘  │   receipt,    │
                                     │   account_id) │
                                     └───────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                        bank_accounts                             │
│  id, name, bank_name, account_type, account_number,             │
│  holder_name, holder_id, is_active, is_default                  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                       driver_liquidations                        │
│  id, driver_id, period_start, period_end,                       │
│  total_service_fees, driver_share (75%), admin_share (25%),     │
│  total_advances, payments_received, previous_balance,           │
│  net_payable, status, paid_at, paid_by                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 9. PLAN DE IMPLEMENTACIÓN POR FASES

### FASE 0 — **COMPLETADA** (Esta auditoría)
- [x] Análisis completo repositorio
- [x] Documentar arquitectura, funcionalidades, tablas, roles
- [x] Identificar reutilizable vs nuevo
- [x] Definir modelo de datos propuesto
- [x] Plan de implementación

### FASE 1 — **Pedido Confirmado + Código + Estados Básicos** (Prioridad ALTA)
- [ ] Migración: `alter_orders_add_financial_fields.sql` + `update_order_status_enum.sql`
- [ ] Migración: `add_tracking_code_index.sql` (trigger auto-genera RE-XXXXXX)
- [ ] Admin: `CreateOrderModal` (formulario manual simple)
- [ ] Admin: Generar código + mensaje WhatsApp copiable
- [ ] Admin: Actualizar estado desde panel (botones rápidos)
- [ ] Types: Actualizar `OrderStatus` enum en shared/types
- [ ] Validaciones: `service-validators.ts` para nuevos campos

### FASE 2 — **Seguimiento Cliente Público** (Prioridad ALTA)
- [ ] Ruta pública `/seguimiento` (sin auth)
- [ ] `PublicTrackingScreen`: input código → buscar por `tracking_code`
- [ ] `OrderDetailPublic`: estado, progreso, detalle, totales, repartidor
- [ ] Rate limiting básico en service público
- [ ] Tests: búsqueda por código, estados, responsive mobile

### FASE 3 — **Actualización Realtime** (Prioridad MEDIA)
- [ ] Suscripción Supabase Realtime en `PublicTrackingScreen`
- [ ] Actualización automática: estado + progreso + ubicación driver
- [ ] Fallback graceful si no hay GPS (requerimiento #20)
- [ ] Optimistic UI para cambios de estado admin

### FASE 4 — **GPS y Mapa** (Prioridad MEDIA)
- [ ] Reutilizar `TrackingScreen` map components (Leaflet + react-leaflet)
- [ ] Mostrar: restaurante 📍, repartidor 🛵 (pulsando), destino 🏠
- [ ] Ruta: tienda→repartidor (sólida) + repartidor→cliente (segmentada)
- [ ] Controles: zoom, centrar repartidor, centrar destino, ajustar vista
- [ ] ETA dinámico basado en estado + distancia

### FASE 5 — **Pagos y Cuentas** (Prioridad ALTA)
- [ ] Migración: `create_bank_accounts.sql` + RLS
- [ ] Admin: CRUD cuentas bancarias (nombre, banco, tipo, titular, últimos 4)
- [ ] Admin: Marcar pago recibido (efectivo/transferencia) + seleccionar cuenta
- [ ] Admin: Filtro "Pedidos pendientes de pago" (entregados + payment_status=pending)
- [ ] Admin: Vista "Pedidos pagados" con método, cuenta, fecha
- [ ] Migración: `alter_orders_add_payment_fields.sql` (payment_status, receiving_account_id)

### FASE 6 — **Control Económico** (Prioridad ALTA)
- [ ] Admin Dashboard: Resumen diario (Pedidos, Entregados, En camino, Pendientes)
- [ ] Económico: Productos $, Servicios $, Pagos recibidos $, Pagos pendientes $
- [ ] Distribución: Admin 25% $, Repartidores 75% $ (solo sobre service_fee)
- [ ] Separar claramente: dinero productos vs dinero servicio (requerimiento #36)

### FASE 7 — **Liquidaciones** (Prioridad MEDIA)
- [ ] Migración: `create_driver_liquidations.sql` + RLS
- [ ] Liquidación diaria: resumen global + por repartidor
- [ ] Liquidación individual: pedidos, servicios, participación 75%, adelantos, pagos recibidos, liquidaciones realizadas, saldo pendiente
- [ ] Admin: Marcar liquidación pagada, registrar pago a repartidor
- [ ] Reporte exportable (CSV/PDF opcional)

---

## 10. RIESGOS Y CONSIDERACIONES

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| **Migración enum `order_status`** | ALTO | Requiere migración cuidadosa: crear nuevo enum, migrar datos, renombrar. Probar en staging primero. |
| **RLS policies nuevas tablas** | MEDIO | Copiar patrón existente: admin all, owner select/insert, driver select own. Testear exhaustivamente. |
| **Código tracking `RE-XXXXXX` colisiones** | BAJO | Usar secuencia PostgreSQL + trigger BEFORE INSERT. Formato `RE-` || LPAD(nextval, 6, '0'). |
| **Realtime público sin auth** | MEDIO | Rate limiting en edge function / middleware. Canal realtime filtrado por `tracking_code` no por `user_id`. |
| **Separación product_total vs service_fee** | ALTO | Validación estricta en formulario admin: total = product_total + service_fee + other_charges - discount. |
| **Liquidación 25/75 solo sobre service_fee** | ALTO | Tests unitarios exhaustivos. Nunca aplicar sobre product_total. |
| **Compatibilidad con datos existentes** | MEDIO | Pedidos antiguos tendrán `product_total=0, service_fee=delivery_fee`. Migración backfill opcional. |
| **Performance tracking público** | BAJO | Índice en `orders.tracking_code`. Consulta simple por PK. |
| **WhatsApp no integrado** | BAJO | Por diseño: solo "copiar mensaje". No usar WhatsApp Business API en esta fase. |

---

## 11. CRITERIOS DE ACEPTACIÓN POR FASE

### Fase 1 ✓
- Admin crea pedido manual en < 2 min
- Código `RE-XXXXXX` generado automáticamente
- Mensaje WhatsApp copiado al portapapeles
- Estado inicial `confirmed` guardado

### Fase 2 ✓
- Cliente entra a `/seguimiento`, ingresa `RE-000123`, ve su pedido
- Ve: estado, progreso, detalle, totales, repartidor
- Funciona en móvil sin autenticación

### Fase 3 ✓
- Admin cambia estado a `preparing` → cliente ve cambio sin recargar
- Driver actualiza GPS → cliente ve marker moverse en mapa

### Fase 4 ✓
- Mapa muestra 3 puntos + ruta con estilos correctos
- ETA visible y razonable
- Graceful degradation sin GPS

### Fase 5 ✓
- Admin registra cuentas bancarias
- Admin marca pago: efectivo/transferencia + cuenta receptora
- Filtro "Pendientes de pago" muestra solo entregados sin pago
- Vista "Pagados" muestra método, cuenta, fecha

### Fase 6 ✓
- Dashboard diario: 4 métricas operativas + 4 económicas + distribución 25/75
- Números cuadran: service_fees * 0.25 = admin_share, * 0.75 = driver_share

### Fase 7 ✓
- Liquidación por repartidor: 7 métricas (pedidos, servicios, 75%, adelantos, recibidos, liquidado, saldo)
- Admin puede marcar liquidación pagada
- Saldo pendiente se arrastra al siguiente período

---

## 12. COMANDOS DE VERIFICACIÓN (Post-cada-fase)

```bash
# Desde raíz del monorepo
cd /tmp/RayoExpress

# TypeScript strict check
npm run typecheck

# Lint
npm run lint

# Tests unitarios + integración
npm run test

# Build producción
npm run build

# E2E (si aplica)
npm run test:e2e
```

---

## 13. PRÓXIMOS PASOS INMEDIATOS

1. **Aprobar esta auditoría** — Confirmar alcance y prioridades
2. **Crear branch `feature/whatsapp-complement`** — Trabajo aislado
3. **Ejecutar Fase 1** — Migraciones + Admin CreateOrder + Tracking Code
4. **Validar con typecheck/lint/test/build** — Antes de continuar

---

**NOTA IMPORTANTE**: El sistema actual YA TIENE todo lo necesario para el tracking (mapa, realtime, delivery_codes, order_status_history). El trabajo principal es:
1. **Simplificar** la creación de pedidos (admin manual, sin catálogo)
2. **Exponer** el tracking públicamente por código (sin login)
3. **Añadir** campos financieros y liquidaciones (nuevas tablas/columnas)
4. **Ajustar** estados al flujo real WhatsApp→Web

No hay que reescribir el tracking ni el realtime ni la auth. Solo adaptar y extender.