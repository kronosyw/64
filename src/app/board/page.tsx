"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  Badge,
  Button,
  CheckLabel,
  EmptyState,
  Message,
  Modal,
  PageHeader,
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

      {message ? <Message tone="ok">{message}</Message> : null}

      <div className="space-y-3">
        {posts.map((post) => (
          <article
            key={post.id}
            className={`rounded-panel border bg-card p-4 shadow-[0_1px_0_rgba(12,35,64,0.04)] ${
              post.isNotice ? "border-gold" : "border-line"
            }`}
          >
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {post.isNotice ? <Badge tone="gold">공지</Badge> : null}
              <Badge>{post.isAll ? "전체" : post.branchNames.join(", ")}</Badge>
              <span className="font-mono text-xs text-muted">
                {post.authorName} · {post.createdAt.slice(0, 16).replace("T", " ")}
              </span>
            </div>
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-semibold text-ink">{post.title}</h2>
              {post.canEdit ? (
                <Button type="button" variant="link" size="sm" onClick={() => openEdit(post)}>
                  수정
                </Button>
              ) : null}
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink/80">{post.content}</p>
          </article>
        ))}
        {!posts.length ? <EmptyState>이 지점에 글이 없습니다. 글쓰기로 첫 글을 남겨 보세요.</EmptyState> : null}
      </div>

      {draft ? (
        <Modal
          title={draft.id ? "글 수정" : "글쓰기"}
          onClose={() => setDraft(null)}
          footer={
            <>
              <Button type="submit" form="board-editor" className="flex-1" size="lg">
                저장
              </Button>
              {draft.id ? (
                <Button type="button" variant="danger" size="lg" onClick={() => remove(draft.id!)}>
                  삭제
                </Button>
              ) : null}
            </>
          }
        >
          <form id="board-editor" onSubmit={save} className="space-y-3">
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
            <CheckLabel
              checked={draft.isNotice}
              onChange={(e) => setDraft({ ...draft, isNotice: e.target.checked })}
            >
              공지
            </CheckLabel>
            <div className="rounded-btn border border-line bg-paper/50 p-3">
              <p className="mb-2 text-sm font-medium text-ink">볼 수 있는 지점</p>
              <CheckLabel
                className="mb-2"
                checked={draft.isAll}
                onChange={(e) =>
                  setDraft({ ...draft, isAll: e.target.checked, branchIds: e.target.checked ? [] : draft.branchIds })
                }
              >
                전체
              </CheckLabel>
              <div className="flex flex-wrap gap-2">
                {branches.map((branch) => (
                  <CheckLabel
                    key={branch.id}
                    className={draft.isAll ? "opacity-40" : ""}
                    disabled={draft.isAll}
                    checked={!draft.isAll && draft.branchIds.includes(branch.id)}
                    onChange={() => toggleBranch(branch.id)}
                  >
                    {branch.name}
                  </CheckLabel>
                ))}
              </div>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
