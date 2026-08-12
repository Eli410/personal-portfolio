import { useEffect, useState } from "react";
import "../../styles/github-projects.css";

const GITHUB_USERNAME = "Eli410";
const PINNED_REPOS_URL = `https://pinned.berrysauce.dev/get/${GITHUB_USERNAME}`;
const GITHUB_API_URL = "https://api.github.com/repos";
const CACHE_KEY = `github-pinned-projects:${GITHUB_USERNAME}:v1`;
const CACHE_MAX_AGE = 15 * 60 * 1000;
const MAX_PINNED_REPOSITORIES = 6;
const FALLBACK_PINS = [
  { author: "Eli410", name: "AggieClassAlert" },
  { author: "Eli410", name: "Instant-Karaoke" },
  { author: "Maroon-Rides", name: "MaroonRides" },
  { author: "Marginally-Better-Apps", name: "MB-converter" },
  { author: "Marginally-Better-Apps", name: "MB-tuner" },
];

const numberFormatter = new Intl.NumberFormat("en", { notation: "compact" });
const relativeTimeFormatter = new Intl.RelativeTimeFormat("en", {
  numeric: "auto",
});

function formatRelativeDate(dateValue) {
  if (!dateValue) return null;

  const timestamp = new Date(dateValue).getTime();
  if (Number.isNaN(timestamp)) return null;

  const elapsedSeconds = Math.round((timestamp - Date.now()) / 1000);
  const intervals = [
    ["year", 60 * 60 * 24 * 365],
    ["month", 60 * 60 * 24 * 30],
    ["week", 60 * 60 * 24 * 7],
    ["day", 60 * 60 * 24],
    ["hour", 60 * 60],
    ["minute", 60],
  ];

  for (const [unit, seconds] of intervals) {
    if (Math.abs(elapsedSeconds) >= seconds) {
      return relativeTimeFormatter.format(
        Math.round(elapsedSeconds / seconds),
        unit,
      );
    }
  }

  return "just now";
}

function readCache() {
  if (typeof window === "undefined") return null;

  try {
    const cached = JSON.parse(window.localStorage.getItem(CACHE_KEY));
    if (!cached || !Array.isArray(cached.repositories) || !cached.savedAt) {
      return null;
    }

    const repositories = cached.repositories
      .map(normalizeCachedRepository)
      .filter(Boolean)
      .slice(0, MAX_PINNED_REPOSITORIES);
    if (!repositories.length) return null;

    return {
      repositories,
      savedAt: cached.savedAt,
      quality: cached.quality === "ready" ? "ready" : "partial",
      fresh: Date.now() - cached.savedAt < CACHE_MAX_AGE,
    };
  } catch {
    return null;
  }
}

function writeCache(repositories, quality) {
  try {
    window.localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ repositories, quality, savedAt: Date.now() }),
    );
  } catch {
    // A private browsing setting can disable storage. Live data still renders.
  }
}

function isValidRepoPart(value) {
  return typeof value === "string" && /^[A-Za-z0-9_.-]+$/.test(value);
}

function cleanText(value, fallback = null) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function cleanLanguageColor(value) {
  return typeof value === "string" && /^#[0-9A-Fa-f]{6}$/.test(value)
    ? value
    : "#94a3b8";
}

function normalizePin(pin) {
  if (!isValidRepoPart(pin?.author) || !isValidRepoPart(pin?.name)) {
    return null;
  }

  return {
    owner: pin.author,
    name: pin.name,
    fullName: `${pin.author}/${pin.name}`,
    url: `https://github.com/${pin.author}/${pin.name}`,
    description: cleanText(pin.description, "Explore this project on GitHub."),
    language: cleanText(pin.language),
    languageColor: cleanLanguageColor(pin.languageColor),
    stars: Number(pin.stars) || 0,
    forks: Number(pin.forks) || 0,
    topics: [],
    pushedAt: null,
    archived: false,
    metadataStatus: "fallback",
  };
}

function normalizeCachedRepository(repository) {
  const normalized = normalizePin({
    author: repository?.owner,
    name: repository?.name,
    description: repository?.description,
    language: repository?.language,
    languageColor: repository?.languageColor,
    stars: repository?.stars,
    forks: repository?.forks,
  });
  if (!normalized) return null;

  return {
    ...normalized,
    topics: Array.isArray(repository.topics)
      ? repository.topics.filter((topic) => typeof topic === "string").slice(0, 3)
      : [],
    pushedAt: cleanText(repository.pushedAt),
    archived: Boolean(repository.archived),
    metadataStatus: repository.metadataStatus === "live" ? "live" : "fallback",
  };
}

async function fetchJson(url, signal) {
  const response = await fetch(url, {
    signal,
    referrerPolicy: "no-referrer",
    headers: { Accept: "application/vnd.github+json" },
  });

  if (!response.ok) {
    throw new Error(`GitHub request failed with ${response.status}`);
  }

  return response.json();
}

async function loadPinnedRepositories(signal) {
  let pins = [];
  let pinMembershipIsLive = true;

  try {
    const pinsResponse = await fetch(PINNED_REPOS_URL, {
      signal,
      referrerPolicy: "no-referrer",
    });
    if (!pinsResponse.ok) {
      throw new Error(`Pinned repositories request failed with ${pinsResponse.status}`);
    }

    const pinsPayload = await pinsResponse.json();
    pins = (Array.isArray(pinsPayload) ? pinsPayload : [])
      .map(normalizePin)
      .filter(Boolean)
      .slice(0, MAX_PINNED_REPOSITORIES);
    if (!pins.length) throw new Error("No pinned repositories were returned");
  } catch (error) {
    if (error?.name === "AbortError") throw error;
    pins = FALLBACK_PINS.map(normalizePin).filter(Boolean);
    pinMembershipIsLive = false;
  }

  const results = await Promise.all(
    pins.map(async (pin) => {
      try {
        const details = await fetchJson(
          `${GITHUB_API_URL}/${encodeURIComponent(pin.owner)}/${encodeURIComponent(pin.name)}`,
          signal,
        );

        const owner = isValidRepoPart(details.owner?.login) ? details.owner.login : pin.owner;
        const name = isValidRepoPart(details.name) ? details.name : pin.name;
        const language = cleanText(details.language, pin.language);

        return {
          ...pin,
          owner,
          name,
          fullName: `${owner}/${name}`,
          url: `https://github.com/${owner}/${name}`,
          description: cleanText(details.description, pin.description),
          language,
          languageColor: language === pin.language ? pin.languageColor : "#94a3b8",
          stars: Number(details.stargazers_count) || 0,
          forks: Number(details.forks_count) || 0,
          topics: Array.isArray(details.topics)
            ? details.topics.filter((topic) => typeof topic === "string").slice(0, 3)
            : [],
          pushedAt: cleanText(details.pushed_at),
          archived: Boolean(details.archived),
          metadataStatus: "live",
        };
      } catch (error) {
        if (error?.name === "AbortError") throw error;
        return pin;
      }
    }),
  );

  const metadataIsLive = results.every(
    (repository) => repository.metadataStatus === "live",
  );

  return {
    repositories: results,
    quality: pinMembershipIsLive && metadataIsLive ? "ready" : "partial",
  };
}

function LoadingCards() {
  return (
    <div
      className="github-projects__grid"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading pinned projects"
    >
      {[0, 1, 2, 3].map((item) => (
        <div className="github-project-card github-project-card--loading" key={item}>
          <span className="github-project-card__skeleton github-project-card__skeleton--icon" />
          <span className="github-project-card__skeleton github-project-card__skeleton--title" />
          <span className="github-project-card__skeleton github-project-card__skeleton--text" />
          <span className="github-project-card__skeleton github-project-card__skeleton--text-short" />
        </div>
      ))}
    </div>
  );
}

function ProjectCard({ repository }) {
  const pushedRelative = formatRelativeDate(repository.pushedAt);
  const activityLabel = repository.metadataStatus !== "live"
    ? "Latest activity unavailable"
    : pushedRelative
      ? `Pushed ${pushedRelative}`
      : "No pushes yet";

  return (
    <a
      className="github-project-card"
      href={repository.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`View ${repository.fullName} on GitHub`}
    >
      <div className="github-project-card__topline">
        <span className="github-project-card__icon" aria-hidden="true">
          <img src="/icons/github.svg" alt="" width="22" height="22" />
        </span>
        <span
          className={`github-project-card__state${repository.archived ? " github-project-card__state--archived" : ""}`}
        >
          <span className="github-project-card__state-dot" aria-hidden="true" />
          {repository.archived ? "Archived" : "Public"}
        </span>
      </div>

      <div className="github-project-card__identity">
        <span>{repository.owner} /</span>
        <h3>{repository.name}</h3>
      </div>

      <p className="github-project-card__description">{repository.description}</p>

      <div className="github-project-card__tags" aria-label="Repository details">
        {repository.language && (
          <span className="github-project-card__language">
            <span
              className="github-project-card__language-dot"
              style={{ "--language-color": repository.languageColor }}
              aria-hidden="true"
            />
            {repository.language}
          </span>
        )}
        {repository.topics.map((topic) => (
          <span className="github-project-card__topic" key={topic}>
            {topic}
          </span>
        ))}
      </div>

      <div className="github-project-card__footer">
        <div className="github-project-card__stats">
          <span title={`${repository.stars} stars`}>
            <span aria-hidden="true">★</span> {numberFormatter.format(repository.stars)}
          </span>
          <span title={`${repository.forks} forks`}>
            Forks {numberFormatter.format(repository.forks)}
          </span>
        </div>
        <span className="github-project-card__activity">
          {activityLabel}
        </span>
        <span className="github-project-card__arrow" aria-hidden="true">↗</span>
      </div>
    </a>
  );
}

export default function GitHubProjects() {
  const [repositories, setRepositories] = useState([]);
  const [state, setState] = useState("loading");

  useEffect(() => {
    const controller = new AbortController();
    const cached = readCache();

    if (cached?.repositories.length) {
      setRepositories(cached.repositories);
      setState(cached.fresh ? cached.quality : "refreshing");
      if (cached.fresh && cached.quality === "ready") {
        return () => controller.abort();
      }
    }

    loadPinnedRepositories(controller.signal)
      .then(({ repositories: nextRepositories, quality }) => {
        setRepositories(nextRepositories);
        setState(quality);
        writeCache(nextRepositories, quality);
      })
      .catch((error) => {
        if (error?.name !== "AbortError") {
          setState(cached?.repositories.length ? "stale" : "error");
        }
      });

    return () => controller.abort();
  }, []);

  if (!repositories.length && state === "loading") {
    return <LoadingCards />;
  }

  if (!repositories.length && state === "error") {
    return (
      <div className="github-projects__error" role="status">
        <p>GitHub is taking a little longer to respond.</p>
        <a href={`https://github.com/${GITHUB_USERNAME}`} target="_blank" rel="noopener noreferrer">
          View my pinned projects on GitHub ↗
        </a>
      </div>
    );
  }

  return (
    <div className="github-projects">
      <div className="github-projects__grid">
        {repositories.map((repository) => (
          <ProjectCard repository={repository} key={repository.fullName} />
        ))}
      </div>
    </div>
  );
}
