import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
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
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            width: 20,
            height: 3,
            background: "#d4b483",
            borderRadius: 2,
            marginBottom: 3,
          }}
        />
        <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1, letterSpacing: -0.5 }}>64</div>
      </div>
    ),
    { ...size },
  );
}
