import { prisma } from "@/lib/prisma";
import { MAX_SUPPORT_BOT_BUTTONS, type SupportButton } from "@/types/support";
import type { Prisma } from "@prisma/client";

export type InboxRole =
  | "user"
  | "assistant"
  | "admin"
  | "notification"
  | "system";

export type InboxMessageView = {
  id: string;
  role: InboxRole;
  content: string;
  buttons: SupportButton[];
  ticketId: string | null;
  notificationId: string | null;
  attachmentUrl: string | null;
  read: boolean;
  createdAt: string;
};

function parseButtons(raw: unknown): SupportButton[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((b): b is SupportButton => {
      if (!b || typeof b !== "object") return false;
      const row = b as SupportButton;
      return typeof row.id === "string" && typeof row.label === "string";
    })
    .slice(0, MAX_SUPPORT_BOT_BUTTONS);
}

function serialize(row: {
  id: string;
  role: string;
  content: string;
  buttons: Prisma.JsonValue | null;
  ticketId: string | null;
  notificationId: string | null;
  attachmentUrl: string | null;
  read: boolean;
  createdAt: Date;
}): InboxMessageView {
  return {
    id: row.id,
    role: row.role as InboxRole,
    content: row.content,
    buttons: parseButtons(row.buttons),
    ticketId: row.ticketId,
    notificationId: row.notificationId,
    attachmentUrl: row.attachmentUrl ?? null,
    read: row.read,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listSupportInbox(
  userId: string,
  limit = 120,
): Promise<InboxMessageView[]> {
  const page = await listSupportInboxPage({ userId, limit });
  return page.messages;
}

/** Paginated inbox for chat UIs — never dump the full history. */
export async function listSupportInboxPage(input: {
  userId: string;
  /** Page size (default 30, max 50). */
  limit?: number;
  /** Load messages older than this ISO timestamp (scroll-up). */
  before?: string;
  /** Load messages newer than this ISO timestamp (live poll). */
  after?: string;
}): Promise<{
  messages: InboxMessageView[];
  hasMore: boolean;
  oldestCreatedAt: string | null;
  newestCreatedAt: string | null;
}> {
  const limit = Math.min(Math.max(input.limit ?? 30, 1), 50);
  const beforeDate = input.before ? new Date(input.before) : null;
  const afterDate = input.after ? new Date(input.after) : null;
  const beforeOk = beforeDate && !Number.isNaN(beforeDate.getTime());
  const afterOk = afterDate && !Number.isNaN(afterDate.getTime());

  // Live delta: append-only newer messages (asc).
  if (afterOk && !beforeOk) {
    const rows = await prisma.supportInboxMessage.findMany({
      where: { userId: input.userId, createdAt: { gt: afterDate! } },
      orderBy: { createdAt: "asc" },
      take: limit,
    });
    const messages = rows.map(serialize);
    return {
      messages,
      hasMore: false,
      oldestCreatedAt: messages[0]?.createdAt ?? null,
      newestCreatedAt: messages.at(-1)?.createdAt ?? null,
    };
  }

  // Initial / older page: newest-first fetch, reverse for display.
  const rows = await prisma.supportInboxMessage.findMany({
    where: {
      userId: input.userId,
      ...(beforeOk ? { createdAt: { lt: beforeDate! } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
  });
  const hasMore = rows.length > limit;
  const page = (hasMore ? rows.slice(0, limit) : rows).reverse();
  const messages = page.map(serialize);
  return {
    messages,
    hasMore,
    oldestCreatedAt: messages[0]?.createdAt ?? null,
    newestCreatedAt: messages.at(-1)?.createdAt ?? null,
  };
}

export async function appendSupportInboxMessage(input: {
  userId: string;
  role: InboxRole;
  content: string;
  buttons?: SupportButton[];
  ticketId?: string | null;
  notificationId?: string | null;
  attachmentUrl?: string | null;
  /** Default: unread for admin/notification, read otherwise. */
  read?: boolean;
}): Promise<InboxMessageView> {
  const inbound = input.role === "admin" || input.role === "notification";
  const row = await prisma.supportInboxMessage.create({
    data: {
      userId: input.userId,
      role: input.role,
      content: input.content.slice(0, 4000),
      buttons: (input.buttons ?? []) as unknown as Prisma.InputJsonValue,
      ticketId: input.ticketId ?? null,
      notificationId: input.notificationId ?? null,
      attachmentUrl: input.attachmentUrl ?? null,
      read: input.read ?? !inbound,
    },
  });
  return serialize(row);
}

export async function markSupportInboxRead(userId: string) {
  await prisma.supportInboxMessage.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
}

export async function countSupportInboxUnread(userId: string) {
  return prisma.supportInboxMessage.count({
    where: { userId, read: false },
  });
}

export async function clearSupportInbox(userId: string) {
  await prisma.supportInboxMessage.deleteMany({ where: { userId } });
}

/** Last N user/assistant/admin turns for bot context (newest last). */
export async function listSupportHistoryForBot(
  userId: string,
  limit = 10,
): Promise<{ role: "user" | "assistant"; content: string }[]> {
  const rows = await prisma.supportInboxMessage.findMany({
    where: {
      userId,
      role: { in: ["user", "assistant", "admin"] },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { role: true, content: true },
  });
  return rows
    .reverse()
    .map((r) => ({
      role: (r.role === "user" ? "user" : "assistant") as "user" | "assistant",
      content: r.content,
    }));
}

export type SupportConversationView = {
  userId: string;
  user: {
    id: string;
    name: string;
    email: string;
    username: string;
  };
  lastMessage: {
    id: string;
    role: InboxRole;
    content: string;
    createdAt: string;
  } | null;
  messageCount: number;
  /** User messages awaiting admin attention (after last admin reply). */
  pendingFromUser: number;
  openTicketId: string | null;
  openTicketStatus: string | null;
  openTicketPriority: string | null;
};

/** Telegram-style conversation list for admin support desk (paginated). */
export async function listSupportConversations(input?: {
  search?: string;
  limit?: number;
  page?: number;
}): Promise<{
  conversations: SupportConversationView[];
  page: number;
  limit: number;
  hasMore: boolean;
}> {
  const page = Math.max(input?.page ?? 1, 1);
  const limit = Math.min(Math.max(input?.limit ?? 20, 1), 50);
  const search = input?.search?.trim().toLowerCase();

  // With search we over-fetch then filter; without, skip/take on groupBy.
  const skip = search ? 0 : (page - 1) * limit;
  const take = search ? Math.min(page * limit + 1, 200) : limit + 1;

  const groups = await prisma.supportInboxMessage.groupBy({
    by: ["userId"],
    _count: { _all: true },
    _max: { createdAt: true },
    orderBy: { _max: { createdAt: "desc" } },
    skip,
    take,
  });

  if (groups.length === 0) {
    return { conversations: [], page, limit, hasMore: false };
  }

  const userIds = groups.map((g) => g.userId);
  const [users, lastMessages, openTickets] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true, username: true },
    }),
    Promise.all(
      groups.map((g) =>
        prisma.supportInboxMessage.findFirst({
          where: { userId: g.userId },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            role: true,
            content: true,
            createdAt: true,
          },
        }),
      ),
    ),
    prisma.supportTicket.findMany({
      where: {
        userId: { in: userIds },
        status: { in: ["OPEN", "IN_PROGRESS"] },
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        userId: true,
        status: true,
        priority: true,
      },
    }),
  ]);

  const userMap = new Map(users.map((u) => [u.id, u]));
  const ticketByUser = new Map<string, (typeof openTickets)[number]>();
  for (const t of openTickets) {
    if (!ticketByUser.has(t.userId)) ticketByUser.set(t.userId, t);
  }

  const pendingCounts = await Promise.all(
    userIds.map(async (userId) => {
      const lastAdmin = await prisma.supportInboxMessage.findFirst({
        where: { userId, role: "admin" },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      });
      const pending = await prisma.supportInboxMessage.count({
        where: {
          userId,
          role: "user",
          ...(lastAdmin ? { createdAt: { gt: lastAdmin.createdAt } } : {}),
        },
      });
      return [userId, pending] as const;
    }),
  );
  const pendingMap = new Map(pendingCounts);

  let rows: SupportConversationView[] = groups.map((g, i) => {
    const user = userMap.get(g.userId);
    const last = lastMessages[i];
    const ticket = ticketByUser.get(g.userId);
    return {
      userId: g.userId,
      user: user
        ? {
            id: user.id,
            name: user.name,
            email: user.email,
            username: user.username,
          }
        : {
            id: g.userId,
            name: "Unknown",
            email: "",
            username: "",
          },
      lastMessage: last
        ? {
            id: last.id,
            role: last.role as InboxRole,
            content: last.content,
            createdAt: last.createdAt.toISOString(),
          }
        : null,
      messageCount: g._count._all,
      pendingFromUser: pendingMap.get(g.userId) ?? 0,
      openTicketId: ticket?.id ?? null,
      openTicketStatus: ticket?.status ?? null,
      openTicketPriority: ticket?.priority ?? null,
    };
  });

  if (search) {
    rows = rows.filter((r) => {
      const hay =
        `${r.user.name} ${r.user.email} ${r.user.username} ${r.lastMessage?.content ?? ""}`.toLowerCase();
      return hay.includes(search);
    });
    const start = (page - 1) * limit;
    const pageRows = rows.slice(start, start + limit);
    return {
      conversations: pageRows,
      page,
      limit,
      hasMore: rows.length > start + limit,
    };
  }

  const hasMore = rows.length > limit;
  return {
    conversations: hasMore ? rows.slice(0, limit) : rows,
    page,
    limit,
    hasMore,
  };
}

/** Admin reply into a user's live support chat (optional ticket mirror). */
export async function adminReplyToUserInbox(input: {
  userId: string;
  adminId: string;
  body: string;
  ticketId?: string | null;
}) {
  const body = input.body.trim().slice(0, 4000);
  if (!body) return null;

  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { id: true },
  });
  if (!user) return null;

  let ticketId = input.ticketId ?? null;
  if (!ticketId) {
    const open = await prisma.supportTicket.findFirst({
      where: {
        userId: input.userId,
        status: { in: ["OPEN", "IN_PROGRESS"] },
      },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    });
    ticketId = open?.id ?? null;
  }

  if (ticketId) {
    await prisma.$transaction([
      prisma.supportTicketReply.create({
        data: {
          ticketId,
          authorRole: "ADMIN",
          authorId: input.adminId,
          body,
        },
      }),
      prisma.supportTicket.update({
        where: { id: ticketId },
        data: { status: "IN_PROGRESS", updatedAt: new Date() },
      }),
    ]);
  }

  const message = await appendSupportInboxMessage({
    userId: input.userId,
    role: "admin",
    content: body,
    ticketId,
    read: false,
  });

  return message;
}

/** Build a short admin-facing ticket brief from recent chat turns. */
export function refineTicketFromChat(input: {
  message: string;
  history?: { role: string; content: string }[];
}): { subject: string; message: string; context: string } {
  const history = (input.history ?? []).slice(-8);
  const userLines = history
    .filter((m) => m.role === "user")
    .map((m) => m.content.trim())
    .filter(Boolean);
  const latest = input.message.trim();
  const subjectSeed = latest || userLines.at(-1) || "Support chat request";
  const subject =
    subjectSeed.length > 90 ? `${subjectSeed.slice(0, 87)}…` : subjectSeed;

  const preview = [
    "Chat preview (newest last):",
    ...history.map((m) => `${m.role}: ${m.content}`),
    `user: ${latest}`,
  ].join("\n");

  const message = [
    "Refined ticket from support chat:",
    "",
    userLines.length
      ? userLines.map((l, i) => `${i + 1}. ${l}`).join("\n")
      : `(no prior user turns)`,
    "",
    `Latest: ${latest}`,
  ].join("\n");

  return {
    subject: `Chat · ${subject}`.slice(0, 200),
    message: message.slice(0, 4000),
    context: preview.slice(0, 8000),
  };
}
