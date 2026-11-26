"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  EmptyState,
  Field,
  Message,
  Modal,
  PageHeader,
  Panel,
  TextInput,
  TextSelect,
  TextTextarea,
} from "@/components/ui";
import { formatBytes, VAULT_MAX_FILE_BYTES } from "@/lib/vault";

type Branch = { id: number; name: string };
type VaultFile = {
  id: number;
  fileName: string;
  mimeType: string;
  size: number;
  kind: string;
  url: string;
};
type VaultRecord = {
  id: number;
  branchId: number;
  branchName: string | null;
  title: string;
  content: string | null;
  authorName: string;
  createdAt: string;
  updatedAt: string;
  files: VaultFile[];
};
type Draft = {
  id: number | null;
  branchId: string;
  title: string;
  content: string;
  files: File[];
  removeFileIds: number[];
  existingFiles: VaultFile[];
};

export default function VaultPage() {
  const [records, setRecords] = useState<VaultRecord[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  function emptyDraft(branchId = ""): Draft {
    return {
      id: null,
      branchId: branchId || (branches[0] ? String(branches[0].id) : ""),
      title: "",
      content: "",
      files: [],
      removeFileIds: [],
      existingFiles: [],
    };
  }

  async function load(q = query) {
    const res = await fetch(`/api/vault${q ? `?q=${encodeURIComponent(q)}` : ""}`);
    const data = await res.json();
    if (data.success) {
      setRecords(data.records);
      if (data.branches) setBranches(data.branches);
    } else setMessage(data.message || "불러오지 못했습니다.");
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const previewUrls = useMemo(
    () =>
      (draft?.files || []).map((file) => ({
        name: file.name,
        url: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
        size: file.size,
      })),
    [draft?.files],
  );

  useEffect(() => {
    return () => {
      previewUrls.forEach((p) => {
        if (p.url) URL.revokeObjectURL(p.url);
      });
    };
  }, [previewUrls]);

  function openCreate() {
    setMessage("");
    setDraft(emptyDraft());
  }

  function openEdit(record: VaultRecord) {
    setMessage("");
    setDraft({
      id: record.id,
      branchId: String(record.branchId),
      title: record.title,
      content: record.content || "",
      files: [],
      removeFileIds: [],
      existingFiles: record.files,
    });
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!draft) return;
    setLoading(true);
    const form = new FormData();
    form.set("title", draft.title);
    form.set("content", draft.content);
    form.set("branchId", draft.branchId);
    if (draft.id) {
      form.set("id", String(draft.id));
      if (draft.removeFileIds.length) form.set("removeFileIds", draft.removeFileIds.join(","));
    }
    for (const file of draft.files) form.append("files", file);

    const res = await fetch("/api/vault", {
      method: draft.id ? "PATCH" : "POST",
      body: form,
    });
    const data = await res.json();
    setLoading(false);
    if (!data.success) {
      setMessage(data.message || "저장 실패");
      return;
    }
    setDraft(null);
    setMessage(draft.id ? "수정했습니다." : "저장했습니다.");
    load();
  }

  async function remove(id: number) {
    if (!confirm("이 정보를 삭제할까요? 첨부 파일도 함께 삭제됩니다.")) return;
    const res = await fetch(`/api/vault?id=${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!data.success) {
      setMessage(data.message || "삭제 실패");
      return;
    }
    if (draft?.id === id) setDraft(null);
    setMessage("삭제했습니다.");
    load();
  }

  function onPickFiles(list: FileList | null) {
    if (!draft || !list?.length) return;
    const next = [...draft.files];
    for (const file of Array.from(list)) {
      if (file.size > VAULT_MAX_FILE_BYTES) {
        setMessage(`${file.name}은(는) ${formatBytes(VAULT_MAX_FILE_BYTES)}를 넘습니다.`);
        continue;
      }
      next.push(file);
    }
    setDraft({ ...draft, files: next });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="정보저장"
        description="사장님만 사용합니다. 같은 지점 사장끼리 공유되고, 최고관리자는 전체를 봅니다."
        actions={
          <Button type="button" onClick={openCreate} disabled={!branches.length}>
            항목 추가
          </Button>
        }
      />

      <Panel className="flex flex-wrap items-end gap-2">
        <Field label="검색" className="min-w-56 flex-1">
          <TextInput
            placeholder="이름·내용 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") load(query);
            }}
          />
        </Field>
        <Button type="button" variant="ghost" onClick={() => load(query)}>
          검색
        </Button>
      </Panel>

      {message ? <Message tone="ok">{message}</Message> : null}

      <div className="space-y-3">
        {records.map((record) => {
          const images = record.files.filter((f) => f.kind === "IMAGE");
          const files = record.files.filter((f) => f.kind !== "IMAGE");
          return (
            <article key={record.id} className="rounded-panel border border-line bg-card p-4 shadow-[0_1px_0_rgba(12,35,64,0.04)]">
              <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold text-ink">{record.title}</h2>
                    {record.branchName ? <Badge tone="ink">{record.branchName}</Badge> : null}
                  </div>
                  <p className="text-xs text-muted">
                    {record.authorName} · {String(record.updatedAt).slice(0, 16).replace("T", " ")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => openEdit(record)}>
                    수정
                  </Button>
                  <Button type="button" variant="danger" size="sm" onClick={() => remove(record.id)}>
                    삭제
                  </Button>
                </div>
              </div>

              {record.content ? (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink/85">{record.content}</p>
              ) : (
                <p className="text-sm text-muted">내용 없음</p>
              )}

              {images.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {images.map((file) => (
                    <a
                      key={file.id}
                      href={file.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block overflow-hidden rounded-btn border border-line"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={file.url} alt={file.fileName} className="h-28 w-28 object-cover" />
                    </a>
                  ))}
                </div>
              ) : null}

              {files.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {files.map((file) => (
                    <a
                      key={file.id}
                      href={`${file.url}&download=1`}
                      className="inline-flex items-center gap-2 rounded-btn border border-line bg-paper px-3 py-1.5 text-sm text-ink hover:border-ink/30"
                    >
                      <Badge tone="muted">파일</Badge>
                      <span className="max-w-48 truncate">{file.fileName}</span>
                      <span className="text-xs text-muted">{formatBytes(file.size)}</span>
                    </a>
                  ))}
                </div>
              ) : null}
            </article>
          );
        })}
        {!records.length ? (
          <EmptyState>
            {branches.length
              ? "저장된 정보가 없습니다. 항목 추가로 계정·연락처·거래처를 남겨 보세요."
              : "배정된 지점이 없습니다. 지점 배정 후 사용할 수 있습니다."}
          </EmptyState>
        ) : null}
      </div>

      {draft ? (
        <Modal
          title={draft.id ? "정보 수정" : "정보 추가"}
          onClose={() => setDraft(null)}
          footer={
            <>
              <Button type="submit" form="vault-form" className="flex-1" size="lg" disabled={loading}>
                {loading ? "저장 중..." : "저장"}
              </Button>
              {draft.id ? (
                <Button type="button" variant="danger" size="lg" onClick={() => remove(draft.id!)}>
                  삭제
                </Button>
              ) : null}
            </>
          }
        >
          <form id="vault-form" onSubmit={save} className="space-y-3">
            <Field label="공유 지점" hint="이 지점에 배정된 사장님들이 함께 봅니다.">
              <TextSelect
                value={draft.branchId}
                onChange={(e) => setDraft({ ...draft, branchId: e.target.value })}
                required
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </TextSelect>
            </Field>
            <Field label="항목 이름">
              <TextInput
                placeholder="예: 배민 사장님 계정, 본점 전화번호, OO거래처"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                required
              />
            </Field>
            <Field label="내용" hint="아이디/비밀번호, 번호, 주소, 메모 등">
              <TextTextarea
                className="min-h-32"
                placeholder="내용을 입력하세요"
                value={draft.content}
                onChange={(e) => setDraft({ ...draft, content: e.target.value })}
              />
            </Field>
            <Field label="파일·이미지" hint={`파일당 ${formatBytes(VAULT_MAX_FILE_BYTES)} 이하`}>
              <input
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.hwp,.txt,.zip"
                className="block w-full text-sm text-muted file:mr-3 file:rounded-btn file:border-0 file:bg-ink file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
                onChange={(e) => onPickFiles(e.target.files)}
              />
            </Field>

            {draft.existingFiles.length ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-ink">기존 첨부</p>
                {draft.existingFiles
                  .filter((f) => !draft.removeFileIds.includes(f.id))
                  .map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between gap-2 rounded-btn border border-line bg-paper/50 px-3 py-2 text-sm"
                    >
                      <span className="truncate">
                        {file.kind === "IMAGE" ? "이미지" : "파일"} · {file.fileName}
                      </span>
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        className="text-danger"
                        onClick={() =>
                          setDraft({ ...draft, removeFileIds: [...draft.removeFileIds, file.id] })
                        }
                      >
                        제거
                      </Button>
                    </div>
                  ))}
              </div>
            ) : null}

            {previewUrls.length ? (
              <div className="flex flex-wrap gap-2">
                {previewUrls.map((file) =>
                  file.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={file.name + file.size}
                      src={file.url}
                      alt={file.name}
                      className="h-20 w-20 rounded-btn border border-line object-cover"
                    />
                  ) : (
                    <span
                      key={file.name + file.size}
                      className="rounded-btn border border-line bg-paper px-3 py-2 text-xs text-ink"
                    >
                      {file.name} ({formatBytes(file.size)})
                    </span>
                  ),
                )}
              </div>
            ) : null}
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
