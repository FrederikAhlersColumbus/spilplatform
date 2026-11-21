// The competition lives in the repository's GitHub issues, so the platform needs no server:
//   • a rating is an issue from the "Bedøm et spil" form (label "bedømmelse"),
//   • a colleague's game is an issue from the "Tilføj dit spil" form (label "nyt-spil"); it is shown once
//     Frederik has given it the label "godkendt".
// The portal reads them with GitHub's public API (no login; 60 calls an hour per visitor, so the answer is
// kept for a few minutes in the browser).

export const STARS = 5;

export interface Rating {
  game: string;
  user: string;
  stars: number;
  comment: string;
  date: string;
  url: string;
}

export interface CommunityGame {
  slug: string;
  title: string;
  developer: { name: string; github: string };
  type: string;
  url: string;
  tagline: string;
  description: string;
  cover?: string;
  date: string;
  issue: string;
}

interface Issue {
  number: number;
  html_url: string;
  body: string | null;
  created_at: string;
  user: { login: string } | null;
  labels: { name: string }[];
  pull_request?: unknown;
}

const CACHE_KEY = "platform.github.v1";
const CACHE_MS = 3 * 60 * 1000;

/** The answers of an issue form: "### Label\n\nvalue" sections, by label. */
function formFields(body: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of body.split(/^### /m).slice(1)) {
    const nl = part.indexOf("\n");
    const label = part.slice(0, nl).trim();
    const value = part.slice(nl + 1).trim();
    out[label] = value === "_No response_" ? "" : value;
  }
  return out;
}

const https = (u: string) => (/^https:\/\/[^\s"'<>]+$/i.test(u) ? u : "");

async function fetchLabel(repo: string, label: string): Promise<Issue[]> {
  const all: Issue[] = [];
  for (let page = 1; page <= 10; page++) {
    const res = await fetch(`https://api.github.com/repos/${repo}/issues?state=all&labels=${encodeURIComponent(label)}&per_page=100&page=${page}`, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!res.ok) throw new Error(`GitHub svarede ${res.status}`);
    const batch = (await res.json()) as Issue[];
    all.push(...batch.filter((i) => !i.pull_request));
    if (batch.length < 100) break;
  }
  return all;
}

export interface Community {
  ratings: Rating[];
  games: CommunityGame[];
  /** Set when GitHub could not be reached: the page works on without ratings. */
  error?: string;
}

export async function loadCommunity(repo: string | undefined): Promise<Community> {
  if (!repo) return { ratings: [], games: [] };
  try {
    const hit = JSON.parse(sessionStorage.getItem(CACHE_KEY) ?? "null");
    if (hit && hit.repo === repo && Date.now() - hit.at < CACHE_MS) return hit.data;
  } catch {
    /* no cache */
  }
  try {
    const [rated, submitted] = await Promise.all([fetchLabel(repo, "bedømmelse"), fetchLabel(repo, "godkendt")]);
    const data: Community = {
      ratings: rated.flatMap((i) => {
        const f = formFields(i.body ?? "");
        const stars = parseInt(f["Stjerner"] ?? "", 10);
        const game = (f["Spil"] ?? "").trim().toLowerCase();
        if (!i.user || !game || !(stars >= 1 && stars <= STARS)) return [];
        return [{ game, user: i.user.login, stars, comment: f["Kommentar"] ?? "", date: i.created_at, url: i.html_url }];
      }),
      games: submitted.flatMap((i) => {
        if (!i.labels.some((l) => l.name === "nyt-spil") || !i.user) return [];
        const f = formFields(i.body ?? "");
        const url = https(f["Adresse"] ?? "");
        if (!url || !f["Titel"]) return [];
        return [{
          slug: `c${i.number}`,
          title: f["Titel"],
          developer: { name: f["Udvikler"] || i.user.login, github: i.user.login },
          type: f["Type"] || "Andet",
          url,
          tagline: f["Kort beskrivelse"] ?? "",
          description: f["Beskrivelse"] ?? "",
          cover: https(f["Coverbillede"] ?? "") || undefined,
          date: i.created_at,
          issue: i.html_url,
        }];
      }),
    };
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ repo, at: Date.now(), data }));
    } catch {
      /* fine */
    }
    return data;
  } catch (e) {
    return { ratings: [], games: [], error: (e as Error).message };
  }
}

/** Links that open the issue forms, filled in for this game. */
export const rateUrl = (repo: string, slug: string, title: string) =>
  `https://github.com/${repo}/issues/new?template=bedoem.yml&spil=${encodeURIComponent(slug)}&title=${encodeURIComponent(`Bedømmelse: ${title}`)}`;
export const submitUrl = (repo: string) => `https://github.com/${repo}/issues/new?template=nyt-spil.yml`;
