import { ImageResponse } from "next/og";
import { BrandMarkImage } from "@/components/BrandMarkImage";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(<BrandMarkImage size={32} />, { ...size });
}
