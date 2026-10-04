import { Router, type IRouter } from "express";
import {
  FindResearchSourcesBody,
  FindResearchSourcesResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

type EuropePmcArticle = {
  title?: string;
  authorString?: string;
  journalInfo?: {
    journal?: {
      title?: string;
    };
  };
  journalTitle?: string;
  firstPublicationDate?: string;
  pubYear?: string;
  doi?: string;
  pmid?: string;
  pmcid?: string;
  abstractText?: string;
};

type EuropePmcResponse = {
  resultList?: {
    result?: EuropePmcArticle[];
  };
};

type CrossrefDate = {
  "date-parts"?: number[][];
};

type CrossrefWork = {
  DOI?: string;
  title?: string[];
  author?: Array<{ given?: string; family?: string }>;
  published?: CrossrefDate;
  "published-print"?: CrossrefDate;
  "published-online"?: CrossrefDate;
  URL?: string;
  type?: string;
  "container-title"?: string[];
  publisher?: string;
  abstract?: string;
};

type CrossrefResponse = {
  message?: {
    items?: CrossrefWork[];
  };
};

function cleanText(value: string | undefined): string | null {
  if (!value) return null;
  const text = value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > 7000 ? `${text.slice(0, 6999)}…` : text || null;
}

function safeDoi(value: string | undefined): string | null {
  if (!value) return null;
  const doi = value.trim().replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "");
  return /^10\.\d{4,9}\/\S+$/i.test(doi) ? doi : null;
}

function safeHttpUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function yearFromDate(date?: CrossrefDate): string | null {
  const parts = date?.["date-parts"]?.[0];
  if (!parts?.[0]) return null;
  const [year, month, day] = parts;
  return [year, month, day].filter(Boolean).join("-");
}

function credibility(
  doi: string | null,
  organization: string,
  publishedDate: string | null,
  author: string | null,
): "high" | "medium" {
  return doi && publishedDate && author && organization ? "high" : "medium";
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "ResearchRescueAI/1.0 (student research discovery)",
    },
    signal: AbortSignal.timeout(12_000),
  });

  if (!response.ok) {
    throw new Error(`Search provider returned HTTP ${response.status}`);
  }

  return (await response.json()) as T;
}

function fromEuropePmc(article: EuropePmcArticle) {
  const doi = safeDoi(article.doi);
  const pmcid = article.pmcid?.replace(/^PMC/i, "");
  const url =
    (pmcid && `https://europepmc.org/articles/PMC${pmcid}`) ||
    (article.pmid && `https://europepmc.org/article/MED/${encodeURIComponent(article.pmid)}`) ||
    (doi && `https://doi.org/${doi}`);
  if (!url) return null;

  const organization =
    article.journalInfo?.journal?.title ??
    article.journalTitle ??
    "Europe PMC indexed record";
  const author = article.authorString?.trim() || null;
  const publishedDate =
    article.firstPublicationDate?.trim() || article.pubYear?.trim() || null;
  return {
    id: doi ?? `epmc:${article.pmid ?? article.pmcid ?? url}`,
    title: cleanText(article.title) ?? "Untitled indexed article",
    organization,
    url,
    author,
    publishedDate,
    abstract: cleanText(article.abstractText),
    sourceType: "Europe PMC indexed article",
    doi,
    credibility: credibility(doi, organization, publishedDate, author),
  };
}

function fromCrossref(work: CrossrefWork) {
  const doi = safeDoi(work.DOI);
  const url = (doi && `https://doi.org/${doi}`) || safeHttpUrl(work.URL);
  if (!url) return null;

  const organization =
    work["container-title"]?.[0] ?? work.publisher ?? "Crossref indexed record";
  const authorNames =
    work.author
      ?.map((author) => [author.given, author.family].filter(Boolean).join(" "))
      .filter(Boolean) ?? [];
  const author =
    authorNames.length > 1
      ? `${authorNames[0]} et al.`
      : authorNames[0] || null;
  const publishedDate =
    yearFromDate(work.published) ??
    yearFromDate(work["published-print"]) ??
    yearFromDate(work["published-online"]);
  return {
    id: doi ?? `crossref:${url}`,
    title: cleanText(work.title?.[0]) ?? "Untitled indexed work",
    organization,
    url,
    author,
    publishedDate,
    abstract: cleanText(work.abstract),
    sourceType: work.type
      ? `Crossref indexed ${work.type.replace(/-/g, " ")}`
      : "Crossref indexed record",
    doi,
    credibility: credibility(doi, organization, publishedDate, author),
  };
}

router.get("/research/status", (_req, res): void => {
  res.json({
    aiAvailable: false,
    aiProvider: "Gemini setup required",
    searchAvailable: true,
    searchProvider: "Europe PMC and Crossref",
  });
});

router.post("/research/search", async (req, res): Promise<void> => {
  const parsed = FindResearchSourcesBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { question, limit } = parsed.data;
  const encodedQuestion = encodeURIComponent(question);
  const europePmcUrl =
    "https://www.ebi.ac.uk/europepmc/webservices/rest/search" +
    `?query=${encodedQuestion}&format=json&pageSize=${limit}&resultType=core`;
  const crossrefUrl = new URL("https://api.crossref.org/works");
  crossrefUrl.searchParams.set("query.bibliographic", question);
  crossrefUrl.searchParams.set("rows", String(limit));
  crossrefUrl.searchParams.set(
    "select",
    "DOI,title,author,published,published-print,published-online,URL,type,container-title,publisher,abstract",
  );

  const [europePmcResult, crossrefResult] = await Promise.allSettled([
    fetchJson<EuropePmcResponse>(europePmcUrl),
    fetchJson<CrossrefResponse>(crossrefUrl.toString()),
  ]);

  const providers: string[] = [];
  const records: Array<ReturnType<typeof fromEuropePmc> | ReturnType<typeof fromCrossref>> =
    [];

  if (europePmcResult.status === "fulfilled") {
    providers.push("Europe PMC");
    records.push(
      ...(europePmcResult.value.resultList?.result ?? []).map(fromEuropePmc),
    );
  }
  if (crossrefResult.status === "fulfilled") {
    providers.push("Crossref");
    records.push(
      ...(crossrefResult.value.message?.items ?? []).map(fromCrossref),
    );
  }

  if (providers.length === 0) {
    req.log.warn("Both scholarly search providers were unavailable");
    res.status(502).json({
      error:
        "Scholarly search is temporarily unavailable. Please try again shortly.",
    });
    return;
  }

  const unique = new Map<
    string,
    NonNullable<(typeof records)[number]>
  >();
  for (const record of records) {
    if (!record) continue;
    const key = (record.doi ?? record.url).toLowerCase();
    const existing = unique.get(key);
    if (!existing || (!existing.abstract && record.abstract)) {
      unique.set(key, record);
    }
  }

  const warning =
    providers.length < 2
      ? "One scholarly index could not be reached; results may be less complete."
      : null;
  const response = FindResearchSourcesResponse.parse({
    sources: [...unique.values()].slice(0, limit),
    providers,
    searchedAt: new Date().toISOString(),
    warning,
  });
  res.json(response);
});

export default router;