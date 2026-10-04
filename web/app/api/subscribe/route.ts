import { NextResponse } from "next/server";
import { addResendSubscriber } from "@/lib/mailer";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Please send a valid email address." },
      { status: 400 },
    );
  }
  const email =
    typeof body === "object" &&
    body !== null &&
    "email" in body &&
    typeof body.email === "string"
      ? body.email.trim()
      : "";
  if (!email)
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "Invalid email address" },
      { status: 400 },
    );
  }
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      {
        error:
          "Email signup is currently unavailable. Please enjoy the archive and try again later.",
      },
      { status: 503 },
    );
  }
  try {
    const subscriber = await addResendSubscriber(email);
    return NextResponse.json(
      { success: true, email: subscriber.email },
      { status: 201 },
    );
  } catch (error) {
    console.error(
      "Subscribe failed:",
      error instanceof Error ? error.name : "Unknown error",
    );
    return NextResponse.json(
      { error: "We couldn’t subscribe you right now. Please try again later." },
      { status: 500 },
    );
  }
}
