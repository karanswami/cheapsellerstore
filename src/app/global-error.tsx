"use client";

import { useEffect } from "react";

/**
 * Root error boundary — must provide its own html/body (no root layout).
 * Kept on-brand with dark neon tokens but self-contained CSS.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5rem",
          background: "#0c0c0e",
          color: "#fafafa",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif",
        }}
      >
        <main
          style={{
            maxWidth: "24rem",
            width: "100%",
            textAlign: "center",
          }}
          role="alert"
        >
          <div
            style={{
              width: "5rem",
              height: "5rem",
              margin: "0 auto 1.15rem",
              borderRadius: "1.25rem",
              border: "1px solid rgba(232, 79, 255, 0.35)",
              background:
                "linear-gradient(160deg, rgba(232, 79, 255, 0.2), rgba(255, 106, 213, 0.1))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.75rem",
              fontWeight: 700,
              color: "#fff",
              boxShadow: "0 12px 40px rgba(232, 79, 255, 0.22)",
            }}
            aria-hidden
          >
            D
          </div>
          <p
            style={{
              margin: 0,
              fontSize: "0.7rem",
              fontWeight: 600,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "#e84fff",
            }}
          >
            DRIP CLIENT
          </p>
          <p
            style={{
              margin: "0.75rem 0 0",
              fontSize: "0.75rem",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#a1a1aa",
            }}
          >
            Error
          </p>
          <h1
            style={{
              margin: "0.5rem 0 0",
              fontSize: "1.5rem",
              fontWeight: 650,
              letterSpacing: "-0.03em",
            }}
          >
            Something went wrong
          </h1>
          <p
            style={{
              margin: "0.75rem 0 0",
              fontSize: "0.9375rem",
              lineHeight: 1.55,
              color: "#a1a1aa",
            }}
          >
            A critical error stopped the page from loading. Try again or return
            home.
          </p>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.65rem",
              marginTop: "1.75rem",
            }}
          >
            <button
              type="button"
              onClick={() => reset()}
              style={{
                appearance: "none",
                border: "none",
                borderRadius: "0.75rem",
                padding: "0.75rem 1.25rem",
                fontSize: "0.9375rem",
                fontWeight: 600,
                color: "#0c0c0e",
                background: "#e84fff",
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            <a
              href="/"
              style={{
                display: "block",
                borderRadius: "0.75rem",
                padding: "0.75rem 1.25rem",
                fontSize: "0.9375rem",
                fontWeight: 600,
                color: "#fafafa",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                textDecoration: "none",
              }}
            >
              Home
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
