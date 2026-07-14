function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  return authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
}

async function secureEqual(left: string, right: string) {
  if (!left || !right) return false;
  const encoder = new TextEncoder();
  const [leftHash, rightHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(left)),
    crypto.subtle.digest("SHA-256", encoder.encode(right)),
  ]);
  const a = new Uint8Array(leftHash);
  const b = new Uint8Array(rightHash);
  let difference = a.length ^ b.length;
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    difference |= (a[index] ?? 0) ^ (b[index] ?? 0);
  }
  return difference === 0;
}

export async function isAlertAdmin(request: Request) {
  return secureEqual(bearerToken(request), process.env.ALERT_ADMIN_TOKEN ?? "");
}

export async function isAlertEvaluator(request: Request) {
  const provided = bearerToken(request);
  return secureEqual(provided, process.env.CRON_SECRET ?? "") || secureEqual(provided, process.env.ALERT_ADMIN_TOKEN ?? "");
}
