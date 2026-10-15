import {
  Activity,
  Apple,
  Award,
  Bot,
  Box,
  Bug,
  CheckCircle,
  Code,
  Compass,
  Cpu,
  Crosshair,
  Crown,
  Disc,
  Eye,
  EyeOff,
  Fingerprint,
  Flame,
  Folder,
  FolderTree,
  Gamepad,
  Gamepad2,
  Gem,
  Ghost,
  Globe,
  Hash,
  Heart,
  Infinity as InfinityIcon,
  Key,
  Laptop,
  Layers,
  LayoutGrid,
  Lock,
  Medal,
  Monitor,
  Package,
  Play,
  Radio,
  Rocket,
  Settings,
  Shield,
  ShieldCheck,
  ShoppingBag,
  Skull,
  Sliders,
  Smartphone,
  Sparkles,
  Star,
  Swords,
  Tablet,
  Tag,
  Target,
  Terminal,
  Trophy,
  Unlock,
  Wifi,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";

export type CategoryIconOption = {
  value: string;
  label: string;
  group: string;
  icon: LucideIcon;
};

export const CATEGORY_ICON_OPTIONS: CategoryIconOption[] = [
  // Devices & OS
  { value: "Smartphone", label: "Smartphone / Android", group: "Devices & OS", icon: Smartphone },
  { value: "Apple", label: "Apple / iOS", group: "Devices & OS", icon: Apple },
  { value: "Laptop", label: "Laptop / PC", group: "Devices & OS", icon: Laptop },
  { value: "Monitor", label: "Monitor / Desktop", group: "Devices & OS", icon: Monitor },
  { value: "Tablet", label: "Tablet", group: "Devices & OS", icon: Tablet },
  { value: "Cpu", label: "CPU / Hardware", group: "Devices & OS", icon: Cpu },

  // Gaming & Cheats / Mods
  { value: "Gamepad2", label: "Gamepad 2", group: "Gaming & Mods", icon: Gamepad2 },
  { value: "Gamepad", label: "Gamepad", group: "Gaming & Mods", icon: Gamepad },
  { value: "Crosshair", label: "Crosshair / Aim", group: "Gaming & Mods", icon: Crosshair },
  { value: "Target", label: "Target", group: "Gaming & Mods", icon: Target },
  { value: "Swords", label: "Swords / Combat", group: "Gaming & Mods", icon: Swords },
  { value: "Skull", label: "Skull / Mod", group: "Gaming & Mods", icon: Skull },
  { value: "Ghost", label: "Ghost / Bypass", group: "Gaming & Mods", icon: Ghost },
  { value: "Bot", label: "Bot / Auto", group: "Gaming & Mods", icon: Bot },
  { value: "Flame", label: "Flame / Root", group: "Gaming & Mods", icon: Flame },
  { value: "Zap", label: "Zap / Fast", group: "Gaming & Mods", icon: Zap },
  { value: "Sparkles", label: "Sparkles / VIP", group: "Gaming & Mods", icon: Sparkles },
  { value: "Eye", label: "Eye / ESP", group: "Gaming & Mods", icon: Eye },
  { value: "EyeOff", label: "Eye Off / Stealth", group: "Gaming & Mods", icon: EyeOff },

  // Security & Keys
  { value: "Shield", label: "Shield", group: "Security & Keys", icon: Shield },
  { value: "ShieldCheck", label: "Shield Check", group: "Security & Keys", icon: ShieldCheck },
  { value: "Key", label: "Key / License", group: "Security & Keys", icon: Key },
  { value: "Lock", label: "Lock / Secure", group: "Security & Keys", icon: Lock },
  { value: "Unlock", label: "Unlock", group: "Security & Keys", icon: Unlock },
  { value: "Fingerprint", label: "Fingerprint", group: "Security & Keys", icon: Fingerprint },

  // Rewards & VIP
  { value: "Crown", label: "Crown / Premium", group: "Status & VIP", icon: Crown },
  { value: "Trophy", label: "Trophy", group: "Status & VIP", icon: Trophy },
  { value: "Star", label: "Star", group: "Status & VIP", icon: Star },
  { value: "Medal", label: "Medal", group: "Status & VIP", icon: Medal },
  { value: "Award", label: "Award", group: "Status & VIP", icon: Award },
  { value: "Gem", label: "Gem / Diamond", group: "Status & VIP", icon: Gem },
  { value: "Heart", label: "Heart", group: "Status & VIP", icon: Heart },

  // Utilities & Tools
  { value: "FolderTree", label: "Folder Tree", group: "Tools & Utilities", icon: FolderTree },
  { value: "Folder", label: "Folder", group: "Tools & Utilities", icon: Folder },
  { value: "Layers", label: "Layers", group: "Tools & Utilities", icon: Layers },
  { value: "Box", label: "Box", group: "Tools & Utilities", icon: Box },
  { value: "Package", label: "Package", group: "Tools & Utilities", icon: Package },
  { value: "Terminal", label: "Terminal / Script", group: "Tools & Utilities", icon: Terminal },
  { value: "Code", label: "Code / Dev", group: "Tools & Utilities", icon: Code },
  { value: "Wrench", label: "Wrench / Tool", group: "Tools & Utilities", icon: Wrench },
  { value: "Settings", label: "Settings", group: "Tools & Utilities", icon: Settings },
  { value: "Sliders", label: "Sliders / Config", group: "Tools & Utilities", icon: Sliders },
  { value: "Radio", label: "Radio / Spoofer", group: "Tools & Utilities", icon: Radio },
  { value: "Wifi", label: "Wifi / Network", group: "Tools & Utilities", icon: Wifi },
  { value: "Globe", label: "Globe / Global", group: "Tools & Utilities", icon: Globe },
  { value: "Rocket", label: "Rocket / Boost", group: "Tools & Utilities", icon: Rocket },
  { value: "Compass", label: "Compass", group: "Tools & Utilities", icon: Compass },
  { value: "Infinity", label: "Infinity", group: "Tools & Utilities", icon: InfinityIcon },
  { value: "Tag", label: "Tag / Promo", group: "Tools & Utilities", icon: Tag },
  { value: "ShoppingBag", label: "Shopping Bag", group: "Tools & Utilities", icon: ShoppingBag },
  { value: "Activity", label: "Activity", group: "Tools & Utilities", icon: Activity },
  { value: "Bug", label: "Bug / Debug", group: "Tools & Utilities", icon: Bug },
  { value: "CheckCircle", label: "Check Circle", group: "Tools & Utilities", icon: CheckCircle },
  { value: "Play", label: "Play", group: "Tools & Utilities", icon: Play },
  { value: "Disc", label: "Disc", group: "Tools & Utilities", icon: Disc },
  { value: "Hash", label: "Hash / Default", group: "Tools & Utilities", icon: Hash },
];

export const CATEGORY_ICON_MAP = new Map<string, LucideIcon>(
  CATEGORY_ICON_OPTIONS.map((opt) => [opt.value.toLowerCase(), opt.icon]),
);

/** Fallback slug mappings when no explicit icon is configured */
const SLUG_FALLBACK_ICONS: Record<string, LucideIcon> = {
  apkmod: Smartphone,
  "apk-mod": Smartphone,
  android: Smartphone,
  root: Flame,
  "root-device": Flame,
  ios: Apple,
  "ios-panel": Apple,
  iphone: Apple,
  tool: Wrench,
  tools: Wrench,
  spoofer: Radio,
  spoofers: Radio,
  mod: Gamepad2,
  mods: Gamepad2,
  vip: Crown,
  premium: Crown,
};

/**
 * Resolves a Lucide React icon component for a category based on explicit icon name, or fallback slug.
 */
export function getCategoryLucideIcon(
  iconName?: string | null,
  slug?: string | null,
): LucideIcon {
  if (iconName && iconName.trim()) {
    const key = iconName.trim().toLowerCase();
    const matched = CATEGORY_ICON_MAP.get(key);
    if (matched) return matched;
  }

  if (slug && slug.trim()) {
    const key = slug.trim().toLowerCase();
    if (SLUG_FALLBACK_ICONS[key]) return SLUG_FALLBACK_ICONS[key];
    if (key.includes("apk") || key.includes("android")) return Smartphone;
    if (key.includes("root")) return Flame;
    if (key.includes("ios") || key.includes("iphone") || key.includes("apple")) return Apple;
    if (key.includes("tool")) return Wrench;
    if (key.includes("spoofer")) return Radio;
    if (key.includes("game") || key.includes("mod")) return Gamepad2;
    if (key.includes("bot")) return Bot;
    if (key.includes("vip") || key.includes("crown")) return Crown;
  }

  return FolderTree;
}

export { LayoutGrid };
