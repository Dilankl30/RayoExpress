Aquí tienes un **prompt técnico profesional y completo** para Figma AI, Lovable, Bolt.new, Cursor AI o cualquier generador de aplicaciones modernas en React:

---

# PROMPT TÉCNICO – RAYO EXPRESS DELIVERY PLATFORM

## CONTEXTO GENERAL

Desarrolla una aplicación web profesional llamada **RAYO EXPRESS** con el lema:

**"Tu delivery de confianza"**

La plataforma debe ser **Mobile First**, inspirada en la experiencia de usuario de PedidosYa, Uber Eats y Rappi, utilizando como referencia las pantallas proporcionadas.

El diseño debe estar optimizado principalmente para dispositivos móviles, pero completamente responsive para tablets y escritorio.

La aplicación debe estar desarrollada con:

### Stack Tecnológico Obligatorio

* React 19
* Next.js 15 App Router
* TypeScript
* Tailwind CSS
* Shadcn/UI
* Supabase
* PostgreSQL
* React Query (TanStack Query)
* Zustand
* React Hook Form + Zod
* Framer Motion
* Mapbox o Google Maps
* Socket.io o Supabase Realtime
* PWA (Progressive Web App)
* Push Notifications
* Geolocalización en tiempo real
* Docker Ready
* Deploy Ready para Vercel

Arquitectura:

* Clean Architecture
* Feature Based Architecture
* Modular
* Escalable
* Producción Ready

---

# IDENTIDAD VISUAL

Utilizar la identidad visual de RAYO EXPRESS.

## Colores

### Primario

Morado principal:

#6D28D9

### Secundario

Morado oscuro:

#4C1D95

### Acento

Amarillo rayo:

#FFD400

### Blanco

#FFFFFF

### Negro

#111827

### Grises

Tailwind Neutral Scale

---

# OBJETIVO DEL SISTEMA

Permitir:

* Pedir productos
* Pedir comida
* Pedir farmacia
* Pedir supermercado
* Pedir mensajería
* Pedir cualquier producto local

Con seguimiento en tiempo real del repartidor.

---

# ROLES DEL SISTEMA

## 1. Cliente

## 2. Repartidor

## 3. Tienda

## 4. Administrador General

---

# AUTENTICACIÓN

Inspirarse completamente en las pantallas de PedidosYa proporcionadas.

Implementar:

### Login

* Google OAuth
* Facebook OAuth
* Correo electrónico
* Teléfono con OTP

### Registro

Capturar:

* Nombre
* Apellido
* Fecha nacimiento
* Género
* Correo
* Teléfono

### Onboarding

Pantallas similares a:

* Activar notificaciones
* Permitir ubicación
* Configurar dirección principal

---

# CLIENTE APP

## HOME

Header:

* Dirección actual
* Selector de dirección
* Notificaciones
* Carrito

Buscador global:

Buscar:

* Tiendas
* Productos
* Restaurantes
* Farmacias
* Supermercados

---

## CATEGORÍAS

Mostrar tarjetas similares a PedidosYa:

* Restaurantes
* Súper
* Farmacias
* Bebidas
* Mascotas
* Mensajería
* Tiendas
* Tecnología
* Regalos

Con iconografía moderna.

---

## CATÁLOGO

Filtros:

* Distancia
* Precio
* Tiempo entrega
* Mejor valorados
* Promociones

Ordenamiento:

* Cercanía
* Popularidad
* Precio
* Tiempo

---

## DETALLE PRODUCTO

Mostrar:

* Imagen
* Galería
* Precio
* Descripción
* Variantes
* Complementos
* Disponibilidad

Botón:

Agregar al carrito

---

## CARRITO

Permitir:

* Agregar productos
* Editar cantidades
* Observaciones
* Cupones
* Propina repartidor

Resumen:

Subtotal

IVA

Envío

Descuento

Total

---

## CHECKOUT

Métodos de pago:

* Efectivo
* Tarjeta
* Transferencia
* PayPhone
* Stripe
* PayPal

---

# MAPA EN TIEMPO REAL

Implementar experiencia similar a Uber Eats.

Mostrar:

Cliente

↓

Tienda

↓

Repartidor

↓

Destino

Actualizar posición en vivo.

Utilizar:

Supabase Realtime

o

WebSockets

---

# TRACKING DE PEDIDOS

Estados:

Pendiente

Aceptado

Preparando

Listo

Asignado

En camino

Entregado

Cancelado

Cada cambio debe generar:

* Push Notification
* Email
* Notificación dentro de la app

---

# REPARTIDOR APP

Panel exclusivo.

---

## Dashboard Repartidor

Mostrar:

Ganancias hoy

Ganancias semana

Pedidos realizados

Horas conectadas

Calificación

---

## Estado

Botón:

Conectado

Desconectado

---

## Gestión Pedidos

Puede:

Aceptar pedido

Rechazar pedido

Ver detalle

Llamar cliente

Navegar con Google Maps

---

## Mapa

Visualizar:

Ruta

Cliente

Tienda

Destino

---

## Wallet

Mostrar:

Ingresos

Comisiones

Bonos

Pagos pendientes

Historial

---

# TIENDAS

Panel independiente.

---

## Dashboard

Mostrar:

Ventas del día

Ventas del mes

Pedidos

Clientes

Productos vendidos

---

## Gestión Catálogo

Crear:

Categorías

Productos

Promociones

Combos

Cupones

Variantes

Inventario

---

## Información tienda

Logo

Banner

Dirección

Ubicación mapa

Horarios

Contacto

Redes sociales

---

# ADMINISTRADOR GENERAL

Panel completo.

---

## Dashboard Ejecutivo

KPIs:

Ventas diarias

Ventas semanales

Ventas mensuales

Ventas anuales

Ingresos plataforma

Comisiones

Pedidos activos

Pedidos completados

Pedidos cancelados

Clientes registrados

Tiendas registradas

Repartidores registrados

Usuarios activos

---

## Gráficos

Ventas

Ganancias

Pedidos

Usuarios

Tiendas

Productos

Utilizar:

Recharts

o

Chart.js

---

## Gestión Usuarios

CRUD completo:

Clientes

Tiendas

Repartidores

Administradores

---

## Gestión Tiendas

Aprobar

Suspender

Eliminar

Editar

---

## Gestión Repartidores

Ver:

Ubicación actual

Estado online

Ganancias

Calificación

Pedidos entregados

---

## Mapa Global

Visualizar:

Todos los repartidores activos

Pedidos activos

Tiendas activas

Clientes conectados

---

## Configuración Plataforma

Configurar:

Costo por km

Comisión plataforma

Impuestos

Promociones

Cupones

Notificaciones

Métodos de pago

---

# NOTIFICACIONES

Implementar:

Push

Email

In-App

SMS opcional

Eventos:

Pedido creado

Pedido aceptado

Pedido preparado

Pedido en camino

Pedido entregado

Pago recibido

Promociones

---

# BASE DE DATOS SUPABASE

Crear tablas completas:

users

roles

addresses

stores

store_categories

products

product_variants

product_images

carts

cart_items

orders

order_items

deliveries

drivers

payments

wallets

transactions

coupons

promotions

notifications

reviews

ratings

favorites

settings

audit_logs

---

# SEGURIDAD

JWT

Row Level Security

Supabase Policies

Rate Limiting

CSRF

XSS Protection

Validaciones Zod

---

# SEO

Generar:

Metadata

Open Graph

Schema.org

Sitemap

Robots

---

# PWA

Instalable como aplicación móvil.

Características:

* Offline Mode
* Push Notifications
* Splash Screen
* App Icon
* Background Sync

---

# EXPERIENCIA VISUAL

Tomar como referencia todas las pantallas adjuntas de PedidosYa para:

* Login
* Registro
* Onboarding
* Ubicación
* Confirmación dirección
* Home
* Categorías
* Promociones
* Carrito
* Perfil
* Configuración
* Notificaciones

Pero adaptadas completamente a:

## Marca

RAYO EXPRESS

## Paleta

Morado + Amarillo

## Logo

Rayo Express proporcionado

## Mascota/Repartidor

Utilizar el repartidor 3D morado mostrado en las referencias.

---

# RESULTADO ESPERADO

Generar una plataforma completa de producción:

✅ Cliente
✅ Repartidor
✅ Tienda
✅ Administrador
✅ Geolocalización en tiempo real
✅ Tracking en vivo
✅ Dashboard de ventas
✅ Catálogo de tiendas
✅ Gestión de pedidos
✅ Notificaciones push
✅ Supabase funcional
✅ Responsive Mobile First
✅ React + Next.js + TypeScript
✅ Lista para desplegar en Vercel sin modificaciones adicionales.
