"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "ro_consent_v1";

function setConsent(granted) {
  if (typeof window === "undefined") return;
  if (typeof window.gtag !== "function") return;
  window.gtag("consent", "update", {
    ad_storage: granted ? "granted" : "denied",
    analytics_storage: granted ? "granted" : "denied",
    ad_user_data: granted ? "granted" : "denied",
    ad_personalization: granted ? "granted" : "denied",
  });
}

export default function ConsentBanner({ googleAdsId }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "granted") {
      setConsent(true);
      return;
    }
    if (saved === "denied") {
      setConsent(false);
      return;
    }
    setVisible(true);
  }, []);

  const accept = () => {
    window.localStorage.setItem(STORAGE_KEY, "granted");
    setConsent(true);
    setVisible(false);
  };

  const reject = () => {
    window.localStorage.setItem(STORAGE_KEY, "denied");
    setConsent(false);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-0 right-0 z-40 px-4">
      <div className="container-wide">
        <div className="card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="text-sm text-ink-muted">
            We gebruiken cookies om data te meten. Door op "Akkoord" te klikken, stemt u in met het gebruik van deze cookies.
          </div>
          <div className="flex gap-2 sm:ml-auto">
            <button
              type="button"
              onClick={reject}
              className="px-4 py-2 rounded-pill border border-border text-ink text-sm hover:bg-bg-muted transition"
            >
              Weigeren
            </button>
            <button
              type="button"
              onClick={accept}
              className="px-4 py-2 rounded-pill bg-primary text-white text-sm hover:bg-primary-hover transition"
            >
              Akkoord
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

