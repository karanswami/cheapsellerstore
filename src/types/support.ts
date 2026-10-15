export const MAX_SUPPORT_BOT_BUTTONS = 12;

export type SupportBotButtonType = "step" | "link" | "back" | "input";

export type SupportBotButton = {
  id: string;
  label: string;
  type: SupportBotButtonType;
  /** Telegram-style keyboard row (1-based). Same row = side-by-side. */
  row?: number;
  targetStepId?: string;
  href?: string;
};

export type SupportBotStepRow = {
  id: string;
  slug: string;
  title: string;
  messageText: string;
  isEntry: boolean;
  isFallback: boolean;
  active: boolean;
  sortOrder: number;
  buttons: SupportBotButton[];
  createdAt: Date;
  updatedAt: Date;
};

export type SupportButtonAction = "focus_input" | "back" | "menu";

export type SupportButton = {
  id: string;
  label: string;
  href?: string;
  action?: SupportButtonAction;
  meta?: string;
  /** Telegram-style keyboard row (1-based). */
  row?: number;
};

export type SupportChatRole = "user" | "assistant";

export type SupportChatMessage = {
  role: SupportChatRole;
  content: string;
};

export type SupportChatReply = {
  reply: string;
  source: "bot" | "fallback" | "link";
  stepId: string;
  stepSlug: string;
  buttons: SupportButton[];
  /** Shown as user bubble when a button was tapped. */
  userEcho?: string;
};
