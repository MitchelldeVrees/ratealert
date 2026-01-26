"use client";

import { useMemo, useState } from "react";
import { renderWeeklyEmail } from "../../lib/weeklyEmail";

export default function NewsletterPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [message, setMessage] = useState("");
  const [lastSubmittedEmail, setLastSubmittedEmail] = useState("");
  const [canResend, setCanResend] = useState(true);

  const checkedAt = useMemo(() => {
    return new Intl.DateTimeFormat("nl-NL", {
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date());
  }, []);

  const previewHtml = useMemo(() => {
    const rankings = {
      180: [
        {
          rank: 1,
          offer: {
            name: "Santander - Online Sparen",
            bank: "Santander",
            url: "#",
            segments: [{ annual_rate: 0.031 }, { annual_rate: 0.0275, days: 90 }],
          },
        },
        {
          rank: 2,
          offer: {
            name: "Renault Bank - Flex",
            bank: "Renault Bank",
            url: "#",
            segments: [{ annual_rate: 0.0295 }],
          },
        },
        {
          rank: 3,
          offer: {
            name: "Bunq - Easy Savings",
            bank: "Bunq",
            url: "#",
            segments: [{ annual_rate: 0.0255 }],
          },
        },
        {
          rank: 4,
          offer: {
            name: "N26 - Spaarrekening",
            bank: "N26",
            url: "#",
            segments: [{ annual_rate: 0.024 }],
          },
        },
        {
          rank: 5,
          offer: {
            name: "LeasePlan Bank - Variabel",
            bank: "LeasePlan Bank",
            url: "#",
            segments: [{ annual_rate: 0.0235 }],
          },
        },
      ],
    };
    return renderWeeklyEmail({
      rankings,
      checkedAt,
      unsubscribeUrl: "#",
    });
  }, [checkedAt]);

  const submitEmail = async (targetEmail) => {
    if (!targetEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(targetEmail)) {
      setMessage("Ongeldig e-mailadres");
      setStatus("error");
      return;
    }
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Er ging iets mis");
      }
      setStatus("success");
      setMessage(
        data.message || "Check je inbox (en spam/promoties) en klik op de bevestigingslink. Zoek op ‘RenteOverzicht’."
      );
      setLastSubmittedEmail(targetEmail);
      setEmail(targetEmail);
      setCanResend(false);
      window.setTimeout(() => setCanResend(true), 60000);
      if (typeof window !== "undefined") {
        window.dataLayer = window.dataLayer || [];
        const params = new URLSearchParams(window.location.search);
        window.dataLayer.push({
          event: "lead_submit",
          lead_type: "newsletter",
          page: "/newsletter",
          utm_source: params.get("utm_source") || undefined,
          utm_medium: params.get("utm_medium") || undefined,
          utm_campaign: params.get("utm_campaign") || undefined,
          utm_term: params.get("utm_term") || undefined,
          utm_content: params.get("utm_content") || undefined,
        });
      }
    } catch (err) {
      setStatus("error");
      setMessage(err.message || "Er ging iets mis");
    }
  };
  const handleSubmit = (e) => {
    e.preventDefault();
    submitEmail(email);
  };

  return (
    <div className="min-h-screen bg-white text-ink">
      <header className="sticky top-0 z-20 backdrop-blur bg-white/80 border-b border-border">
        <div className="container-wide flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-white shadow-card flex items-center justify-center border border-border">
              <span className="font-display text-xs">RO</span>
            </div>
            <span className="font-display text-lg">Rente overzicht</span>
          </div>
        </div>
      </header>

      <main>
        <section className="section bg-hero-gradient">
          <div className="container-wide grid gap-10 lg:grid-cols-2 items-start">
            <div>
              <div className="flex flex-wrap gap-2 items-center text-xs text-ink-muted mb-3">
                <span className="pill bg-white border border-border" title={`Laatst gecheckt: ${checkedAt}`}>
                  Laatst gecheckt: {checkedAt}
                </span>
                <span className="pill bg-white border border-border">Geen spam</span>
                <span className="pill bg-white border border-border">EU depositogarantie</span>
                <span className="pill bg-white border border-border">Onafhankelijk</span>
              </div>
              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl leading-tight text-ink mb-4">
                Elke vrijdag automatisch de hoogste spaarrente in je inbox
              </h1>
              <p className="text-base sm:text-lg text-ink-muted mb-6 max-w-2xl">
                Je hoeft niet te vergelijken. Wij sturen je elke vrijdag de beste spaarrentes, inclusief promo’s en effectieve
                rente.
              </p>
              <p className="text-sm text-ink mb-6 max-w-2xl">
                Banken wijzigen rentes vaker dan je denkt. Wij sturen je elke vrijdag de top 5 + wat er is veranderd.
              </p>
              <ul className="text-sm sm:text-base text-ink-muted mb-6 space-y-2">
                <li>• Top 5 spaarrentes (actueel)</li>
                <li>• Wat is gewijzigd t.o.v. vorige week (↑/↓)</li>
                <li>• Promo’s + voorwaarden in 1 overzicht</li>
              </ul>

              <form onSubmit={handleSubmit} className="flex flex-col gap-3 mb-2 max-w-xl">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jij@voorbeeld.nl"
                  className="w-full px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="w-full bg-primary hover:bg-primary-hover text-white py-3 rounded-xl font-medium shadow-card transition disabled:opacity-70"
                >
                  {status === "loading" ? "Versturen..." : "Ontvang elke vrijdag de hoogste spaarrentes"}
                </button>
              </form>
              {status === "success" && <div className="text-sm text-green-600 mb-2">{message}</div>}
              {status === "error" && <div className="text-sm text-red-600 mb-1">{message}</div>}
              {status === "success" && (
                <div className="flex flex-wrap gap-3 text-sm mb-2">
                  <button
                    type="button"
                    onClick={() => submitEmail(lastSubmittedEmail)}
                    disabled={!canResend}
                    className="text-primary font-medium hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Stuur opnieuw
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStatus("idle");
                      setMessage("");
                      setEmail(lastSubmittedEmail);
                    }}
                    className="text-ink-muted hover:underline"
                  >
                    Wijzig e-mail
                  </button>
                </div>
              )}
              <div className="text-sm text-ink-muted">
                Vorige week steeg de #1 met +0,10% — abonnees zagen dit als eerste.
              </div>
              <div className="text-sm text-ink-muted">Geen spam. 1x per week. Opzeggen met 1 klik.</div>
              <div className="text-xs text-ink-muted mt-2">
                We vergelijken onafhankelijk op basis van publieke info van banken.
              </div>
            </div>

            <div className="card p-6 bg-white">
              <div className="text-sm text-ink-muted mb-3">Voorbeeld van de laatste mail</div>
              <div className="hidden lg:block rounded-2xl overflow-hidden border border-border bg-white">
                <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
              </div>
              <details className="lg:hidden">
                <summary className="cursor-pointer text-sm font-medium">Bekijk voorbeeldmail</summary>
                <div className="mt-3 rounded-2xl overflow-hidden border border-border bg-white">
                  <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
                </div>
              </details>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
