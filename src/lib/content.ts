type MarkdownModule = {
  Content: unknown;
  frontmatter: ArticleFrontmatter;
  headings?: Array<{ depth: number; slug: string; text: string }>;
};

export type ArticleFrontmatter = {
  schemaVersion: number;
  id: string;
  slug: string;
  title: string;
  dek: string;
  date: string | Date;
  updated: string | Date;
  status: "draft" | "review" | "published" | "archived";
  maturity: "seed" | "sprout" | "evergreen" | "contested" | "superseded";
  topic: string;
  tags: string[];
  summary: string;
  readingTime: string;
  agentArtifact: string;
  sourcePath: string;
};

export type ArticleArtifact = {
  schemaVersion: number;
  id: string;
  slug: string;
  title: string;
  canonicalPath: string;
  sourcePath: string;
  agentBriefPath: string;
  thesis: string;
  status: string;
  maturity: string;
  publishedAt: string;
  updatedAt: string;
  audiences: string[];
  topics: string[];
  claims: Array<{
    id: string;
    claim: string;
    confidence: string;
    status: string;
    evidence: string[];
    counterevidence: string[];
  }>;
  sources: Array<{
    id: string;
    title: string;
    url: string;
    type: string;
    accessed: string;
  }>;
  related: Array<{ type: string; id: string }>;
  agentInstructions: string[];
  humanReview: {
    status: string;
    reviewedAt: string;
    reviewers: string[];
    notes: string;
  };
  contentHash: string;
};

export type Article = ArticleFrontmatter & {
  year: string;
  sourceDir: string;
  canonicalPath: string;
  Content: unknown;
  headings: Array<{ depth: number; slug: string; text: string }>;
  artifact: ArticleArtifact;
  agentBrief: string;
};

const articles = import.meta.glob<MarkdownModule>("../../content/articles/*/*/article.md", {
  eager: true
});

const artifacts = import.meta.glob<ArticleArtifact>("../../content/articles/*/*/artifact.json", {
  eager: true,
  import: "default"
});

const agentBriefs = import.meta.glob<string>("../../content/articles/*/*/agent.md", {
  eager: true,
  query: "?raw",
  import: "default"
});

function sourceDirFromPath(path: string) {
  const match = path.match(/content\/articles\/([^/]+)\/([^/]+)\/article\.md$/);
  if (!match) {
    throw new Error(`Unexpected article path: ${path}`);
  }

  return {
    year: match[1],
    slug: match[2],
    sourceDir: `content/articles/${match[1]}/${match[2]}`
  };
}

function toDateString(value: string | Date) {
  if (value instanceof Date || Object.prototype.toString.call(value) === "[object Date]") {
    return value.toISOString().slice(0, 10);
  }

  return String(value).slice(0, 10);
}

function loadArticles(): Article[] {
  return Object.entries(articles)
    .map(([path, module]) => {
      const { year, slug, sourceDir } = sourceDirFromPath(path);
      const frontmatter = module.frontmatter;
      const artifactPath = path.replace(/article\.md$/, "artifact.json");
      const agentPath = path.replace(/article\.md$/, "agent.md");
      const artifact = artifacts[artifactPath];
      const agentBrief = agentBriefs[agentPath];

      if (!artifact) {
        throw new Error(`Missing artifact for ${path}`);
      }

      if (!agentBrief) {
        throw new Error(`Missing agent brief for ${path}`);
      }

      return {
        ...frontmatter,
        date: toDateString(frontmatter.date),
        updated: toDateString(frontmatter.updated),
        year,
        sourceDir,
        canonicalPath: `/articles/${frontmatter.slug}/`,
        Content: module.Content,
        headings: module.headings ?? [],
        artifact,
        agentBrief
      };
    })
    .sort((left, right) => (left.date < right.date ? 1 : -1));
}

function isPublished(article: Article) {
  return article.status === "published" && article.artifact.status === "published";
}

export function getArticles(options: { includeUnpublished?: boolean } = {}): Article[] {
  const loaded = loadArticles();
  if (options.includeUnpublished) {
    return loaded;
  }

  return loaded.filter(isPublished);
}

export function getArticleBySlug(slug: string) {
  return getArticles().find((article) => article.slug === slug);
}

export function groupArticlesByTopic(articles: Article[]): Map<string, Article[]> {
  const groups = new Map<string, Article[]>();
  for (const article of articles) {
    for (const topic of article.artifact.topics) {
      const current = groups.get(topic) ?? [];
      current.push(article);
      groups.set(topic, current);
    }
  }
  return groups;
}

export function formatTopicLabel(topic: string): string {
  return topic.replaceAll("-", " ");
}

export function getTopicEntries(articles: Article[]): [string, Article[]][] {
  return Array.from(groupArticlesByTopic(articles).entries()).sort(([left], [right]) =>
    left.localeCompare(right)
  );
}

export function getArticlesByTopic(articles: Article[], topic: string): Article[] {
  return articles.filter((article) => article.artifact.topics.includes(topic));
}

export function groupArticlesByYear(articles: Article[]): Map<string, Article[]> {
  const groups = new Map<string, Article[]>();
  for (const article of articles) {
    const year = article.date.slice(0, 4);
    const current = groups.get(year) ?? [];
    current.push(article);
    groups.set(year, current);
  }
  return groups;
}

export function groupArticlesByYearMonth(articles: Article[]): Map<string, Article[]> {
  const groups = new Map<string, Article[]>();
  for (const article of articles) {
    const yearMonth = article.date.slice(0, 7);
    const current = groups.get(yearMonth) ?? [];
    current.push(article);
    groups.set(yearMonth, current);
  }
  return groups;
}

export function getYearEntries(articles: Article[]): [string, Article[]][] {
  return Array.from(groupArticlesByYear(articles).entries()).sort(([left], [right]) =>
    right.localeCompare(left)
  );
}

export function getYearMonthEntries(articles: Article[]): [string, Article[]][] {
  return Array.from(groupArticlesByYearMonth(articles).entries()).sort(([left], [right]) =>
    right.localeCompare(left)
  );
}

export function getMonthName(yearMonth: string): string {
  const [year, month] = yearMonth.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleString("en-US", { month: "long" });
}
