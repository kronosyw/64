import { readFile } from "node:fs/promises";
import path from "node:path";

export const BRAND_FONT_NAME = "Noto Sans KR";

export function loadBrandFont() {
  return readFile(path.join(process.cwd(), "src/assets/NotoSansKR-Bold.ttf"));
}
