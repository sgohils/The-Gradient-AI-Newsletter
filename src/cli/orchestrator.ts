import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { loadConfig } from '../config';
import { fetchArticles } from '../fetcher/fetcher';
import { curate } from '../curator';
import { summarizeArticle } from '../summarizer';
import { buildMarkdown, buildHtml, publish } from '../publisher';
import { buildNewsletterHtml, buildNewsletterText, sendEmail } from '../mailer';
import { getResendSubscribers } from '../mailer';
import { Article, NewsletterIssue, Source } from '../types';
import type { Config } from '../config';

export interface CliOptions {
  sources?: string[];
  outputDir?: string;
  dryRun: boolean;
}

export interface OrchestratorResult {
  mdPath: string;
  htmlPath: string;
  issuesPublished: number;
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = { dryRun: false };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === '--sources' && i + 1 < argv.length) {
      options.sources = argv[++i].split(',').map((s) => s.trim()).filter(Boolean);
    } else if (arg === '--output-dir' && i + 1 < argv.length) {
      options.outputDir = argv[++i];
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    }
  }

  return options;
}

function printUsage(): void {
  console.log(`Usage: npm run dev [options]

Options:
  --sources <ids>     Comma-separated source IDs to limit fetching (e.g. --sources openai-blog,arxiv-csai)
  --output-dir <dir>  Directory to write newsletter files (default: posts or config.json value)
  --dry-run           Run the full pipeline but skip writing files to disk
  --help, -h          Show this help message`);
}

function validateSources(sourceIds: string[], config: Config): Source[] {
  const validIds = new Set(config.sources.map((s) => s.id));
  const invalid = sourceIds.filter((id) => !validIds.has(id));

  if (invalid.length > 0) {
    throw new Error(`Unknown source IDs: ${invalid.join(', ')}. Available: ${Array.from(validIds).join(', ')}`);
  }

  return config.sources.filter((s) => sourceIds.includes(s.id));
}

function buildIssue(articles: Article[], summaries: { article: Article; summary: { headline: string; intro: string; body: string; sourceUrl: string } }[]): NewsletterIssue {
  const now = new Date();
  const date = now.toISOString().split('T')[0];
  const tags = Array.from(new Set(articles.map((a) => a.category).filter((c): c is string => !!c)));
  const intro = summaries[0]?.summary.intro || `The Gradient — ${date}`;

  return {
    id: `gradient-${date}`,
    title: `The Gradient — ${date}`,
    date,
    intro,
    articles: summaries.map((item) => ({
      ...item.article,
      description: item.summary.body,
    })),
    tags,
    featuredImageUrl: undefined,
  };
}

export async function runPipeline(cliOptions: CliOptions): Promise<OrchestratorResult> {
  console.log('Starting The Gradient pipeline...');

  const config = loadConfig();
  const outputDir = cliOptions.outputDir || config.outputDir || 'posts';

  let effectiveSources = config.sources;

  if (cliOptions.sources && cliOptions.sources.length > 0) {
    effectiveSources = validateSources(cliOptions.sources, config);
  }

  console.log(`[1/5] Fetching articles from ${effectiveSources.length} sources...`);
  let articles: Article[];

  try {
    articles = await fetchArticles({ sources: effectiveSources });
  } catch (error) {
    console.error('Fetcher failed:', error);
    process.exitCode = 1;
    throw error;
  }

  console.log(`  Fetched ${articles.length} articles`);

  console.log('[2/5] Curating top stories...');
  const curated = curate(articles);

  if (curated.length === 0) {
    console.warn('No stories met the curation threshold. Nothing to publish.');
    process.exitCode = 0;
    return { mdPath: '', htmlPath: '', issuesPublished: 0 };
  }

  console.log(`  Selected ${curated.length} stories`);

  console.log('[3/5] Generating summaries...');
  const summaries = await Promise.all(
    curated.map(async (article) => {
      try {
        const summary = await summarizeArticle(article, {
          groqApiKey: config.groqApiKey,
          groqModel: config.groqModel,
          groqTemperature: config.groqTemperature,
          openaiApiKey: config.openaiApiKey,
          openaiModel: config.openaiModel,
          openaiTemperature: config.openaiTemperature,
        });
        return { article, summary };
      } catch (error) {
        console.warn(`  Failed to summarize "${article.title}":`, error);
        const fallbackSummary = await summarizeArticle(article);
        return { article, summary: fallbackSummary };
      }
    })
  );

  console.log(`  Summarized ${summaries.length} articles`);

  console.log('[4/5] Building newsletter issue...');
  const issue = buildIssue(curated, summaries);

  console.log('[5/5] Publishing newsletter...');
  let mdPath = '';
  let htmlPath = '';

  if (cliOptions.dryRun) {
    const dryRunDir = fs.mkdtempSync(path.join(os.tmpdir(), 'the-gradient-dry-run-'));
    const markdown = buildMarkdown(issue);
    const html = buildHtml(issue);

    fs.writeFileSync(path.join(dryRunDir, `${issue.date}.md`), markdown, 'utf-8');
    fs.writeFileSync(path.join(dryRunDir, `${issue.date}.html`), html, 'utf-8');

    mdPath = path.join(dryRunDir, `${issue.date}.md`);
    htmlPath = path.join(dryRunDir, `${issue.date}.html`);

    console.log(`  Dry-run complete. Files written to: ${dryRunDir}`);
  } else {
    const result = await publish(issue, {
      outputDir,
      generateFeaturedImage: config.imageGeneration?.enabled ?? true,
      imageModel: config.imageGeneration?.model,
      apiKey: config.pixazApiKey,
    });
    mdPath = result.mdPath;
    htmlPath = result.htmlPath;
    console.log(`  Published to: ${mdPath}, ${htmlPath}`);
    if (result.featuredImageUrl) {
      console.log(`  Featured image: ${result.featuredImageUrl}`);
    }
  }

  console.log('[6/6] Sending newsletter to subscribers...');
  const subscribers = await getResendSubscribers();
  if (subscribers.length > 0 && config.mailer.resendApiKey) {
    const htmlContent = buildNewsletterHtml(issue);
    const textContent = buildNewsletterText(issue);
    const baseUrl = process.env.NEWSLETTER_BASE_URL || 'https://gradientnews.app';
    const unsubscribeUrl = (email: string, token: string) =>
      `${baseUrl}/api/unsubscribe?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;

    const sendPromises = subscribers.map(async (subscriber) => {
      try {
        const personalizedHtml = htmlContent.replace(/\{\{unsubscribe_url\}\}/g, unsubscribeUrl(subscriber.email, subscriber.token));
        const personalizedText = textContent.replace(/\{\{unsubscribe_url\}\}/g, unsubscribeUrl(subscriber.email, subscriber.token));
        await sendEmail({
          to: [subscriber.email],
          subject: issue.title,
          html: personalizedHtml,
          text: personalizedText,
        });
      } catch (error) {
        console.warn(`  Failed to send to ${subscriber.email}:`, error);
      }
    });

    await Promise.all(sendPromises);
    console.log(`  Sent to ${subscribers.length} subscriber(s)`);
  } else if (subscribers.length > 0 && !config.mailer.resendApiKey) {
    console.warn('  Skipping email: RESEND_API_KEY is not set');
  } else {
    console.log('  No active subscribers');
  }

  console.log('Pipeline completed successfully.');
  return { mdPath, htmlPath, issuesPublished: 1 };
}

export async function main(): Promise<void> {
  const options = parseArgs(process.argv);

  try {
    const result = await runPipeline(options);

    if (result.issuesPublished > 0) {
      console.log(`Output: ${result.mdPath} | ${result.htmlPath}`);
      process.exitCode = 0;
    } else {
      process.exitCode = 0;
    }
  } catch (error) {
    console.error('Pipeline failed:', error);
    process.exitCode = 1;
  }
}
