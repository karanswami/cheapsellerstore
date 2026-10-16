import type { Metadata } from "next";
import { ThemeLab } from "./theme-lab";

export const metadata: Metadata = {
  title: "Theme Lab",
  robots: { index: false, follow: false },
};

export default function ThemeLabPage() {
  return <ThemeLab />;
}
