import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faDiscord,
  faFacebook,
  faGithub,
  faInstagram,
  faLinkedin,
  faReddit,
  faTelegram,
  faTiktok,
  faTwitch,
  faWhatsapp,
  faXTwitter,
  faYoutube,
} from "@fortawesome/free-brands-svg-icons";

type BrandRule = {
  icon: IconDefinition;
  match: (label: string, url: string) => boolean;
};

const BRAND_RULES: BrandRule[] = [
  {
    icon: faTelegram,
    match: (label, url) => {
      const h = `${label} ${url}`;
      return (
        h.includes("telegram") || h.includes("t.me") || h.includes("tg://")
      );
    },
  },
  {
    icon: faDiscord,
    match: (label, url) => `${label} ${url}`.includes("discord"),
  },
  {
    icon: faYoutube,
    match: (label, url) => {
      const h = `${label} ${url}`;
      return h.includes("youtube") || h.includes("youtu.be");
    },
  },
  {
    icon: faXTwitter,
    match: (label, url) => {
      const h = `${label} ${url}`;
      return (
        h.includes("twitter") ||
        h.includes("x.com") ||
        h.includes("x (twitter)") ||
        label.trim() === "x"
      );
    },
  },
  {
    icon: faInstagram,
    match: (label, url) => {
      const h = `${label} ${url}`;
      return h.includes("instagram") || h.includes("instagr.am");
    },
  },
  {
    icon: faFacebook,
    match: (label, url) => {
      const h = `${label} ${url}`;
      return h.includes("facebook") || h.includes("fb.com");
    },
  },
  {
    icon: faWhatsapp,
    match: (label, url) => {
      const h = `${label} ${url}`;
      return h.includes("whatsapp") || h.includes("wa.me");
    },
  },
  {
    icon: faGithub,
    match: (label, url) => `${label} ${url}`.includes("github"),
  },
  {
    icon: faTiktok,
    match: (label, url) => `${label} ${url}`.includes("tiktok"),
  },
  {
    icon: faLinkedin,
    match: (label, url) => `${label} ${url}`.includes("linkedin"),
  },
  {
    icon: faReddit,
    match: (label, url) => `${label} ${url}`.includes("reddit"),
  },
  {
    icon: faTwitch,
    match: (label, url) => `${label} ${url}`.includes("twitch"),
  },
];

/** Resolve a Font Awesome brand icon from social label + URL, or null if unknown. */
export function resolveSocialBrandIcon(
  label: string,
  url: string,
): IconDefinition | null {
  const labelKey = label.toLowerCase();
  const urlKey = url.toLowerCase();
  for (const rule of BRAND_RULES) {
    if (rule.match(labelKey, urlKey)) return rule.icon;
  }
  return null;
}
