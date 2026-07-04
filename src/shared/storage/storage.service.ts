import { getSupabase, isSupabaseReady } from '../../integrations/supabase/client';

export type BucketName =
  | 'product-images'
  | 'avatars'
  | 'delivery-evidence'
  | 'receipts'
  | 'driver-documents'
  | 'application-documents';

export type AllowedMimeType = 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf';

const BUCKET_CONFIG: Record<BucketName, { maxMb: number; allowed: AllowedMimeType[] }> = {
  'product-images': { maxMb: 5, allowed: ['image/jpeg', 'image/png', 'image/webp'] },
  'avatars': { maxMb: 2, allowed: ['image/jpeg', 'image/png', 'image/webp'] },
  'delivery-evidence': { maxMb: 10, allowed: ['image/jpeg', 'image/png', 'image/webp'] },
  'receipts': { maxMb: 10, allowed: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] },
  'driver-documents': { maxMb: 10, allowed: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] },
  'application-documents': { maxMb: 10, allowed: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] },
};

const SIGNED_URL_CACHE = new Map<string, { url: string; expiresAt: number }>();

function validateFile(file: File, bucket: BucketName): string | null {
  const config = BUCKET_CONFIG[bucket];
  const maxBytes = config.maxMb * 1024 * 1024;
  if (file.size > maxBytes) return `El archivo excede el límite de ${config.maxMb} MB`;
  if (!config.allowed.includes(file.type as AllowedMimeType)) {
    const names: Record<string, string> = { 'image/jpeg': 'JPG', 'image/png': 'PNG', 'image/webp': 'WebP', 'application/pdf': 'PDF' };
    const allowed = config.allowed.map((t) => names[t] || t).join(', ');
    return `Formato no permitido. Usa: ${allowed}`;
  }
  return null;
}

function buildPath(bucket: BucketName, entityId: string, fileName: string): string {
  const ext = fileName.split('.').pop() || 'jpg';
  const timestamp = Date.now();
  const safe = fileName.replace(/[^a-zA-Z0-9_.-]/g, '_').slice(0, 50);
  return `${bucket}/${entityId}/${timestamp}-${safe}`;
}

export async function uploadFile(
  bucket: BucketName,
  entityId: string,
  file: File,
): Promise<{ path: string; storagePath: string }> {
  const validationError = validateFile(file, bucket);
  if (validationError) throw new Error(validationError);

  const path = buildPath(bucket, entityId, file.name);

  if (!isSupabaseReady) {
    return { path, storagePath: URL.createObjectURL(file) };
  }

  const supabase = getSupabase();
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
  if (error) throw error;

  return { path, storagePath: path };
}

export async function uploadFileWithUpsert(
  bucket: BucketName,
  entityId: string,
  file: File,
): Promise<{ path: string; storagePath: string }> {
  const validationError = validateFile(file, bucket);
  if (validationError) throw new Error(validationError);

  const path = buildPath(bucket, entityId, file.name);

  if (!isSupabaseReady) {
    return { path, storagePath: URL.createObjectURL(file) };
  }

  const supabase = getSupabase();
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
  if (error) throw error;

  return { path, storagePath: path };
}

export async function getPublicUrl(bucket: BucketName, path: string): Promise<string> {
  if (!isSupabaseReady) return path;
  const supabase = getSupabase();
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function getSignedUrl(
  bucket: BucketName,
  path: string,
  expiresInSeconds = 3600,
): Promise<string> {
  if (!isSupabaseReady) return path;

  const cacheKey = `${bucket}/${path}`;
  const cached = SIGNED_URL_CACHE.get(cacheKey);
  if (cached && cached.expiresAt > Date.now() + 60000) {
    return cached.url;
  }

  const supabase = getSupabase();
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
  if (error) throw error;

  SIGNED_URL_CACHE.set(cacheKey, { url: data.signedUrl, expiresAt: Date.now() + expiresInSeconds * 1000 });
  return data.signedUrl;
}

export async function getFileUrl(
  bucket: BucketName,
  path: string | null | undefined,
): Promise<string | null> {
  if (!path) return null;
  if (!isSupabaseReady) return path;

  const config = BUCKET_CONFIG[bucket];
  const isPublic = bucket === 'product-images' || bucket === 'avatars';

  if (isPublic) {
    return getPublicUrl(bucket, path);
  }

  try {
    return await getSignedUrl(bucket, path);
  } catch {
    return null;
  }
}

export async function deleteFile(bucket: BucketName, path: string): Promise<void> {
  if (!isSupabaseReady) return;
  const supabase = getSupabase();
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw error;

  const cacheKey = `${bucket}/${path}`;
  SIGNED_URL_CACHE.delete(cacheKey);
}
