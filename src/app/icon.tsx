import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

/** Generisana TVS ikonica — teniska loptica na navy podlozi. */
export default function Icon() {
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
          borderRadius: 14,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            background: "#D6E84B",
            border: "3px solid #B7CC2E",
          }}
        />
      </div>
    ),
    { ...size },
  );
}
