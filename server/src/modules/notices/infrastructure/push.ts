import { getMessaging } from "../../../shared/auth/firebase";
import { prisma } from "../../../shared/prisma";
import { pushBody, staleTokens } from "../domain/push";

// A new notice as a phone notification, for students whose app is closed or in the background (an open app shows it
// itself, as the floating Deemo). Runs after the notice is saved and never fails the send: the inbox has it anyway.
export async function pushNotice(n: { id: string; title: string; body: string; targetId: string | null; segment: string | null }) {
  const rows = await prisma.pushToken.findMany({
    where: n.targetId
      ? { userId: n.targetId }
      : n.segment
        ? { user: { noticeInbox: { some: { noticeId: n.id } } } }
        : { user: { deletedAt: null } },
    select: { token: true },
  });
  const tokens = rows.map((r) => r.token);
  const stale: string[] = [];
  for (let i = 0; i < tokens.length; i += 500) {
    const batch = tokens.slice(i, i + 500); // FCM's multicast limit
    const res = await getMessaging().sendEachForMulticast({
      tokens: batch,
      notification: { title: n.title, body: pushBody(n.body) },
      data: { noticeId: n.id }, // the app opens this notice when the notification is tapped
      android: { priority: "high" },
    });
    stale.push(...staleTokens(batch, res.responses));
  }
  // Uninstalled apps and expired tokens: forget them so the next notice doesn't try again.
  if (stale.length) await prisma.pushToken.deleteMany({ where: { token: { in: stale } } });
}
