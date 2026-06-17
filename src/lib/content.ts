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
