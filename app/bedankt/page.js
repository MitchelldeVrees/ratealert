export const metadata = {
  title: "Bedankt – bevestig je inschrijving | RenteOverzicht",
  description: "Check je mail om je inschrijving te bevestigen.",
};

export default function BedanktPage() {
  return (
    <div className="min-h-screen bg-white text-ink flex items-center justify-center px-6">
      <div className="card w-full max-w-xl p-8 text-center">
        <div className="font-display text-3xl mb-3">Bedankt!</div>
        <p className="text-ink mb-2">Check je mail om te bevestigen.</p>
        <p className="text-sm text-ink-muted">Geen mail? Check je spam of voeg ons toe.</p>
      </div>
    </div>
  );
}
