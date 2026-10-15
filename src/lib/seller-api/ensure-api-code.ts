import { prisma } from "@/lib/prisma";
import {
  suggestDurationApiCode,
  suggestProductApiCode,
} from "@/lib/seller-api/codes";

async function isProductCodeFree(code: string, excludeId?: string) {
  const row = await prisma.product.findFirst({
    where: {
      apiCode: code,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    select: { id: true },
  });
  return !row;
}

async function isDurationCodeFree(code: string, excludeId?: string) {
  const row = await prisma.duration.findFirst({
    where: {
      apiCode: code,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    select: { id: true },
  });
  return !row;
}

export async function allocateProductApiCode(
  title: string,
  preferred?: string | null,
  excludeId?: string,
): Promise<string> {
  const base = (preferred?.trim() || suggestProductApiCode(title)).toUpperCase();
  let code = base;
  let n = 0;
  while (!(await isProductCodeFree(code, excludeId))) {
    n += 1;
    code = `${base}-${n}`;
  }
  return code;
}

export async function allocateDurationApiCode(input: {
  productApiCode: string;
  label: string;
  days?: number | null;
  preferred?: string | null;
  excludeId?: string;
}): Promise<string> {
  const base = (
    input.preferred?.trim() ||
    suggestDurationApiCode(input.productApiCode, input.label, input.days)
  ).toUpperCase();
  let code = base;
  let n = 0;
  while (!(await isDurationCodeFree(code, input.excludeId))) {
    n += 1;
    code = `${base}-${n}`;
  }
  return code;
}
