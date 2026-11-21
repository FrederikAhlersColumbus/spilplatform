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

Ingen server: kolleger bruger GitHub-formularer, en **dommer** (workflowet `konkurrence.yml`) tjekker dem og
skriver resultatet i `ledger.json` på grenen **`data`** – den eneste kilde, portalen tæller fra.

- **Bedøm et spil** (formularen `bedoem.yml`, åbnes med "★ Bedøm spillet"): dommeren godkender kun, hvis
  kontoen står i **`voters.json`**, er mindst 30 dage gammel, spillet findes og ikke er ens eget. Stemmen gemmes,
  som den var ved oprettelsen; issuet lukkes og låses. Rettelser bagefter tæller ikke. Den nyeste stemme pr.
  person pr. spil gælder.
- **Tilføj dit spil** (formularen `nyt-spil.yml`): fra en kollega på `voters.json` kommer det **straks** på siden
  (teksten ved oprettelsen gemmes, issuet låses). Fra andre venter det, til **du** (admin) sætter labelen `godkendt`.
  Labelen `afvist` tager et spil af siden. Andre, der sætter labelerne, får dem fjernet. Dommeren nævner dig
  (`@ejeren`) i issuet, så GitHub sender dig en mail. Spillet kører i en sandkasse-ramme.
- **Kommentarer** pr. spil: giscus (GitHub Discussions, kategorien Announcements). Man skriver som den GitHub-bruger,
  man er logget ind som. Kommentarer giver ingen point. Moderér under Discussions (slet, lås).
- **Topliste** (`#/topliste`): flest point (summen af stjerner på ens spil), bedste spil (gennemsnit, mindst 3
  stemmer), flest spil. Alle stemmer står åbent på spillets side med link til issuet.
- Egne spil får `developer` og `type` i `games.config.json`; de opdateres i kataloget ved hver `deploy`.

Labels der skal findes i repoet: `bedømmelse`, `nyt-spil`, `godkendt`, `afvist`.

### Sikkerhed – det skal holdes
- **Giv aldrig kolleger skriveadgang til repoet.** Så kan kun du og dommeren skrive `main`, `data` og labels.
- Ny kollega: tilføj GitHub-brugernavnet i `voters.json` og push.
- Bliver en stemme snydt ind alligevel, så slet den i `ledger.json` på `data`-grenen – det er hele regnskabet.
- Kendte grænser: én person med flere konti kan kun stemme, hvis du har sat begge på listen; stemmebytte
  mellem kolleger kan ikke forhindres teknisk – derfor er alle stemmer offentlige.

## Første gang (GitHub Pages)

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
