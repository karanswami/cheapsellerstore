"use client";

import { useState } from "react";
import { BadgePercent, Plus, Users } from "lucide-react";
import { Chips, StatCard, useAdminQuery } from "@/components/admin/kit";
import { Button } from "@/components/ui/button";
import { AddPriceDialog } from "./add-price-dialog";
import { PriceDesk, type PickedUser } from "./price-desk";
import { SpecialLists } from "./special-lists";

type Overview = { stats: { total: number; users: number } };

export function SpecialPricesTab() {
  const [view, setView] = useState<"desk" | "active" | "history">("desk");
  const [deskUser, setDeskUser] = useState<PickedUser | null>(null);
  const [adding, setAdding] = useState(false);
  const overview = useAdminQuery<Overview>("/api/admin/special-prices/overview");
  const s = overview.data?.stats;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard label="Users with special price" value={s ? s.users : "—"} hint="Total users given a custom price" icon={Users} tone="success" />
        <StatCard label="Active overrides" value={s ? s.total : "—"} hint="Products with durations on a special price" icon={BadgePercent} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Chips
          value={view}
          onChange={setView}
          options={[
            { v: "desk", label: "Price desk" },
            { v: "active", label: "All prices" },
            { v: "history", label: "History" },
          ]}
        />
        <Button onClick={() => setAdding(true)}>
          <Plus /> Add special price
        </Button>
      </div>
      <AddPriceDialog
        open={adding}
        onOpenChange={setAdding}
        onSaved={(u) => {
          setAdding(false);
          overview.reload();
          setDeskUser(u);
          setView("desk");
        }}
      />
      {view === "desk" ? (
        <PriceDesk user={deskUser} onUser={setDeskUser} onChanged={overview.reload} />
      ) : (
        <SpecialLists
          view={view}
          onChanged={overview.reload}
          onEditUser={(u) => {
            setDeskUser(u);
            setView("desk");
          }}
        />
      )}
    </div>
  );
}
