/**
 * Server-rendered gate for browsers with JavaScript disabled / blocked.
 * Hides SSR HTML (which would otherwise be readable without ContentProtection)
 * and shows a blank black screen. View-source still reveals markup — unavoidable.
 */
export function ContentProtectionNoscript() {
  return (
    <noscript>
      <style
        dangerouslySetInnerHTML={{
          __html: `
html, body {
  background: #000 !important;
  margin: 0 !important;
  overflow: hidden !important;
  min-height: 100% !important;
}
body > *:not(#drip-noscript-gate) {
  display: none !important;
}
#drip-noscript-gate {
  display: flex !important;
  position: fixed !important;
  inset: 0 !important;
  z-index: 2147483647 !important;
  align-items: center !important;
  justify-content: center !important;
  margin: 0 !important;
  padding: 1.5rem !important;
  background: #000 !important;
  color: #a1a1aa !important;
  font-family: ui-sans-serif, system-ui, sans-serif !important;
  font-size: 0.875rem !important;
  text-align: center !important;
  line-height: 1.5 !important;
}
`.trim(),
        }}
      />
      <div id="drip-noscript-gate" role="alert">
        JavaScript is required to use this site.
      </div>
    </noscript>
  );
}
