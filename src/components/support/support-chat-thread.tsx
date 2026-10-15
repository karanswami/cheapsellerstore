"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Attachment,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from "@/components/ui/attachment";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Button } from "@/components/ui/button";
import { Marker, MarkerContent } from "@/components/ui/marker";
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
  MessageHeader,
} from "@/components/ui/message";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
  useMessageScroller,
} from "@/components/ui/message-scroller";
import { layoutSupportKeyboard } from "@/lib/support-keyboard";
import { cn } from "@/lib/utils";
import type { SupportButton } from "@/types/support";
import { Bell, Bot, ImageIcon, Shield, UserRound } from "lucide-react";
import {
  type ReactNode,
  useLayoutEffect,
  useEffect,
  useRef,
} from "react";

export type SupportThreadRole =
  | "user"
  | "assistant"
  | "admin"
  | "notification"
  | "system";

export type SupportThreadMessage = {
  id?: string;
  role: SupportThreadRole;
  content: string;
  buttons?: SupportButton[];
  attachmentUrl?: string | null;
  createdAt?: string;
};

export type SupportChatViewer = "customer" | "admin";

type SupportChatThreadProps = {
  messages: SupportThreadMessage[];
  viewer: SupportChatViewer;
  sending?: boolean;
  onButton?: (btn: SupportButton) => void;
  className?: string;
  footer?: ReactNode;
  /** Older history available — show Load earlier control at top. */
  hasMoreOlder?: boolean;
  loadingOlder?: boolean;
  onLoadOlder?: () => void;
};

function isOwnSide(role: SupportThreadRole, viewer: SupportChatViewer) {
  if (viewer === "customer") return role === "user";
  return role === "admin";
}

function roleLabel(role: SupportThreadRole) {
  if (role === "admin") return "Admin";
  if (role === "notification") return "Notification";
  if (role === "assistant") return "Cheap Seller Support";
  if (role === "user") return "Customer";
  return null;
}

function bubbleVariant(
  role: SupportThreadRole,
  own: boolean,
): "default" | "muted" | "tinted" | "secondary" | "outline" {
  if (own) return "default";
  if (role === "admin") return "tinted";
  if (role === "notification") return "secondary";
  if (role === "system") return "outline";
  return "muted";
}

function RoleIcon({ role }: { role: SupportThreadRole }) {
  if (role === "admin") return <Shield className="size-3.5" />;
  if (role === "notification") return <Bell className="size-3.5" />;
  if (role === "user") return <UserRound className="size-3.5" />;
  return <Bot className="size-3.5" />;
}

function formatWhen(iso?: string) {
  if (!iso) return null;
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Keep the latest reply + action buttons in view after every interaction. */
function ScrollToLatest({
  messageCount,
  sending,
}: {
  messageCount: number;
  sending: boolean;
}) {
  const { scrollToEnd } = useMessageScroller();
  const first = useRef(true);

  useLayoutEffect(() => {
    const behavior = first.current ? "auto" : "smooth";
    first.current = false;
    scrollToEnd({ behavior });
  }, [messageCount, sending, scrollToEnd]);

  // Choice buttons / bubble animations can grow after paint — settle to bottom.
  useEffect(() => {
    const frames: number[] = [];
    const settle = (n: number) => {
      if (n <= 0) {
        scrollToEnd({ behavior: "auto" });
        return;
      }
      frames.push(
        window.requestAnimationFrame(() => {
          scrollToEnd({ behavior: "auto" });
          settle(n - 1);
        }),
      );
    };
    settle(2);
    const t = window.setTimeout(() => scrollToEnd({ behavior: "auto" }), 180);
    return () => {
      frames.forEach((id) => window.cancelAnimationFrame(id));
      window.clearTimeout(t);
    };
  }, [messageCount, sending, scrollToEnd]);

  return null;
}

function ChoiceButtons({
  buttons,
  disabled,
  onButton,
}: {
  buttons: SupportButton[];
  disabled?: boolean;
  onButton?: (btn: SupportButton) => void;
}) {
  const rows = layoutSupportKeyboard(buttons);

  return (
    <div
      className="flex w-full max-w-[min(100%,20rem)] flex-col gap-1.5 pt-1"
      role="group"
      aria-label="Support choices"
    >
      {rows.map((row, rowIdx) => (
        <div key={`kb-row-${rowIdx}`} className="flex w-full gap-1.5">
          {row.map((btn) => {
            const isBack = btn.action === "back";
            const isInput = btn.action === "focus_input";
            const alone = row.length === 1;
            return (
              <Button
                key={btn.id}
                type="button"
                size="sm"
                variant={isBack ? "ghost" : "outline"}
                disabled={disabled}
                className={cn(
                  "pressable h-10 min-w-0 flex-1 justify-center gap-1.5 rounded-xl px-2.5 text-center text-[12px] font-medium leading-tight",
                  "border-border/60 bg-card/90 shadow-sm backdrop-blur-sm",
                  "hover:border-primary/45 hover:bg-primary/12 hover:text-foreground",
                  "transition-[border-color,background-color,transform,box-shadow] duration-200",
                  alone && "px-3",
                  isInput &&
                    "border-dashed border-primary/35 bg-primary/5 text-foreground",
                  isBack &&
                    "border-transparent bg-transparent text-muted-foreground shadow-none hover:bg-muted/55",
                )}
                onClick={() => onButton?.(btn)}
              >
                <span className="line-clamp-2 break-words">{btn.label}</span>
              </Button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function SupportChatThread({
  messages,
  viewer,
  sending = false,
  onButton,
  className,
  footer,
  hasMoreOlder = false,
  loadingOlder = false,
  onLoadOlder,
}: SupportChatThreadProps) {
  const lastInteractiveIdx = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (
        m &&
        (m.role === "assistant" || m.role === "admin" || m.role === "notification") &&
        m.buttons &&
        m.buttons.length > 0
      ) {
        return i;
      }
    }
    return -1;
  })();

  const itemClass =
    "min-w-0 shrink-0 [content-visibility:visible] [contain-intrinsic-size:none] animate-in fade-in-0 slide-in-from-bottom-1 duration-200 fill-mode-both";

  return (
    <div className={cn("flex h-full min-h-0 flex-1 flex-col overflow-hidden", className)}>
      <MessageScrollerProvider autoScroll defaultScrollPosition="end">
        <MessageScroller className="min-h-0 flex-1">
          <ScrollToLatest messageCount={messages.length} sending={sending} />
          <MessageScrollerViewport className="min-h-0 scroll-smooth">
            <MessageScrollerContent className="gap-3.5 px-3 py-3.5">
              {hasMoreOlder || loadingOlder ? (
                <MessageScrollerItem
                  messageId="load-older"
                  className={itemClass}
                >
                  <div className="flex justify-center py-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 rounded-full px-3 text-xs"
                      disabled={loadingOlder || !onLoadOlder}
                      onClick={() => onLoadOlder?.()}
                    >
                      {loadingOlder ? "Loading…" : "Load earlier messages"}
                    </Button>
                  </div>
                </MessageScrollerItem>
              ) : null}

              {messages.map((msg, i) => {
                if (msg.role === "system") {
                  return (
                    <MessageScrollerItem
                      key={msg.id ?? `system-${i}`}
                      messageId={msg.id ?? `system-${i}`}
                      className={itemClass}
                    >
                      <Marker variant="separator">
                        <MarkerContent className="max-w-[90%] text-center text-xs">
                          {msg.content}
                        </MarkerContent>
                      </Marker>
                    </MessageScrollerItem>
                  );
                }

                const own = isOwnSide(msg.role, viewer);
                const align = own ? "end" : "start";
                const label = roleLabel(msg.role);
                const when = formatWhen(msg.createdAt);
                const showButtons =
                  i === lastInteractiveIdx &&
                  Boolean(msg.buttons?.length) &&
                  !sending;

                return (
                  <MessageScrollerItem
                    key={msg.id ?? `${msg.role}-${i}`}
                    messageId={msg.id ?? `${msg.role}-${i}`}
                    className={itemClass}
                  >
                    <Message align={align}>
                      {!own ? (
                        <MessageAvatar>
                          <Avatar size="sm">
                            <AvatarFallback
                              className={cn(
                                "ring-1 ring-border/40",
                                msg.role === "admin"
                                  ? "bg-primary/15 text-primary"
                                  : msg.role === "notification"
                                    ? "bg-secondary text-secondary-foreground"
                                    : msg.role === "user"
                                      ? "bg-muted text-muted-foreground"
                                      : "bg-primary/15 text-primary",
                              )}
                            >
                              <RoleIcon role={msg.role} />
                            </AvatarFallback>
                          </Avatar>
                        </MessageAvatar>
                      ) : null}
                      <MessageContent className="gap-1.5">
                        {label && !own ? (
                          <MessageHeader className="text-[11px] font-medium tracking-wide text-muted-foreground/90">
                            {label}
                          </MessageHeader>
                        ) : null}
                        <Bubble
                          variant={bubbleVariant(msg.role, own)}
                          align={align}
                          className={cn(
                            "max-w-[92%]",
                            own &&
                              "*:data-[slot=bubble-content]:rounded-2xl *:data-[slot=bubble-content]:rounded-br-md *:data-[slot=bubble-content]:bg-[image:var(--gradient-primary)] *:data-[slot=bubble-content]:shadow-[0_6px_18px_-8px_color-mix(in_oklab,var(--primary)_55%,transparent)]",
                            !own &&
                              "*:data-[slot=bubble-content]:rounded-2xl *:data-[slot=bubble-content]:rounded-bl-md *:data-[slot=bubble-content]:border-border/50 *:data-[slot=bubble-content]:bg-muted/80 *:data-[slot=bubble-content]:shadow-sm",
                          )}
                        >
                          <BubbleContent className="whitespace-pre-wrap text-[13px] leading-relaxed">
                            {msg.content}
                          </BubbleContent>
                        </Bubble>
                        {msg.attachmentUrl ? (
                          <Attachment state="done" size="sm" className="max-w-[92%]">
                            <AttachmentMedia variant="image">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={msg.attachmentUrl}
                                alt="Attachment"
                              />
                            </AttachmentMedia>
                            <AttachmentContent>
                              <AttachmentTitle>Screenshot</AttachmentTitle>
                              <AttachmentDescription>
                                <a
                                  href={msg.attachmentUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="underline"
                                >
                                  Open
                                </a>
                              </AttachmentDescription>
                            </AttachmentContent>
                          </Attachment>
                        ) : null}
                        {showButtons && msg.buttons ? (
                          <ChoiceButtons
                            buttons={msg.buttons}
                            disabled={sending}
                            onButton={onButton}
                          />
                        ) : null}
                        {when ? (
                          <MessageFooter className="text-[10px] text-muted-foreground/70">
                            {when}
                          </MessageFooter>
                        ) : null}
                      </MessageContent>
                    </Message>
                  </MessageScrollerItem>
                );
              })}

              {sending ? (
                <MessageScrollerItem
                  messageId="typing"
                  className={itemClass}
                >
                  <Message align="start">
                    <MessageAvatar>
                      <Avatar size="sm">
                        <AvatarFallback className="bg-primary/15 text-primary ring-1 ring-border/40">
                          {viewer === "admin" ? (
                            <UserRound className="size-3.5" />
                          ) : (
                            <Bot className="size-3.5" />
                          )}
                        </AvatarFallback>
                      </Avatar>
                    </MessageAvatar>
                    <MessageContent>
                      <Bubble
                        variant="muted"
                        align="start"
                        className="*:data-[slot=bubble-content]:rounded-2xl *:data-[slot=bubble-content]:rounded-bl-md *:data-[slot=bubble-content]:border-border/50 *:data-[slot=bubble-content]:bg-muted/80"
                      >
                        <BubbleContent
                          className="flex items-center gap-1.5 px-3.5 py-3"
                          aria-label="Typing"
                        >
                          <span className="size-1.5 animate-bounce rounded-full bg-primary/70 [animation-delay:0ms]" />
                          <span className="size-1.5 animate-bounce rounded-full bg-primary/70 [animation-delay:150ms]" />
                          <span className="size-1.5 animate-bounce rounded-full bg-primary/70 [animation-delay:300ms]" />
                        </BubbleContent>
                      </Bubble>
                    </MessageContent>
                  </Message>
                </MessageScrollerItem>
              ) : null}

              {footer ? (
                <MessageScrollerItem
                  messageId="thread-footer"
                  className={itemClass}
                >
                  {footer}
                </MessageScrollerItem>
              ) : null}
            </MessageScrollerContent>
          </MessageScrollerViewport>
          <MessageScrollerButton className="bottom-3 shadow-md" />
        </MessageScroller>
      </MessageScrollerProvider>
    </div>
  );
}

export function SupportAttachHint({
  onPick,
  uploading,
}: {
  onPick: (file: File) => void;
  uploading?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground hover:bg-muted/40">
      <ImageIcon className="size-4 shrink-0 text-primary" />
      <span>{uploading ? "Uploading…" : "Tap to attach deposit screenshot"}</span>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        disabled={uploading}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onPick(file);
          e.target.value = "";
        }}
      />
    </label>
  );
}
