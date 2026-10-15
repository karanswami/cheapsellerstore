"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type CarouselApi = {
  scrollPrev: () => void;
  scrollNext: () => void;
  scrollTo: (index: number) => void;
};

type CarouselContextValue = {
  viewportRef: React.RefObject<HTMLDivElement | null>;
  api: CarouselApi;
};

const CarouselContext = React.createContext<CarouselContextValue | null>(null);

function useCarousel() {
  const context = React.useContext(CarouselContext);
  if (!context) {
    throw new Error("useCarousel must be used within a Carousel");
  }
  return context;
}

export type CarouselProps = React.HTMLAttributes<HTMLDivElement> & {
  setApi?: (api: CarouselApi) => void;
  autoPlay?: boolean;
  autoPlayMs?: number;
};

export const Carousel = React.forwardRef<HTMLDivElement, CarouselProps>(
  (
    {
      className,
      children,
      setApi,
      autoPlay = false,
      autoPlayMs = 4500,
      ...props
    },
    ref,
  ) => {
    const viewportRef = React.useRef<HTMLDivElement | null>(null);

    const scrollTo = React.useCallback((index: number) => {
      const viewport = viewportRef.current;
      const item = viewport?.querySelector<HTMLElement>("[data-carousel-item]");
      if (!viewport || !item) return;
      viewport.scrollTo({
        left: item.offsetWidth * index,
        behavior: "smooth",
      });
    }, []);

    const scrollByItem = React.useCallback((direction: 1 | -1) => {
      const viewport = viewportRef.current;
      const item = viewport?.querySelector<HTMLElement>("[data-carousel-item]");
      if (!viewport || !item) return;
      const maxLeft = viewport.scrollWidth - viewport.clientWidth - 2;
      const nextLeft = viewport.scrollLeft + item.offsetWidth * direction;
      viewport.scrollTo({
        left: direction > 0 && nextLeft >= maxLeft ? 0 : Math.max(0, nextLeft),
        behavior: "smooth",
      });
    }, []);

    const api = React.useMemo<CarouselApi>(
      () => ({
        scrollPrev: () => scrollByItem(-1),
        scrollNext: () => scrollByItem(1),
        scrollTo,
      }),
      [scrollByItem, scrollTo],
    );

    React.useEffect(() => {
      setApi?.(api);
    }, [api, setApi]);

    React.useEffect(() => {
      if (!autoPlay) return;
      const timer = window.setInterval(() => api.scrollNext(), autoPlayMs);
      return () => window.clearInterval(timer);
    }, [api, autoPlay, autoPlayMs]);

    return (
      <CarouselContext.Provider value={{ viewportRef, api }}>
        <div
          ref={ref}
          className={cn("relative", className)}
          role="region"
          aria-roledescription="carousel"
          {...props}
        >
          {children}
        </div>
      </CarouselContext.Provider>
    );
  },
);
Carousel.displayName = "Carousel";

export const CarouselContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { viewportRef } = useCarousel();

  return (
    <div
      ref={viewportRef}
      className="overflow-x-auto overscroll-x-contain scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <div
        ref={ref}
        className={cn("flex snap-x snap-mandatory", className)}
        {...props}
      />
    </div>
  );
});
CarouselContent.displayName = "CarouselContent";

export const CarouselItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-carousel-item=""
    className={cn("min-w-0 shrink-0 grow-0 basis-full snap-start", className)}
    {...props}
  />
));
CarouselItem.displayName = "CarouselItem";

export const CarouselPrevious = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof Button>
>(({ className, variant = "secondary", size = "icon", ...props }, ref) => {
  const { api } = useCarousel();
  return (
    <Button
      ref={ref}
      type="button"
      variant={variant}
      size={size}
      className={cn(
        "absolute top-1/2 left-2 z-10 -translate-y-1/2 rounded-full",
        className,
      )}
      onClick={api.scrollPrev}
      aria-label="Previous slide"
      {...props}
    >
      <ChevronLeft className="size-4" />
    </Button>
  );
});
CarouselPrevious.displayName = "CarouselPrevious";

export const CarouselNext = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof Button>
>(({ className, variant = "secondary", size = "icon", ...props }, ref) => {
  const { api } = useCarousel();
  return (
    <Button
      ref={ref}
      type="button"
      variant={variant}
      size={size}
      className={cn(
        "absolute top-1/2 right-2 z-10 -translate-y-1/2 rounded-full",
        className,
      )}
      onClick={api.scrollNext}
      aria-label="Next slide"
      {...props}
    >
      <ChevronRight className="size-4" />
    </Button>
  );
});
CarouselNext.displayName = "CarouselNext";

export { useCarousel };
