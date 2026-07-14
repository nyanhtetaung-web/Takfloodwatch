export const dynamic = "force-dynamic";

export function GET() {
  const publicKey = process.env.VAPID_PUBLIC_KEY ?? "";
  return Response.json({ enabled: Boolean(publicKey), publicKey }, { headers: { "Cache-Control": "no-store" } });
}
