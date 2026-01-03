import "../styles/globals.css";

export const metadata = {
  title: "Beste spaarrente in Europa – wekelijkse Top 5 | RenteOverzicht",
  description:
    "Elke week automatisch de beste spaarrentes in je inbox. Inclusief promo’s, effectieve rente en alerts bij wijzigingen. Gratis tijdens beta.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="nl">
      <body>{children}</body>
    </html>
  );
}
