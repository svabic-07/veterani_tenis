import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Apple touch ikonica (iOS home screen) — teniska loptica na navy podlozi. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#15233A",
        }}
      >
        <div
          style={{
            width: 96,
            height: 96,
            borderRadius: 48,
            background: "#D6E84B",
            border: "8px solid #B7CC2E",
          }}
        />
      </div>
    ),
    { ...size },
  );
}
