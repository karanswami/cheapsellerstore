"use client";

import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      theme="dark"
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast:
            "!rounded-xl !border !border-border !bg-popover !text-foreground !shadow-2xl !shadow-black/40 !font-sans",
          description: "!text-muted-foreground",
          success: "!border-success/40",
          error: "!border-destructive/40",
          warning: "!border-warning/40",
          info: "!border-highlight/40",
        },
      }}
    />
  );
}
