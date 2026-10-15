"use client";

import { FlashOfferBanner } from "@/components/catalog/flash-offer-banner";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { formatFlashCountdownParts } from "@/lib/flash-sale-format";
import { cn } from "@/lib/utils";
import type { PublicOfferBanner } from "@/types/offer-banner";
import { useEffect, useMemo, useState } from "react";

type FlashOfferCarouselProps = {
  offers: PublicOfferBanner[];
  className?: string;
};

function isOfferLive(offer: PublicOfferBanner): boolean {
  if (!offer.expiresAt) return true;
  const parts = formatFlashCountdownParts(offer.expiresAt);
  return Boolean(parts && !parts.ended);
}

export function FlashOfferCarousel({
  offers,
  className,
}: FlashOfferCarouselProps) {
  const [tick, setTick] = useState(0);
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const visible = useMemo(() => {
    void tick;
    return offers.filter(isOfferLive).slice(0, 3);
  }, [offers, tick]);

  useEffect(() => {
    if (!visible.length) return;
    setCurrent((value) => Math.min(value, visible.length - 1));
  }, [visible.length]);

  useEffect(() => {
    if (!api || visible.length <= 1) return;

    const timer = window.setInterval(() => {
      if (document.hidden) return;
      setCurrent((value) => {
        const next = value >= visible.length - 1 ? 0 : value + 1;
        api.scrollTo(next);
        return next;
      });
    }, 5600);

    return () => window.clearInterval(timer);
  }, [api, visible.length]);

  if (!visible.length) return null;

  if (visible.length === 1) {
    return <FlashOfferBanner offer={visible[0]!} className={className} />;
  }

  return (
    <section
      aria-label="Special offers"
      className={cn("relative min-w-0 space-y-2", className)}
    >
      <Carousel setApi={setApi} className="min-w-0">
        <CarouselContent>
          {visible.map((offer) => (
            <CarouselItem key={`${offer.kind}-${offer.id}`}>
              <FlashOfferBanner offer={offer} />
            </CarouselItem>
          ))}
        </CarouselContent>

        <CarouselPrevious className="hidden size-8 sm:inline-flex" />
        <CarouselNext className="hidden size-8 sm:inline-flex" />
      </Carousel>

      <div className="flex justify-center gap-1.5" aria-label="Offer slides">
        {visible.map((offer, index) => (
          <button
            key={`${offer.kind}-${offer.id}-dot`}
            type="button"
            className={cn(
              "h-1.5 rounded-full transition-all",
              index === current
                ? "w-5 bg-primary"
                : "w-1.5 bg-foreground/25 hover:bg-foreground/40",
            )}
            aria-label={`Go to offer ${index + 1}`}
            aria-current={index === current ? "true" : undefined}
            onClick={() => {
              setCurrent(index);
              api?.scrollTo(index);
            }}
          />
        ))}
      </div>
    </section>
  );
}
