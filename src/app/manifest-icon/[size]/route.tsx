import { ImageResponse } from "next/og";

/**
 * PWA ikonice za manifest (maskable, full-bleed navy podloga).
 * Rute: /manifest-icon/192 i /manifest-icon/512.
 */
export function generateStaticParams() {
  return [{ size: "192" }, { size: "512" }];
}

export async function GET(_req: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size: raw } = await params;
  const size = raw === "512" ? 512 : 192;
  const ball = Math.round(size * 0.5);

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
            width: ball,
            height: ball,
            borderRadius: ball / 2,
            background: "#D6E84B",
            border: `${Math.round(size * 0.045)}px solid #B7CC2E`,
          }}
        />
      </div>
    ),
    { width: size, height: size },
  );
}
