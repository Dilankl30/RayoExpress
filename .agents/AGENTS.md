# RayoExpress - Reglas del Proyecto

## Idioma
- Siempre responder en **español**.
- El código y comentarios técnicos pueden estar en inglés.
- Los mensajes de UI, alertas y textos del usuario deben estar en **español ecuatoriano**.

## Estilo de Código
- Usar **TypeScript** estricto. No usar `any` excepto cuando es necesario para Supabase.
- Usar **arrow functions** para constantes y handlers.
- Usar **async/await** en lugar de `.then()` cuando sea posible.
- Nombres de variables y funciones en **camelCase**.
- Nombres de componentes en **PascalCase**.
- Nombres de archivos de componentes en **PascalCase** (e.g., `HomeScreen.tsx`).
- Nombres de archivos de servicios en **kebab-case** (e.g., `store-service.ts`).

## Base de Datos
- **NUNCA** hardcodear credenciales de Supabase en el código.
- Siempre usar `getSupabase()` de `src/integrations/supabase/client.ts`.
- Las migraciones SQL van en `supabase/migrations/` con numeración secuencial.
- Siempre agregar `ON CONFLICT DO NOTHING` cuando haya triggers que puedan causar duplicados.

## UI/UX
- Usar **CartoDB Voyager** como tile de mapas (NO OpenStreetMap genérico).
- Color de marca: `var(--brand)` (#6D28D9 morado).
- Diseño **mobile-first**.
- Todos los componentes deben tener `rounded-2xl` y aspecto premium.
- Usar **Lucide React** para iconos (NO Font Awesome ni otros).

## Git
- Repositorio: `https://github.com/Dilankl30/RayoExpress.git`
- Branch principal: `main`
- Siempre hacer `npm run build` y `npm run test` antes de push.

## Zona de Operación
- Ciudad actual: **Puerto Francisco de Orellana (El Coca)**, Ecuador
- Coordenadas centro: `[-0.4632, -76.9892]`
- La cobertura se configura desde el panel de Admin > Cobertura
