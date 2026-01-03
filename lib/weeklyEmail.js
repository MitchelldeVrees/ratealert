export function renderWeeklyEmail({ rankings, checkedAt, unsubscribeUrl }) {
  const rows = rankings[180] || [];
  const items = rows.slice(0, 5).map((row, idx) => {
    const offer = row.offer;
    const rate = offer.segments?.[0]?.annual_rate
      ? `${(offer.segments[0].annual_rate * 100).toFixed(2)}%`
      : "-";
    const promo =
      offer.segments?.length >= 2 && offer.segments[0]?.days
        ? `Promo ${(offer.segments[0].annual_rate * 100).toFixed(2)}% ~${Math.round(
            offer.segments[0].days / 30
          )}m → daarna ${(offer.segments[1].annual_rate * 100).toFixed(2)}%`
        : null;
    const url = offer.url || "#";
    return `
      <tr>
        <td style="padding:14px 12px;border-bottom:1px solid #e2e8f0;vertical-align:top">
          <div style="font-size:12px;color:#64748b">#${idx + 1}</div>
          <div style="font-weight:600;color:#0f172a">${offer.name}</div>
          <div style="font-size:12px;color:#64748b;margin-top:4px">${offer.bank || ""}</div>
        </td>
        <td style="padding:14px 12px;border-bottom:1px solid #e2e8f0;vertical-align:top">
          <div style="font-size:18px;font-weight:700;color:#0f172a">${rate} eff.</div>
          ${promo ? `<div style="font-size:12px;color:#64748b;margin-top:4px">${promo}</div>` : ""}
        </td>
        <td style="padding:14px 12px;border-bottom:1px solid #e2e8f0;vertical-align:top;text-align:right">
          <a href="${url}" style="background:#1F7AE0;color:#fff;text-decoration:none;padding:8px 18px;border-radius:999px;font-size:12px;display:inline-block;white-space:nowrap;min-width:120px;text-align:center">
            Bekijk bank
          </a>
        </td>
      </tr>
    `;
  });

  return `
    <div style="font-family:Inter,Arial,sans-serif;line-height:1.6;color:#0f172a;background:#f6f8fb;padding:24px">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden">
        <div style="padding:20px 24px;background:linear-gradient(135deg,#EEF4FF 0%,#F9FBFF 100%);border-bottom:1px solid #e2e8f0">
          <div style="display:flex;align-items:center;gap:10px">
            <div style="width:36px;height:36px;border-radius:10px;background:#1F7AE0;color:#fff;font-weight:700;display:flex;align-items:center;justify-content:center">
              RO
            </div>
            <div>
              <div style="font-weight:700;font-size:18px">RenteOverzicht · Top 5 spaarrentes</div>
              <div style="font-size:12px;color:#64748b">Gecheckt: ${checkedAt}</div>
            </div>
          </div>
          <p style="margin-top:12px;font-size:14px;color:#475569">
            De beste spaarrentes van deze week, inclusief promo’s en effectieve rente. Klik direct door naar de bank.
          </p>
        </div>

        <div style="padding:0 16px">
          <table style="width:100%;border-collapse:collapse">
            <thead>
              <tr>
                <th style="text-align:left;font-size:12px;color:#64748b;padding:12px">Bank</th>
                <th style="text-align:left;font-size:12px;color:#64748b;padding:12px">Effectieve rente</th>
                <th style="text-align:right;font-size:12px;color:#64748b;padding:12px">Link</th>
              </tr>
            </thead>
            <tbody>
              ${items.join("")}
            </tbody>
          </table>
        </div>

        <div style="padding:18px 24px;border-top:1px solid #e2e8f0;background:#f9fbff">
          <div style="font-size:12px;color:#64748b">
            EU depositogarantie tot €100.000 per bank/land · Geen financieel advies, alleen informatie en vergelijking.
          </div>
          <div style="font-size:12px;color:#64748b;margin-top:6px">
            Afmelden? <a href="${unsubscribeUrl}" style="color:#1F7AE0">Uitschrijven</a>
          </div>
        </div>
      </div>
    </div>
  `;
}
