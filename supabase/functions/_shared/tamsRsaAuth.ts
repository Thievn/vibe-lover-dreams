/**
 * Optional TAMS "Standard Authentication" (RSA signature).
 * @see https://tams-docs.tensor.art/docs/api/signature/signature_build/
 */

function pemPkcs8ToDer(pem: string): Uint8Array {
  const normalized = pem.replace(/\\n/g, "\n").trim();
  const match = normalized.match(/-----BEGIN PRIVATE KEY-----([\s\S]+?)-----END PRIVATE KEY-----/);
  if (!match) {
    throw new Error(
      "TAMS_PRIVATE_KEY must be PKCS#8 PEM (-----BEGIN PRIVATE KEY----- … -----END PRIVATE KEY-----). " +
        "If you have PKCS#1 (BEGIN RSA PRIVATE KEY), run: openssl pkcs8 -topk8 -nocrypt -in key.pem -out key.pkcs8.pem",
    );
  }
  const b64 = match[1].replace(/\s/g, "");
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

async function importPkcs8RsaPrivateKey(pem: string): Promise<CryptoKey> {
  const der = pemPkcs8ToDer(pem);
  return await crypto.subtle.importKey(
    "pkcs8",
    der,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

function uint8ToBase64(bytes: Uint8Array): string {
  const chunk = 0x8000;
  const parts: string[] = [];
  for (let i = 0; i < bytes.length; i += chunk) {
    parts.push(String.fromCharCode(...bytes.subarray(i, i + chunk)));
  }
  return btoa(parts.join(""));
}

function randomNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Builds `Authorization: TAMS-SHA256-RSA app_id=…,nonce_str=…,timestamp=…,signature=…`
 * StringToSign = METHOD + "\n" + urlPath + "\n" + timestamp + "\n" + nonce + "\n" + body
 */
export async function buildTamsRsaAuthorization(
  method: string,
  urlPath: string,
  body: string,
  appId: string,
  privateKeyPem: string,
): Promise<string> {
  const methodStr = method.toUpperCase();
  const timestamp = String(Math.floor(Date.now() / 1000));
  const nonce_str = randomNonce();
  const toSign = `${methodStr}\n${urlPath}\n${timestamp}\n${nonce_str}\n${body}`;
  const key = await importPkcs8RsaPrivateKey(privateKeyPem);
  const sigBuf = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(toSign),
  );
  const signature = uint8ToBase64(new Uint8Array(sigBuf));
  return `TAMS-SHA256-RSA app_id=${appId},nonce_str=${nonce_str},timestamp=${timestamp},signature=${signature}`;
}

export function readTamsPrivateKeyFromEnv(): string {
  return (Deno.env.get("TAMS_PRIVATE_KEY") ?? "").replace(/\\n/g, "\n").trim();
}

export function readTamsAppIdFromEnv(): string {
  return (Deno.env.get("TAMS_APP_ID") ?? "").trim();
}

export function hasTamsRsaCredentials(): boolean {
  return Boolean(readTamsAppIdFromEnv() && readTamsPrivateKeyFromEnv());
}
