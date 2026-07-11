---
name: rayoexpress-ui
description: Sistema de diseño UI/UX de RayoExpress. Usar cuando se necesite crear o modificar componentes visuales, estilos, animaciones, mapas o el diseño de la interfaz.
---

# Skill: UI/UX Design System - RayoExpress

## Sistema de Diseño

### Variables CSS (index.css)

```css
:root {
  --bg: #F8F9FA;
  --surface: #F3F4F6;
  --card: #FFFFFF;
  --text-primary: #1F2937;
  --text-secondary: #6B7280;
  --border: #E5E7EB;
  --border-light: #F3F4F6;
  --brand: #6D28D9;        /* Morado principal */
  --brand-light: #EDE9FE;
  --brand-dark: #5B21B6;
  --success: #22C55E;
  --success-light: #F0FDF4;
  --warning: #F59E0B;
  --warning-light: #FFFBEB;
  --danger: #EF4444;
  --danger-light: #FEF2F2;
}
```

### Tipografía
- **Fuente principal**: Inter (Google Fonts)
- **Importar**: ya incluido en `index.html`

### Patrones de Componentes

```jsx
{/* Card estándar */}
<div className="bg-card rounded-2xl p-4 shadow-sm border border-border-light">
  {/* contenido */}
</div>

{/* Botón primario */}
<button
  className="w-full py-3 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-1.5 shadow-md active:scale-98 transition-transform"
  style={{ backgroundColor: 'var(--brand)' }}
>
  Acción
</button>

{/* Badge de estado */}
<span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
  Activo
</span>

{/* Input estándar */}
<input
  className="w-full bg-surface rounded-xl px-3 py-2 text-sm outline-none border border-border-light focus:border-purple-500"
/>
```

## Bibliotecas

| Librería | Uso |
|----------|-----|
| **Lucide React** | Iconos (`import { Icon } from 'lucide-react'`) |
| **motion/react** | Animaciones (Framer Motion) |
| **react-leaflet** | Mapas interactivos |
| **recharts** | Gráficos y charts |

## Mapas (Leaflet)

### Tiles: CartoDB Voyager (estilo premium)

```jsx
<TileLayer
  attribution='&copy; OpenStreetMap &copy; CARTO'
  url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
/>
```

### Fix de iconos para Vite

```typescript
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});
```

### Marcadores personalizados con DivIcon

```typescript
L.divIcon({
  className: '',
  html: `<div class="flex items-center justify-center w-8 h-8 rounded-full border-2 border-white shadow-lg text-white font-bold text-xs" style="background: var(--brand)">
    1
  </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
})
```

## Principios de Diseño

1. **Mobile-first**: Diseñar primero para móvil, luego adaptar para escritorio
2. **Premium feel**: Sombras suaves, bordes redondeados (rounded-2xl), glassmorphismo
3. **Micro-animaciones**: `active:scale-95`, `transition-transform`, `animate-spin`, `animate-pulse`
4. **Gradientes sutiles**: Para fondos y acentos
5. **Iconos consistentes**: Solo Lucide React, tamaño 16-20px
6. **Espaciado**: Gap system de Tailwind (gap-2, gap-3, gap-4)

## Coordenadas de Referencia

- **El Coca (Puerto Francisco de Orellana)**: `[-0.4632, -76.9892]`
- **Guayaquil (fallback)**: `[-2.1706, -79.9223]`
