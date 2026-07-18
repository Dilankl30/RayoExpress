import { Capacitor } from '@capacitor/core';
import { PushNotifications, type Token } from '@capacitor/push-notifications';
import { getSupabase, isSupabaseReady } from '../../../integrations/supabase/client';

let activeRegistrationUserId: string | null = null;

async function savePushToken(userId: string, token: string) {
  if (!isSupabaseReady || !token) return;

  try {
    const supabase = getSupabase();
    await supabase
      .from('push_device_tokens')
      .upsert(
        {
          user_id: userId,
          token,
          platform: Capacitor.getPlatform(),
          enabled: true,
          last_seen_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'token' },
      );
  } catch {
    // Push token persistence should never block auth or realtime notifications.
  }
}

export async function registerPushDevice(userId: string) {
  if (activeRegistrationUserId === userId) return;
  if (!Capacitor.isNativePlatform()) return;

  activeRegistrationUserId = userId;

  try {
    const currentPermission = await PushNotifications.checkPermissions();
    const permission =
      currentPermission.receive === 'prompt'
        ? await PushNotifications.requestPermissions()
        : currentPermission;

    if (permission.receive !== 'granted') return;

    await PushNotifications.removeAllListeners();

    await PushNotifications.addListener('registration', (token: Token) => {
      void savePushToken(userId, token.value);
    });

    await PushNotifications.addListener('registrationError', (error) => {
      console.warn('Push registration failed', error);
    });

    await PushNotifications.addListener('pushNotificationActionPerformed', (event) => {
      try {
        window.sessionStorage.setItem('rayoexpress-last-push-action', JSON.stringify(event.notification.data ?? {}));
      } catch {
        // Ignore storage failures.
      }
    });

    await PushNotifications.register();
  } catch (error) {
    activeRegistrationUserId = null;
    console.warn('Push notifications are not available', error);
  }
}
