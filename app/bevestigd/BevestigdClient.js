"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";

const copyMap = {
  sent: {
    title: "Je bent ingeschreven ✅",
    body: "Check je inbox voor je eerste Top 5. Volgende keer ontvang je deze mail elke vrijdag.",
  },
  queued: {
    title: "Je bent ingeschreven ✅",
    body: "Het is vrijdag. Je eerste Top 5 ontvang je vanmiddag.",
  },
  missing: {
    title: "Link onvolledig",
    body: "De bevestigingslink is onvolledig. Vraag een nieuwe link aan.",
  },
  invalid: {
    title: "Link verlopen",
    body: "Deze bevestigingslink is verlopen of ongeldig. Vraag een nieuwe link aan.",
  },
  error: {
    title: "Er ging iets mis",
    body: "Er ging iets mis bij het bevestigen. Probeer het later opnieuw.",
  },
};

export default function BevestigdClient() {
  const params = useSearchParams();
  const status = params.get("status") || "sent";
  const content = useMemo(() => copyMap[status] || copyMap.sent, [status]);

  return (
    <main className="min-h-screen bg-white text-ink">
      <div className="mx-auto w-full max-w-2xl px-6 py-16">
        <h1 className="font-display text-3xl sm:text-4xl text-ink mb-4">{content.title}</h1>
        <p className="text-base sm:text-lg text-ink-muted mb-8">{content.body}</p>
        <div className="text-sm text-ink-muted">
          Tip: check ook je spam/promoties en zoek op “RenteOverzicht”.
        </div>
      </div>
    </main>
  );
}
