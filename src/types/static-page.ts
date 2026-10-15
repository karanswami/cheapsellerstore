export type PublicStaticPageNav = {
  id: string;
  slug: string;
  title: string;
};

export type PublicStaticPage = PublicStaticPageNav & {
  seoTitle: string | null;
  seoDescription: string | null;
  content: string;
};
