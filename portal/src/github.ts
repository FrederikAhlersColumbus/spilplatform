// The competition's record: ledger.json on the repository's "data" branch. Only the referee workflow
// (.github/workflows/konkurrence.yml) and Frederik write it – ratings checked when they were made (an allowed
// voter, an old enough account, not their own game) and colleagues' games as they read when approved. The
// portal never reads the issues themselves, so editing an issue, extra accounts or a hand-made issue count for
// nothing here. What it reads is still treated as text from strangers: escaped, and addresses checked.

export const STARS = 5;

export interface Rating {
  game: string;
  user: string;
  stars: number;
  comment: string;
  date: string;
  issue?: number;
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
  issue?: number;
}

export interface Community {
  ratings: Rating[];
  games: CommunityGame[];
  /** Set when the record could not be fetched: the page works on without ratings. */
  error?: string;
}

const CACHE_KEY = "platform.ledger.v1";
const CACHE_MS = 60 * 1000;

const https = (u: unknown) => (typeof u === "string" && /^https:\/\/[A-Za-z0-9.-]+(:\d+)?(\/[^\s"'<>]*)?$/.test(u) ? u : "");
const str = (u: unknown, max: number) => (typeof u === "string" ? u.slice(0, max) : "");
const slugOk = (u: unknown): u is string => typeof u === "string" && /^[a-z0-9][a-z0-9-]{0,40}$/.test(u);

/** Keep only well-formed entries, whatever the file holds. */
function sanitize(raw: unknown): Community {
  const r = (raw ?? {}) as { ratings?: unknown[]; games?: unknown[] };
  const ratings = (Array.isArray(r.ratings) ? r.ratings : []).flatMap((x): Rating[] => {
    const v = x as Record<string, unknown>;
    const stars = Number(v.stars);
    if (!slugOk(v.game) || typeof v.user !== "string" || !Number.isInteger(stars) || stars < 1 || stars > STARS) return [];
    return [{ game: v.game, user: str(v.user, 39), stars, comment: str(v.comment, 600), date: str(v.date, 40), issue: Number(v.issue) || undefined }];
  });
  const games = (Array.isArray(r.games) ? r.games : []).flatMap((x): CommunityGame[] => {
    const v = x as Record<string, unknown>;
    const dev = (v.developer ?? {}) as Record<string, unknown>;
    const url = https(v.url);
    if (!slugOk(v.slug) || !url || typeof v.title !== "string" || typeof dev.github !== "string") return [];
    return [{
      slug: v.slug, title: str(v.title, 60), url, type: str(v.type, 30) || "Andet",
      developer: { name: str(dev.name, 60) || dev.github, github: str(dev.github, 39) },
      tagline: str(v.tagline, 140), description: str(v.description, 2000), cover: https(v.cover) || undefined,
      date: str(v.date, 40), issue: Number(v.issue) || undefined,
    }];
  });
  return { ratings, games };
}

export async function loadCommunity(repo: string | undefined): Promise<Community> {
  if (!repo) return { ratings: [], games: [] };
  try {
    const hit = JSON.parse(sessionStorage.getItem(CACHE_KEY) ?? "null");
    if (hit && hit.repo === repo && Date.now() - hit.at < CACHE_MS) return sanitize(hit.data);
  } catch {
    /* no cache */
  }
  try {
    const res = await fetch(`https://raw.githubusercontent.com/${repo}/data/ledger.json?t=${Math.floor(Date.now() / CACHE_MS)}`, { cache: "no-cache" });
    if (!res.ok) throw new Error(`GitHub svarede ${res.status}`);
    const data = await res.json();
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ repo, at: Date.now(), data }));
    } catch {
      /* fine */
    }
    return sanitize(data);
  } catch (e) {
    return { ratings: [], games: [], error: (e as Error).message };
  }
}

/** Links that open the issue forms, filled in for this game. */
export const rateUrl = (repo: string, slug: string, title: string) =>
  `https://github.com/${repo}/issues/new?template=bedoem.yml&spil=${encodeURIComponent(slug)}&title=${encodeURIComponent(`Bedømmelse: ${title}`)}`;
export const submitUrl = (repo: string) => `https://github.com/${repo}/issues/new?template=nyt-spil.yml`;
export const issueUrl = (repo: string, n: number) => `https://github.com/${repo}/issues/${n}`;
