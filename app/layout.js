import "../styles/globals.css";

export const metadata = {
  title: "RateRadar – Top 5 spaarrentes in Europa, wekelijks in je inbox",
  description:
    "Elke week de Top 5 spaarrentes in Europa, inclusief promo en effectieve rente. Geen zoeken, geen rekenen.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="nl">
      <body>{children}</body>
    </html>
  );
}
