import { VideoInput } from './types';

/** Clearly fictional fixture; publisher rejects every manifest marked sample. */
export function sampleInput(now = new Date(), kind: 'context' | 'product' | 'research' = 'context'): VideoInput {
  const excerpts = {
    context: 'A fictional research team has released an open toolkit for checking how language models answer everyday questions. The toolkit lets developers compare model responses using the same prompts and review examples that need closer inspection. Its sample reports show the questions, the generated answers, and the settings used for each test. The team says the project is intended to help people document model behavior before using a system in an application. Developers can run the checks locally and share their findings with collaborators.',
    product: 'A fictional software team released a local document search tool. The tool lets people search their own files without sending documents to a remote server. Its search results include links to the original passages so people can check where an answer came from. Users can compare the generated answer with the document before relying on it. The team says the current release supports text files and requires a computer with enough free memory. The software is a fictional example for testing this video format.',
    research: 'A fictional robotics team tested a new robot navigation method. Researchers compared the method with a baseline on the same laboratory obstacle course. The robot used camera images to choose its next step and recorded each route for later inspection. The reported tests were limited to indoor conditions, so outdoor performance remains unknown. Researchers say the results describe a controlled experiment rather than a system ready for public use. The study is a fictional example for testing this video format.',
  };
  const excerpt = excerpts[kind];
  return {
    version: 1, issueDate: now.toISOString().slice(0, 10), generatedAt: now.toISOString(), sample: true,
    stories: [{ id: kind === 'context' ? 'fictional-video-sample' : `fictional-video-${kind}`, rank: 1,
      title: kind === 'context' ? 'Sample: an open toolkit for checking AI answers' : kind === 'product' ? 'Sample: local document search software' : 'Sample: robot navigation research',
      sourceName: 'Fictional Research Lab', sourceUrl: 'https://example.com/fictional-ai-toolkit',
      publishedAt: now.toISOString(), sourceExcerpt: excerpt, summary: excerpt }],
  };
}
