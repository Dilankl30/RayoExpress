import { jsonResponse } from './_shared/http';

export default function handler() {
  return jsonResponse({
    ok: true,
    service: 'rayo-express-api',
    timestamp: new Date().toISOString(),
  });
}
