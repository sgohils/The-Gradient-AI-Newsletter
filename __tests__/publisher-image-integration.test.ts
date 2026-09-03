import { describe, it, expect, vi, beforeEach } from 'vitest';
import { publish } from '../src/publisher';
import * as imageGenerator from '../src/publisher/image-generator';
import type { NewsletterIssue } from '../src/types';

vi.mock('fs', () => ({
  existsSync: vi.fn(() => true),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

vi.mock('../src/publisher/image-generator', () => ({
  generateIssueImage: vi.fn(),
  buildPollinationsUrl: vi.fn(),
}));

import * as fs from 'fs';

const baseIssue: NewsletterIssue = {
  id: 'gradient-2026-09-03',
  title: 'The Gradient — 2026-09-03',
  date: '2026-09-03',
  intro: 'Daily AI news.',
  articles: [],
  tags: ['AI'],
};

describe('publish() image generation integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.GRADIENT_IMAGE_GEN;
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.writeFileSync).mockClear();
  });

  it('skips image generation when featuredImageUrl is already set', async () => {
    const generateSpy = vi.spyOn(imageGenerator, 'generateIssueImage');
    const issue: NewsletterIssue = {
      ...baseIssue,
      featuredImageUrl: 'https://example.com/existing.png',
    };

    await publish(issue, { outputDir: 'posts' });

    expect(generateSpy).not.toHaveBeenCalled();
  });

  it('skips image generation when GRADIENT_IMAGE_GEN=off', async () => {
    process.env.GRADIENT_IMAGE_GEN = 'off';
    const generateSpy = vi.spyOn(imageGenerator, 'generateIssueImage');

    await publish({ ...baseIssue }, { outputDir: 'posts' });

    expect(generateSpy).not.toHaveBeenCalled();
  });

  it('calls generator and writes returned URL when image is generated', async () => {
    vi.spyOn(imageGenerator, 'generateIssueImage').mockResolvedValue('/issue-images/2026-09-03.png');

    const result = await publish({ ...baseIssue }, { outputDir: 'posts' });

    expect(imageGenerator.generateIssueImage).toHaveBeenCalledTimes(1);
    expect(result.featuredImageUrl).toBe('/issue-images/2026-09-03.png');
  });

  it('does not throw when image generation returns null (non-fatal)', async () => {
    vi.spyOn(imageGenerator, 'generateIssueImage').mockResolvedValue(null);

    const result = await publish({ ...baseIssue }, { outputDir: 'posts' });

    expect(result.featuredImageUrl).toBeUndefined();
    expect(result.mdPath).toContain('2026-09-03.md');
    expect(result.htmlPath).toContain('2026-09-03.html');
  });

  it('does not throw when image generation throws (non-fatal)', async () => {
    vi.spyOn(imageGenerator, 'generateIssueImage').mockRejectedValue(new Error('network down'));

    const result = await publish({ ...baseIssue }, { outputDir: 'posts' });

    expect(result.featuredImageUrl).toBeUndefined();
    expect(result.mdPath).toContain('2026-09-03.md');
  });
});
