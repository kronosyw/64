"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  Button,
  EmptyState,
  Message,
  PageHeader,
  Panel,
  Tabs,
  TextInput,
  TextTextarea,
} from "@/components/ui";

type Branch = { id: number; name: string };
type Post = {
  id: number;
  title: string;
  content: string;
  isNotice: boolean;
  isAll: boolean;
  authorName: string;
  createdAt: string;
  branchIds: number[];
  branchNames: string[];
  canEdit: boolean;
};
type Draft = {
  id: number | null;
  title: string;
  content: string;
  isNotice: boolean;
  isAll: boolean;
  branchIds: number[];
};

const emptyDraft: Draft = { id: null, title: "", content: "", isNotice: false, isAll: false, branchIds: [] };

export default function BoardPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState<number | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [message, setMessage] = useState("");

  async function load(nextBranchId?: number | null) {
    const query = nextBranchId ? `?branchId=${nextBranchId}` : "";
    const res = await fetch(`/api/board${query}`);
    const data = await res.json();
    if (!data.success) {
      setMessage(data.message || "게시판을 불러오지 못했습니다.");
      return;
    }
    setBranches(data.branches);
    setBranchId(data.branchId);
    setPosts(data.posts);
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setMessage("");
    setDraft({ ...emptyDraft, branchIds: branchId ? [branchId] : [] });
  }

  function openEdit(post: Post) {
    setMessage("");
    setDraft({
      id: post.id,
      title: post.title,
      content: post.content,
      isNotice: post.isNotice,
      isAll: post.isAll,
      branchIds: post.branchIds.filter((id) => branches.some((branch) => branch.id === id)),
    });
  }

  function toggleBranch(id: number) {
    setDraft((current) => {
      if (!current) return current;
      const branchIds = current.branchIds.includes(id)
        ? current.branchIds.filter((branch) => branch !== id)
        : [...current.branchIds, id];
      return { ...current, branchIds, isAll: false };
    });
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!draft) return;
    const res = await fetch("/api/board", {
      method: draft.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    const data = await res.json();
    if (!data.success) {
      setMessage(data.message || "저장에 실패했습니다.");
      return;
    }
    setDraft(null);
    setMessage(draft.id ? "수정했습니다." : "등록했습니다.");
    load(branchId);
  }

  async function remove(id: number) {
    if (!confirm("이 글을 삭제할까요?")) return;
    const res = await fetch(`/api/board?id=${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!data.success) {
      setMessage(data.message || "삭제에 실패했습니다.");
      return;
    }
    setDraft(null);
    load(branchId);
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="게시판"
        description="지점별로 보고, 공지는 탭 위에 고정됩니다."
        actions={
          <Button type="button" onClick={openCreate}>
            글쓰기
          </Button>
        }
      />

      <Tabs
        items={branches.map((branch) => ({ id: branch.id, label: branch.name }))}
        value={branchId}
        onChange={(id) => load(Number(id))}
      />

      {message ? <Message>{message}</Message> : null}

      <div className="space-y-3">
        {posts.map((post) => (
          <article
            key={post.id}
            className={`rounded-panel border bg-card p-4 ${post.isNotice ? "border-gold" : "border-line"}`}
          >
            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
              {post.isNotice ? (
                <span className="rounded-full bg-gold/20 px-2 py-0.5 font-medium text-ink">공지</span>
              ) : null}
              <span className="rounded-full bg-paper px-2 py-0.5 text-muted">
                {post.isAll ? "전체" : post.branchNames.join(", ")}
              </span>
              <span className="font-mono text-muted">
                {post.authorName} · {post.createdAt.slice(0, 16).replace("T", " ")}
              </span>
            </div>
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-semibold text-ink">{post.title}</h2>
              {post.canEdit ? (
                <button type="button" className="shrink-0 text-sm text-ink" onClick={() => openEdit(post)}>
                  수정
                </button>
              ) : null}
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-ink/80">{post.content}</p>
          </article>
        ))}
        {!posts.length ? <EmptyState>이 지점에 글이 없습니다. 글쓰기로 첫 글을 남겨 보세요.</EmptyState> : null}
      </div>

      {draft ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40 md:items-center md:p-6">
          <form
            onSubmit={save}
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-line bg-card p-4 md:rounded-panel"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-ink">{draft.id ? "글 수정" : "글쓰기"}</h2>
              <button type="button" className="text-sm text-muted" onClick={() => setDraft(null)}>
                닫기
              </button>
            </div>
            <div className="space-y-3">
              <TextInput
                placeholder="제목"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                required
              />
              <TextTextarea
                className="h-36"
                placeholder="내용"
                value={draft.content}
                onChange={(e) => setDraft({ ...draft, content: e.target.value })}
                required
              />
              <label className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={draft.isNotice}
                  onChange={(e) => setDraft({ ...draft, isNotice: e.target.checked })}
                />
                공지
              </label>
              <div className="rounded-btn border border-line p-3">
                <p className="mb-2 text-sm font-medium text-ink">볼 수 있는 지점</p>
                <label className="mb-2 flex items-center gap-2 text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={draft.isAll}
                    onChange={(e) =>
                      setDraft({ ...draft, isAll: e.target.checked, branchIds: e.target.checked ? [] : draft.branchIds })
                    }
                  />
                  전체
                </label>
                <div className="flex flex-wrap gap-2">
                  {branches.map((branch) => (
                    <label
                      key={branch.id}
                      className={`flex items-center gap-1 rounded-full border border-line px-2 py-1 text-sm ${draft.isAll ? "opacity-40" : ""}`}
                    >
                      <input
                        type="checkbox"
                        disabled={draft.isAll}
                        checked={!draft.isAll && draft.branchIds.includes(branch.id)}
                        onChange={() => toggleBranch(branch.id)}
                      />
                      {branch.name}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button type="submit" className="flex-1 py-2.5">
                저장
              </Button>
              {draft.id ? (
                <Button type="button" variant="danger" onClick={() => remove(draft.id!)}>
                  삭제
                </Button>
              ) : null}
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
