---
name: rayoexpress-deploy
description: Despliegue y publicación de RayoExpress en Vercel, Android y iOS. Usar cuando se necesite hacer deploy, build, configurar variables de entorno o publicar la app.
---

# Skill: Despliegue - RayoExpress

## Build y Desarrollo Local

```bash
# Desarrollo local
npm run dev

# Build de producción
npm run build

# Preview del build
npm run preview
```

## Variables de Entorno

| Variable | Descripción |
|----------|-------------|
| `VITE_SUPABASE_URL` | URL del proyecto Supabase (`https://yhnfrfqrxnxfxfbntfsr.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Clave anónima de Supabase |
| `VITE_GOOGLE_CLIENT_ID` | ID de cliente de Google OAuth |

- **Archivo local**: `.env` (no versionado)
- **Ejemplo**: `vercel.env.example`

## Vercel (Web)

### Configuración
- Archivo: `vercel.json`
- Framework: Vite
- Output: `dist/`

### Despliegue
```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy a preview
vercel

# Deploy a producción
vercel --prod
```

## Android (Capacitor)

```bash
# Sincronizar cambios al proyecto nativo
npx cap sync android

# Abrir en Android Studio
npx cap open android

# O ejecutar directamente
npx cap run android
```

- Config: `capacitor.config.ts`
- Proyecto Android: `android/`

## iOS (Capacitor)

```bash
# Sincronizar cambios al proyecto nativo
npx cap sync ios

# Abrir en Xcode
npx cap open ios
```

- Proyecto iOS: `ios/`

## Git Workflow

```bash
# Verificar antes de push
npm run build
npm run test

# Commit y push
git add -A
git commit -m "feat: descripcion del cambio"
git push origin main
```

## Repositorio

- **GitHub**: `https://github.com/Dilankl30/RayoExpress.git`
- **Branch principal**: `main`
