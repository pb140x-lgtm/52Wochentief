# Designvorgabe (Teilprojekt 2)

Diese Datei wird sowohl bei der Datensammlung als auch beim Morgenreport
an Claude mitgegeben, damit beide Schritte dieselbe Optik erzeugen.

## Farben & Schrift (Apple-Muster)
- Schriftart: -apple-system, "SF Pro Display", "Helvetica Neue", Arial, sans-serif
- Hintergrund: #FFFFFF (hell) / #1C1C1E (dunkel, optional)
- Textfarbe: #1D1D1F
- Akzent Grün (positiv): #34C759
- Akzent Rot (negativ): #FF3B30
- Akzent Blau (Links/Kennzahlen): #007AFF
- Grauton für Rahmen/Trennlinien: #E5E5EA

## Tabellen
- Zeilen abwechselnd einfärben: #FFFFFF und #F5F5F7
- Kopfzeile: #F0F0F2, fett

## Zahlenformate (deutsches Format)
- Prozent: genau 1 Nachkommastelle, mit Vorzeichen, z.B. `+2,3%` oder `-1,8%`
- Währungen: Nachkommastellen mit Komma trennen, z.B. `1.234,56 USD`
- Alle Vorkommastellen ab 1000: Punkt als Tausendertrennzeichen, z.B. `12.345.678`

Diese Formate entsprechen dem JavaScript-Locale `de-DE`
(`Intl.NumberFormat('de-DE', ...)`).
