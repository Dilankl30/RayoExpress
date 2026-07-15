type JsonBody = Record<string, unknown> | unknown[] | string | number | boolean | null;

export function jsonResponse(body: JsonBody, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...(init.headers ?? {}),
    },
  });
}

export function methodNotAllowed(allowed: string[]) {
  return jsonResponse(
    { ok: false, error: 'Method not allowed', allowed },
    { status: 405 },
  );
}
