import { prisma } from "@/lib/prisma";
import type { PublicFaq } from "@/types/faq";

function normalizeSupportText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const FAQ_SELECT = {
  id: true,
  question: true,
  answer: true,
  category: true,
} as const;

/** Active FAQs for storefront, profile, and support (sortOrder asc). */
export async function getActiveFaqs(take = 100): Promise<PublicFaq[]> {
  try {
    return await prisma.faqItem.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      take,
      select: FAQ_SELECT,
    });
  } catch (error) {
    console.warn("ACTIVE_FAQS_LOAD_FAILED", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return [];
  }
}

/** Compact FAQ lines for support AI live pack. */
export function formatFaqsForSupportPack(faqs: PublicFaq[], max = 24): string {
  if (!faqs.length) return "(no FAQs published)";
  return faqs
    .slice(0, max)
    .map((f, i) => {
      const cat = f.category ? ` [${f.category}]` : "";
      return `${i + 1}. Q:${f.question}${cat}\n   A:${f.answer.slice(0, 400)}`;
    })
    .join("\n");
}

/**
 * Match a user message to an active FAQ (exact / containment / word overlap).
 * Returns null when confidence is too low — keyword router / AI still run.
 */
export function matchFaqFromMessage(
  message: string,
  faqs: PublicFaq[],
): PublicFaq | null {
  const normalized = normalizeSupportText(message);
  if (!normalized || !faqs.length) return null;

  let best: PublicFaq | null = null;
  let bestScore = 0;

  for (const faq of faqs) {
    const q = normalizeSupportText(faq.question);
    if (!q) continue;

    let score = 0;
    if (normalized === q) {
      score = 100;
    } else if (normalized.includes(q) || q.includes(normalized)) {
      score = 80;
    } else {
      const words = q.split(/\s+/).filter((w) => w.length >= 3);
      if (words.length === 0) continue;
      const hits = words.filter((w) => normalized.includes(w)).length;
      score = (hits / words.length) * 60;
      if (hits >= 3 && hits === words.length) score = Math.max(score, 70);
    }

    if (score > bestScore) {
      bestScore = score;
      best = faq;
    }
  }

  return bestScore >= 45 ? best : null;
}
