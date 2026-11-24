import { ImageResponse } from "next/og";
import { BRAND_FONT_NAME, loadBrandFont } from "@/lib/brand-font";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon() {
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
            width: 92,
            height: 8,
            background: "#d4b483",
            borderRadius: 4,
            marginBottom: 14,
          }}
        />
        <div style={{ fontSize: 46, fontWeight: 700, lineHeight: 1.05 }}>잉잉</div>
        <div style={{ fontSize: 34, fontWeight: 700, lineHeight: 1.15, marginTop: 4 }}>관리자</div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: BRAND_FONT_NAME, data: font, weight: 700, style: "normal" }],
    },
  );
}
