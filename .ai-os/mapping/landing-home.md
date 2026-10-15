# Feature Maps & Access Rules

## 1. File Inventory
- Route: `/` — guests only (proxy redirects logged-in → `/app` or `/admin`)
- Page: `src/app/(store)/page.tsx`
- Loading: `src/app/(store)/loading.tsx` → `src/components/landing/landing-skeleton.tsx`
- Stream slots: `src/components/catalog/store-catalog-slots.tsx` (`BannerSlotSuspended` — image carousel then flash/promo `FlashOfferCarousel` (up to 3 slides; autoplay + dots); titles polished via `offer-banner.ts`, `CatalogSlotSuspended` — Store `HubHeaderBar` + tabs + feed) + `src/components/catalog/product-grid-feed.tsx` / `product-grid.tsx` (mobile FAB clearance `pb-14`)
- Components: `src/components/app/banner-carousel.tsx`, `src/components/catalog/flash-offer-carousel.tsx`, `src/components/catalog/flash-offer-banner.tsx` (+ module CSS), `src/components/catalog/category-tabs.tsx`, `src/components/catalog/product-grid.tsx`, `src/components/catalog/product-card.tsx` (+ `product-card.module.css` — flat card; 4:3 media; category+verified; blurb; green From price; equal **Demo** (red) + **Buy** CTAs; whole-card `onClick` opens ProductSheet; PINNED / BESTSELLER badges), `src/components/catalog/flash-sale-ticker.tsx` (+ module CSS), `src/components/product/product-sheet.tsx` (Buy → purchase Dialog; optional version-first when ≥2 `Duration.version` values), `src/components/product/product-demo-dialog.tsx` (Demo → in-site YouTube embed Dialog), `src/components/product/version-picker.tsx`, `src/components/product/duration-picker.tsx` (selectable duration cards), `src/components/product/rating-summary.tsx`, `src/components/product/product-reviews-drawer.tsx`, `src/components/product/product-review-list.tsx`, `src/components/product/product-review-form.tsx`, `src/components/product/star-rating.tsx`, `src/components/app/app-page-skeleton.tsx` (shared banner/catalog skeletons; card media `4/3`), `src/components/app/hub/hub-header-bar.tsx` (store section header)
- Chrome (global): `src/components/layout/site-chrome.tsx` (`min-h-dvh` flex column so footer sticks to viewport bottom on short public pages), `src/components/layout/site-header.tsx` (+ `site-header.module.css` — glass/neon bar; native APK: WebView WindowInsets pad so header clears status bar), `src/components/landing/site-footer.tsx` (compact premium bar: brand+tagline · horizontal nav · socials · ©/Secure checkout; socials = Font Awesome brand icons by label/URL, no rounded tiles; optional custom `iconUrl` as plain `object-contain`; FAB bottom clearance; SiteConfig socials + `/api/pages`), support FAB stack, `src/components/auth/auth-dialog.tsx`, `src/components/cart/cart-sheet.tsx`
- Social brand icons: `src/lib/social-brand-icon.ts` + `src/lib/fontawesome.ts` (FA CSS once in root layout)
- Visual foundation (global): `src/components/layout/live-wave-background.tsx` (+ module CSS) fixed ambient layer — **mobile: single static tint, no blur/animation**; `src/components/layout/page-transition-shell.tsx` wraps public route content (`flex-1`) for native/fallback transitions + sticky footer grow
- PWA (global root): `src/app/manifest.ts`, `public/sw.js`, `public/pwa/icon-*.png`, `src/components/layout/pwa-provider.tsx`, `src/components/layout/install-app-ui.tsx` (banner + help Dialog; Android → APK), `src/lib/android-apk.ts`, `src/app/downloads/[file]/route.ts` → `releases/DRIP-CLIENT-OFFICIAL*.apk`
- Interaction feedback (global root): `src/components/layout/interaction-feedback-provider.tsx` + `src/lib/feedback.ts` (`feedbackTap`) + press CSS (`.pressable`) — covers Button / tabs / chips / product card presses
- Content protection (global root): `src/components/layout/content-protection.tsx` + `content-protection-noscript.tsx` + `html.drip-protect` CSS in `globals.css`; Android `FLAG_SECURE` in `MainActivity.java`
- Libs: `src/lib/banners.ts`, `src/lib/offer-banner.ts`, `src/lib/products.ts` (`getProductsPage` — sort pinned → bestseller → newest; resolves `demoUrl` = product override || `default_product_demo_url` setting || builtin), `src/lib/youtube.ts` (`getYoutubeEmbedUrl` for Demo Dialog), `src/lib/flash-sales.ts`, `src/lib/flash-sale-format.ts`, `src/lib/faqs.ts`, `src/lib/static-pages.ts`, `src/lib/settings.ts` (`getDefaultProductDemoUrl`), types under `src/types/*`
- Client APIs: `GET /api/products?category=&page=&limit=`, `GET/POST /api/products/[productId]/reviews?page=&limit=&sort=`, promos, flash quote, faqs, pages, support/*

## 2. Hard Governance Rules (Read-Only Guardrails)
- Prisma only on server; client components never import `@/lib/prisma`.
- Money is USD microcents only; no FX.
- API envelope `{ data }` / `{ error: { code, message } }`.
- Guests-only landing; never show unused `Key.code` on catalog.
- Stock gates purchase but Stock/Sold labels stay hidden on storefront.
- **Same store flow as `/app` home:** image carousel → flash/promo **offer carousel** (up to 3 slides when admin `showBanner`; autoplay + dots; single offer renders as one card) → Store `HubHeaderBar` → category tabs → product grid (first page ≤ 12 + Load more). Column width `max-w-5xl` matches `/app` `AppHomeShell` so logout does not widen the store. No marketing hero, trust strip, how-it-works, or CTA band above/below catalog.
- Catalog sort: `isPinned` → `isBestSeller` → `createdAt` asc; products must have ≥1 duration (`durations: { some: {} }`).
- Page ends at catalog; SiteFooter is the last content block (compact: brand+tagline, inline quick/static links, socials from SiteConfig, ©/Secure strip; FAB/CartSheet are overlays only). Socials render as plain Font Awesome brand icons (Telegram/Discord/YouTube/X/etc from label+URL); optional custom `iconUrl` is a plain square image without rounded tile chrome; footer owns mobile FAB bottom clearance so icons are not covered.
- Product cards: flat `var(--card)` + border; 4:3 media; category row + compact verified icon; full-width 2-line title; short blurb; green **From $…** price; equal **Demo** (opens in-site `ProductDemoDialog` YouTube embed; non-video URLs show Open on YouTube fallback) + **Buy** (opens ProductSheet) — no separate Cart CTA; whole-card click opens ProductSheet; Reviews pill stops propagation; Premium Verified when `reviewCount > 0`.
- `Product.demoUrl` optional; empty → AppSetting `default_product_demo_url` → builtin YouTube fallback. Prefer watch/shorts/`youtu.be` video URLs so Demo embeds; channel URLs are not embeddable.
- Product Details Dialog is purchase-only (hero + optional version chips + duration cards + CTAs + Android ID device binding input when `requiresAndroidId` is true, bypassing cart sheet for direct checkout) plus a clear “Ratings & reviews → Open” row; full reviews live in dedicated bottom Drawer with sort + Load more.
- Stream banners and catalog independently (Suspense).
- Route-level transitions come from `site-chrome` wrapper; landing content should not introduce heavyweight nested transitions.
- Active flash sales enrich catalog prices + countdown ticker; storefront special-offer banner is separate (`showBanner` + window).
- Auth is dialog-only — no `/login` or `/register` pages.
- Support FAB present; Lucide icon; button-tree bot + notifications.

## 3. Permitted Edit Scopes (Write Fields)
- Landing layout must stay aligned with `/app` home catalog flow (banner + store section).
- Category filter query `?category=` and `#store` hash; banner carousel presentation.
- Product duration Dialog (`ProductSheet`) + optional version picker + duration cards; Review Drawer from card/sheet rating; cart localStorage `drip-cart-v2`.
- Do not hardcode catalog prices/stock — DB via `getProductsPage` / `getCategories`.
- Do not reintroduce marketing sections below the catalog / above the footer unless product explicitly requests them.
