import { ImageResponse } from "next/og";

// The edge renderer bundles its assets, avoiding Node file-URL handling on Windows.
export const runtime = "edge";

export const alt = "The Gradient — A clearer view of AI.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#f6f5f1",
        color: "#202421",
        padding: "64px 80px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "flex-end",
            height: 44,
          }}
        >
          {[44, 32, 20].map((height) => (
            <div
              key={height}
              style={{ width: 6, height, background: "#176b5b" }}
            />
          ))}
        </div>
        <span style={{ fontSize: 34 }}>The Gradient</span>
        <span style={{ marginLeft: "auto", fontSize: 18, color: "#176b5b" }}>
          AI, IN FOCUS
        </span>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          fontFamily: "serif",
          fontSize: 92,
          lineHeight: 1.06,
        }}
      >
        <span>A clearer view</span>
        <span style={{ color: "#176b5b" }}>of AI.</span>
      </div>
      <div
        style={{
          display: "flex",
          borderTop: "1px solid #d9dcd5",
          paddingTop: 24,
          fontSize: 22,
          color: "#555c57",
        }}
      >
        Research. Industry. Engineering.
      </div>
    </div>,
    size,
  );
}
