import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertCircle, Construction } from "lucide-react";

export function AdminComingSoon({
  title,
  description = "This workspace is not live yet.",
}: {
  title: string;
  description?: string;
}) {
  return (
    <main className="space-y-6">
      <AdminPageHeader title={title} description={description} />
      <Card variant="info">
        <CardHeader className="border-b border-border/40">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
              <Construction className="size-5" />
            </span>
            <div className="min-w-0 flex-1 space-y-1">
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle />
            <AlertTitle>Coming soon</AlertTitle>
            <AlertDescription>
              This admin feature is queued for a future update. The nav entry
              stays so you can see what’s planned.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </main>
  );
}
