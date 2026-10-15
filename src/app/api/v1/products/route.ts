import {
  catalogListPayload,
  listApiCatalog,
  sandboxSkus,
} from "@/lib/seller-api/catalog";
import { withPublicApi } from "@/lib/seller-api/handler";
import type { UserRole } from "@prisma/client";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  return withPublicApi(req, async (ctx) => {
    const role = ctx.auth?.user.role as UserRole | undefined;
    if (ctx.auth?.isSandbox) {
      const items = await sandboxSkus(role, ctx.auth?.user.id);
      return {
        data: catalogListPayload(items, role, { sandbox: true }),
      };
    }
    const items = await listApiCatalog(role, ctx.auth?.user.id);
    return {
      data: catalogListPayload(items, role),
    };
  });
}
