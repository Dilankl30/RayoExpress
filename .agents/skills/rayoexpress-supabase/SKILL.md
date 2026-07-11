---
name: rayoexpress-supabase
description: Gestión de base de datos Supabase para RayoExpress. Usar cuando se necesite consultar, modificar o crear migraciones de la base de datos, crear RPCs, vistas, o políticas RLS.
---

# Skill: Supabase & Base de Datos - RayoExpress

## Conexión a Supabase

- **Proyecto**: RayoExpress
- **Región**: `us-west-2`
- **URL**: `https://yhnfrfqrxnxfxfbntfsr.supabase.co`
- **Cliente**: Importar `getSupabase()` desde `src/integrations/supabase/client.ts`

```typescript
import { getSupabase } from '../integrations/supabase/client';
const supabase = getSupabase();
```

## Esquema de Base de Datos

### Tablas principales

| Tabla | Descripción |
|-------|-------------|
| `profiles` | Perfiles de usuario (id, role, full_name, phone, avatar_url) |
| `stores` | Tiendas (owner_id, name, emoji, description, address, latitude, longitude, city, is_open, delivery_fee, min_order) |
| `products` | Productos de tiendas (store_id, name, price, category, image_url, is_active) |
| `orders` | Pedidos (customer_id, store_id, driver_id, status, total, delivery_address) |
| `order_items` | Items de pedido (order_id, product_id, quantity, price) |
| `inventory` | Inventario (product_id, stock, low_stock_threshold) |
| `addresses` | Direcciones de clientes (user_id, title, line1, lat, lng, is_default) |
| `favorites` | Favoritos (user_id, store_id) |
| `app_config` | Configuración global (key TEXT PK, value JSONB, updated_at) |
| `store_applications` | Solicitudes de tienda |
| `driver_applications` | Solicitudes de repartidor |
| `delivery_tracking` | Tracking de entregas en tiempo real |

### Roles de usuario (`profiles.role`)

- `customer` - Cliente
- `store` - Dueño de tienda
- `driver` - Repartidor
- `admin` - Administrador

### Tabla `app_config` (Configuración Global)

Patrón clave-valor para configuración persistente:

```typescript
// Leer configuración
const { data } = await supabase
  .from('app_config')
  .select('*')
  .eq('key', 'coverage_area')
  .maybeSingle();

// Guardar/actualizar configuración
await supabase.from('app_config').upsert({
  key: 'coverage_area',
  value: { center: [-0.4632, -76.9892], radius_km: 5, city_name: 'El Coca' },
  updated_at: new Date().toISOString(),
});
```

## Vistas SQL

- `admin_store_stats` - Estadísticas por tienda (store_id, store_name, is_open, emoji, total_orders, total_revenue, avg_order_value, product_count)
- `admin_driver_stats` - Estadísticas por repartidor

## Funciones RPC

- `create_product_secure(p_store_id, p_name, p_price, ...)` - Crear producto con inventario (usa `ON CONFLICT DO NOTHING` para evitar duplicados)
- `admin_delete_user(p_user_id)` - Eliminar usuario (solo admin)
- `admin_search_users(p_search, p_role, p_limit, p_offset)` - Buscar usuarios

## Seguridad (RLS)

- Lectura pública en `app_config` para todos los roles
- Escritura en `app_config` solo para `admin`
- Perfiles: cada usuario puede leer/editar su propio perfil
- Tiendas: el owner puede editar su tienda
- Pedidos: acceso basado en customer_id, store_id, o driver_id

## Migraciones

- **Ubicación**: `supabase/migrations/NNN_description.sql`
- **Numeración**: Secuencial (001, 002, ..., 028)
- **Ejecutar**: `node scripts/run-migrations-robust.mjs`

### Crear una nueva migración

1. Crear archivo: `supabase/migrations/029_mi_migracion.sql`
2. Escribir SQL (CREATE TABLE, ALTER TABLE, CREATE FUNCTION, etc.)
3. Ejecutar: `node scripts/run-migrations-robust.mjs`
