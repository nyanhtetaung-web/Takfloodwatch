export const dynamic = "force-dynamic";

export function GET() {
  const publicKey = process.env.VAPID_PUBLIC_KEY ?? "";
  const lineAddFriendUrl = process.env.LINE_ADD_FRIEND_URL ?? "";
  const lineEnabled = Boolean(
    lineAddFriendUrl && process.env.LINE_CHANNEL_SECRET && process.env.LINE_CHANNEL_ACCESS_TOKEN,
  );
  return Response.json({
    enabled: Boolean(publicKey),
    publicKey,
    channels: {
      line: { enabled: lineEnabled, addFriendUrl: lineEnabled ? lineAddFriendUrl : "" },
    },
  }, { headers: { "Cache-Control": "no-store" } });
}
