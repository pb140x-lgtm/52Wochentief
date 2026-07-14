// scripts/datensammlung.js
// Holt Rohdaten von Yahoo Finance und lässt Claude sie
// gemäss prompt-datensammlung.md in ein sauberes JSON verwandeln.
// Benötigt: ANTHROPIC_API_KEY als Umgebungsvariable.

import fs from "fs";
import path from "path";
import yahooFinance from "yahoo-finance2";

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

if (!ANTHROPIC_KEY) {
  console.error("ANTHROPIC_API_KEY fehlt.");
  process.exit(1);
}

const INDIZES = {
  Japan:     { symbol: "^N225",  name: "Nikkei 225" },
  Korea:     { symbol: "^KS11",  name: "KOSPI" },
  China:     { symbol: "^SSEC",  name: "Shanghai Composite" },
  Indien:    { symbol: "^NSEI",  name: "Nifty 50" },
  Singapore: { symbol: "^STI",   name: "Straits Times Index" },
};

// Repräsentative Grosskapitalisierungen je Markt (> 10 Mrd. USD Marktkapitalisierung)
const ASIEN_AKTIEN = {
  Japan:     ["7203.T", "6758.T", "9984.T", "8306.T", "6861.T", "9432.T", "7974.T", "8035.T", "4519.T", "6501.T"],
  Korea:     ["005930.KS", "000660.KS", "051910.KS", "035420.KS", "005380.KS", "000270.KS"],
  China:     ["0700.HK", "9988.HK", "3690.HK", "9618.HK", "1810.HK", "2318.HK", "0941.HK"],
  Indien:    ["RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "HINDUNILVR.NS", "ICICIBANK.NS"],
  Singapore: ["D05.SI", "O39.SI", "U11.SI", "C6L.SI", "Z74.SI"],
};

async function holeIndexPerformance() {
  const ergebnisse = [];
  const heute = new Date();
  const vor30 = new Date(heute);
  vor30.setDate(heute.getDate() - 30);
  const period1 = vor30.toISOString().split("T")[0];
  const period2 = heute.toISOString().split("T")[0];

  for (const [land, { symbol, name }] of Object.entries(INDIZES)) {
    try {
      const [quote, history] = await Promise.all([
        yahooFinance.quote(symbol),
        yahooFinance.historical(symbol, { period1, period2, interval: "1d" }),
      ]);

      const aktuell   = quote?.regularMarketPrice ?? null;
      const heute_pct = quote?.regularMarketChangePercent ?? null;
      // history ist aufsteigend sortiert (älteste zuerst)
      const vor5  = history.length >= 6  ? history[history.length - 6].close  : null;
      const vor20 = history.length >= 21 ? history[history.length - 21].close : null;

      ergebnisse.push({
        land,
        index: name,
        heute_pct:  heute_pct != null ? +heute_pct.toFixed(1) : null,
        tage5_pct:  (vor5  && aktuell) ? +(((aktuell - vor5)  / vor5)  * 100).toFixed(1) : null,
        tage20_pct: (vor20 && aktuell) ? +(((aktuell - vor20) / vor20) * 100).toFixed(1) : null,
      });
    } catch (err) {
      console.warn(`Indexfehler ${land} (${symbol}):`, err.message);
      ergebnisse.push({ land, index: name, heute_pct: null, tage5_pct: null, tage20_pct: null });
    }
  }
  return ergebnisse;
}

async function holeGrosseBewegungenAsien() {
  const alle = [];
  for (const [land, symbole] of Object.entries(ASIEN_AKTIEN)) {
    try {
      const quotes = await yahooFinance.quote(symbole);
      const quoteArray = Array.isArray(quotes) ? quotes : [quotes];
      for (const q of quoteArray) {
        const veraenderung = q?.regularMarketChangePercent;
        if (veraenderung != null && Math.abs(veraenderung) >= 4) {
          alle.push({
            land,
            unternehmen: q.shortName || q.longName || q.symbol,
            ticker: q.symbol,
            veraenderung_pct: +veraenderung.toFixed(1),
          });
        }
      }
    } catch (err) {
      console.warn(`Kursfehler ${land}:`, err.message);
    }
  }
  return alle;
}

async function claudeStrukturieren(rohdaten) {
  const promptVorlage = fs.readFileSync(
    path.join(process.cwd(), "scripts/prompt-datensammlung.md"),
    "utf8"
  );
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
  const indizes    = await holeIndexPerformance();
  const bewegungen = await holeGrosseBewegungenAsien();

  const rohdaten = {
    datum:                      new Date().toISOString().split("T")[0],
    indizes,
    grosse_bewegungen_asien:    bewegungen,
    earnings_gestern_asien:     [],
    earnings_nachboerslich_usa: [],
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
