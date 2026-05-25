export function handleHealthCheck() {
  return new Response(JSON.stringify({ ok: true }, null, 2), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
    },
  });
}
