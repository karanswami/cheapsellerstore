"use client";

import { Tag, Zap } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FlashSection } from "./flash-section";
import { PromoSection } from "./promo-section";

export function AdminPromosClient() {
  return (
    <Tabs defaultValue="promos">
      <TabsList className="w-fit">
        <TabsTrigger value="promos">
          <Tag /> Promo codes
        </TabsTrigger>
        <TabsTrigger value="flash">
          <Zap /> Flash sales
        </TabsTrigger>
      </TabsList>
      <TabsContent value="promos">
        <PromoSection />
      </TabsContent>
      <TabsContent value="flash">
        <FlashSection />
      </TabsContent>
    </Tabs>
  );
}
