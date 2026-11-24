import { ImageResponse } from "next/og";
import { BRAND_FONT_NAME, loadBrandFont } from "@/lib/brand-font";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default async function Icon() {
  const font = await loadBrandFont();
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0c2340",
          color: "#f8fafc",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: BRAND_FONT_NAME,
        }}
      >
        <div
          style={{
            width: 18,
            height: 2,
            background: "#d4b483",
            borderRadius: 2,
            marginBottom: 2,
          }}
        />
        <div style={{ fontSize: 11, fontWeight: 700, lineHeight: 1 }}>잉잉</div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: BRAND_FONT_NAME, data: font, weight: 700, style: "normal" }],
    },
  );
}
