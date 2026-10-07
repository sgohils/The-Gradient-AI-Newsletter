import axios, { AxiosRequestConfig } from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as cheerio from 'cheerio';
import { VisualAsset, VisualCandidate, VideoStory } from './types';
import { fileSha256, readJson, sha256, writeJson } from './storage';
import { discoverSourceMedia, requirePublicUrl } from './source-media';

type Client = { get: (url: string, config?: AxiosRequestConfig) => Promise<{ data: any; headers?: Record<string, string> }> };
export const VISUAL_SEARCH_LIMIT = 12;
const agent = 'TheGradientVideo/1.0 (https://github.com/sgohils/The-Gradient-AI-Newsletter)';
const plain = (value: string) => cheerio.load(value || '').root().text().replace(/\s+/g, ' ').trim();

export function allowedLicense(name: string, url: string): boolean {
  try {
  const parsed = new URL(url);
  if (!['https:', 'http:'].includes(parsed.protocol) || parsed.hostname !== 'creativecommons.org') return false;
  return /^(?:Public domain|CC0|CC BY(?: [\d.]+)?)$/i.test(name) &&
    /^\/(?:publicdomain\/(?:zero|mark)\/1\.0|licenses\/by\/\d\.\d)(?:\/|$)/.test(parsed.pathname);
  } catch { return false; }
}

export function visualTopic(story: VideoStory): string {
  // A passing mention of remote servers must not turn a software story into
  // a data-center story. The named subject takes precedence over context.
  if (/\b(software|toolkit|document search|coding|chatbot\w*|language models?|LLMs?|prompts?|APIs?)\b/i.test(story.title) &&
      !/\b(chips?|GPUs?|data centers?|supercomputers?|robot\w*)\b/i.test(story.title)) return 'computers';
  const text = `${story.title} ${story.sourceExcerpt}`;
  if (/\b(robot\w*|humanoid|rover)\b/i.test(text)) return 'robotics';
  if (/\b(students?|schools?|education|teachers?|classrooms?)\b/i.test(text)) return 'education';
  if (/\b(chips?|GPUs?|data centers?|servers?|compute|supercomputers?)\b/i.test(text)) return 'data-centers';
  if (/\b(workers?|employees?|workplaces?|offices?)\b/i.test(text)) return 'workplaces';
  if (/\b(code|coding|toolkit|software|language models?|LLMs?|prompts?|APIs?|chatbots?)\b/i.test(text)) return 'computers';
  if (/\b(research|study|paper|scientists?|experiments?)\b/i.test(text)) return 'research';
  return 'computers';
}

export function readLibrary(root = 'assets/video/library'): (VisualAsset & { topic: string })[] {
  const catalog = readJson(path.join(root, 'catalog.json')) as { version: number; assets: (VisualAsset & { topic: string })[] };
  if (catalog.version !== 1 || !Array.isArray(catalog.assets) || catalog.assets.length < 6) throw new Error('The bundled real photograph library is missing.');
  return catalog.assets.map(asset => {
    const file = path.resolve(root, asset.file);
    if (path.dirname(file) !== path.resolve(root) || !allowedLicense(asset.license, asset.licenseUrl) ||
        fileSha256(file) !== asset.sha256) throw new Error('The photograph library has a damaged file or unsupported license.');
    return { ...asset, file };
  });
}

function allowedMediaUrl(url: string, extraHosts: string[] = []): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && !parsed.username && !parsed.password && (!parsed.port || parsed.port === '443') &&
      ['upload.wikimedia.org', 'images.pexels.com', 'videos.pexels.com', ...extraHosts].includes(parsed.hostname);
  } catch { return false; }
}

function sameSourceHost(url: string, sourceUrl: string): boolean {
  try { return new URL(url).protocol === 'https:' && new URL(url).hostname === new URL(sourceUrl).hostname; }
  catch { return false; }
}

/** Cache files are disposable. Submitted edition media lives outside this cache. */
export function pruneVisualCache(root: string, maximumBytes = 100 * 1024 * 1024, now = Date.now()): void {
  const files = fs.readdirSync(root).filter(name => /^[a-f0-9]{64}\.(bin|mp4)$/.test(name)).map(name => {
    const file = path.join(root, name); const stat = fs.lstatSync(file);
    return { file, stat };
  }).filter(item => item.stat.isFile() && !item.stat.isSymbolicLink()).sort((a, b) => a.stat.mtimeMs - b.stat.mtimeMs);
  let bytes = files.reduce((sum, item) => sum + item.stat.size, 0);
  for (const item of files) if (bytes > maximumBytes || now - item.stat.mtimeMs > 14 * 86400000) {
    fs.unlinkSync(item.file); bytes -= item.stat.size;
  }
}

function imageSize(data: Buffer): { width: number; height: number; extension: string } {
  if (data.length >= 24 && data.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) {
    return { width: data.readUInt32BE(16), height: data.readUInt32BE(20), extension: 'png' };
  }
  if (data.length > 4 && data[0] === 255 && data[1] === 216) {
    let offset = 2;
    while (offset + 9 < data.length) {
      if (data[offset] !== 255) { offset++; continue; }
      const marker = data[offset + 1];
      if (marker === 216 || marker === 217) { offset += 2; continue; }
      const length = data.readUInt16BE(offset + 2);
      if (length < 2 || offset + length + 2 > data.length) break;
      if ([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)) {
        return { width: data.readUInt16BE(offset + 7), height: data.readUInt16BE(offset + 5), extension: 'jpg' };
      }
      offset += length + 2;
    }
  }
  throw new Error('Downloaded photo is not a supported JPEG or PNG image.');
}

export async function collectVisuals(story: VideoStory, directory: string, options: {
  pexelsApiKey?: string; offline?: boolean; libraryRoot?: string; cacheRoot?: string; client?: Client;
} = {}): Promise<{ assets: VisualAsset[]; searches: number; sourceSpecific: boolean }> {
  const client = options.client || axios;
  const savedPath = path.join(directory, 'visual-assets.json');
  if (fs.existsSync(savedPath)) {
    const saved = readJson(savedPath) as { version: number; storyId?: string; sourceUrl?: string; assets: VisualAsset[] };
    if (saved.version === 1 && saved.storyId === story.id && saved.sourceUrl === story.sourceUrl && saved.assets?.length >= 2 && saved.assets.every(asset => {
      const file = path.resolve(directory, asset.file);
      return file.startsWith(path.resolve(directory) + path.sep) && fs.existsSync(file) && fileSha256(file) === asset.sha256;
    })) return { assets: saved.assets, searches: 0, sourceSpecific: saved.assets.some(asset => asset.usage === 'actual') };
  }
  const target = path.resolve(directory, 'media'); fs.mkdirSync(target, { recursive: true });
  const cacheRoot = path.resolve(options.cacheRoot || '.cache/video-assets'); fs.mkdirSync(cacheRoot, { recursive: true });
  pruneVisualCache(cacheRoot);
  const topic = visualTopic(story);
  const library = readLibrary(options.libraryRoot);
  let searches = 0;
  const candidates: (VisualCandidate & { provider: VisualAsset['provider']; width?: number; height?: number })[] = [];
  const policyPath = 'assets/video/source-policy.json';
  const policy = fs.existsSync(policyPath) ? readJson(policyPath) as { mediaHosts?: string[] } : {};
  const sourceCandidates = options.offline ? [] : [...(story.visualCandidates || []), ...(options.client ? [] : await discoverSourceMedia(story))];
  for (const candidate of sourceCandidates) {
    if (candidate.creator && candidate.kind === 'photo' && allowedLicense(candidate.license, candidate.licenseUrl) &&
        (allowedMediaUrl(candidate.url, policy.mediaHosts) || sameSourceHost(candidate.url, story.sourceUrl))) candidates.push({ ...candidate, provider: 'official' });
  }
  if (!options.offline) {
    const queries: Record<string, string> = { computers: 'laptop', 'data-centers': 'server racks', research: 'laboratory equipment',
      robotics: 'robot', education: 'computer classroom', workplaces: 'office workstation' };
    try {
      searches++;
      const response = await client.get('https://commons.wikimedia.org/w/api.php', { timeout: 12000, maxContentLength: 2 * 1024 * 1024,
        headers: { 'User-Agent': agent }, params: { action: 'query', format: 'json', generator: 'search',
          gsrnamespace: 6, gsrsearch: queries[topic], gsrlimit: 15, prop: 'imageinfo', iiprop: 'url|size|mime|extmetadata', iiurlwidth: 1280 } });
      for (const page of Object.values(response.data.query?.pages || {}) as any[]) {
        const info = page.imageinfo?.[0]; const meta = info?.extmetadata || {};
        const license = plain(meta.LicenseShortName?.value || '');
        const licenseUrl = plain(meta.LicenseUrl?.value || '') || (license === 'Public domain' ? 'https://creativecommons.org/publicdomain/mark/1.0/' : '');
        const title = plain(meta.ImageDescription?.value || page.title || '');
        if (!info || !/^image\/(jpeg|png)$/.test(info.mime) || info.width < 1000 ||
            !allowedLicense(license, licenseUrl || 'https://invalid.example') ||
            /rendering|illustration|diagram|painting|generated|gemini|artist.s concept|screenshot|logo/i.test(`${title} ${page.title}`)) continue;
        candidates.push({ provider: 'wikimedia', kind: 'photo', usage: 'illustrative', title: title.slice(0, 180),
          url: info.thumburl || info.url, sourceUrl: info.descriptionurl, creator: plain(meta.Artist?.value || 'Unknown creator'),
          license, licenseUrl });
      }
    } catch { console.warn('[video] Wikimedia unavailable; bundled photos remain available.'); }
    if (options.pexelsApiKey && searches < VISUAL_SEARCH_LIMIT) {
      for (const kind of ['photo', 'video'] as const) {
        try {
          searches++;
          const response = await client.get(`https://api.pexels.com/v1/${kind === 'photo' ? 'search' : 'videos/search'}`, {
            timeout: 12000, maxContentLength: 2 * 1024 * 1024, headers: { Authorization: options.pexelsApiKey },
            params: { query: queries[topic], orientation: 'portrait', per_page: 4 } });
          for (const item of kind === 'photo' ? response.data.photos || [] : response.data.videos || []) {
            const file = kind === 'video' ? item.video_files?.filter((file: any) => file.file_type === 'video/mp4' && file.width >= 720 && file.height >= 1280)
              .sort((a: any, b: any) => a.width * a.height - b.width * b.height)[0] : undefined;
            const url = kind === 'photo' ? item.src?.large2x : file?.link;
            if (!url || kind === 'video' && item.duration > 60) continue;
            candidates.push({ provider: 'pexels', kind, usage: 'illustrative', title: item.alt || `Illustrative ${topic} footage`,
              url, sourceUrl: item.url, creator: item.photographer || item.user?.name || 'Pexels contributor',
              license: 'Pexels', licenseUrl: 'https://www.pexels.com/license/', width: file?.width, height: file?.height });
          }
        } catch { console.warn(`[video] Pexels ${kind} unavailable; using free alternatives.`); }
      }
    }
  }
  const assets: VisualAsset[] = [];
  for (const candidate of candidates.slice(0, 12)) {
    if (assets.length >= 4) break;
    if (candidate.kind === 'video' && assets.filter(asset => asset.kind === 'video').length >= 2) continue;
    if (!allowedMediaUrl(candidate.url, candidate.provider === 'official' ? policy.mediaHosts : []) &&
        !(candidate.provider === 'official' && sameSourceHost(candidate.url, story.sourceUrl))) continue;
    try {
      if (candidate.provider === 'official' && !options.client) await requirePublicUrl(candidate.url);
      const key = sha256(candidate.url);
      const cachePath = path.join(cacheRoot, `${key}.${candidate.kind === 'video' ? 'mp4' : 'bin'}`);
      let data: Buffer;
      if (fs.existsSync(cachePath) && fs.statSync(cachePath).size <= (candidate.kind === 'video' ? 12 : 4) * 1024 * 1024) data = fs.readFileSync(cachePath);
      else {
        const response = await client.get(candidate.url, { timeout: 15000, responseType: 'arraybuffer', maxRedirects: 0,
          maxContentLength: (candidate.kind === 'video' ? 12 : 4) * 1024 * 1024, headers: { 'User-Agent': agent } });
        data = Buffer.from(response.data); fs.writeFileSync(cachePath, data);
      }
      const size = candidate.kind === 'photo' ? imageSize(data) : { width: candidate.width || 0, height: candidate.height || 0, extension: 'mp4' };
      if (size.width < 720 || size.height < 480 || size.width * size.height > 40_000_000) continue;
      const digest = sha256(data); if (assets.some(asset => asset.sha256 === digest)) continue;
      const file = `media/${key.slice(0, 16)}.${size.extension}`;
      fs.writeFileSync(path.join(directory, file), data);
      assets.push({ ...candidate, ...size, id: key.slice(0, 16), file, sha256: digest, downloadedAt: new Date().toISOString(),
        credit: `${candidate.creator} / ${candidate.provider === 'pexels' ? 'Pexels' : 'Wikimedia or original source'} / ${candidate.license}` });
    } catch { /* Invalid or unavailable assets fall through to the bundled library. */ }
  }
  const ranked = [...library].sort((a, b) => Number(b.topic === topic) - Number(a.topic === topic) ||
    Number(b.topic === 'computers') - Number(a.topic === 'computers'));
  // Rotate within each topic by story identity, keeping reruns deterministic.
  const offset = parseInt(sha256(story.id).slice(0, 4), 16);
  const relevant = ranked.filter(asset => asset.topic === topic || asset.topic === 'computers' || asset.topic === 'data-centers');
  const primary = relevant.filter(asset => asset.topic === topic);
  const secondary = relevant.filter(asset => asset.topic !== topic);
  const rotated = [...primary.slice(offset % Math.max(1, primary.length)), ...primary.slice(0, offset % Math.max(1, primary.length)), ...secondary];
  for (const asset of rotated) {
    if (assets.length >= 4) break;
    if (assets.some(existing => existing.sha256 === asset.sha256)) continue;
    const file = `media/${path.basename(asset.file)}`; fs.copyFileSync(asset.file, path.join(directory, file));
    assets.push({ ...asset, file });
  }
  if (assets.length < 2) throw new Error('At least two licensed real images are required.');
  writeJson(path.join(directory, 'visual-assets.json'), { version: 1, storyId: story.id, sourceUrl: story.sourceUrl, searches, topic, assets });
  pruneVisualCache(cacheRoot);
  return { assets, searches, sourceSpecific: assets.some(asset => asset.usage === 'actual') };
}

export function visualCredits(assets: VisualAsset[]): string {
  const credits = [...new Map(assets.map(asset => [asset.sourceUrl, asset])).values()]
    .map(asset => `${asset.credit}\n${asset.sourceUrl}\n${asset.licenseUrl}\nCropped/animated for this explainer.`).join('\n\n');
  return credits + (assets.some(asset => asset.provider === 'pexels') ? '\n\nPhotos/footage provided by Pexels: https://www.pexels.com' : '');
}
