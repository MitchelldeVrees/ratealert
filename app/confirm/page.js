"use client";

import { useEffect, useState } from "react";

export default function ConfirmPage({ searchParams }) {
  const token = searchParams?.token || "";
  const [state, setState] = useState("loading");
  const [message, setMessage] = useState("Bezig met bevestigen...");

  useEffect(() => {
    if (!token) {
      setState("error");
      setMessage("Ontbrekende token.");
      return;
    }
    fetch(`/api/confirm?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Bevestigen mislukt");
        return data;
      })
      .then(() => {
        setState("success");
        setMessage("Je e-mail is bevestigd. Je ontvangt elke week de Top 5.");
      })
      .catch((err) => {
        setState("error");
        setMessage(err.message || "Bevestigen mislukt");
      });
  }, [token]);

  return (
    <main className="min-h-screen bg-hero-gradient flex items-center justify-center px-4">
      <div className="card max-w-md w-full p-6 text-center">
        <h1 className="font-display text-2xl mb-2">Bevestiging</h1>
        <p className={state === "error" ? "text-red-600" : "text-ink-muted"}>{message}</p>
        <a href="/" className="inline-flex mt-6 text-primary font-medium hover:underline">
          Terug naar RenteOverzicht
        </a>
      </div>
    </main>
  );
}
