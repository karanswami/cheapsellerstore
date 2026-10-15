export type OfferBannerKind = "flash" | "promo";

export type PublicOfferBanner = {
  kind: OfferBannerKind;
  id: string;
  title: string;
  description: string;
  discountLabel: string;
  promoCode: string | null;
  expiresAt: string | null;
};
