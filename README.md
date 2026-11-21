# Spilplatform

Min egen lille "Steam": et katalog over mine spil, som kan spilles direkte i browseren.
Hostes gratis på **GitHub Pages**. Hvert spil udgives i faste versioner med to kanaler:

- **Dev** – den nyeste udgivelse, til test.
- **Live (Prod)** – den version alle spiller.

## Sådan virker det

```
spilplatform/
├── games.config.json   ← spillene: titel, beskrivelse, cover, sti til spillets projekt
├── covers/             ← coverbilleder
├── portal/             ← platformens hjemmeside (katalog, spilside, afspiller)
├── tools/              ← publish / promote / rollback / deploy
└── site/               ← det GitHub Pages viser (gh-pages-grenen)
    ├── catalog.json            ← hvilke versioner findes, og hvad Dev/Live peger på
    └── games/<spil>/<version>/ ← hver udgivelse, uforanderlig
```

- En udgivet version ændres **aldrig**. Hæv versionen i spillets `package.json` for hver udgivelse.
- **Promovering bygger ikke igen**: Live får præcis de filer, du testede på Dev.
- Besøgende ser kun **Live**. Dev/Live-knappen vises i udviklertilstand: åbn platformen med `?dev` (huskes i browseren, slås fra med `?dev=0`).
- Dev og Live har **hver deres gemte spil** (spillet får `?channel=dev|prod` og gemmer pr. kanal).

## Arbejdsgang

> **Regel:** Claude starter aldrig selv en udgivelse eller deployment (`publish-game`, `promote`, `rollback`,
> `notes`, `deploy` eller push). Det sker først, når Frederik beder om det. Claude må gerne foreslå det og
> skrive kommandoerne.

```bash
npm run publish-game -- bondegaarden --bump patch --notes "Hvad er nyt"   # hæv version, byg + udgiv til Dev
npm run preview                                         # se platformen lokalt på http://localhost:4300
npm run promote -- bondegaarden                              # Dev-versionen går Live
npm run rollback -- bondegaarden                             # Live tilbage til forrige version
npm run notes -- bondegaarden --version 0.9.3 --notes "…"  # ret noten på en version
npm run status                                          # alle spil, versioner og kanaler
npm run deploy                                          # læg site/ ud på GitHub Pages
```

## Nyt spil

1. Spillets byg skal bruge relative stier (Vite: `base: "./"`) og have en `version` i `package.json`.
2. Tilføj det i `games.config.json` (og et cover i `covers/`).
3. `npm run publish-game -- <slug>`

Spillet kører i en iframe med `?channel=dev|prod`. Vil spillet have en "Tilbage til menu"-knap, sender det
`window.parent.postMessage({ type: "spilplatform:exit" }, "*")` – så viser platformen spillets side igen.

## Konkurrencen: kollegers spil, bedømmelser og topliste

Alt foregår i repoets GitHub-issues – der er ingen server eller database. Portalen læser issues med GitHubs
offentlige API (uden login, gemt et par minutter i browseren).

- **Bedøm et spil**: knappen "★ Bedøm spillet" åbner formularen `bedoem.yml` med spillet udfyldt. 1–5 stjerner og
  en valgfri kommentar. Én stemme pr. GitHub-konto pr. spil tæller – den nyeste. Egne spil kan ikke bedømmes.
  Workflowet `bedoemmelser.yml` takker og lukker issuet (lukkede tæller stadig).
- **Tilføj dit spil**: formularen `nyt-spil.yml` (titel, udvikler, adresse, type, beskrivelse, cover). Spillet skal
  ligge på en offentlig adresse, fx GitHub Pages, og vises i en ramme. **Det kommer først på siden, når issuet får
  labelen `godkendt`.** Vil man trække det tilbage, fjernes labelen.
- **Topliste** (`#/topliste`): flest point (summen af stjerner på ens spil), bedste spil (gennemsnit, mindst 3
  stemmer) og flest spil.
- Egne spil får `developer` og `type` i `games.config.json`; de opdateres i kataloget ved hver `deploy`.

Labels der skal findes i repoet: `bedømmelse`, `nyt-spil`, `godkendt`.



```bash
git init -b main && git add -A && git commit -m "Spilplatform"
gh repo create <navn> --public --source . --push
# site/ bliver gh-pages-grenen:
mv site site.tmp
git worktree add --orphan -b gh-pages site
cp -R site.tmp/. site/ && rm -rf site.tmp
npm run deploy
gh api -X POST repos/{owner}/{repo}/pages -f "source[branch]=gh-pages" -f "source[path]=/"
```
