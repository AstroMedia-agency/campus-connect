// Pulls commit history for a repo from the public GitHub REST API and maps
// commits authored by known team members (matched by github_username) into
// activity_log-shaped records. No auth needed for public repos; GitHub's
// unauthenticated rate limit (60 req/hour) is plenty for a class demo.

export type GithubCommit = {
  sha: string;
  message: string;
  authorLogin: string | null;
  date: string;
};

export async function fetchRecentCommits(repo: string, perPage = 50): Promise<GithubCommit[]> {
  const url = `https://api.github.com/repos/${repo}/commits?per_page=${perPage}`;
  const res = await fetch(url, {
    headers: { Accept: "application/vnd.github+json" },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub API error (${res.status}): ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  return (data as any[]).map((c) => ({
    sha: c.sha,
    message: c.commit?.message?.split("\n")[0] || "",
    authorLogin: c.author?.login || null,
    date: c.commit?.author?.date || c.commit?.committer?.date,
  }));
}

/**
 * Very rough "active minutes" estimate: each commit counts as 20 minutes of
 * work by default. This is a stand-in heuristic — a real IDE extension would
 * measure actual editor-focus time instead. Good enough to make the
 * contribution report reflect real commit frequency rather than nothing.
 */
export const MINUTES_PER_COMMIT = 20;
