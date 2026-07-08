# RayoExpress 🚀

Plataforma de delivery a demanda. Conecta clientes, tiendas y repartidores.

## Tecnologías

- **Frontend:** React 19 + TypeScript + Vite 6
- **UI:** Tailwind CSS v4, shadcn/ui, lucide-react, motion
- **Backend:** Supabase (Auth, Database, Realtime, Storage)
- **Paquetería:** npm

## Instalación

```bash
npm install
```

## Configuración

1. Copia `.env.example` a `.env`
2. Completa las credenciales de Supabase:
   - `VITE_SUPABASE_URL` - URL de tu proyecto Supabase
   - `VITE_SUPABASE_ANON_KEY` - Anon key pública de Supabase

## Base de datos

Ejecutar migrations en orden:

```sql
-- 1. Schema principal
\i supabase/migrations/001_schema.sql

-- 2. Triggers y funciones
\i supabase/migrations/002_triggers.sql

-- 3. Seed data
\i supabase/migrations/003_seed.sql
```

> **Nota:** Hay migrations adicionales (004–023) que se deben aplicar en orden numérico.
> La migración `023_security_production_hardening.sql` contiene mejoras críticas de seguridad que deben aplicarse en producción antes de abrir el registro público.

## Desarrollo

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Estructura del proyecto

```
src/
├── app/          # Componentes y tipos
│   ├── components/
│   │   ├── auth/       # Login/registro
│   │   ├── customer/   # Home, tienda, carrito, tracking
│   │   ├── driver/     # Dashboard repartidor
│   │   ├── store/      # Dashboard tienda
│   │   ├── admin/      # Dashboard admin
│   │   ├── shared/     # Componentes compartidos
│   │   └── ui/         # shadcn/ui components
│   └── App.tsx
├── context/      # AuthContext, CartContext
├── services/     # API clients (supabase, auth, stores, orders)
├── styles/       # CSS
└── supabase/     # Migraciones SQL
```
