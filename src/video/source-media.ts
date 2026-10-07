import axios from 'axios';
import * as cheerio from 'cheerio';
import { lookup } from 'dns/promises';
import { isIP } from 'net';
import { VisualCandidate, VideoStory } from './types';

export async function requirePublicUrl(value: string): Promise<URL> {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.port && url.port !== '443' ||
      isIP(url.hostname) || /(^|\.)(localhost|local|internal|test|invalid)$/.test(url.hostname)) throw new Error('Only public HTTPS media sources are supported.');
  const addresses = await lookup(url.hostname, { all: true });
  if (!addresses.length || addresses.some(({ address }) => /^(?:0\.|10\.|127\.|169\.254\.|172\.(?:1[6-9]|2\d|3[01])\.|192\.168\.|224\.|240\.|::|fc|fd|fe80)/i.test(address))) {
    throw new Error('Media source resolves to a private or reserved address.');
  }
  return url;
}

function licenseName(url: string): string | undefined {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== 'creativecommons.org') return undefined;
    if (/^\/publicdomain\/zero\/1\.0\//.test(parsed.pathname)) return 'CC0';
    if (/^\/publicdomain\/mark\/1\.0\//.test(parsed.pathname)) return 'Public domain';
    const by = parsed.pathname.match(/^\/licenses\/by\/(\d\.\d)\//);
    return by ? `CC BY ${by[1]}` : undefined;
  } catch { return undefined; }
}

export function extractPermittedMedia(html: string, story: VideoStory): VisualCandidate[] {
  const $ = cheerio.load(html); const origin = new URL(story.sourceUrl);
  const pageLicense = $('a[rel~=license]').map((_index, node) => $(node).attr('href') || '').get().find(link => licenseName(link));
  const author = $('meta[name=author]').attr('content') || $('.ltx_authors').first().text().replace(/\s+/g, ' ').trim();
  const result: VisualCandidate[] = [];
  $('figure img, img[data-license-url]').each((_index, image) => {
    const figure = $(image).closest('figure'); const caption = figure.find('figcaption,.ltx_caption').text();
    if (/adapted|reproduced|courtesy|copyright|©|third.party/i.test(caption)) return;
    const licenseUrl = $(image).attr('data-license-url') || figure.find('a[rel~=license]').attr('href') || pageLicense;
    const creator = $(image).attr('data-creator') || figure.attr('data-creator') || author;
    const license = licenseUrl && licenseName(licenseUrl); const source = $(image).attr('src');
    if (!license || !creator || !source) return;
    const url = new URL(source, story.sourceUrl);
    // A document-wide license is inherited only by same-origin images. External
    // media needs its own explicit license/creator metadata on the element.
    if (url.hostname !== origin.hostname && !$(image).attr('data-license-url')) return;
    if (url.protocol !== 'https:' || /\.(svg|gif)(?:\?|$)/i.test(url.pathname)) return;
    result.push({ url: url.toString(), sourceUrl: story.sourceUrl, creator: creator.slice(0, 500), license, licenseUrl,
      title: ($(image).attr('alt') || caption || story.title).slice(0, 180), kind: 'photo', usage: 'actual' });
  });
  return result.slice(0, 4);
}

export async function discoverSourceMedia(story: VideoStory): Promise<VisualCandidate[]> {
  try {
    await requirePublicUrl(story.sourceUrl);
    const response = await axios.get(story.sourceUrl, { timeout: 10000, maxContentLength: 2 * 1024 * 1024,
      maxRedirects: 0, headers: { 'User-Agent': 'TheGradientVideo/1.0 (https://github.com/sgohils/The-Gradient-AI-Newsletter)' } });
    return typeof response.data === 'string' ? extractPermittedMedia(response.data, story) : [];
  } catch { return []; }
}
