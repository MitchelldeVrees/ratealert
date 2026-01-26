import { Suspense } from "react";
import BevestigdClient from "./BevestigdClient";

export default function BevestigdPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-white text-ink">
          <div className="mx-auto w-full max-w-2xl px-6 py-16">
            <h1 className="font-display text-3xl sm:text-4xl text-ink mb-4">Je bent ingeschreven</h1>
            <p className="text-base sm:text-lg text-ink-muted">Bevestiging laden...</p>
          </div>
        </main>
      }
    >
      <BevestigdClient />
    </Suspense>
  );
}
