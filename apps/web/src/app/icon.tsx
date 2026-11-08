import { ImageResponse } from "next/og";

// Placeholder icon until the design system feature sets the real one.
export function generateImageMetadata() {
  return [
    { id: "192", size: { width: 192, height: 192 }, contentType: "image/png" },
    { id: "512", size: { width: 512, height: 512 }, contentType: "image/png" },
  ];
}

export default async function Icon({ id }: { id: Promise<string> }) {
  const px = Number(await id);
  return new ImageResponse(<Glyph px={px} />, { width: px, height: px });
}

export function Glyph({ px }: { px: number }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#1f2937",
        color: "#ffffff",
        fontSize: px * 0.6,
        fontWeight: 700,
      }}
    >
      M
    </div>
  );
}
