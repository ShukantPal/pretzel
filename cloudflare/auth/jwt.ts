import {
  TALON_AGENT,
  TALON_NAMESPACE,
  TALON_SESSION_ID,
  TALON_SESSION_TOKEN_TTL_SECONDS,
  type TalonSessionClaims,
} from '@/cloudflare/env';

function base64UrlEncode(value: Uint8Array): string {
  let binary = '';
  for (const byte of value) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export async function mintTalonSessionJwt(secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const headerBytes = encoder.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const claims: TalonSessionClaims = {
    sub: 'pretzel-cloudflare',
    aud: 'talon',
    exp: Math.floor(Date.now() / 1000) + TALON_SESSION_TOKEN_TTL_SECONDS,
    'talon:ns': TALON_NAMESPACE,
    'talon:agent': TALON_AGENT,
    'talon:session': TALON_SESSION_ID,
  };
  const payloadBytes = encoder.encode(JSON.stringify(claims));

  const encodedHeader = base64UrlEncode(headerBytes);
  const encodedPayload = base64UrlEncode(payloadBytes);
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(signingInput));
  const encodedSignature = base64UrlEncode(new Uint8Array(signature));

  return `${signingInput}.${encodedSignature}`;
}
