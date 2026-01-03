"use client";

import { useEffect, useState } from "react";

const reasons = [
  "Te veel e-mails",
  "Niet relevant voor mij",
  "Ik heb al een betere rente",
  "Ik wil geen buitenlandse banken",
  "Anders, namelijk...",
];

export default function UnsubscribePage({ searchParams }) {
  const token = searchParams?.token || "";
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState(reasons[0]);
  const [customReason, setCustomReason] = useState("");
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("Bezig met laden...");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Ontbrekende token.");
      return;
    }
    fetch(`/api/unsubscribe?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Ophalen mislukt");
        return data;
      })
      .then((data) => {
        setEmail(data.email || "");
        setStatus("ready");
        setMessage("");
      })
      .catch((err) => {
        setStatus("error");
        setMessage(err.message || "Ophalen mislukt");
      });
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) return;
    setStatus("saving");
    const finalReason = reason === "Anders, namelijk..." ? customReason : reason;
    const res = await fetch("/api/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, reason: finalReason }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus("error");
      setMessage(data.error || "Uitschrijven mislukt");
      return;
    }
    setStatus("done");
    setMessage("Je bent uitgeschreven. Je ontvangt geen e-mails meer.");
  };

  return (
    <main className="min-h-screen bg-hero-gradient flex items-center justify-center px-4">
      <div className="card max-w-md w-full p-6">
        <h1 className="font-display text-2xl mb-2">Uitschrijven</h1>
        {email ? <p className="text-sm text-ink-muted mb-4">Voor: {email}</p> : null}

        {status === "ready" || status === "saving" ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <label className="text-sm text-ink-muted">Waarom wil je uitschrijven?</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="px-3 py-2 rounded-xl border border-border"
            >
              {reasons.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            {reason === "Anders, namelijk..." ? (
              <input
                type="text"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Je reden"
                className="px-3 py-2 rounded-xl border border-border"
              />
            ) : null}
            <button
              type="submit"
              disabled={status === "saving"}
              className="bg-primary hover:bg-primary-hover text-white px-5 py-3 rounded-xl font-medium shadow-card transition disabled:opacity-70"
            >
              {status === "saving" ? "Bezig..." : "Uitschrijven"}
            </button>
          </form>
        ) : null}

        {status === "loading" ? <p className="text-sm text-ink-muted">{message}</p> : null}
        {status === "error" ? <p className="text-sm text-red-600">{message}</p> : null}
        {status === "done" ? <p className="text-sm text-ink-muted">{message}</p> : null}

        <a href="/" className="inline-flex mt-6 text-primary font-medium hover:underline">
          Terug naar RenteOverzicht
        </a>
      </div>
    </main>
  );
}
