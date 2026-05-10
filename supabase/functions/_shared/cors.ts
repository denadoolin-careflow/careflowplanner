export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export async function signState(payload: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  const b64 = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${btoa(payload).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_")}.${b64}`;
}

export async function verifyState(token: string, secret: string): Promise<string | null> {
  const [p, s] = token.split(".");
  if (!p || !s) return null;
  const payload = atob(p.replace(/-/g, "+").replace(/_/g, "/"));
  const expected = await signState(payload, secret);
  if (expected.split(".")[1] !== s) return null;
  return payload;
}