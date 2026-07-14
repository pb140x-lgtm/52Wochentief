// scripts/morgenreport.js
// Liest die JSON-Datensammlung von heute und lässt Claude daraus,
// gemäss prompt-morgenreport.md und styleguide.md, eine HTML-Seite erzeugen.
// Benötigt: ANTHROPIC_API_KEY als Umgebungsvariable.

import fs from "fs";
import path from "path";

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

if (!ANTHROPIC_KEY) {
  console.error("ANTHROPIC_API_KEY fehlt.");
  process.exit(1);
}

function heutigesDatum() {
  return new Date().toISOString().split("T")[0];
}

async function main() {
  const datum = heutigesDatum();
  const datenPfad = path.join(process.cwd(), "data", `${datum}.json`);

  if (!fs.existsSync(datenPfad)) {
    console.error(`Keine Datensammlung für ${datum} gefunden unter ${datenPfad}.`);
    process.exit(1);
  }

  const daten = JSON.parse(fs.readFileSync(datenPfad, "utf8"));
  const promptVorlage = fs.readFileSync(path.join(process.cwd(), "scripts/prompt-morgenreport.md"), "utf8");
  const styleguide = fs.readFileSync(path.join(process.cwd(), "scripts/styleguide.md"), "utf8");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 8000,
      system: `${promptVorlage}\n\n---\n\n${styleguide}`,
      messages: [
        { role: "user", content: `Hier sind die Marktdaten von heute:\n\n${JSON.stringify(daten)}` },
      ],
    }),
  });

  const data = await res.json();
  const html = data.content?.find((b) => b.type === "text")?.text ?? "";
  const bereinigt = html.replace(/```html|```/g, "").trim();

  const zielOrdner = path.join(process.cwd(), "reports");
  fs.mkdirSync(zielOrdner, { recursive: true });
  const zielDatei = path.join(zielOrdner, `${datum}.html`);
  fs.writeFileSync(zielDatei, bereinigt);

  // Zusätzlich als index.html speichern, damit die GitHub-Pages-Startseite
  // immer den neuesten Report zeigt.
  fs.writeFileSync(path.join(zielOrdner, "index.html"), bereinigt);

  console.log(`Morgenreport gespeichert: ${zielDatei}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
