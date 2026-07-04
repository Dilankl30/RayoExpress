# Informe tecnico y plan de arquitectura - RayoExpress

Fecha: 2026-07-04  
Repositorio revisado: https://github.com/Dilankl30/RayoExpress.git

## 1. Resumen ejecutivo

RayoExpress ya tiene una maqueta avanzada de frontend para una plataforma de delivery con roles de cliente, repartidor, tienda y administrador. El repositorio usa React, TypeScript, Vite, Tailwind/shadcn UI y Supabase. Tambien incluye un modelo inicial de base de datos con tablas, enums, triggers, funciones RPC y politicas RLS.

El estado actual es bueno como prototipo visual, pero todavia no es un sistema completo de produccion. La mayor brecha esta en arquitectura de aplicacion, seguridad, separacion por modulos, rutas reales, permisos por rol, validaciones, flujos completos de negocio, pruebas, observabilidad y endurecimiento de Supabase.

La recomendacion es evolucionar el proyecto hacia una arquitectura modular por dominios, manteniendo React + Supabase al inicio para avanzar rapido, pero ordenando el codigo con limites claros entre UI, casos de uso, servicios, datos y seguridad.

## 2. Estado actual del repositorio

### Tecnologias encontradas

- Frontend: React 18, TypeScript, Vite 6.
- UI: Tailwind CSS v4, componentes tipo shadcn/ui, lucide-react, motion, recharts.
- Backend actual: Supabase Auth, Database, Realtime y Storage previstos.
- Base de datos: SQL en `supabase/migrations`.
- Estado global: React Context para auth y carrito.
- Datos de demo: `src/services/mockData.ts`.

### Estructura actual relevante

```txt
src/
  app/
    App.tsx
    types.ts
    components/
      public/
      auth/
      customer/
      driver/
      store/
      admin/
      shared/
      ui/
  context/
    AuthContext.tsx
    CartContext.tsx
  services/
    auth.ts
    stores.ts
    orders.ts
    notifications.ts
    validation.ts
    supabase.ts
    mockData.ts
supabase/
  migrations/
    001_schema.sql
    002_triggers.sql
    003_seed.sql
```

### Lo que ya existe y sirve

- Pantallas base para landing, login, cliente, tienda, repartidor y administrador.
- Modelo de datos inicial bastante completo: perfiles, clientes, repartidores, tiendas, productos, inventario, promociones, pedidos, pagos, codigos de entrega, evidencias, notificaciones, chats, ubicaciones.
- Funcion RPC `create_order` con calculo de totales en servidor.
- Maquina de estados inicial para pedidos.
- Triggers para historial de estados, notificaciones, inventario y creacion de perfiles.
- Politicas RLS iniciales en tablas principales.
- Modo demo para probar sin Supabase.
- Build de produccion exitoso.

### Problemas principales detectados

- La navegacion usa estado manual (`screen`) en vez de rutas reales con proteccion por rol.
- El frontend mezcla maqueta, datos mock, servicios reales y logica de negocio.
- No hay estructura modular por dominio. Hay carpetas por tipo tecnico, no por funcionalidad.
- Los dashboards de admin, tienda y repartidor usan muchos datos hardcodeados.
- Faltan CRUD reales para tienda, productos, inventario, horarios, documentos y configuracion.
- Las politicas RLS no cubren todas las tablas habilitadas.
- La recuperacion por pregunta de seguridad usa SHA-256 simple en cliente; para produccion no es suficiente.
- El rol se puede enviar desde metadata en registro; debe validarse con reglas de negocio.
- Falta tipado generado desde Supabase.
- Falta test unitario, test de integracion, test E2E y validacion de migraciones.
- Hay vulnerabilidades reportadas por `npm audit`.
- El bundle final JS es grande: `840.19 kB` minificado.

## 3. Resultado de verificacion tecnica

### Build

Comando ejecutado:

```bash
npm run build
```

Resultado: exitoso.

Advertencia:

- El bundle principal supera 500 kB.
- Se recomienda code splitting por rutas y modulos.

### Seguridad de dependencias

Comando ejecutado:

```bash
npm audit --audit-level=low
```

Resultado:

- 4 vulnerabilidades.
- 2 bajas.
- 2 altas.

Dependencias afectadas:

- `@supabase/supabase-js` por `@supabase/auth-js`.
- `react-router`.
- `vite`.

Accion recomendada:

- Actualizar dependencias con pruebas de regresion.
- No aplicar `npm audit fix --force` sin revisar cambios, porque sube versiones fuera del rango declarado.

## 4. Arquitectura profesional propuesta

### Objetivo

Construir un sistema modular, seguro y mantenible donde cada dominio tenga su propia UI, casos de uso, validaciones, servicios, tipos y pruebas.

### Capas recomendadas

```txt
src/
  app/
    providers/
    router/
    layouts/
    config/
  shared/
    ui/
    lib/
    api/
    hooks/
    types/
    validation/
  modules/
    auth/
    customer/
    stores/
    catalog/
    cart/
    orders/
    payments/
    delivery/
    tracking/
    notifications/
    chat/
    admin/
    reports/
  integrations/
    supabase/
    maps/
    payments/
    storage/
  test/
```

### Regla de dependencias

- `app` compone providers, rutas y layouts.
- `modules/*` contiene funcionalidad de negocio.
- `shared/*` contiene piezas reutilizables sin depender de dominios.
- `integrations/*` encapsula servicios externos.
- Ningun componente visual debe llamar directamente a Supabase si existe un caso de uso o servicio del modulo.

### Ejemplo por modulo

```txt
src/modules/orders/
  domain/
    order.types.ts
    order-status.machine.ts
    order.rules.ts
  application/
    create-order.use-case.ts
    update-order-status.use-case.ts
    assign-driver.use-case.ts
  data/
    orders.repository.ts
    orders.mappers.ts
  ui/
    OrderCard.tsx
    OrderStatusBadge.tsx
    screens/
      CustomerOrdersPage.tsx
      StoreOrdersPage.tsx
      DriverOrdersPage.tsx
  tests/
    order.rules.test.ts
    create-order.use-case.test.ts
```

## 5. Arquitectura backend con Supabase

### Mantener Supabase, pero endurecido

Supabase es una buena eleccion para esta etapa porque ya esta integrado y permite avanzar rapido con Auth, Postgres, Storage, Realtime y Edge Functions.

Uso recomendado:

- Supabase Auth para login, sesiones, OAuth y OTP.
- Postgres para datos transaccionales.
- RLS para autorizacion fina.
- RPC para operaciones criticas: crear pedido, aceptar pedido, asignar repartidor, verificar entrega, aplicar cupon.
- Storage para documentos, comprobantes, imagenes de productos y evidencia de entrega.
- Realtime para estado de pedidos, ubicacion, chat y notificaciones.
- Edge Functions para integraciones externas: pagos, notificaciones push, mapas, webhooks.

### Operaciones que no deben quedarse solo en frontend

- Calculo de totales.
- Aplicacion de cupones.
- Validacion de stock.
- Asignacion de repartidor.
- Cambio de estado de pedidos.
- Verificacion de pago.
- Aprobacion de documentos.
- Cierre o suspension de cuentas.
- Generacion y validacion de codigos de entrega.

## 6. Seguridad requerida

### Autenticacion

- Email/password con politicas fuertes.
- OAuth opcional con Google/Facebook.
- OTP por telefono si se configura proveedor SMS.
- Recuperacion oficial de Supabase por email.
- Evitar preguntas de seguridad como mecanismo principal. Si se mantienen, deben ser secundarias y con hashing fuerte del lado servidor.

### Autorizacion

Roles:

- `customer`: compra y consulta sus pedidos.
- `driver`: recibe pedidos asignados o disponibles, actualiza estados permitidos, envia ubicacion y evidencia.
- `store`: administra su tienda, productos, inventario, horarios y pedidos de su tienda.
- `admin`: administra usuarios, tiendas, repartidores, zonas, comisiones, reportes y auditoria.

Acciones sensibles:

- Un usuario no debe poder elegirse `admin` desde el registro publico.
- Repartidores deben pasar por aprobacion.
- Tiendas deben pasar por aprobacion antes de vender.
- Cambios de rol solo por admin o proceso interno.
- RLS debe cubrir todas las tablas con `enable row level security`.

### Datos y privacidad

- No guardar contrasenas ni respuestas sensibles en texto plano.
- No exponer datos personales de cliente a tiendas mas alla de lo necesario.
- Limitar visibilidad de ubicacion solo durante pedidos activos.
- Usar buckets privados para documentos, comprobantes y evidencias.
- URLs firmadas para archivos privados.
- Auditoria para cambios de rol, estados, pagos y suspensiones.

### Seguridad tecnica

- Validar `.env` al iniciar.
- Actualizar dependencias vulnerables.
- Agregar CSP y headers de seguridad en hosting.
- Rate limiting para login, OTP, creacion de pedidos y chat.
- Sanitizar entradas de usuario.
- Tipar respuestas de Supabase.
- Manejar errores sin filtrar informacion interna.

## 7. Casos de uso principales

### Cliente

- Registrarse e iniciar sesion.
- Completar perfil y direccion.
- Ver tiendas abiertas por categoria/zona.
- Buscar productos.
- Ver detalle de tienda.
- Agregar productos al carrito.
- Crear pedido con metodo de pago.
- Subir comprobante si paga por transferencia.
- Consultar estado del pedido en tiempo real.
- Ver ubicacion del repartidor.
- Recibir notificaciones.
- Chatear con repartidor/soporte.
- Confirmar entrega con codigo.
- Calificar pedido y repartidor.
- Ver historial.

### Tienda

- Registrarse como tienda.
- Completar informacion comercial.
- Esperar aprobacion.
- Abrir/cerrar tienda.
- Configurar horarios y zona de cobertura.
- Crear categorias y productos.
- Gestionar stock.
- Recibir pedidos.
- Aceptar/rechazar pedido.
- Marcar preparando y listo para recoger.
- Ver ventas y productos mas vendidos.
- Gestionar promociones.

### Repartidor

- Registrarse como repartidor.
- Subir documentos.
- Esperar aprobacion.
- Activarse/desactivarse.
- Compartir ubicacion.
- Recibir o tomar pedidos.
- Aceptar/rechazar pedido.
- Ver ruta de retiro y entrega.
- Cambiar estados permitidos.
- Subir evidencia de entrega.
- Ver ganancias e historial.

### Administrador

- Ver dashboard global.
- Aprobar/suspender tiendas.
- Aprobar/suspender repartidores.
- Ver usuarios.
- Gestionar pedidos conflictivos.
- Ver mapa operativo.
- Configurar comisiones, tarifas, zonas e impuestos.
- Gestionar promociones globales.
- Revisar pagos y comprobantes.
- Ver reportes financieros.
- Auditar eventos.

## 8. Modelo de datos recomendado

El modelo actual es buen punto de partida. Se recomienda ajustar o agregar:

- `addresses`: multiples direcciones por cliente con lat/lng.
- `store_applications`: solicitud y aprobacion de tiendas.
- `driver_applications`: solicitud y aprobacion de repartidores.
- `audit_logs`: auditoria de acciones sensibles.
- `payment_transactions`: estado externo de pago, referencia, proveedor, webhook.
- `reviews`: calificaciones de pedido, tienda y repartidor.
- `support_tickets`: incidencias y soporte.
- `zones`: zonas operativas, tarifas, cobertura.
- `delivery_assignments`: historial de intentos/asignaciones de repartidores.
- `platform_settings`: comisiones, IVA, tarifas base, limites.
- `order_events`: evento general para tracking y auditoria, ademas del historial de estado.

## 9. Tecnologias recomendadas

### Mantener

- React + TypeScript.
- Vite.
- Supabase.
- Tailwind CSS.
- shadcn/ui/Radix.
- lucide-react.
- Recharts para dashboards.

### Agregar

- React Router para rutas reales y lazy loading.
- TanStack Query para cache, carga, mutaciones y estados remotos.
- Zod para validaciones y esquemas.
- React Hook Form para formularios.
- Vitest + Testing Library para unit/component tests.
- Playwright para E2E.
- Supabase CLI para migraciones locales y tipos.
- ESLint + Prettier.
- Husky/lint-staged opcional para calidad antes de commits.
- Sentry o similar para errores.
- Mapbox, Google Maps o Leaflet segun presupuesto.
- Web Push/Firebase Cloud Messaging para notificaciones push si aplica.

### Decisiones importantes

- No crear backend Node separado al inicio salvo que aparezcan reglas complejas que Supabase Edge Functions no cubran bien.
- Usar RPC/Edge Functions para operaciones criticas.
- Separar demo/mock del modo produccion mediante adaptadores o fixtures de desarrollo.
- Generar tipos desde Supabase para evitar duplicar manualmente `Database`.

## 10. Backlog de tareas por orden

### Fase 1 - Base tecnica y seguridad minima

1. Actualizar dependencias vulnerables y verificar build.
2. Agregar ESLint, Prettier, Vitest y scripts de calidad.
3. Crear estructura modular `app`, `shared`, `modules`, `integrations`.
4. Migrar cliente Supabase a `integrations/supabase`.
5. Generar tipos reales de Supabase.
6. Separar modo mock de modo produccion.
7. Implementar React Router con rutas protegidas por rol.
8. Reemplazar `screen` global por rutas.
9. Crear `AuthGuard`, `RoleGuard` y layout por rol.
10. Revisar registro para impedir alta publica de administradores.

### Fase 2 - Autenticacion y perfiles

11. Completar login email/password.
12. Completar registro de cliente.
13. Crear solicitud de tienda.
14. Crear solicitud de repartidor con documentos.
15. Implementar recuperacion segura por email.
16. Agregar perfil editable.
17. Agregar suspension de usuarios y bloqueo real de acceso.
18. Probar RLS de perfiles, clientes, drivers y tiendas.

### Fase 3 - Catalogo y tiendas

19. CRUD real de tiendas.
20. Aprobacion de tiendas por admin.
21. Horarios de atencion.
22. Zonas de cobertura.
23. CRUD de categorias.
24. CRUD de productos.
25. Imagenes de productos en Storage.
26. Inventario real.
27. Abrir/cerrar tienda contra base de datos.
28. Busqueda y filtros.

### Fase 4 - Carrito y pedidos

29. Persistir carrito por usuario o localStorage validado.
30. Validar carrito por tienda.
31. Crear pedido usando RPC `create_order`.
32. Mejorar RPC con validacion de arrays, tienda de producto y stock.
33. Mostrar pedidos reales del cliente.
34. Mostrar pedidos reales de tienda.
35. Implementar maquina de estados completa.
36. Bloquear transiciones no permitidas por rol.
37. Crear historial visible de pedido.

### Fase 5 - Pagos

38. Pago en efectivo.
39. Pago por transferencia con comprobante.
40. Bucket privado para comprobantes.
41. Verificacion de comprobantes por tienda/admin.
42. Preparar integracion futura de tarjeta.
43. Crear tabla/fujo de transacciones.
44. Reporte financiero basico.

### Fase 6 - Repartidores y tracking

45. Aprobacion de repartidores.
46. Estado online/offline real.
47. Ubicacion en tiempo real.
48. Asignacion manual de pedidos.
49. Asignacion automatica por zona/distancia.
50. Flujo de aceptar/rechazar pedido.
51. Ruta de retiro y entrega.
52. Codigo de entrega.
53. Evidencia de entrega.
54. Ganancias del repartidor.

### Fase 7 - Realtime, notificaciones y chat

55. Suscripciones realtime para pedidos.
56. Notificaciones en app.
57. Marcar notificaciones como leidas.
58. Chat por pedido.
59. Politicas RLS completas para chats y mensajes.
60. Push notifications.
61. Eventos de auditoria para notificaciones importantes.

### Fase 8 - Administracion

62. Dashboard con datos reales.
63. Gestion de usuarios.
64. Gestion de tiendas.
65. Gestion de repartidores.
66. Gestion de pedidos conflictivos.
67. Configuracion de comisiones, IVA y tarifas.
68. Gestion de zonas.
69. Auditoria de acciones.
70. Reportes exportables.

### Fase 9 - Calidad, despliegue y produccion

71. Tests unitarios de reglas de negocio.
72. Tests de integracion con Supabase local.
73. Tests E2E de cliente, tienda, repartidor y admin.
74. Optimizar bundle con lazy loading.
75. Manejo global de errores.
76. Observabilidad con Sentry/logs.
77. CI/CD.
78. Variables de entorno por ambiente.
79. Configurar hosting.
80. Checklist final de seguridad.

## 11. Primera tarea recomendada

La primera tarea debe ser:

**Reestructurar la base de arquitectura sin cambiar funcionalidad visible.**

Objetivo:

- Crear carpetas profesionales.
- Mover Supabase a integracion.
- Centralizar tipos.
- Instalar herramientas de calidad.
- Preparar rutas protegidas.
- Mantener la maqueta compilando.

Criterio de aceptacion:

- `npm run build` sigue pasando.
- Hay scripts `lint`, `test` y `typecheck`.
- La estructura nueva existe.
- No se rompen pantallas actuales.
- Queda listo el terreno para reemplazar `screen` por rutas.

## 12. Prompt maestro para trabajar el sistema por tareas

Usa este prompt para iniciar el desarrollo ordenado:

```txt
Actua como arquitecto senior full-stack y ayudame a convertir RayoExpress en un sistema profesional de delivery.

Contexto:
- El repositorio actual es una maqueta React + TypeScript + Vite con Supabase.
- Ya existen pantallas para cliente, tienda, repartidor y administrador.
- Ya existen migraciones SQL iniciales con perfiles, tiendas, productos, pedidos, pagos, tracking, notificaciones y RLS parcial.
- Quiero mantener la UI base, pero convertirla en un sistema real, seguro, modular y mantenible.

Objetivo general:
Construir RayoExpress por tareas pequenas, una por una, con buena arquitectura, seguridad, casos de uso claros, pruebas y verificacion despues de cada cambio.

Reglas de trabajo:
1. Antes de modificar, revisa el codigo existente.
2. No borres la maqueta visual sin necesidad.
3. Mantén React + TypeScript + Vite + Supabase.
4. Organiza por modulos de dominio: auth, customer, stores, catalog, cart, orders, payments, delivery, tracking, notifications, chat, admin, reports.
5. Separa UI, casos de uso, repositorios, validaciones, tipos e integraciones.
6. No pongas logica critica solo en frontend.
7. Usa Supabase RLS, RPC y Edge Functions para operaciones sensibles.
8. Cada tarea debe terminar con build/test/lint cuando aplique.
9. Reporta archivos modificados, decisiones tecnicas y riesgos pendientes.
10. Trabajemos en orden, sin saltar a otra fase hasta cerrar la tarea actual.

Primera tarea:
Reestructurar la base de arquitectura sin cambiar funcionalidad visible:
- Crear estructura src/app, src/shared, src/modules, src/integrations.
- Mover cliente Supabase a integrations/supabase.
- Preparar shared validation/types.
- Agregar scripts de lint, typecheck y test.
- Mantener la app compilando.
- Dejar documentado el siguiente paso: React Router con rutas protegidas por rol.
```

## 13. Riesgos prioritarios

- Seguridad incompleta si se publica con RLS parcial.
- Admin asignable desde registro si no se bloquea.
- Datos mock mezclados con produccion.
- Operaciones sensibles ejecutables desde frontend sin validacion servidor.
- Vulnerabilidades de dependencias.
- Falta de pruebas para cambios de estado de pedido e inventario.
- Posible inconsistencia de stock por concurrencia si no se bloquea correctamente.
- Falta de auditoria para pagos, roles y suspensiones.

## 14. Conclusion

RayoExpress tiene una buena base visual y una intencion correcta de backend con Supabase. Para convertirlo en sistema completo, el camino no debe empezar agregando pantallas sueltas, sino ordenando la arquitectura, cerrando seguridad base y moviendo la logica de negocio a modulos y operaciones servidoras.

La ruta recomendada es avanzar por fases, empezando por arquitectura y seguridad minima, luego autenticacion/perfiles, catalogo, pedidos, pagos, reparto, realtime, administracion y finalmente calidad/despliegue.
