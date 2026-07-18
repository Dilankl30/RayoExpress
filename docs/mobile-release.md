# RayoExpress mobile release

RayoExpress already runs as a Capacitor app using the same React/Vite build as the web app.

## What is ready in the repo

- Capacitor app id: `com.rayoexpress.app`
- Android and iOS projects are synced from `dist`
- Native splash plugin installed
- Push notification plugin installed
- The app registers native push tokens in Supabase table `push_device_tokens`
- Users can persist notification preferences in `notification_preferences`

## Local commands

```bash
npm run cap:sync
npm run cap:open:android
npm run cap:open:ios
```

## Before publishing Android

- Create a release keystore and keep it outside the repository.
- Add the Android SHA-1/SHA-256 fingerprints to Google OAuth credentials.
- Add Firebase Cloud Messaging credentials for package `com.rayoexpress.app`.
- Place the production `google-services.json` in the Android project when FCM is configured.
- Build and sign from Android Studio, then upload to Play Console.

## Before publishing iOS

- Enroll in Apple Developer Program.
- Create Bundle ID `com.rayoexpress.app`.
- Configure APNs key/certificate.
- Add any required Firebase/Google config for iOS if push or Google sign-in is handled natively.
- Archive from Xcode and upload through App Store Connect.

## Push delivery model

The app stores each device token in Supabase. Sending push notifications still needs a trusted backend or Supabase Edge Function with FCM/APNs credentials. Never expose FCM server keys, APNs keys, Supabase service role keys, or signing files in the frontend.
