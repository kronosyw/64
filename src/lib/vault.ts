import { Role } from "@prisma/client";

export const VAULT_MAX_FILE_BYTES = 3 * 1024 * 1024; // 3MB (Vercel 본문 한도 고려)

/** 사장·최고관리자만. 지점장은 불가. */
export function canAccessVault(role: string) {
  return role === Role.SUPERADMIN || role === Role.OWNER || role === "SUPERADMIN" || role === "OWNER";
}

export function canViewAllVault(role: string) {
  return role === Role.SUPERADMIN || role === "SUPERADMIN";
}

export function fileKind(mimeType: string, fileName: string) {
  if (mimeType.startsWith("image/")) return "IMAGE";
  const lower = fileName.toLowerCase();
  if (/\.(png|jpe?g|gif|webp|bmp|svg)$/.test(lower)) return "IMAGE";
  return "FILE";
}

export function formatBytes(size: number) {
  if (size < 1024) return `${size}B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)}KB`;
  return `${(size / (1024 * 1024)).toFixed(1)}MB`;
}

export async function readUploadFiles(form: FormData, fieldName = "files") {
  const entries = form.getAll(fieldName);
  const files: Array<{
    fileName: string;
    mimeType: string;
    size: number;
    kind: string;
    data: Buffer;
  }> = [];

  for (const entry of entries) {
    if (!(entry instanceof File) || entry.size <= 0) continue;
    if (entry.size > VAULT_MAX_FILE_BYTES) {
      throw new Error(`파일은 ${formatBytes(VAULT_MAX_FILE_BYTES)} 이하만 올릴 수 있습니다: ${entry.name}`);
    }
    const buffer = Buffer.from(await entry.arrayBuffer());
    const mimeType = entry.type || "application/octet-stream";
    files.push({
      fileName: entry.name || "file",
      mimeType,
      size: buffer.length,
      kind: fileKind(mimeType, entry.name || "file"),
      data: buffer,
    });
  }

  return files;
}
