"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";

export function CopyKey({ value }: { value: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      size="sm"
      variant="secondary"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          toast.success("Key copied");
          setTimeout(() => setDone(false), 1500);
        } catch {
          toast.error("Copy failed");
        }
      }}
    >
      {done ? <Check /> : <Copy />} {done ? "Copied" : "Copy"}
    </Button>
  );
}
