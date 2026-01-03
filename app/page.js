"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";

const steps = [
  { title: "Meld je aan", copy: "Laat je e-mail achter en kies je voorkeuren." },
  { title: "Wij rekenen door", copy: "Promo-rentes → effectieve rente, elke week opnieuw." },
  { title: "Je ontvangt Top 5", copy: "E-mail + alerts bij rente-wijzigingen. Geen gedoe." },
];

const features = [
  { title: "Promo’s doorgerekend", copy: "3m promo? We tonen de effectieve rente per horizon." },
  { title: "Alerts bij wijzigingen", copy: "Seintje bij rente-updates zodat je snel kunt schakelen." },
  { title: "Filters NL/EU/deposito", copy: "Vrij opneembaar of deposito, NL-only toggle." },
  { title: "Magic link login", copy: "Geen wachtwoorden, veilig inloggen via je e-mail." },
];

const trustBadges = [
  "EU depositogarantie tot €100.000 per bank/land",
  "Data uit openbare bronnen",
  "Geen advies, alleen informatie",
  "HTTPS + privacy-first",
];

const testimonials = [
  { name: "Sander, ondernemer", quote: "Ik bespaar tijd én krijg meer rente dan bij mijn huisbank." },
  { name: "Marije, data-analist", quote: "Fijn dat de promo’s al zijn omgerekend." },
  { name: "Jeroen, zzp’er", quote: "Elke week even checken, klaar." },
];

const faqs = [
  { q: "Is dit financieel advies?", a: "Nee, dit is informatie en vergelijking. Controleer altijd de voorwaarden bij de bank." },
  { q: "Zijn buitenlandse banken veilig?", a: "EU depositogarantie tot €100.000 per bank/land. Check ook looptijden en voorwaarden." },
  { q: "Hoe vaak mailen jullie?", a: "1x per week de Top 5 + alerts bij rente-wijzigingen." },
  { q: "Kan ik me afmelden?", a: "Ja, in elke e-mail staat 1-klik opzeggen." },
  { q: "Wat kost het?", a: "Gratis. We verdienen geld met reclames tonen en affiliate links" },
];

const exampleEmail = {
  week: "Week 12",
  timestamp: "Gecheckt: vandaag 09:05",
  subject: "Top 5 spaarrentes • incl. promo en effectieve rente",
  items: [
    "Santander ES – 3,10% promo 3m → eff. 2,85%",
    "Renault Bank FR – 2,95% eff.",
    "Bunq NL – 2,55% eff. (vrij opneembaar)",
    "N26 DE – 2,40% eff.",
    "LeasePlan BE – 2,35% eff.",
  ],
};

const presetAmounts = [10000, 50000, 200000];
const horizonPresets = [3, 6, 12];

const formatCurrency = (value) =>
  value.toLocaleString("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

export default function Page() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [message, setMessage] = useState("");
  const [amount, setAmount] = useState(50000);
  const [horizon, setHorizon] = useState(6);
  const [showModal, setShowModal] = useState(false);

  const effectiveRate = useMemo(() => {
    if (horizon <= 3) return 0.0275;
    if (horizon <= 6) return 0.0285;
    return 0.03;
  }, [horizon]);

  const projected = useMemo(() => amount * effectiveRate * (horizon / 12), [amount, effectiveRate, horizon]);
  const ingInterest = useMemo(() => {
    const tiers = [
      { cap: 10000, rate: 0.0125 },
      { cap: 100000, rate: 0.01 },
      { cap: 1000000, rate: 0.01 },
    ];
    let remaining = amount;
    let total = 0;
    let lastCap = 0;
    for (const tier of tiers) {
      if (remaining <= 0) break;
      const span = Math.max(0, Math.min(remaining, tier.cap - lastCap));
      total += span * tier.rate * (horizon / 12);
      remaining -= span;
      lastCap = tier.cap;
    }
    return total;
  }, [amount, horizon]);
  const uplift = projected - ingInterest;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
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
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Er ging iets mis");
      }
      setStatus("success");
      setMessage("Check je mail en bevestig je inschrijving (kan 1-2 min duren).");
      setEmail("");
    } catch (err) {
      setStatus("error");
      setMessage(err.message || "Er ging iets mis");
    }
  };

  return (
    <div className="min-h-screen bg-white text-ink">
      <header className="sticky top-0 z-20 backdrop-blur bg-white/80 border-b border-border">
        <div className="container-wide flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary text-white font-display flex items-center justify-center text-lg shadow-card">
              RR
            </div>
            <span className="font-display text-lg">Rente overzicht</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-ink-muted">
            <a href="#how">Hoe het werkt</a>
            <a href="#why">Waarom het loont</a>
            <a href="#features">Features</a>
            <a href="#faq">FAQ</a>
          </nav>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="hidden sm:inline-flex bg-primary text-white px-4 py-2 rounded-pill text-sm font-medium hover:bg-primary-hover transition"
          >
            Ontvang de Top 5 rentes
          </button>
        </div>
      </header>

      <main>
        <section className="section bg-hero-gradient" id="hero">
          <div className="container-wide grid gap-10 lg:grid-cols-2 items-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              <div className="flex flex-wrap gap-2 items-center text-xs text-ink-muted mb-3">
                <span className="pill bg-white border border-border">Laatst gecheckt: 2 min geleden</span>
                <span className="pill bg-white border border-border">Geen spam</span>
                <span className="pill bg-white border border-border">EU depositogarantie</span>
              </div>
              <h1 className="font-display text-4xl sm:text-5xl leading-tight text-ink mb-4">
                RenteOverzicht – Beste spaarrentes in Europa, automatisch in je inbox
              </h1>
              <div className="text-sm text-ink-muted mb-3">
                Onafhankelijke rente-informatie. Geen advies. Wel de beste opties.
              </div>
              <p className="text-lg text-ink-muted mb-6 max-w-2xl">
                Elke week de Top 5 spaarrentes in Europa, inclusief promo’s en effectieve rente. Geen zoeken, geen rekenen.
              </p>
              <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 mb-3" id="cta">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jij@voorbeeld.nl"
                  className="flex-1 px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="bg-primary hover:bg-primary-hover text-white px-5 py-3 rounded-xl font-medium shadow-card transition disabled:opacity-70"
                >
                  {status === "loading" ? "Versturen..." : "Ontvang de Top 5 rentes"}
                </button>
              </form>
              <div className="text-sm text-ink-muted mb-4">Geen spam. 1x per week. Opzeggen met 1 klik.</div>
              {status === "success" && <div className="text-sm text-green-600 mb-2">{message}</div>}
              {status === "error" && <div className="text-sm text-red-600 mb-2">{message}</div>}
              <div className="flex items-center gap-3 text-sm text-ink">
                <div className="font-semibold">1.284 spaarders ingeschreven*</div>
                <div className="text-ink-muted text-xs">*Indicatief, live teller.</div>
              </div>
              <div className="mt-3">
              <a href="#email-preview" className="text-primary text-sm font-medium hover:underline">
                Bekijk voorbeeld e-mail
              </a>
            </div>
          </motion.div>

            <motion.div
              id="email-preview"
              className="card p-6 bg-white"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-sm font-semibold">RenteOverzicht · {exampleEmail.week}</div>
                  <div className="text-xs text-ink-muted">{exampleEmail.timestamp}</div>
                </div>
                <span className="pill bg-bg-muted border border-border text-ink-muted text-xs">Info, geen advies</span>
              </div>
              <div className="font-medium mb-3 text-ink">{exampleEmail.subject}</div>
              <ol className="space-y-2 text-sm text-ink">
                {exampleEmail.items.slice(0, 3).map((item, idx) => (
                  <li key={idx} className="flex gap-2">
                    <span className="text-ink-muted">{idx + 1}.</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
              <div className="mt-4">
                <a href="#features" className="text-primary text-sm font-medium hover:underline">
                  Bekijk volledige vergelijking
                </a>
              </div>
              <div className="mt-4 text-xs text-ink-muted">
                EU depositogarantie tot €100.000 per bank/land · Geen advies, alleen info
              </div>
            </motion.div>
          </div>
        </section>

        <section className="section" id="how">
          <div className="container-wide">
            <h2 className="font-display text-3xl mb-3">Zo werkt het</h2>
            <p className="text-ink-muted mb-8">In 3 stappen elke week de beste spaarrentes in je inbox.</p>
            <div className="grid gap-4 md:grid-cols-3">
              {steps.map((step, idx) => (
                <div key={step.title} className="card p-5">
                  <div className="pill bg-bg-muted border border-border text-ink-muted inline-flex mb-3">
                    Stap {idx + 1}
                  </div>
                  <div className="font-semibold text-lg mb-2">{step.title}</div>
                  <div className="text-ink-muted text-sm">{step.copy}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section bg-bg-muted" id="why">
          <div className="container-wide grid gap-10 lg:grid-cols-2 items-center">
            <div>
              <h2 className="font-display text-3xl mb-3">Waarom dit je geld oplevert</h2>
              <p className="text-ink-muted mb-6">
                Kies een bedrag en horizon. We tonen de effectieve rente én het verschil met de huisbank (0,5%).
              </p>
              <div className="flex flex-wrap gap-2 mb-5">
                {presetAmounts.map((val) => (
                  <button
                    key={val}
                    onClick={() => setAmount(val)}
                    className={`px-3 py-2 rounded-pill border ${
                      amount === val ? "bg-primary text-white border-primary" : "border-border text-ink"
                    }`}
                  >
                    {formatCurrency(val)}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm text-ink-muted">Bedrag:</span>
                <input
                  type="range"
                  min="10000"
                  max="200000"
                  step="5000"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full accent-primary"
                />
                <span className="text-sm font-semibold">{formatCurrency(amount)}</span>
              </div>
              <div className="flex gap-2 mb-6">
                {horizonPresets.map((h) => (
                  <button
                    key={h}
                    onClick={() => setHorizon(h)}
                    className={`px-3 py-2 rounded-pill border ${
                      horizon === h ? "bg-primary text-white border-primary" : "border-border text-ink"
                    }`}
                  >
                    {h} mnd
                  </button>
                ))}
              </div>
            </div>
            <div className="card p-6">
              <div className="text-sm text-ink-muted mb-2">Effectieve rente-inschatting</div>
              <div className="flex items-baseline gap-3 mb-4">
                <div className="text-4xl font-display text-ink">{(effectiveRate * 100).toFixed(2)}%</div>
                <div className="text-sm text-ink-muted">op basis van recente deals</div>
              </div>
              <div className="text-sm text-ink-muted mb-1">Verwachte rente met RenteOverzicht</div>
              <div className="text-2xl font-semibold mb-2">{formatCurrency(projected)}</div>
              <div className="text-sm text-ink-muted mb-4">ING-rente (berekend): {formatCurrency(ingInterest)}</div>
              <div className="bg-bg-muted border border-border rounded-xl p-4 mb-4">
                <div className="text-sm text-ink-muted">Extra opbrengst t.o.v. ING</div>
                <div className="text-xl font-semibold text-ink">{formatCurrency(uplift)}</div>
              </div>
              <button className="w-full bg-primary hover:bg-primary-hover text-white py-3 rounded-xl font-medium shadow-card transition">
                Stuur mij de deals
              </button>
              <div className="text-xs text-ink-muted mt-3">
                Indicatief voorbeeld, geen advies. Promo’s worden omgerekend naar effectieve rente.
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="features">
          <div className="container-wide">
            <h2 className="font-display text-3xl mb-3">Top features</h2>
            <p className="text-ink-muted mb-8">Gebouwd om sneller en slimmer rente te kiezen.</p>
            <div className="grid gap-4 md:grid-cols-2">
              {features.map((feat) => (
                <div key={feat.title} className="card p-5">
                  <div className="text-lg font-semibold mb-2">{feat.title}</div>
                  <div className="text-ink-muted text-sm">{feat.copy}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section bg-bg-muted" id="trust">
          <div className="container-wide grid gap-8 lg:grid-cols-2 items-start">
            <div>
              <h2 className="font-display text-3xl mb-3">Vertrouwen & veiligheid</h2>
              <p className="text-ink-muted mb-4">
                Informatie en vergelijking, geen advies. We hanteren EU depositogarantie-informatie en beschermen je data.
              </p>
              
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {trustBadges.map((item) => (
                <div key={item} className="card p-4 text-sm text-ink">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section" id="testimonials">
          <div className="container-wide">
            <h2 className="font-display text-3xl mb-3">Wat anderen zeggen</h2>
            <p className="text-ink-muted mb-8">Echte bezwaren, kort en eerlijk beantwoord.</p>
            <div className="grid gap-4 md:grid-cols-3">
              {testimonials.map((t) => (
                <div key={t.name} className="card p-5 flex flex-col gap-3">
                  <div className="text-ink">{t.quote}</div>
                  <div className="text-sm text-ink-muted">{t.name}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section bg-bg-muted" id="faq">
          <div className="container-wide">
            <h2 className="font-display text-3xl mb-3">FAQ & disclaimer</h2>
            <p className="text-ink-muted mb-6">Veelgestelde vragen en duidelijke disclaimers.</p>
            <div className="space-y-3">
              {faqs.map((item, idx) => (
                <details key={idx} className="card p-4">
                  <summary className="cursor-pointer text-ink font-medium">{item.q}</summary>
                  <div className="mt-2 text-ink-muted text-sm">{item.a}</div>
                </details>
              ))}
            </div>
            <div className="mt-6 text-sm text-ink-muted">
              RenteOverzicht biedt informatie en vergelijking, geen persoonlijk financieel advies. Rentes kunnen wijzigen. Controleer
              voorwaarden bij de bank.
            </div>
          </div>
        </section>

        <section className="section" id="final-cta">
          <div className="container-wide grid gap-8 lg:grid-cols-2 items-center">
            <div>
              <h2 className="font-display text-3xl mb-3">Krijg de Top 5 in je inbox</h2>
              <p className="text-ink-muted mb-4">Gratis tijdens beta. Kost 30 seconden. Afmelden wanneer je wil.</p>
              <div className="flex items-center gap-2 text-sm text-ink-muted mb-2">
                <span className="pill bg-bg-muted border border-border">Geen spam</span>
                <span className="pill bg-bg-muted border border-border">1x per week</span>
                <span className="pill bg-bg-muted border border-border">EU depositogarantie info</span>
              </div>
              <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 mb-2">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jij@voorbeeld.nl"
                  className="flex-1 px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="bg-primary hover:bg-primary-hover text-white px-5 py-3 rounded-xl font-medium shadow-card transition disabled:opacity-70"
                >
                  {status === "loading" ? "Versturen..." : "Ontvang de Top 5 rentes"}
                </button>
              </form>
              {status === "success" && <div className="text-sm text-green-600 mb-1">{message}</div>}
              {status === "error" && <div className="text-sm text-red-600 mb-1">{message}</div>}
              <a href="#email-preview" className="text-primary text-sm font-medium hover:underline">
                Bekijk voorbeeld e-mail
              </a>
            </div>
            <div className="card p-6">
              <div className="text-sm text-ink-muted mb-2">Objection busters</div>
              <ul className="space-y-2 text-ink">
                <li>• EU depositogarantie tot €100.000 per bank/land</li>
                <li>• Geen advies, alleen informatie</li>
                <li>• Afmelden in 1 klik</li>
              </ul>
              <div className="mt-4 text-sm text-ink-muted">Gratis. We verdienen geld met reclames tonen en affiliate links</div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-6">
          <div className="container-wide flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-ink-muted">
            <div>
              © {new Date().getFullYear()} RenteOverzicht. RenteOverzicht.com is een onafhankelijk informatieplatform voor
              spaarrentes in Europa.
            </div>
          <div className="flex gap-4">
            <a href="#privacy">Privacy</a>
            <a href="#terms">Terms</a>
            <a href="#contact">Contact</a>
          </div>
        </div>
      </footer>

      {showModal && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 px-4"
          role="dialog"
          aria-modal="true"
          aria-label="Ontvang de Top 5 rentes"
          onClick={() => setShowModal(false)}
        >
          <div
            className="card w-full max-w-lg p-6 bg-white relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="absolute right-3 top-3 text-ink-muted hover:text-ink"
              onClick={() => setShowModal(false)}
              aria-label="Sluit"
            >
              ✕
            </button>
            <h3 className="font-display text-2xl mb-2 text-ink">Ontvang de Top 5 rentes</h3>
            <p className="text-ink-muted text-sm mb-4">
              Geen spam. 1x per week. Opzeggen met 1 klik.
            </p>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3 mb-2">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jij@voorbeeld.nl"
                className="flex-1 px-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-primary focus:outline-none"
              />
              <button
                type="submit"
                disabled={status === "loading"}
                className="bg-primary hover:bg-primary-hover text-white px-5 py-3 rounded-xl font-medium shadow-card transition disabled:opacity-70"
              >
                {status === "loading" ? "Versturen..." : "Ontvang de Top 5 rentes"}
              </button>
            </form>
            {status === "success" && <div className="text-sm text-green-600 mb-1">{message}</div>}
            {status === "error" && <div className="text-sm text-red-600 mb-1">{message}</div>}
            <div className="text-xs text-ink-muted">EU depositogarantie info · Geen advies, alleen informatie.</div>
          </div>
        </div>
      )}
    </div>
  );
}
