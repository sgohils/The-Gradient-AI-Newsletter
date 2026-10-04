import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { addResendSubscriber } from "@/lib/mailer";

vi.mock("@/lib/mailer", () => ({ addResendSubscriber: vi.fn() }));
const request = (body: unknown) =>
  new Request("http://localhost/api/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

describe("newsletter signup", () => {
  beforeEach(() => {
    vi.stubEnv("RESEND_API_KEY", "test-key");
    vi.mocked(addResendSubscriber).mockReset();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("preserves the successful response and trims email", async () => {
    vi.mocked(addResendSubscriber).mockResolvedValue({
      email: "reader@example.com",
      token: "test",
      subscribedAt: "2026-01-01",
    });
    const result = await POST(request({ email: "  reader@example.com  " }));
    expect(result.status).toBe(201);
    expect(await result.json()).toEqual({
      success: true,
      email: "reader@example.com",
    });
    expect(addResendSubscriber).toHaveBeenCalledWith("reader@example.com");
  });
  it("returns a helpful 503 without contacting the provider when unconfigured", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const result = await POST(request({ email: "reader@example.com" }));
    expect(result.status).toBe(503);
    expect((await result.json()).error).toContain("archive");
    expect(addResendSubscriber).not.toHaveBeenCalled();
  });
  it.each([
    null,
    {},
    { email: 42 },
    { email: " " },
    { email: "invalid" },
    { email: "a".repeat(255) + "@example.com" },
  ])(
    "rejects invalid input %j before contacting the provider",
    async (body) => {
      const result = await POST(request(body));
      expect(result.status).toBe(400);
      expect(addResendSubscriber).not.toHaveBeenCalled();
    },
  );
  it("handles malformed JSON as a client error", async () => {
    const result = await POST(
      new Request("http://localhost/api/subscribe", {
        method: "POST",
        body: "{",
      }),
    );
    expect(result.status).toBe(400);
    expect(addResendSubscriber).not.toHaveBeenCalled();
  });
  it("returns a friendly error without exposing provider details", async () => {
    vi.mocked(addResendSubscriber).mockRejectedValue(
      new Error("provider secret / authentication details"),
    );
    const result = await POST(request({ email: "reader@example.com" }));
    expect(result.status).toBe(500);
    expect((await result.json()).error).not.toContain("secret");
  });
});
