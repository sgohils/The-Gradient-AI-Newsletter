import * as cheerio from 'cheerio';

export function plainText(value: string): string {
  const $ = cheerio.load(value);
  $('script,style,noscript').remove();
  $('p,div,li,br,h1,h2,h3').each((_index, element) => { $(element).append(' '); });
  return $.root().text().replace(/\s+/g, ' ').trim();
}
