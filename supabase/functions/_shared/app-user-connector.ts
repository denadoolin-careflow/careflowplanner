import { createClient } from "npm:@supabase/supabase-js@2";

export const GATEWAY = "https://connector-gateway.lovable.dev";
export const CONNECTOR_ID = "google_mail";

export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/gmail.readonly",
];

function clientApiKey() {
  const key = Deno.env.get("GOOGLE_MAIL_APP_USER_CONNECTOR_CLIENT_API_KEY");
  if (!key) throw new Error("Gmail connector client key is not configured");
  return key;
}

export function admin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

export async function authedUserId(req: Request): Promise<string | null> {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: auth } },
  });
  const { data, error } = await supa.auth.getUser();
  if (error || !data?.user) return null;
  return data.user.id;
}

/* ---------- encryption ---------- */

async function cryptoKey(): Promise<CryptoKey> {
  const raw = Deno.env.get("APP_USER_CONNECTION_KEY_SECRET");
  if (!raw) throw new Error("APP_USER_CONNECTION_KEY_SECRET is not set");
  return crypto.subtle.importKey(
    "raw",
    Uint8Array.from(atob(raw), (c) => c.charCodeAt(0)),
    "AES-GCM",
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptKey(plaintext: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await cryptoKey(), new TextEncoder().encode(plaintext)),
  );
  const buf = new Uint8Array(iv.length + ct.length);
  buf.set(iv);
  buf.set(ct, iv.length);
  return btoa(String.fromCharCode(...buf));
}

export async function decryptKey(stored: string): Promise<string> {
  const buf = Uint8Array.from(atob(stored), (c) => c.charCodeAt(0));
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: buf.subarray(0, 12) },
    await cryptoKey(),
    buf.subarray(12),
  );
  return new TextDecoder().decode(plain);
}

/* ---------- storage ---------- */

export async function saveConnectionKey(userId: string, connectionKey: string, email?: string | null) {
  const { error } = await admin().from("app_user_connections").upsert(
    {
      user_id: userId,
      connector_id: CONNECTOR_ID,
      connection_key_ciphertext: await encryptKey(connectionKey),
      account_email: email ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,connector_id" },
  );
  if (error) throw error;
}

export async function getConnectionKey(userId: string): Promise<string | null> {
  const { data, error } = await admin()
    .from("app_user_connections")
    .select("connection_key_ciphertext")
    .eq("user_id", userId)
    .eq("connector_id", CONNECTOR_ID)
    .maybeSingle();
  if (error) throw error;
  return data ? await decryptKey(data.connection_key_ciphertext) : null;
}

/* ---------- gateway ---------- */

export async function startAppUserOAuth(appUserId: string, returnUrl: string) {
  const res = await fetch(`${GATEWAY}/api/v1/app-users/oauth2/authorize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
      "X-Client-Api-Key": clientApiKey(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      connector_id: CONNECTOR_ID,
      app_user_id: appUserId,
      return_url: returnUrl,
      credentials_configuration: { scopes: GOOGLE_SCOPES },
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`[${res.status}]: ${text}`);
  return JSON.parse(text) as { authorization_url: string; session_id: string };
}

export async function exchangeAppUserOAuthCode(code: string) {
  const res = await fetch(`${GATEWAY}/api/v1/app-users/oauth2/exchange`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
      "X-Client-Api-Key": clientApiKey(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ code }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`[${res.status}]: ${text}`);
  const body = JSON.parse(text) as Record<string, unknown>;
  const key =
    (body.connection_api_key as string) ??
    (body.connection_key as string) ??
    (body.api_key as string) ??
    ((body.connection as Record<string, string> | undefined)?.api_key);
  if (!key) throw new Error(`Exchange response had no connection key: ${text}`);
  return { connectionKey: key, raw: body };
}

export async function callAsAppUser(
  connectionKey: string,
  path: string,
  init: { method?: string; body?: unknown } = {},
) {
  const res = await fetch(`${GATEWAY}/${CONNECTOR_ID}${path}`, {
    method: init.method ?? "GET",
    headers: {
      Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
      "X-Connection-Api-Key": connectionKey,
      "Content-Type": "application/json",
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`[${res.status}]: ${text}`);
  return text ? JSON.parse(text) : null;
}
