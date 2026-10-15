import { notifyDiscordWebhook } from "@/lib/discord-webhook";
import { prisma } from "@/lib/prisma";
import {
  appendSupportInboxMessage,
  refineTicketFromChat,
} from "@/lib/support-inbox";
import type { TicketPriority, TicketStatus } from "@prisma/client";

export type CreateTicketInput = {
  userId: string;
  routeId: string;
  subject?: string;
  message: string;
  priority?: TicketPriority;
  context?: string | null;
  history?: { role: string; content: string }[];
  /** When true, refine subject/message from chat history. */
  refineFromChat?: boolean;
  attachmentUrls?: string[];
  /** Pause bot while ticket is open. */
  freezeBot?: boolean;
  language?: string | null;
};

function serializeTicket<
  T extends {
    id: string;
    userId: string;
    status: TicketStatus;
    priority: TicketPriority;
    routeId: string;
    subject: string;
    message: string;
    context: string | null;
    attachmentUrls?: string[];
    freezeBot?: boolean;
    createdAt: Date;
    updatedAt: Date;
    user?: { id: string; name: string; email: string; username: string };
    replies?: {
      id: string;
      authorRole: string;
      authorId: string | null;
      body: string;
      createdAt: Date;
    }[];
  },
>(ticket: T) {
  return {
    id: ticket.id,
    userId: ticket.userId,
    status: ticket.status,
    priority: ticket.priority,
    routeId: ticket.routeId,
    subject: ticket.subject,
    message: ticket.message,
    context: ticket.context,
    attachmentUrls: ticket.attachmentUrls ?? [],
    freezeBot: Boolean(ticket.freezeBot),
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
    user: ticket.user
      ? {
          id: ticket.user.id,
          name: ticket.user.name,
          email: ticket.user.email,
          username: ticket.user.username,
        }
      : undefined,
    replies: (ticket.replies ?? []).map((r) => ({
      id: r.id,
      authorRole: r.authorRole,
      authorId: r.authorId,
      body: r.body,
      createdAt: r.createdAt.toISOString(),
    })),
  };
}

export async function createSupportTicket(input: CreateTicketInput) {
  const refined = input.refineFromChat
    ? refineTicketFromChat({
        message: input.message,
        history: input.history,
      })
    : null;

  const subject = (refined?.subject || input.subject || "Support request").slice(
    0,
    200,
  );
  const message = (refined?.message || input.message).slice(0, 4000);
  const context =
    refined?.context || input.context?.slice(0, 8000) || null;
  const freezeBot = Boolean(input.freezeBot);
  const attachments = (input.attachmentUrls ?? []).slice(0, 5);

  const ticket = await prisma.supportTicket.create({
    data: {
      userId: input.userId,
      routeId: input.routeId,
      subject,
      message,
      priority: input.priority ?? "NORMAL",
      status: "OPEN",
      context,
      attachmentUrls: attachments,
      freezeBot,
    },
    include: {
      user: { select: { id: true, name: true, email: true, username: true } },
      replies: { orderBy: { createdAt: "asc" } },
    },
  });

  await appendSupportInboxMessage({
    userId: input.userId,
    role: "system",
    content: freezeBot
      ? "Admin handoff started. The bot is paused — an admin will reply here."
      : "Ticket opened for an admin. They’ll reply right here in this chat.",
    ticketId: ticket.id,
    read: true,
  });

  if (attachments[0]) {
    await appendSupportInboxMessage({
      userId: input.userId,
      role: "user",
      content: "Attached proof / screenshot",
      attachmentUrl: attachments[0],
      ticketId: ticket.id,
      read: true,
    });
  }

  void notifyDiscordWebhook({
    title: `Support ticket · ${ticket.priority}${freezeBot ? " · freeze" : ""}`,
    description: ticket.message.slice(0, 500),
    fields: [
      { name: "Ticket", value: ticket.id, inline: true },
      { name: "User", value: ticket.user.email, inline: true },
      { name: "Route", value: ticket.routeId, inline: true },
      { name: "Language", value: input.language ?? "unknown", inline: true },
      { name: "Subject", value: ticket.subject },
      ...(attachments[0]
        ? [{ name: "Attachment", value: attachments[0] }]
        : []),
    ],
  });

  return serializeTicket(ticket);
}

export async function listCustomerTickets(userId: string) {
  const tickets = await prisma.supportTicket.findMany({
    where: { userId },
    include: { replies: { orderBy: { createdAt: "asc" } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return tickets.map((t) => serializeTicket(t));
}

export async function getCustomerTicket(userId: string, id: string) {
  const ticket = await prisma.supportTicket.findFirst({
    where: { id, userId },
    include: { replies: { orderBy: { createdAt: "asc" } } },
  });
  return ticket ? serializeTicket(ticket) : null;
}

export async function listAdminTickets(filters?: {
  status?: TicketStatus | "ALL";
  priority?: TicketPriority | "ALL";
  search?: string;
}) {
  const status =
    filters?.status && filters.status !== "ALL" ? filters.status : undefined;
  const priority =
    filters?.priority && filters.priority !== "ALL"
      ? filters.priority
      : undefined;
  const search = filters?.search?.trim();

  const tickets = await prisma.supportTicket.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(priority ? { priority } : {}),
      ...(search
        ? {
            OR: [
              { subject: { contains: search } },
              { message: { contains: search } },
              { routeId: { contains: search } },
            ],
          }
        : {}),
    },
    include: {
      user: { select: { id: true, name: true, email: true, username: true } },
      replies: { orderBy: { createdAt: "asc" } },
    },
    orderBy: [{ createdAt: "desc" }],
    take: 200,
  });

  const q = search?.toLowerCase();
  const filtered = q
    ? tickets.filter((t) => {
        const hay = `${t.subject} ${t.message} ${t.routeId} ${t.user.email} ${t.user.username} ${t.user.name}`.toLowerCase();
        return hay.includes(q);
      })
    : tickets;

  return filtered.map((t) => serializeTicket(t));
}

export async function updateTicketStatus(id: string, status: TicketStatus) {
  const ticket = await prisma.supportTicket.update({
    where: { id },
    data: { status },
    include: {
      user: { select: { id: true, name: true, email: true, username: true } },
      replies: { orderBy: { createdAt: "asc" } },
    },
  });
  return serializeTicket(ticket);
}

export async function replyToTicket(input: {
  ticketId: string;
  adminId: string;
  body: string;
  status?: TicketStatus;
}) {
  const existing = await prisma.supportTicket.findUnique({
    where: { id: input.ticketId },
  });
  if (!existing) return null;

  const body = input.body.trim().slice(0, 4000);
  if (!body) return null;

  const [, ticket] = await prisma.$transaction([
    prisma.supportTicketReply.create({
      data: {
        ticketId: input.ticketId,
        authorRole: "ADMIN",
        authorId: input.adminId,
        body,
      },
    }),
    prisma.supportTicket.update({
      where: { id: input.ticketId },
      data: {
        status: input.status ?? "IN_PROGRESS",
        updatedAt: new Date(),
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, username: true },
        },
        replies: { orderBy: { createdAt: "asc" } },
      },
    }),
  ]);

  await appendSupportInboxMessage({
    userId: existing.userId,
    role: "admin",
    content: body,
    ticketId: input.ticketId,
    read: false,
  });

  const nextStatus = input.status ?? "IN_PROGRESS";
  if (nextStatus === "RESOLVED" || nextStatus === "CLOSED") {
    await prisma.supportTicket.update({
      where: { id: input.ticketId },
      data: { freezeBot: false },
    });
  }

  return serializeTicket(ticket);
}
