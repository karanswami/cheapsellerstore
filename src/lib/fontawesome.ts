import { config } from "@fortawesome/fontawesome-svg-core";
import "@fortawesome/fontawesome-svg-core/styles.css";

/** Prevent FA from injecting CSS (Next already imports styles.css). */
config.autoAddCss = false;
