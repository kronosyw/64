# 잉잉관리자 디자인 가이드

컨셉은 **선명한 화이트보드 오피스**입니다.  
배경은 거의 화이트, 사이드바·패널은 흰 카드 톤. 브랜드 블루와 골드는 **강조·선택·CTA·활성 표시**에만 씁니다.  
화면 전체를 남색으로 칠하지 않습니다.

## 구현 스택: Tailwind CSS 4

| 역할 | 위치 |
|------|------|
| 토큰·테마 | `src/app/globals.css` `@theme` |
| 패턴 | `@layer components` (`desk-*`, `app-sidebar`, `nav-side*`) |
| 공통 조각 | `src/components/ui.tsx` |
| 앱 셸 | `src/components/AppShell.tsx` |

규칙:

1. hex는 페이지에 직접 쓰지 말고 토큰 클래스를 쓴다. (차트·브랜드 마크 SVG 예외)
2. 내비는 **밝은 좌측 사이드바** — 어두운 풀폭 헤더/남색 벽 금지.
3. primary 버튼은 `bg-ink text-white`, 본문 글자는 `text-foreground`.
4. 포커스 링은 `ring-gold`.

### 치트시트

```
배경     bg-paper  bg-card
글자     text-foreground  text-muted  text-white(on primary)
테두리   border-line
액센트   bg-ink  bg-gold  text-ink  text-gold
칩       desk-chip / desk-chip-active
패널     desk-panel
내비     nav-side / nav-side-active / nav-side-idle
셸       app-sidebar  app-topbar
```

---

## 색

| 이름 | Hex | 용도 |
|------|-----|------|
| paper | `#f5f8fc` | 앱 배경 (거의 화이트) |
| card | `#ffffff` | 사이드바·카드·모달 |
| ink | `#1a56db` | 선명한 블루, CTA, 활성 |
| ink-soft | `#2b6cf0` | hover |
| ink-deep | `#1347b8` | pressed |
| line | `#e2e8f2` | 테두리 |
| muted | `#64748b` | 부가 텍스트 |
| gold | `#e8a317` | 마크·활성 좌측 바 |
| foreground | `#0f172a` | 본문 (잉크와 분리) |
| danger | `#d14343` | 오류·삭제 |
| success | `#0f9f6e` | 성공·증가 |

---

## 레이아웃 · 내비

### Desktop (`md+`)

- 고정 좌측 사이드바(~240px, `bg-card` + `border-line`)
- 상단: BrandMark · 제품명
- 중앙: 세로 메뉴 (`nav-side`, 활성 = ink 배경 + 좌측 gold 바)
- 하단: 사용자 · 역할 · 로그아웃
- 우측 메인만 스크롤, ads는 `max-w-[1400px]`

### Mobile (`md` 미만)

- sticky 탑바: 로고 · 제품명 · 햄버거
- 오버레이 드로어(동일 메뉴·유저·로그아웃)
- 열림 시 body scroll lock, Esc/백드롭/링크 클릭으로 닫기

## 로그인

- 밝은 배경 + 흰 카드
- 마크·타이틀이 카드 안 브랜드 신호
- CTA는 full-width primary

## 하지 않을 것

- 화면 전체를 어두운 남색으로 덮기
- 탁한 베이지 페이퍼로 우중충하게 만들기
- 상단 가로 필 메뉴를 다시 쓰기
- 보라 그라데이션 / 크림+테라코타 / 다크모드 기본값
