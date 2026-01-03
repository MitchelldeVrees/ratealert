import "../styles/globals.css";
import Script from "next/script";

import ConsentBanner from "./components/ConsentBanner";

export const metadata = {
  title: "Beste spaarrente in Europa – wekelijkse Top 5 | RenteOverzicht",
  description:
    "Elke week automatisch de beste spaarrentes in je inbox. Inclusief promo’s, effectieve rente en alerts bij wijzigingen. Gratis tijdens beta.",
};

export default function RootLayout({ children }) {
  const googleAdsId = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || "AW-17849928635";
  return (
    <html lang="nl">
      <head>
        <Script
          id="gtag-consent-default"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('consent', 'default', {
  ad_storage: 'denied',
  analytics_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied'
});
gtag('js', new Date());
`,
          }}
        />
        <Script async src={`https://www.googletagmanager.com/gtag/js?id=${googleAdsId}`} strategy="afterInteractive" />
        <Script
          id="gtag-config"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
gtag('config', '${googleAdsId}');
`,
          }}
        />
      </head>
      <body>
        {children}
        <ConsentBanner googleAdsId={googleAdsId} />
      </body>
    </html>
  );
}
