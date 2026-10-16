/** Instant feedback while a /app page renders on the server: generic card-and-rows skeleton. */
export default function AppLoading() {
  return (
    <div aria-busy="true" aria-label="Loading" className="space-y-5">
      <div className="skeleton h-36 rounded-3xl" />
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <div className="skeleton size-12 rounded-2xl" />
            <div className="skeleton h-2.5 w-12 rounded-full" />
          </div>
        ))}
      </div>
      <div className="space-y-2.5 rounded-3xl border border-white/5 bg-card/60 p-4">
        <div className="skeleton mb-4 h-4 w-32 rounded-full" />
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 py-1.5">
            <div className="skeleton size-10 shrink-0 rounded-xl" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-3 w-2/3 rounded-full" />
              <div className="skeleton h-2.5 w-1/3 rounded-full" />
            </div>
            <div className="skeleton h-3.5 w-14 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
