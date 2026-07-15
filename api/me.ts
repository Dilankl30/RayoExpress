import { getSupabaseAdminClient } from '../apps/api/lib/supabase-admin';
import { jsonResponse, methodNotAllowed } from './_shared/http';

type Role = 'customer' | 'driver' | 'store' | 'admin';

type ProfileRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: Role | string | null;
  avatar_url: string | null;
  is_suspended: boolean | null;
};

const ALLOWED_ROLES = new Set<Role>(['customer', 'driver', 'store', 'admin']);

function normalizeRole(value: unknown): Role {
  return typeof value === 'string' && ALLOWED_ROLES.has(value as Role) ? (value as Role) : 'customer';
}

function readBearerToken(request: Request): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

export default async function handler(request: Request) {
  if (request.method !== 'GET') {
    return methodNotAllowed(['GET']);
  }

  const token = readBearerToken(request);
  if (!token) {
    return jsonResponse({ ok: false, error: 'Missing bearer token' }, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();
  const { data: userResult, error: userError } = await supabase.auth.getUser(token);
  const authUser = userResult.user;

  if (userError || !authUser) {
    return jsonResponse({ ok: false, error: 'Invalid or expired session' }, { status: 401 });
  }

  const { data: existingProfile, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, phone, role, avatar_url, is_suspended')
    .eq('id', authUser.id)
    .maybeSingle<ProfileRow>();

  if (profileError) {
    return jsonResponse(
      { ok: false, error: 'Could not load profile', details: profileError.message },
      { status: 500 },
    );
  }

  const profileData =
    existingProfile ??
    ({
      id: authUser.id,
      full_name: authUser.user_metadata?.full_name ?? authUser.email ?? null,
      phone: authUser.phone ?? null,
      role: normalizeRole(authUser.user_metadata?.role),
      avatar_url: authUser.user_metadata?.avatar_url ?? null,
      is_suspended: false,
    } satisfies ProfileRow);

  if (!existingProfile) {
    const { error: upsertError } = await supabase.from('profiles').upsert(
      {
        id: authUser.id,
        full_name: profileData.full_name,
        phone: profileData.phone,
        role: profileData.role,
        avatar_url: profileData.avatar_url,
        is_suspended: false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    );

    if (upsertError) {
      return jsonResponse(
        { ok: false, error: 'Could not initialize profile', details: upsertError.message },
        { status: 500 },
      );
    }
  }

  if (profileData.is_suspended) {
    return jsonResponse(
      { ok: false, error: 'Your account is suspended' },
      { status: 403 },
    );
  }

  return jsonResponse({
    ok: true,
    user: {
      id: authUser.id,
      email: authUser.email,
      role: normalizeRole(profileData.role),
      full_name: profileData.full_name,
      phone: profileData.phone,
      avatar_url: profileData.avatar_url,
      is_suspended: Boolean(profileData.is_suspended),
    },
  });
}
