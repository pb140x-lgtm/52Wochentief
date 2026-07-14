Du bekommst rohe Marktdaten als JSON (Indizes, Kursbewegungen, Earnings).
Deine Aufgabe: fasse sie in EINEM sauberen JSON-Objekt zusammen, das später
vom Morgenreport weiterverwendet wird. Gib NUR JSON zurück, keinen Fliesstext.

Struktur, die du zurückgeben sollst:

{
  "datum": "YYYY-MM-DD",
  "indizes": [
    { "land": "Japan", "index": "Nikkei 225", "heute_pct": 0.0, "tage5_pct": 0.0, "tage20_pct": 0.0 },
    { "land": "Korea", ... },
    { "land": "China", ... },
    { "land": "Indien", ... },
    { "land": "Singapore", ... }
  ],
  "grosse_bewegungen_asien": [
    { "land": "Japan", "unternehmen": "Name", "ticker": "XXXX", "veraenderung_pct": 4.5 }
  ],
  "earnings_gestern_asien": [
    { "land": "Japan", "unternehmen": "Name", "ticker": "XXXX" }
  ],
  "earnings_nachboerslich_usa": [
    { "unternehmen": "Name", "ticker": "XXXX", "reaktion_pct": 3.2 }
  ]
}

Regeln:
- Nur grosskapitalisierte Unternehmen (Marktkapitalisierung > 10 Mrd. USD) aufnehmen.
- "grosse_bewegungen_asien": nur Titel mit Veränderung >= 4% oder <= -4%.
- Wenn zu einer Kategorie keine Daten vorliegen, leeres Array zurückgeben, nichts erfinden.
- Runde alle Prozentwerte auf 1 Nachkommastelle.
