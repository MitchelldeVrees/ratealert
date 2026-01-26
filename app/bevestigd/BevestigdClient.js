"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

const copyMap = {
  sent: {
    title: "Je bent ingeschreven ✅",
    body: "Je eerste Top 5 is onderweg (meestal binnen 1 minuut). Check ook je spam/promoties.",
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
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const [resendError, setResendError] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: "newsletter_confirm_result",
      status,
      page: "/bevestigd",
    });
  }, [status]);

  const handleResend = async () => {
    if (resendLoading) return;
    setResendLoading(true);
    setResendMessage("");
    setResendError(false);
    try {
      const res = await fetch("/api/resend-welcome", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Er ging iets mis. Probeer het later opnieuw.");
      }
      setResendMessage(data?.message || "Verzonden! Check ook spam/promoties.");
    } catch (err) {
      setResendError(true);
      setResendMessage(err?.message || "Er ging iets mis. Probeer het later opnieuw.");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-white text-ink">
      <div className="mx-auto w-full max-w-2xl px-6 py-16">
        <h1 className="font-display text-3xl sm:text-4xl text-ink mb-4">{content.title}</h1>
        <p className="text-base sm:text-lg text-ink-muted mb-8">{content.body}</p>
        {status === "sent" ? (
          <div className="mb-8">
            <button
              type="button"
              onClick={handleResend}
              disabled={resendLoading}
              className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {resendLoading ? "Versturen..." : "Geen mail ontvangen? Stuur opnieuw"}
            </button>
            {resendMessage ? (
              <p className={`mt-3 text-sm ${resendError ? "text-red-600" : "text-ink-muted"}`}>
                {resendMessage}
              </p>
            ) : null}
          </div>
        ) : null}
        <div className="text-sm text-ink-muted">
          Tip: check ook je spam/promoties en zoek op “RenteOverzicht”.
        </div>
      </div>
    </main>
  );
}
