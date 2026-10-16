"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  BadgeCheck, Bell, Gamepad2, LayoutPanelTop, MousePointerClick, PanelLeft,
  Palette, RectangleHorizontal, Tag, TextCursorInput, Type,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PALETTES, type PaletteId } from "./palettes";
import { PaletteTab } from "./sections/palette-tab";
import { TypeTab } from "./sections/type-tab";
import { ButtonsTab } from "./sections/buttons-tab";
import { BadgesTab } from "./sections/badges-tab";
import { CardsTab } from "./sections/cards-tab";
import { HeaderTab } from "./sections/header-tab";
import { SidebarTab } from "./sections/sidebar-tab";
import { FeedbackTab } from "./sections/feedback-tab";
import { FormsTab } from "./sections/forms-tab";

const STORAGE_KEY = "theme-lab-palette";
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => void listeners.delete(cb);
}
function readPalette(): PaletteId {
  const saved = localStorage.getItem(STORAGE_KEY);
  return PALETTES.some((p) => p.id === saved) ? (saved as PaletteId) : "arctic";
}
function writePalette(id: PaletteId) {
  localStorage.setItem(STORAGE_KEY, id);
  listeners.forEach((l) => l());
}

export function ThemeLab() {
  const palette = useSyncExternalStore(subscribe, readPalette, () => "arctic" as PaletteId);
  const setPalette = writePalette;

  useEffect(() => {
    document.documentElement.dataset.palette = palette;
  }, [palette]);

  return (
    <div className="relative min-h-screen">
      <div className="grid-bg pointer-events-none absolute inset-x-0 top-0 h-[420px] opacity-40 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-72 w-[600px] -translate-x-1/2 rounded-full bg-primary/20 blur-[120px]" />

      <main className="relative mx-auto max-w-6xl px-4 py-8 sm:py-12">
        <header className="mb-8">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-highlight">
            <Gamepad2 className="size-4" /> Theme Lab
          </div>
          <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
            Pick the <span className="text-gradient">look</span> before we build the store
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Switch palette (top-right of every tab), then go through each tab and note which
            variant you like: header, sidebar, product card, badges, toasts.
          </p>
        </header>

        <Tabs defaultValue="palette">
          <TabsList>
            <TabsTrigger value="palette"><Palette /> Palette</TabsTrigger>
            <TabsTrigger value="type"><Type /> Type</TabsTrigger>
            <TabsTrigger value="buttons"><MousePointerClick /> Buttons</TabsTrigger>
            <TabsTrigger value="badges"><Tag /> Badges &amp; chips</TabsTrigger>
            <TabsTrigger value="cards"><RectangleHorizontal /> Cards</TabsTrigger>
            <TabsTrigger value="header"><LayoutPanelTop /> Header</TabsTrigger>
            <TabsTrigger value="sidebar"><PanelLeft /> Sidebar</TabsTrigger>
            <TabsTrigger value="feedback"><Bell /> Toasts &amp; alerts</TabsTrigger>
            <TabsTrigger value="forms"><TextCursorInput /> Forms &amp; dialogs</TabsTrigger>
          </TabsList>

          <TabsContent value="palette"><PaletteTab palette={palette} onChange={setPalette} /></TabsContent>
          <TabsContent value="type"><TypeTab /></TabsContent>
          <TabsContent value="buttons"><ButtonsTab /></TabsContent>
          <TabsContent value="badges"><BadgesTab /></TabsContent>
          <TabsContent value="cards"><CardsTab /></TabsContent>
          <TabsContent value="header"><HeaderTab /></TabsContent>
          <TabsContent value="sidebar"><SidebarTab /></TabsContent>
          <TabsContent value="feedback"><FeedbackTab /></TabsContent>
          <TabsContent value="forms"><FormsTab /></TabsContent>
        </Tabs>

        <p className="mt-12 flex items-center gap-2 text-xs text-muted-foreground">
          <BadgeCheck className="size-4 text-success" /> Not linked anywhere and hidden from search engines.
        </p>
      </main>
    </div>
  );
}
