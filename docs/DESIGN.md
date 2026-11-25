# 잉잉관리자 디자인 가이드

컨셉은 **마감 데스크**입니다. 매장 문을 닫고 장부를 펼친 자리처럼, 작업면은 따뜻한 종이색이고 글자와 버튼은 로고의 남색 잉크입니다. 금색은 마크와 공지·오늘 표시에만 씁니다.

## 색

| 이름 | Hex | 용도 |
|------|-----|------|
| ink | `#0c2340` | 글자, 헤더, 주요 버튼 |
| paper | `#f6f1e7` | 앱 배경 |
| card | `#fffdf8` | 카드·패널·표 |
| line | `#e4dccb` | 테두리·구분선 |
| muted | `#6b6558` | 부가 설명 |
| gold | `#c4a15a` | 마크 강조, 공지, 활성 밑줄 |
| danger | `#9f2d2d` | 오류·삭제 |

Tailwind에서는 `bg-ink`, `text-paper`, `border-line`처럼 씁니다.

## 글자

- 본문·제목: Pretendard
- 시간·숫자·코드: 고정폭 (`font-mono`)
- 페이지 제목: `text-2xl font-bold text-ink`
- 부가 설명: `text-sm text-muted`, 한 줄
- 버튼·라벨: sentence case, 한국어 그대로

## 배치

- 내용은 왼쪽 정렬
- 헤더: 남색(`ink`) 띠, 메뉴는 한 줄 가로 스크롤
- 본문: 종이 배경 위 카드
- 모서리: 버튼·입력 `rounded-btn`(8px), 카드 `rounded-panel`(16px)
- 최대 폭: `max-w-6xl`

## 상태

- 공지·오늘: 금색 또는 남색 원
- 오류: `text-danger` 한 문장
- 빈 화면: 다음에 할 행동을 한 줄로 (“글쓰기” 등)
- 근무 칩: 지점별 근무형태 색을 그대로 사용

## 하지 않을 것

- 파란 그라데이션, `blue-700` / `slate-50` 일회성 팔레트
- 페이지마다 다른 버튼 색
- 장식용 다중 그림자
- 다크 모드 자동 전환
- 장식용 ALL-CAPS 라벨, 중점(·)으로 이어 붙인 메타 나열의 남용

## 공통 조각

`src/components/ui.tsx` — Tailwind 유틸로 구성. 새 화면은 여기 조각을 먼저 쓴다.

- `PageHeader` — 제목 + 한 줄 설명 + 우측 액션
- `Panel` — 카드 컨테이너 (선택적 title/actions)
- `Button` / `ButtonLink` — primary · ghost · danger · soft · gold · link, 크기 sm/md/lg
- `Field` · `TextInput` · `TextSelect` · `TextTextarea` · `CheckLabel`
- `Tabs` — 지점·필터 탭
- `Badge` · `Modal` · `Message` · `EmptyState` · `TableShell`

버튼은 포커스에 금색 링, 눌림에 아주 얕은 이동만 쓴다. 페이지마다 임의 `bg-blue-*` 버튼을 만들지 않는다.
