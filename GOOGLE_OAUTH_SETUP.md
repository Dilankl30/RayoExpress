# Configurar Google OAuth para RayoExpress

## 1. Google Cloud Console

1. Ve a https://console.cloud.google.com/apis/credentials
2. Crea un proyecto o selecciona uno existente
3. Ve a "Pantalla de consentimiento OAuth" (OAuth consent screen)
   - Tipo: Externo (External)
   - Datos requeridos: nombre, email de soporte, datos de contacto
   - Scopes: `email`, `profile`, `openid`
   - Agrega tu email como usuario de prueba
4. Ve a "Credenciales" → "Crear credenciales" → "ID de cliente OAuth"
   - Tipo de aplicación: Aplicación web
   - Nombre: "RayoExpress"
   - Orígenes de JavaScript autorizados: `http://localhost:5173`, `https://[TU-DOMINIO].vercel.app`
   - URIs de redireccionamiento autorizados:
     - `http://localhost:5173`
     - `https://[TU-DOMINIO].vercel.app`
     - `https://bxhnlwkhoeeqpifqvqxs.supabase.co/auth/v1/callback`

> **Nota:** Ya están configurados `localhost:5173` y la callback de Supabase. Cuando tengas el dominio real de Vercel, agrégalo en los dos campos (orígenes JS y URIs de redirección).
5. Copia el **Client ID** y **Client Secret**

## 2. Supabase Dashboard

1. Ve a https://supabase.com/dashboard/project/bxhnlwkhoeeqpifqvqxs
2. Authentication → Providers → Google
   - Habilitar (Enable)
   - Client ID: pega el de Google
   - Client Secret: pega el de Google
   - Redirect URLs: deja las que vienen por defecto
   - Guardar

## 3. Variables de entorno

Ya tienes en `.env`:
```
VITE_SUPABASE_URL=https://bxhnlwkhoeeqpifqvqxs.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable__YLr43cEbtmlrRPdhOmMsA_CeN6c2-n
```

No necesitas cambios en `.env` — la autenticación OAuth la maneja Supabase del lado del servidor.

## 4. Cómo funciona el flujo

1. Usuario hace clic en "Google"
2. `supabase.auth.signInWithOAuth({ provider: 'google' })` abre una ventana de Google
3. Google redirige a Supabase con el código de autorización
4. Supabase intercambia el código por un session token
5. Supabase redirige de vuelta a tu app (`window.location.origin`)
6. `detectSessionInUrl: true` en el cliente Supabase captura el token
7. `onAuthStateChange` en AuthContext.tsx dispara → carga el perfil → navega a la pantalla correspondiente

## 5. Problemas comunes

| Problema | Solución |
|---|---|
| "redirect_uri_mismatch" | Agrega la URL exacta en Google Cloud Console |
| Popup bloqueado | El usuario debe permitir popups para el dominio |
| Error 403 en Supabase | Verifica que el provider esté habilitado en Supabase Auth |
| No redirige tras login | Verifica `detectSessionInUrl: true` en el cliente Supabase |
| Usuario sin rol | Después del primer login OAuth, se crea un profile sin rol. Un admin debe asignarlo via `admin_set_user_role` RPC o directamente en la BD |

## 6. Asignar rol tras registro OAuth

Los usuarios que se registran con Google no tienen rol asignado. Un admin debe:
1. Ir a la tabla `profiles` en Supabase Table Editor
2. Editar el `role` del usuario (customer, driver, store, admin)
3. O ejecutar: `SELECT admin_set_user_role('user-id', 'customer');`
