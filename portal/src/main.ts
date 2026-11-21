// The platform portal: a catalog of games, a page per game, a full-screen player – and the competition:
// colleagues' games, ratings and the leaderboard. The published games come from catalog.json (kept by the
// publish/promote tools); colleagues' games and all ratings come from the repository's GitHub issues.

import { Community, CommunityGame, Rating, STARS, issueUrl, loadCommunity, rateUrl, submitUrl } from "./github";

type Channel = "prod" | "dev";

interface Version {
  version: string;
  date: string;
  notes: string;
}
interface Developer {
  name: string;
  github?: string;
}
interface Game {
  slug: string;
  title: string;
  tagline: string;
  description: string;
  cover?: string;
  tags: string[];
  type?: string;
  developer?: Developer | null;
  channels: Record<Channel, string | null>;
  versions: Version[];
  /** A colleague's game, played from its own address (no channels or versions here). */
  url?: string;
  issue?: number;
  date?: string;
}
interface Catalog {
  updated: string | null;
  platform?: { title: string; tagline: string; repo?: string; giscus?: { repoId: string; category: string; categoryId: string } };
  games: Game[];
}

const app = document.getElementById("app")!;
const CHANNEL_KEY = "platform.channel";
let catalog: Catalog = { updated: null, games: [] };
let community: Community = { ratings: [], games: [] };
/** Every game: the published ones and the colleagues' approved ones. */
let games: Game[] = [];

const fromCommunity = (c: CommunityGame): Game => ({
  slug: c.slug, title: c.title, tagline: c.tagline, description: c.description, cover: c.cover, tags: [], type: c.type,
  developer: c.developer, channels: { prod: "live", dev: "live" }, versions: [], url: c.url, issue: c.issue, date: c.date,
});

// ---- Scores ----------------------------------------------------------------------------------------------

const devKey = (d?: Developer | null) => (d?.github || d?.name || "ukendt").toLowerCase();
const devName = (d?: Developer | null) => d?.name || d?.github || "Ukendt";

interface Score { votes: Rating[]; sum: number; avg: number }
let scores = new Map<string, Score>();

/** One vote per person per game – the newest – and never for your own game. */
function computeScores() {
  const owner = new Map(games.map((g) => [g.slug, (g.developer?.github ?? "").toLowerCase()]));
  const latest = new Map<string, Rating>();
  for (const r of [...community.ratings].sort((a, b) => a.date.localeCompare(b.date))) {
    if (!owner.has(r.game) || owner.get(r.game) === r.user.toLowerCase()) continue;
    latest.set(`${r.game}|${r.user.toLowerCase()}`, r);
  }
  scores = new Map();
  for (const r of latest.values()) {
    const s = scores.get(r.game) ?? { votes: [], sum: 0, avg: 0 };
    s.votes.push(r);
    s.sum += r.stars;
    s.avg = s.sum / s.votes.length;
    scores.set(r.game, s);
  }
}
const scoreOf = (slug: string): Score => scores.get(slug) ?? { votes: [], sum: 0, avg: 0 };
const MIN_VOTES = 3;

function starsHtml(avg: number, n: number, small = false) {
  if (!n) return `<span class="stars none${small ? " small" : ""}">Ingen bedømmelser endnu</span>`;
  const full = Math.round(avg);
  return `<span class="stars${small ? " small" : ""}" title="${avg.toFixed(1)} af ${STARS} – ${n} ${n === 1 ? "bedømmelse" : "bedømmelser"}">${"★".repeat(full)}<i>${"★".repeat(STARS - full)}</i> <b>${avg.toFixed(1)}</b> <span class="muted">(${n})</span></span>`;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("da-DK", { day: "numeric", month: "long", year: "numeric" });

/**
 * Developer mode shows the Live/Dev switch. Visitors only ever see Live. Turn it on with ?dev in
 * the address (remembered in this browser) and off again with ?dev=0.
 */
const DEV_KEY = "platform.devmode";
const devMode = (() => {
  const q = new URLSearchParams(location.search).get("dev");
  try {
    if (q !== null) localStorage.setItem(DEV_KEY, q === "0" ? "0" : "1");
    return localStorage.getItem(DEV_KEY) === "1";
  } catch {
    return q !== null && q !== "0";
  }
})();

function getChannel(): Channel {
  if (!devMode) return "prod";
  try {
    return localStorage.getItem(CHANNEL_KEY) === "dev" ? "dev" : "prod";
  } catch {
    return "prod";
  }
}
function setChannel(c: Channel) {
  try {
    localStorage.setItem(CHANNEL_KEY, c);
  } catch {
    /* ignore */
  }
  document.body.classList.toggle("dev", c === "dev");
  document.querySelectorAll<HTMLButtonElement>("[data-channel]").forEach((b) => b.classList.toggle("active", b.dataset.channel === c));
  route();
}

const CHANNEL_NAME: Record<Channel, string> = { prod: "Live", dev: "Dev" };

function channelBadge(c: Channel) {
  if (!devMode) return ""; // visitors only see Live, so there is nothing to label
  return `<span class="badge ${c}">${CHANNEL_NAME[c]}</span>`;
}

// ---- Pages -----------------------------------------------------------------------------

// What the library shows: a type, a developer, and the order.
const view = { type: "", dev: "", sort: "best" as "best" | "votes" | "new" | "az" };

function catalogPage() {
  const ch = getChannel();
  const types = [...new Set(games.map((g) => g.type || "Andet"))].sort();
  const devs = [...new Map(games.map((g) => [devKey(g.developer), devName(g.developer)])).entries()].sort((a, b) => a[1].localeCompare(b[1]));
  const shown = games
    .filter((g) => (!view.type || (g.type || "Andet") === view.type) && (!view.dev || devKey(g.developer) === view.dev))
    .sort((a, b) => {
      const sa = scoreOf(a.slug), sb = scoreOf(b.slug);
      if (view.sort === "az") return a.title.localeCompare(b.title, "da");
      if (view.sort === "votes") return sb.votes.length - sa.votes.length || sb.avg - sa.avg;
      if (view.sort === "new") return newest(b).localeCompare(newest(a));
      return sb.avg - sa.avg || sb.votes.length - sa.votes.length;
    });
  const cards = shown.map((g) => {
    const v = g.url ? "live" : g.channels[ch];
    const sc = scoreOf(g.slug);
    return `<a class="card ${v ? "" : "soon"}" href="#/spil/${g.slug}">
      <div class="cover">${g.cover ? `<img src="${esc(g.cover)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : `<span class="nocover">${esc(g.title.slice(0, 1))}</span>`}</div>
      <div class="card-body">
        <h3>${esc(g.title)}</h3>
        <p class="by">af ${esc(devName(g.developer))}</p>
        <p>${esc(g.tagline)}</p>
        ${starsHtml(sc.avg, sc.votes.length, true)}
        <div class="meta"><span class="tag type">${esc(g.type || "Andet")}</span>${g.tags.filter((t) => t !== g.type).map((t) => `<span class="tag">${esc(t)}</span>`).join("")}
          <span class="ver">${g.url ? "Kollega" : v ? `v${esc(v)}` : "Kommer snart"}</span></div>
      </div>
    </a>`;
  });
  const repo = catalog.platform?.repo;
  app.innerHTML = `
    <section class="hero">
      <h1>${esc(catalog.platform?.tagline ?? "Bibliotek")}</h1>
      <p>${games.length} spil fra ${devs.length} ${devs.length === 1 ? "udvikler" : "udviklere"} · Spil dem, giv dem stjerner – og byg selv det næste.
        ${ch === "dev" ? " Du ser <b>Dev</b>-kanalen." : ""}</p>
      ${community.error ? `<p class="warn">Bedømmelserne kunne ikke hentes fra GitHub lige nu (${esc(community.error)}). Prøv igen om lidt.</p>` : ""}
    </section>
    <section class="filters">
      <div class="chips"><button data-type="" class="${view.type ? "" : "on"}">Alle</button>${types.map((t) => `<button data-type="${esc(t)}" class="${view.type === t ? "on" : ""}">${esc(t)}</button>`).join("")}</div>
      <span class="spacer"></span>
      <label>Udvikler <select data-dev><option value="">Alle</option>${devs.map(([k, n]) => `<option value="${esc(k)}" ${view.dev === k ? "selected" : ""}>${esc(n)}</option>`).join("")}</select></label>
      <label>Sortér <select data-sort>
        ${([["best", "Bedst bedømt"], ["votes", "Flest bedømmelser"], ["new", "Nyeste"], ["az", "A–Å"]] as const).map(([k, n]) => `<option value="${k}" ${view.sort === k ? "selected" : ""}>${n}</option>`).join("")}
      </select></label>
    </section>
    <section class="grid">${cards.join("") || `<p class="empty">Ingen spil passer til filtret.</p>`}
      ${repo ? `<a class="card add" href="#/guide"><div class="add-body"><span>＋</span><b>Tilføj dit spil</b><p>Indsend det på GitHub – så er du med i konkurrencen.</p></div></a>` : ""}
    </section>`;
  app.querySelectorAll<HTMLButtonElement>("[data-type]").forEach((b) => (b.onclick = () => ((view.type = b.dataset.type!), catalogPage())));
  app.querySelector<HTMLSelectElement>("[data-dev]")!.onchange = (e) => ((view.dev = (e.target as HTMLSelectElement).value), catalogPage());
  app.querySelector<HTMLSelectElement>("[data-sort]")!.onchange = (e) => ((view.sort = (e.target as HTMLSelectElement).value as typeof view.sort), catalogPage());
}

const newest = (g: Game) => g.date ?? g.versions.at(-1)?.date ?? "";

function gamePage(g: Game) {
  const ch = getChannel();
  const sc = scoreOf(g.slug);
  const repo = catalog.platform?.repo;
  const v = g.channels[ch];
  const other: Channel = ch === "prod" ? "dev" : "prod";
  app.innerHTML = `
    <section class="game">
      <div class="game-cover">${g.cover ? `<img src="${esc(g.cover)}" alt="${esc(g.title)}">` : ""}</div>
      <div class="game-info">
        <a class="back" href="#/">← Bibliotek</a>
        <h1>${esc(g.title)}</h1>
        <p class="tagline">${esc(g.tagline)}</p>
        <p class="by">af <b>${esc(devName(g.developer))}</b></p>
        <div class="meta"><span class="tag type">${esc(g.type || "Andet")}</span>${g.tags.filter((t) => t !== g.type).map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div>
        <div class="rating">${starsHtml(sc.avg, sc.votes.length)}
          ${repo ? `<a class="rate" href="${esc(rateUrl(repo, g.slug, g.title))}" target="_blank" rel="noopener">★ Bedøm spillet</a>` : ""}</div>
        <p class="desc">${esc(g.description)}</p>
        ${g.url
          ? `<a class="play" href="#/spil/${g.slug}/spil">▶ Spil nu</a>
             <p class="muted small">Et spil fra en kollega · <a href="${esc(g.url)}" target="_blank" rel="noopener">åbn i nyt vindue</a></p>`
          : v
          ? `<a class="play" href="#/spil/${g.slug}/spil">▶ Spil nu</a>
             <p class="muted">Version ${esc(v)}${devMode ? ` ${channelBadge(ch)}${g.channels[other] && g.channels[other] !== v ? ` · ${CHANNEL_NAME[other]}: ${esc(g.channels[other]!)}` : ""}` : ""}</p>`
          : `<p class="soon-note">${devMode ? `Ikke udgivet på ${CHANNEL_NAME[ch]} endnu.${g.channels[other] ? ` Skift til ${CHANNEL_NAME[other]} for at spille version ${esc(g.channels[other]!)}.` : ""}` : "Kommer snart."}</p>`}
        <p class="muted small">Dit spil gemmes i browseren.${devMode && !g.url ? ` ${CHANNEL_NAME.prod} og ${CHANNEL_NAME.dev} har hver deres gemte spil.` : ""}</p>
      </div>
    </section>
    ${reviewsHtml(sc)}
    <section class="discussion"><h2>Kommentarer</h2><div id="giscus"></div></section>`;
  mountComments(g);
}

/**
 * The game's comment thread: giscus shows a GitHub Discussion for the game (one per game, made on the first
 * comment) and lets people write as the GitHub user they are logged in as. Comments give no points.
 */
function mountComments(g: Game) {
  const box = document.getElementById("giscus")!;
  const cfg = catalog.platform?.giscus;
  const repo = catalog.platform?.repo;
  if (!repo || !cfg?.repoId || !cfg.categoryId) {
    box.innerHTML = `<p class="muted">Kommentarsporet bliver slået til snart.</p>`;
    return;
  }
  const s = document.createElement("script");
  s.src = "https://giscus.app/client.js";
  s.async = true;
  s.crossOrigin = "anonymous";
  const attrs: Record<string, string> = {
    repo, "repo-id": cfg.repoId, category: cfg.category, "category-id": cfg.categoryId,
    mapping: "specific", term: `Kommentarer: ${g.slug}`, strict: "1", "reactions-enabled": "1",
    "emit-metadata": "0", "input-position": "top", theme: "dark_dimmed", lang: "da", loading: "lazy",
  };
  for (const [k, v] of Object.entries(attrs)) s.setAttribute(`data-${k}`, v);
  box.append(s);
}

/** What people wrote, newest first (their own words, as written – escaped) – and, open for all to see, who gave what. */
function reviewsHtml(sc: Score) {
  if (!sc.votes.length) return "";
  const repo = catalog.platform?.repo;
  const said = sc.votes.filter((r) => r.comment.trim()).sort((a, b) => b.date.localeCompare(a.date));
  const all = [...sc.votes].sort((a, b) => b.stars - a.stars || a.user.localeCompare(b.user));
  const link = (r: Rating) => (repo && r.issue ? `href="${esc(issueUrl(repo, r.issue))}" target="_blank" rel="noopener"` : "");
  return `<section class="reviews">
    ${said.length ? `<h2>Det siger kollegerne</h2>
    ${said.slice(0, 20).map((r) => `<div class="review"><div class="review-head">${"★".repeat(r.stars)}<i>${"★".repeat(STARS - r.stars)}</i>
      <b>${esc(r.user)}</b><span class="muted small">${fmtDate(r.date)}</span></div><p>${esc(r.comment)}</p></div>`).join("")}` : ""}
    <h3>Alle stemmer (${all.length})</h3>
    <p class="voters">${all.map((r) => `<a ${link(r)}>${esc(r.user)} <span>${"★".repeat(r.stars)}</span></a>`).join("")}</p>
    <p class="muted small">Alle stemmer er åbne: hver bedømmelse kan ses som et issue på GitHub. Kun godkendte kolleger kan stemme, én stemme pr. spil (den nyeste), og aldrig på egne spil.</p>
  </section>`;
}

function playPage(g: Game) {
  const ch = getChannel();
  const v = g.url ? "live" : g.channels[ch];
  if (!v) return gamePage(g);
  const src = g.url ?? `games/${g.slug}/${encodeURIComponent(v)}/index.html?channel=${ch}`;
  document.body.classList.add("playing");
  track(`start/${g.slug}`, `Start: ${g.title}`, true);
  app.innerHTML = `
    <div class="player">
      <div class="player-bar">
        <a class="back" href="#/spil/${g.slug}">← ${esc(g.title)}</a>
        ${g.url ? `<span class="muted">af ${esc(devName(g.developer))}</span>` : `<span class="muted">v${esc(v)}</span>${channelBadge(ch)}`}
        <span class="spacer"></span>
        <button id="fullscreen" title="Fuld skærm">⛶ Fuld skærm</button>
      </div>
      <iframe id="game-frame" src="${esc(src)}" title="${esc(g.title)}" allow="fullscreen; autoplay"
        ${g.url ? `sandbox="allow-scripts allow-same-origin allow-pointer-lock allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox" referrerpolicy="no-referrer"` : ""}></iframe>
    </div>`;
  document.getElementById("fullscreen")!.onclick = () => document.getElementById("game-frame")!.requestFullscreen?.();
}

// ---- The leaderboard ----------------------------------------------------------------------------------------

function leaderboardPage() {
  // Developers: points are all the stars given to their games (by others).
  const devs = new Map<string, { name: string; points: number; votes: number; games: Game[] }>();
  for (const g of games) {
    const k = devKey(g.developer);
    const d = devs.get(k) ?? { name: devName(g.developer), points: 0, votes: 0, games: [] };
    const sc = scoreOf(g.slug);
    d.points += sc.sum;
    d.votes += sc.votes.length;
    d.games.push(g);
    devs.set(k, d);
  }
  const byPoints = [...devs.values()].sort((a, b) => b.points - a.points || b.votes - a.votes || a.name.localeCompare(b.name));
  const byGames = [...devs.values()].sort((a, b) => b.games.length - a.games.length || b.points - a.points);
  const ranked = games.map((g) => ({ g, sc: scoreOf(g.slug) })).filter((x) => x.sc.votes.length >= MIN_VOTES)
    .sort((a, b) => b.sc.avg - a.sc.avg || b.sc.votes.length - a.sc.votes.length);
  const waiting = games.filter((g) => scoreOf(g.slug).votes.length < MIN_VOTES);
  const medal = (i: number) => (i < 3 ? ["🥇", "🥈", "🥉"][i] : `${i + 1}.`);
  const filter = (k: string) => `#/?udvikler=${encodeURIComponent(k)}`;
  app.innerHTML = `
    <section class="hero"><h1>Topliste</h1>
      <p>Point er alle de stjerner, ens spil har fået af andre. Hver person tæller én gang pr. spil (den nyeste bedømmelse), og man kan ikke bedømme sine egne spil.</p>
      ${community.error ? `<p class="warn">Bedømmelserne kunne ikke hentes fra GitHub lige nu – toplisten er tom indtil da.</p>` : ""}</section>
    <section class="boards">
      <div class="board"><h2>Flest point</h2>
        <table>${byPoints.map((d, i) => `<tr><td class="rank">${medal(i)}</td><td><a href="${filter(devKey(d.games[0].developer))}">${esc(d.name)}</a></td>
          <td class="num"><b>${d.points}</b> point</td><td class="num muted">${d.votes} ${d.votes === 1 ? "stemme" : "stemmer"}</td></tr>`).join("")}</table></div>
      <div class="board"><h2>Bedste spil</h2>
        ${ranked.length ? `<table>${ranked.map(({ g, sc }, i) => `<tr><td class="rank">${medal(i)}</td><td><a href="#/spil/${g.slug}">${esc(g.title)}</a><div class="muted small">${esc(devName(g.developer))}</div></td>
          <td class="num">${starsHtml(sc.avg, sc.votes.length, true)}</td></tr>`).join("")}</table>` : `<p class="muted">Endnu intet spil med ${MIN_VOTES} bedømmelser.</p>`}
        ${waiting.length ? `<p class="muted small">Mangler stemmer (under ${MIN_VOTES}): ${waiting.map((g) => `<a href="#/spil/${g.slug}">${esc(g.title)}</a> (${scoreOf(g.slug).votes.length})`).join(", ")}</p>` : ""}</div>
      <div class="board"><h2>Flest spil</h2>
        <table>${byGames.map((d, i) => `<tr><td class="rank">${medal(i)}</td><td><a href="${filter(devKey(d.games[0].developer))}">${esc(d.name)}</a>
          <div class="muted small">${d.games.map((g) => esc(g.title)).join(", ")}</div></td><td class="num"><b>${d.games.length}</b> spil</td></tr>`).join("")}</table></div>
    </section>`;
}

function notFound() {
  app.innerHTML = `<section class="hero"><h1>Ikke fundet</h1><p><a href="#/">Tilbage til biblioteket</a></p></section>`;
}

function guidePage() {
  const repo = catalog.platform?.repo;
  const form = repo ? submitUrl(repo) : "";
  app.innerHTML = `
    <section class="hero"><h1>Sådan tilføjer du dit spil</h1>
      <p>Dit spil kommer på spilsiden med det samme og er med i konkurrencen om flest point. Det tager 5 minutter, når spillet ligger online.</p></section>
    <section class="guide">
      <div class="step"><span class="n">1</span><div><h2>Det skal du have</h2>
        <ul>
          <li><b>En GitHub-konto, der er mindst 30 dage gammel.</b> Indsendelsen sker som et issue på GitHub, så toplisten ved, hvem der har lavet spillet.</li>
          <li><b>Et spil, der kører i browseren</b> – HTML/JavaScript, fx lavet med Claude. Ingen installation, intet login.</li>
          <li><b>En offentlig adresse, der starter med <code>https://</code>.</b> Spillet ligger hos dig, ikke på spilsiden.</li>
        </ul></div></div>
      <div class="step"><span class="n">2</span><div><h2>Læg spillet online</h2>
        <p>Har du ikke et sted? GitHub Pages er gratis:</p>
        <ol>
          <li>Lav et <b>offentligt</b> repository på GitHub og læg spillets filer i det (<code>index.html</code> i roden).</li>
          <li>Gå til <b>Settings → Pages</b>, vælg grenen <code>main</code> og mappen <code>/ (root)</code>, og gem.</li>
          <li>Efter et minut ligger spillet på <code>https://dit-brugernavn.github.io/repo-navn/</code>.</li>
        </ol>
        <p class="muted">Netlify, Vercel og lignende virker også. Brug relative stier (<code>./spil.js</code>, ikke <code>/spil.js</code>), så filerne findes under undermappen.</p></div></div>
      <div class="step"><span class="n">3</span><div><h2>Tjek, at det kan spilles herinde</h2>
        <p>Spilsiden viser dit spil i en ramme (en <i>iframe</i>) i en sandkasse. Det betyder:</p>
        <ul>
          <li>Siden må <b>ikke</b> nægte at blive vist i en ramme (<code>X-Frame-Options</code> eller <code>frame-ancestors</code>). GitHub Pages er i orden.</li>
          <li>Scripts, gemte spil (<code>localStorage</code>), lyd, fuld skærm, musefangst, formularer og popup-vinduer virker.</li>
          <li>Downloads og at skifte hele browserfanen til en anden side virker ikke.</li>
          <li>Spillet skal kunne starte uden login og fylde vinduet – det får hele skærmen under menulinjen.</li>
        </ul>
        <p class="muted">Valgfrit: en "Tilbage til menu"-knap kan sende <code>window.parent.postMessage({ type: "spilplatform:exit" }, "*")</code>, så kommer spilleren tilbage til spillets side.</p></div></div>
      <div class="step"><span class="n">4</span><div><h2>Udfyld formularen</h2>
        <table class="fields">
          <tr><td>Titel</td><td>Spillets navn, højst 60 tegn.</td></tr>
          <tr><td>Udvikler</td><td>Dit navn, som det skal stå på toplisten. Point går til din GitHub-konto.</td></tr>
          <tr><td>Adresse</td><td>Spillets <code>https://</code>-adresse fra trin 2.</td></tr>
          <tr><td>Type</td><td>Strategi, Simulation, Action, Arkade, Puslespil, Eventyr, Sport eller Andet – bruges til filtrene.</td></tr>
          <tr><td>Kort beskrivelse</td><td>Én linje til kortet i biblioteket, højst 140 tegn.</td></tr>
          <tr><td>Beskrivelse</td><td>Hvad går spillet ud på, og hvordan styrer man det? Højst 2000 tegn.</td></tr>
          <tr><td>Coverbillede</td><td>Valgfrit: <code>https://</code>-adresse på et billede i 16:9, fx 1280×720. Læg det samme sted som spillet.</td></tr>
        </table>
        ${form ? `<p><a class="btn" href="${esc(form)}" target="_blank" rel="noopener">Åbn formularen på GitHub</a></p>` : ""}</div></div>
      <div class="step"><span class="n">5</span><div><h2>Når du har trykket "Submit new issue"</h2>
        <ul>
          <li>Inden for et minut svarer dommeren i issuet med ✅, og spillet står i biblioteket. Svarer den ⚠️, mangler titel eller adresse – indsend igen.</li>
          <li><b>Opdatér spillet ved at opdatere det på din adresse.</b> Spilsiden viser altid den nyeste version, og dine stemmer bliver.</li>
          <li>Rettelser i issuet bagefter tæller ikke. Skal titel eller tekst ændres, så indsend et nyt issue – men så starter det forfra uden stemmer, så skriv til Frederik i stedet, hvis det bare er en tekst.</li>
          <li>Frederik får besked om alle nye spil og kan tage et spil af siden.</li>
        </ul></div></div>
      <div class="step"><span class="n">★</span><div><h2>Konkurrencen</h2>
        <p>Kolleger giver 1–5 stjerner med "★ Bedøm spillet" på spillets side. Man kan ikke bedømme sine egne spil, og kun den nyeste stemme pr. person tæller. Alle stemmer er offentlige. Se stillingen på <a href="#/topliste">toplisten</a>.</p></div></div>
    </section>`;
}

// ---- Routing (hash based, so it works on GitHub Pages without server rules) -------------

// ---- Visitor counts (GoatCounter, no cookies) ------------------------------------------------------
// The portal uses #-addresses, so each page is counted by hand; starting a game is counted as an event.
type GC = { count: (o: { path: string; title?: string; event?: boolean }) => void };
function track(path: string, title?: string, event = false) {
  if (devMode) return; // your own testing on Dev does not count
  // the script loads async: retry for a while, so the first page of a visit is counted too
  let tries = 0;
  const send = () => {
    const gc = (window as unknown as { goatcounter?: GC }).goatcounter;
    if (gc?.count) gc.count({ path, title, event });
    else if (++tries < 40) setTimeout(send, 250);
  };
  send();
}

function route() {
  document.body.classList.remove("playing");
  const [path, query = ""] = location.hash.replace(/^#\/?/, "").split("?");
  const parts = path.split("/").filter(Boolean);
  track(`/${path}`);
  document.querySelectorAll<HTMLAnchorElement>("nav a").forEach((a) => a.classList.toggle("on", a.getAttribute("href") === `#/${parts[0] ?? ""}`));
  if (!parts.length) {
    const dev = new URLSearchParams(query).get("udvikler");
    if (dev !== null) view.dev = dev;
    return catalogPage();
  }
  if (parts[0] === "topliste") return leaderboardPage();
  if (parts[0] === "guide") return guidePage();
  if (parts[0] === "spil" && parts[1]) {
    const g = games.find((x) => x.slug === parts[1]);
    if (!g) return notFound();
    document.title = `${g.title} – ${document.getElementById("brand-title")!.textContent}`;
    return parts[2] === "spil" ? playPage(g) : gamePage(g);
  }
  notFound();
}

async function start() {
  document.querySelectorAll<HTMLButtonElement>("[data-channel]").forEach((b) => (b.onclick = () => setChannel(b.dataset.channel as Channel)));
  (document.querySelector(".channel") as HTMLElement).hidden = !devMode;
  try {
    const res = await fetch("catalog.json", { cache: "no-cache" });
    catalog = await res.json();
  } catch {
    app.innerHTML = `<section class="hero"><h1>Kataloget kunne ikke hentes</h1><p>Prøv at genindlæse siden.</p></section>`;
    return;
  }
  if (catalog.platform) {
    document.getElementById("brand-title")!.textContent = catalog.platform.title;
    document.title = catalog.platform.title;
  }
  const repo = catalog.platform?.repo;
  if (!repo) (document.getElementById("nav-submit") as HTMLAnchorElement).hidden = true;
  community = await loadCommunity(repo);
  games = [...catalog.games, ...community.games.map(fromCommunity)];
  computeScores();
  window.addEventListener("hashchange", route);
  // A game asks to go back to the menu (its own "Tilbage til menu"): show the game's page again.
  window.addEventListener("message", (e) => {
    const frame = document.getElementById("game-frame") as HTMLIFrameElement | null;
    if (!frame || e.source !== frame.contentWindow || e.data?.type !== "spilplatform:exit") return;
    const slug = location.hash.replace(/^#\/?/, "").split("/")[1];
    location.hash = slug ? `#/spil/${slug}` : "#/";
  });
  setChannel(getChannel());
}

start();
