import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const liveJobInput = z.object({
  jobs: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(120),
        company: z.string().trim().min(1).max(120),
        location: z.string().trim().max(120),
      }),
    )
    .min(1)
    .max(4),
});

const ALLOWED_JOB_HOSTS = [
  "linkedin.com",
  "indeed.com",
  "greenhouse.io",
  "lever.co",
  "ashbyhq.com",
  "wellfound.com",
  "workable.com",
];

export type LiveJobPosting = {
  id: string;
  title: string;
  company: string;
  location: string;
  source: string;
  url: string;
  description: string;
  matchedRole: string;
};

type SearchResult = {
  url?: string;
  title?: string;
  description?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getResults(payload: unknown): SearchResult[] {
  if (Array.isArray(payload)) return payload.filter(isRecord) as SearchResult[];
  if (!isRecord(payload)) return [];

  const data = payload.data;
  if (Array.isArray(data)) return data.filter(isRecord) as SearchResult[];
  if (isRecord(data) && Array.isArray(data.data)) {
    return data.data.filter(isRecord) as SearchResult[];
  }
  return [];
}

function getSource(hostname: string) {
  const host = hostname.replace(/^www\./, "");
  if (host.includes("linkedin")) return "LinkedIn";
  if (host.includes("indeed")) return "Indeed";
  if (host.includes("greenhouse")) return "Greenhouse";
  if (host.includes("lever")) return "Lever";
  if (host.includes("ashbyhq")) return "Ashby";
  if (host.includes("wellfound")) return "Wellfound";
  return "Workable";
}

function isAllowedJobUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && ALLOWED_JOB_HOSTS.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
}

function cleanQueryPart(value: string) {
  return value.replace(/["']/g, "").replace(/\s+/g, " ").trim().slice(0, 90);
}

function buildSearchQuery(job: z.infer<typeof liveJobInput>["jobs"][number]) {
  const title = cleanQueryPart(job.title);
  const company = cleanQueryPart(job.company);
  const location = cleanQueryPart(job.location);
  return `"${title}" "${company}" ${location} jobs (site:linkedin.com/jobs OR site:indeed.com/viewjob OR site:boards.greenhouse.io OR site:jobs.lever.co OR site:jobs.ashbyhq.com)`;
}

export const getLiveJobPostings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => liveJobInput.parse(input))
  .handler(async ({ data }) => {
    const lovableApiKey = process.env["LOVABLE_API_KEY"];
    const firecrawlApiKey = process.env["FIRECRAWL_API_KEY"];
    if (!lovableApiKey || !firecrawlApiKey) {
      throw new Error("Live job search is not configured yet.");
    }

    const searches = await Promise.allSettled(
      data.jobs.slice(0, 3).map(async (job) => {
        const response = await fetch("https://connector-gateway.lovable.dev/firecrawl/v2/search", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableApiKey}`,
            "X-Connection-Api-Key": firecrawlApiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: buildSearchQuery(job),
            limit: 8,
            scrapeOptions: { formats: ["markdown"] },
          }),
        });

        const body = await response.text();
        let payload: unknown = null;
        try {
          payload = JSON.parse(body) as unknown;
        } catch {
          payload = null;
        }

        if (!response.ok) {
          const providerMessage = isRecord(payload) && typeof payload.error === "string" ? payload.error : "provider error";
          console.error(`Live job search failed [${response.status}]: ${providerMessage.slice(0, 300)}`);
          throw new Error(`Live job search unavailable (${response.status}).`);
        }

        return { job, results: getResults(payload) };
      }),
    );

    const fulfilled = searches.flatMap((search) => (search.status === "fulfilled" ? [search.value] : []));
    if (fulfilled.length === 0) {
      const failed = searches.find((search) => search.status === "rejected");
      throw failed?.reason instanceof Error ? failed.reason : new Error("Live job search unavailable.");
    }

    const seen = new Set<string>();
    const postings: LiveJobPosting[] = [];
    for (const search of fulfilled) {
      for (const result of search.results) {
        const url = result.url?.trim();
        if (!url || !isAllowedJobUrl(url) || seen.has(url)) continue;

        try {
          const parsedUrl = new URL(url);
          seen.add(url);
          postings.push({
            id: `${search.job.title}-${parsedUrl.hostname}-${parsedUrl.pathname}`,
            title: result.title?.trim() || search.job.title,
            company: search.job.company,
            location: search.job.location || "See listing",
            source: getSource(parsedUrl.hostname),
            url,
            description: result.description?.trim() || "Open the listing for requirements, location and application details.",
            matchedRole: search.job.title,
          });
        } catch {
          // Search results are external input; invalid URLs are ignored.
        }
      }
    }

    return postings.slice(0, 12);
  });