import { NextResponse } from "next/server";
import { readIssuesFromMarkdown } from "@/lib/posts";
import { parseArchiveQuery, queryArchive } from "@/lib/archive";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    return NextResponse.json(queryArchive(readIssuesFromMarkdown(), parseArchiveQuery(new URL(request.url).searchParams)));
  } catch {
    return NextResponse.json({ error: "The archive could not be loaded." }, { status: 500 });
  }
}
