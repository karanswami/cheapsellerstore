"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function AdminChartCard({
  title,
  description,
  config,
  children,
  className,
  chartClassName,
  action,
}: {
  title: string;
  description?: string;
  config: ChartConfig;
  children: ReactNode;
  className?: string;
  chartClassName?: string;
  action?: ReactNode;
}) {
  return (
    <Card className={cn("gap-0", className)}>
      <CardHeader className="flex flex-row items-start justify-between gap-2 border-b pb-3">
        <div>
          <CardTitle>{title}</CardTitle>
          {description ? (
            <CardDescription className="mt-0.5">{description}</CardDescription>
          ) : null}
        </div>
        {action}
      </CardHeader>
      <CardContent className="pt-4">
        <ChartContainer
          config={config}
          className={cn("aspect-auto h-[220px] w-full", chartClassName)}
        >
          {children}
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

export { ChartTooltip, ChartTooltipContent };
export type { ChartConfig };
