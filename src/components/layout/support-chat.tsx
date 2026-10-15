"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { SupportChatThread } from "@/components/support/support-chat-thread";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { SupportButton, SupportChatReply } from "@/types/support";
import { useSidebarOptional } from "@/components/ui/sidebar";
import { Bot, Eraser, MessageCircle, Send, X } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { toast } from "@/lib/toast";

type UiRole = "user" | "assistant" | "admin" | "notification" | "system";

type UiMessage = {
  id?: string;
  role: UiRole;
  content: string;
  buttons?: SupportButton[];
  attachmentUrl?: string | null;
  createdAt?: string;
};

type GuestState = {
  messages: UiMessage[];
  stepId: string | null;
  stepStack: string[];
};

const GUEST_STORAGE_KEY = "drip-support-bot-v1";
const FAB_CLEARANCE_PX = 76;
const PANEL_GAP_PX = 12;
const PANEL_MAX_HEIGHT_PX = 560;
const PANEL_MIN_HEIGHT_PX = 320;

function loadGuestState(): GuestState {
  if (typeof window === "undefined") {
    return { messages: [], stepId: null, stepStack: [] };
  }
  try {
    const raw = localStorage.getItem(GUEST_STORAGE_KEY);
    if (!raw) return { messages: [], stepId: null, stepStack: [] };
    const parsed = JSON.parse(raw) as GuestState;
    return {
      messages: Array.isArray(parsed.messages) ? parsed.messages : [],
      stepId: parsed.stepId ?? null,
      stepStack: Array.isArray(parsed.stepStack) ? parsed.stepStack : [],
    };
  } catch {
    return { messages: [], stepId: null, stepStack: [] };
  }
}

function saveGuestState(state: GuestState) {
  try {
    localStorage.setItem(
      GUEST_STORAGE_KEY,
      JSON.stringify({
        messages: state.messages.slice(-80),
        stepId: state.stepId,
        stepStack: state.stepStack.slice(-20),
      }),
    );
  } catch {
    // ignore quota
  }
}

function hasUserChat(messages: UiMessage[]) {
  return messages.some((m) => m.role === "user");
}

/** Floating panel frame that tracks the visible viewport (keyboard-safe). */
function useFloatingChatFrame(active: boolean) {
  const [frame, setFrame] = useState<{
    height: number;
    bottom: number;
    top: number;
  } | null>(null);

  useEffect(() => {
    if (!active) {
      setFrame(null);
      return;
    }

    let raf = 0;
    const sync = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const vv = window.visualViewport;
        const layoutH = window.innerHeight;
        const visibleH = vv ? vv.height : layoutH;
        const offsetTop = vv ? vv.offsetTop : 0;
        const keyboardInset = Math.max(
          0,
          Math.round(layoutH - visibleH - offsetTop),
        );
        const keyboardOpen = keyboardInset > 48;

        // Sit above the keyboard when open; otherwise clear the FAB.
        const bottom = keyboardOpen
          ? keyboardInset + PANEL_GAP_PX
          : FAB_CLEARANCE_PX + PANEL_GAP_PX;

        const topPad = PANEL_GAP_PX + Math.max(0, Math.round(offsetTop));
        const available = Math.round(visibleH) - bottom - topPad + offsetTop;
        const height = Math.max(
          PANEL_MIN_HEIGHT_PX,
          Math.min(PANEL_MAX_HEIGHT_PX, available),
        );

        setFrame({
          height,
          bottom,
          top: topPad,
        });
      });
    };

    sync();
    const vv = window.visualViewport;
    vv?.addEventListener("resize", sync);
    vv?.addEventListener("scroll", sync);
    window.addEventListener("resize", sync);
    window.addEventListener("orientationchange", sync);

    return () => {
      cancelAnimationFrame(raf);
      vv?.removeEventListener("resize", sync);
      vv?.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
      window.removeEventListener("orientationchange", sync);
    };
  }, [active]);

  return frame;
}

type SupportChatProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unread: number;
  onUnreadChange: (n: number) => void;
};

export type SupportChatHandle = {
  requestClose: () => void;
};

export const SupportChat = forwardRef<SupportChatHandle, SupportChatProps>(
  function SupportChat(
    { open, onOpenChange, unread, onUnreadChange },
    ref,
  ) {
    const router = useRouter();
    const { user } = useAuth();
    const frame = useFloatingChatFrame(open);
    const [messages, setMessages] = useState<UiMessage[]>([]);
    const [stepId, setStepId] = useState<string | null>(null);
    const stepStackRef = useRef<string[]>([]);
    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);
    const [closeOpen, setCloseOpen] = useState(false);
    const [hydrated, setHydrated] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const skipCloseConfirm = useRef(false);

    const applyEntryReply = useCallback((data: SupportChatReply) => {
      setStepId(data.stepId || null);
      stepStackRef.current = [];
      setMessages([
        {
          role: "assistant",
          content: data.reply,
          buttons: data.buttons,
          createdAt: new Date().toISOString(),
        },
      ]);
    }, []);

    const fetchEntry = useCallback(async () => {
      const res = await fetch("/api/support/chat");
      const json = (await res.json()) as {
        data?: SupportChatReply;
        error?: { message: string };
      };
      if (!res.ok || !json.data?.reply) {
        throw new Error(json.error?.message ?? "Support is unavailable.");
      }
      return json.data;
    }, []);

    const loadInbox = useCallback(async () => {
      if (!user) {
        const guest = loadGuestState();
        if (guest.messages.length === 0) {
          try {
            const entry = await fetchEntry();
            applyEntryReply(entry);
            saveGuestState({
              messages: [
                {
                  role: "assistant",
                  content: entry.reply,
                  buttons: entry.buttons,
                  createdAt: new Date().toISOString(),
                },
              ],
              stepId: entry.stepId || null,
              stepStack: [],
            });
          } catch {
            setMessages([
              {
                role: "assistant",
                content: "Support bot is loading… try again in a moment.",
              },
            ]);
          }
        } else {
          setMessages(guest.messages);
          setStepId(guest.stepId);
          stepStackRef.current = guest.stepStack;
        }
        setHydrated(true);
        return;
      }

      try {
        const res = await fetch("/api/support/inbox");
        const json = (await res.json()) as {
          data?: { messages?: UiMessage[]; unread?: number };
        };
        const rows = json.data?.messages ?? [];
        if (rows.length === 0) {
          const entry = await fetchEntry();
          applyEntryReply(entry);
        } else {
          setMessages(
            rows.map((m) => ({
              id: m.id,
              role: m.role as UiRole,
              content: m.content,
              buttons: m.buttons,
              attachmentUrl: m.attachmentUrl,
              createdAt: m.createdAt,
            })),
          );
        }
        onUnreadChange(json.data?.unread ?? 0);
      } catch {
        try {
          const entry = await fetchEntry();
          applyEntryReply(entry);
        } catch {
          setMessages([
            {
              role: "assistant",
              content: "Support bot is loading… try again in a moment.",
            },
          ]);
        }
      } finally {
        setHydrated(true);
      }
    }, [user, onUnreadChange, fetchEntry, applyEntryReply]);

    useEffect(() => {
      void loadInbox();
    }, [loadInbox]);

    useEffect(() => {
      if (!user) {
        saveGuestState({
          messages,
          stepId,
          stepStack: stepStackRef.current,
        });
      }
    }, [messages, stepId, user]);

    useEffect(() => {
      if (!open || !user) return;
      void fetch("/api/support/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "read" }),
      }).then(() => onUnreadChange(0));
    }, [open, user, onUnreadChange]);

    useEffect(() => {
      if (!user) return;
      const tick = async () => {
        try {
          const res = await fetch("/api/support/inbox/unread");
          const json = (await res.json()) as { data?: { unread?: number } };
          const n = json.data?.unread ?? 0;
          onUnreadChange(n);
          if (open && n > 0) {
            await loadInbox();
            await fetch("/api/support/inbox", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "read" }),
            });
            onUnreadChange(0);
          }
        } catch {
          // ignore
        }
      };
      const id = window.setInterval(() => {
        if (document.hidden) return;
        void tick();
      }, 5_000);
      return () => window.clearInterval(id);
    }, [user, open, unread, onUnreadChange, loadInbox]);

    useEffect(() => {
      if (!open) return;
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          e.preventDefault();
          requestClose();
        }
      };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
      // eslint-disable-next-line react-hooks/exhaustive-deps -- requestClose uses latest messages via closure on each open
    }, [open, messages]);

    function forceClose() {
      skipCloseConfirm.current = true;
      setCloseOpen(false);
      inputRef.current?.blur();
      onOpenChange(false);
    }

    function requestClose() {
      if (skipCloseConfirm.current) {
        skipCloseConfirm.current = false;
        onOpenChange(false);
        return;
      }
      if (hasUserChat(messages)) {
        setCloseOpen(true);
        return;
      }
      forceClose();
    }

    useImperativeHandle(ref, () => ({ requestClose }), [messages, onOpenChange]);

    async function clearAndClose() {
      if (user) {
        await fetch("/api/support/inbox", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "clear" }),
        });
      } else {
        localStorage.removeItem(GUEST_STORAGE_KEY);
      }
      try {
        const entry = await fetchEntry();
        applyEntryReply(entry);
      } catch {
        setMessages([]);
        setStepId(null);
        stepStackRef.current = [];
      }
      setInput("");
      setSending(false);
      onUnreadChange(0);
      toast.message("Chat cleared.");
      forceClose();
    }

    function keepAndClose() {
      forceClose();
    }

    async function callChat(payload: {
      message?: string;
      stepId?: string | null;
      buttonId?: string;
      buttonAction?: string;
    }) {
      const res = await fetch("/api/support/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const raw = await res.text();
      let json: { data?: SupportChatReply; error?: { message: string } } = {};
      if (raw) {
        try {
          json = JSON.parse(raw) as {
            data?: SupportChatReply;
            error?: { message: string };
          };
        } catch {
          throw new Error("Support returned an invalid response.");
        }
      }
      if (!res.ok || !json.data?.reply) {
        throw new Error(json.error?.message ?? "Support is unavailable.");
      }
      return json.data;
    }

    function applyReplyLocal(
      data: SupportChatReply,
      userBubble?: string,
    ) {
      setMessages((prev) => {
        const next = [...prev];
        if (userBubble) {
          next.push({
            role: "user",
            content: userBubble,
            createdAt: new Date().toISOString(),
          });
        }
        next.push({
          role: "assistant",
          content: data.reply,
          buttons: data.buttons,
          createdAt: new Date().toISOString(),
        });
        return next;
      });
      if (data.stepId) setStepId(data.stepId);
    }

    async function handleButton(btn: SupportButton) {
      if (btn.action === "focus_input") {
        inputRef.current?.focus();
        return;
      }

      if (btn.href && !btn.action) {
        forceClose();
        router.push(btn.href);
        return;
      }

      const echo = btn.label;
      setMessages((prev) => [
        ...prev,
        {
          role: "user",
          content: echo,
          createdAt: new Date().toISOString(),
        },
      ]);
      setSending(true);
      try {
        let payload: {
          message?: string;
          stepId?: string | null;
          buttonId?: string;
          buttonAction?: string;
        };

        if (btn.action === "back") {
          const stack = stepStackRef.current;
          const previous = stack.pop() ?? null;
          stepStackRef.current = stack;
          payload = {
            buttonAction: "back",
            stepId: previous,
            buttonId: btn.id,
          };
        } else {
          if (stepId) {
            stepStackRef.current = [...stepStackRef.current, stepId];
          }
          payload = {
            stepId,
            buttonId: btn.id,
          };
        }

        const data = await callChat(payload);
        // User echo already painted — only append the bot reply.
        applyReplyLocal(data);
      } catch (err) {
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "user" && last.content === echo) {
            return prev.slice(0, -1);
          }
          return prev;
        });
        toast.error(err instanceof Error ? err.message : "Action failed.");
      } finally {
        setSending(false);
      }
    }

    async function sendText(text: string) {
      const trimmed = text.trim();
      if (!trimmed || sending) return;

      inputRef.current?.blur();
      setInput("");
      setMessages((prev) => [
        ...prev,
        {
          role: "user",
          content: trimmed,
          createdAt: new Date().toISOString(),
        },
      ]);
      setSending(true);

      try {
        const data = await callChat({
          message: trimmed,
          stepId,
        });
        applyReplyLocal(data);
      } catch (err) {
        const errMsg =
          err instanceof Error
            ? err.message
            : "Something went wrong. Please try again.";
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: errMsg,
            createdAt: new Date().toISOString(),
          },
        ]);
      } finally {
        setSending(false);
      }
    }

    if (!open && !closeOpen) return null;

    return (
      <>
        {open ? (
          <>
            <button
              type="button"
              aria-label="Dismiss support chat"
              className="fixed inset-0 z-40 bg-black/45 supports-backdrop-filter:backdrop-blur-[2px]"
              onClick={requestClose}
            />

            <div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-label="Drip Support"
              className={cn(
                "fixed z-50 flex w-[min(24rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-[1.35rem]",
                "border border-[color:var(--glass-border)] bg-[color:var(--glass-surface)]",
                "shadow-[var(--elevation-2),0_0_40px_-18px_color-mix(in_oklab,var(--primary)_45%,transparent)]",
                "supports-backdrop-filter:backdrop-blur-2xl",
                "right-3 left-auto animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-3 duration-200",
              )}
              style={{
                bottom: frame?.bottom ?? FAB_CLEARANCE_PX + PANEL_GAP_PX,
                height: frame?.height ?? PANEL_MAX_HEIGHT_PX,
                maxHeight: frame?.height ?? PANEL_MAX_HEIGHT_PX,
              }}
            >
              <header className="relative shrink-0 overflow-hidden border-b border-border/40">
                <div
                  className="pointer-events-none absolute inset-0 bg-[image:var(--gradient-primary)] opacity-[0.18]"
                  aria-hidden
                />
                <div
                  className="pointer-events-none absolute -top-10 right-0 size-28 rounded-full bg-primary/25 blur-3xl"
                  aria-hidden
                />
                <div className="relative flex items-center gap-2.5 px-3.5 py-3">
                  <span className="relative flex size-10 items-center justify-center rounded-2xl bg-primary/20 text-primary shadow-[0_0_20px_-6px_color-mix(in_oklab,var(--primary)_70%,transparent)] ring-1 ring-primary/30">
                    <Bot className="size-5" />
                    <span
                      className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2 border-background bg-success shadow-[0_0_8px_color-mix(in_oklab,var(--success)_70%,transparent)]"
                      aria-hidden
                    />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold tracking-tight text-foreground">
                      Drip Support
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {sending ? (
                        <span className="text-primary/90">Typing a reply…</span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className="size-1.5 rounded-full bg-success shadow-[0_0_6px_color-mix(in_oklab,var(--success)_80%,transparent)]"
                            aria-hidden
                          />
                          Online · guided help
                        </span>
                      )}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    className="rounded-full hover:bg-background/40"
                    onClick={requestClose}
                    aria-label="Close support chat"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              </header>

              <SupportChatThread
                messages={hydrated ? messages : []}
                viewer="customer"
                sending={sending}
                onButton={(btn) => void handleButton(btn)}
                className="bg-[radial-gradient(ellipse_at_top,color-mix(in_oklab,var(--primary)_8%,transparent),transparent_55%)]"
              />

              <form
                className="shrink-0 border-t border-border/40 bg-muted/20 p-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]"
                onSubmit={(e) => {
                  e.preventDefault();
                  void sendText(input);
                }}
              >
                <div className="flex items-center gap-2 rounded-2xl border border-border/55 bg-background/85 p-1 pl-3 shadow-[inset_0_1px_0_color-mix(in_oklab,white_6%,transparent)] backdrop-blur-md focus-within:border-primary/45 focus-within:ring-3 focus-within:ring-primary/25">
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask anything…"
                    maxLength={1000}
                    disabled={sending}
                    className="h-9 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/80 disabled:opacity-60"
                    aria-label="Support message"
                  />
                  <Button
                    type="submit"
                    size="icon-sm"
                    className="pressable size-8 rounded-xl shadow-sm"
                    disabled={sending || !input.trim()}
                    aria-label="Send message"
                  >
                    <Send className="size-3.5" />
                  </Button>
                </div>
              </form>
            </div>
          </>
        ) : null}

        <Dialog open={closeOpen} onOpenChange={setCloseOpen}>
          <DialogContent className="max-w-sm gap-0 overflow-hidden p-0">
            <DialogHeader className="border-b border-border bg-muted/40 px-4 py-3">
              <DialogTitle>Close support chat?</DialogTitle>
              <DialogDescription>
                Your conversation stays saved so notifications can still reach
                you here. Clear only if you want a fresh start.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 px-4 py-3 text-sm text-muted-foreground">
              <p>
                <strong className="text-foreground">Keep & close</strong> — hide
                the chat, keep history.
              </p>
              <p>
                <strong className="text-foreground">Clear & close</strong> — wipe
                this thread and restart from the main menu.
              </p>
            </div>
            <DialogFooter className="flex-col gap-2 border-t border-border px-4 py-3 sm:flex-col">
              <Button type="button" className="w-full" onClick={keepAndClose}>
                Keep & close
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="w-full"
                onClick={() => void clearAndClose()}
              >
                <Eraser className="size-4" />
                Clear & close
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setCloseOpen(false)}
              >
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  },
);

export function SupportChatFab() {
  const { user } = useAuth();
  const sidebar = useSidebarOptional();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const chatRef = useRef<SupportChatHandle>(null);
  const hideFab = Boolean(sidebar?.isMobile && sidebar.openMobile);

  useEffect(() => {
    if (!user) {
      setUnread(0);
      return;
    }
    void fetch("/api/support/inbox/unread")
      .then((r) => r.json())
      .then((json: { data?: { unread?: number } }) => {
        setUnread(json.data?.unread ?? 0);
      })
      .catch(() => undefined);
  }, [user]);

  return (
    <>
      {!hideFab ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "relative fixed right-3 z-50 size-14 rounded-full border-0 bg-transparent shadow-none hover:bg-transparent dark:hover:bg-transparent",
            "bottom-[max(1rem,env(safe-area-inset-bottom))]",
          )}
          onClick={() => {
            if (open) chatRef.current?.requestClose();
            else setOpen(true);
          }}
          aria-label={open ? "Close support chat" : "Open support chat"}
          aria-expanded={open}
        >
          {open ? (
            <span className="flex size-14 items-center justify-center rounded-full bg-muted text-foreground shadow-lg ring-2 ring-border/60 transition-transform duration-300 ease-out hover:scale-105">
              <X className="size-6" />
            </span>
          ) : (
            <span className="flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-2 ring-primary/30 transition-transform duration-300 ease-out hover:scale-105">
              <MessageCircle className="size-7" strokeWidth={2} />
            </span>
          )}
          {!open && unread > 0 ? (
            <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground ring-2 ring-background">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </Button>
      ) : null}
      <SupportChat
        ref={chatRef}
        open={open}
        onOpenChange={setOpen}
        unread={unread}
        onUnreadChange={setUnread}
      />
    </>
  );
}
