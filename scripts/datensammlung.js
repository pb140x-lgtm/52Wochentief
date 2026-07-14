// scripts/datensammlung.js
// Holt Rohdaten von Financial Modeling Prep (FMP) und lässt Claude sie
// gemäss prompt-datensammlung.md in ein sauberes JSON verwandeln.
// Benötigt: FMP_API_KEY, ANTHROPIC_API_KEY als Umgebungsvariablen.

import fs from "fs";
import path from "path";

const FMP_KEY = process.env.FMP_API_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

if (!FMP_KEY || !ANTHROPIC_KEY) {
  console.error("FMP_API_KEY oder ANTHROPIC_API_KEY fehlt.");
  process.exit(1);
}

// Indizes je Land. WICHTIG: Diese Symbole solltest du gegen deinen FMP-Plan
// prüfen (nicht jeder Plan deckt alle Indizes ab) und ggf. anpassen.
const INDIZES = {
  Japan: "^N225",
  Korea: "^KS11",
  China: "^SSEC",
  Indien: "^NSEI",
  Singapore: "^STI",
};

// Grosse Börsen je Land für den Screener. Ebenfalls gegen deinen FMP-Plan
// prüfen und anpassen (exchangeShortName kann variieren).
const BOERSEN = {
  Japan: "JPX",
  Korea: "KSE",
  China: "SHH",
  Indien: "NSE",
  Singapore: "SGX",
};

async function fmpGet(endpoint) {
  const url = `https://financialmodelingprep.com/api/v3/${endpoint}${endpoint.includes("?") ? "&" : "?"}apikey=${FMP_KEY}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`FMP-Anfrage fehlgeschlagen (${res.status}): ${endpoint}`);
    return null;
  }
  return res.json();
}

async function holeIndexPerformance() {
  const ergebnisse = [];
  for (const [land, symbol] of Object.entries(INDIZES)) {
    const daten = await fmpGet(`historical-price-full/${encodeURIComponent(symbol)}?timeseries=25`);
    const reihe = daten?.historical;
    if (!reihe || reihe.length < 21) {
      ergebnisse.push({ land, index: symbol, heute_pct: null, tage5_pct: null, tage20_pct: null });
      continue;
    }
    // FMP liefert neueste zuerst
    const heute = reihe[0].close;
    const gestern = reihe[1].close;
    const vor5 = reihe[5].close;
    const vor20 = reihe[20].close;
    ergebnisse.push({
      land,
      index: symbol,
      heute_pct: +(((heute - gestern) / gestern) * 100).toFixed(1),
      tage5_pct: +(((heute - vor5) / vor5) * 100).toFixed(1),
      tage20_pct: +(((heute - vor20) / vor20) * 100).toFixed(1),
    });
  }
  return ergebnisse;
}

async function holeGrosseBewegungenAsien() {
  const alle = [];
  for (const [land, exchange] of Object.entries(BOERSEN)) {
    const treffer = await fmpGet(
      `stock-screener?marketCapMoreThan=10000000000&exchange=${exchange}&limit=200`
    );
    if (!Array.isArray(treffer)) continue;
    for (const firma of treffer) {
      const quote = await fmpGet(`quote/${encodeURIComponent(firma.symbol)}`);
      const veraenderung = quote?.[0]?.changesPercentage;
      if (veraenderung != null && Math.abs(veraenderung) >= 4) {
        alle.push({
          land,
          unternehmen: firma.companyName,
          ticker: firma.symbol,
          veraenderung_pct: +veraenderung.toFixed(1),
        });
      }
    }
  }
  return alle;
}

async function holeEarningsGestern(nurUSA = false) {
  const heute = new Date();
  const gestern = new Date(heute);
  gestern.setDate(heute.getDate() - 1);
  const von = gestern.toISOString().split("T")[0];
  const bis = von;
  const kalender = await fmpGet(`earning_calendar?from=${von}&to=${bis}`);
  if (!Array.isArray(kalender)) return [];
  return kalender.filter((e) => (nurUSA ? true : true)); // Filterung nach Marktkap. erfolgt via Claude-Prompt
}

async function claudeStrukturieren(rohdaten) {
  const promptVorlage = fs.readFileSync(path.join(process.cwd(), "scripts/prompt-datensammlung.md"), "utf8");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
      system: promptVorlage,
      messages: [
        { role: "user", content: `Hier sind die Rohdaten von heute:\n\n${JSON.stringify(rohdaten)}` },
      ],
    }),
  });
  const data = await res.json();
  const text = data.content?.find((b) => b.type === "text")?.text ?? "{}";
  const bereinigt = text.replace(/```json|```/g, "").trim();
  return JSON.parse(bereinigt);
}

async function main() {
  const indizes = await holeIndexPerformance();
  const bewegungen = await holeGrosseBewegungenAsien();
  const earningsAsien = await holeEarningsGestern();
  const earningsUSA = await holeEarningsGestern(true);

  const rohdaten = {
    datum: new Date().toISOString().split("T")[0],
    indizes,
    grosse_bewegungen_asien: bewegungen,
    earnings_gestern_asien: earningsAsien,
    earnings_nachboerslich_usa: earningsUSA,
  };

  const strukturiert = await claudeStrukturieren(rohdaten);

  const zielOrdner = path.join(process.cwd(), "data");
  fs.mkdirSync(zielOrdner, { recursive: true });
  const zielDatei = path.join(zielOrdner, `${strukturiert.datum || rohdaten.datum}.json`);
  fs.writeFileSync(zielDatei, JSON.stringify(strukturiert, null, 2));
  console.log(`Datensammlung gespeichert: ${zielDatei}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
