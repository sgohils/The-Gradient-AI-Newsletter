import { readIssuesFromMarkdown } from "@/lib/posts";

export default async function DataLoader({
  children,
}: {
  children: (data: {
    issues: ReturnType<typeof readIssuesFromMarkdown>;
  }) => React.ReactNode;
}) {
  // Unexpected filesystem failures reach the route error boundary. Missing posts
  // return an empty array and are presented as an actual empty state.
  const issues = readIssuesFromMarkdown();
  return <>{children({ issues })}</>;
}
