"use client";

import styles from "@/components/app/banner-carousel.module.css";
import { useEffect, useMemo, useState } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";
import type { PublicBanner } from "@/types/banner";

type Props = {
  banners: PublicBanner[];
};

export function BannerCarousel({ banners }: Props) {
  const visible = useMemo(() => banners.slice(0, 8), [banners]);
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

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
    }, 5200);

    return () => window.clearInterval(timer);
  }, [api, visible.length]);

  if (!visible.length) return null;

  return (
    <section aria-label="Banners" className="relative min-w-0 space-y-2">
      <div className={styles.carouselSection}>
        <span className={styles.snakeOverlay} aria-hidden="true" />
        <Carousel
          setApi={setApi}
          className="overflow-hidden rounded-xl border border-border bg-muted"
        >
          <CarouselContent>
            {visible.map((banner) => (
              <CarouselItem key={banner.id}>
                <div className="relative aspect-[21/9] w-full sm:aspect-[3/1]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={banner.imageUrl}
                    alt=""
                    loading="lazy"
                    className="size-full object-cover"
                  />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>

          {visible.length > 1 ? (
            <>
              <CarouselPrevious className="hidden size-8 sm:inline-flex" />
              <CarouselNext className="hidden size-8 sm:inline-flex" />
            </>
          ) : null}
        </Carousel>
      </div>

      {visible.length > 1 ? (
        <div className="flex justify-center gap-1.5" aria-label="Banner slides">
          {visible.map((banner, index) => (
            <button
              key={banner.id}
              type="button"
              className={cn(
                "h-1.5 rounded-full transition-all",
                index === current
                  ? "w-5 bg-primary"
                  : "w-1.5 bg-foreground/25 hover:bg-foreground/40",
              )}
              aria-label={`Go to banner ${index + 1}`}
              aria-current={index === current ? "true" : undefined}
              onClick={() => {
                setCurrent(index);
                api?.scrollTo(index);
              }}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
