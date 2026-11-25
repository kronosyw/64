# 급여대장 생성 · 출력 스펙 (SKADI 64 원본 분석)

이 문서는 기존 SKADI `64/payroll` 의 **생성·자동계산·A4 인쇄·지급처리** 동작을 분석해,  
독립 Next.js 앱(`yuksa-64`)에서 **동일 업무 규칙·동일 출력 양식**으로 재구현하기 위한 스펙이다.

원본 파일:

| 파일 | 역할 |
|------|------|
| `64/payroll/index.php` | 목록 (지점·연월 필터, 작성중/완료/지급완료) |
| `64/payroll/create.php` | 작성·편집·A4 인쇄 UI |
| `64/payroll/payroll_api.php` | list/get/get_employees/save/confirm_payment/update_status |
| `64/payroll/payment.php` | 세무 확정액·계좌 입금 리스트 인쇄 |
| `64/payroll/guide.php` | 3.3% 계산 기준서 (인쇄 가능) |
| `64/payroll/create_payroll_tables.sql` | 테이블 정의 |

---

## 1. 업무 흐름

```mermaid
flowchart LR
  list[목록_index] --> create[작성_create]
  create --> load[직원자동불러오기]
  load --> schedules[schedules집계]
  schedules --> calc[급여_공제계산]
  calc --> save[저장]
  save --> printA4[A4인건비현황인쇄]
  save --> payment[지급처리_payment]
  payment --> printPay[지급현황인쇄]
```

1. 지점 + 연 + 월 선택
2. **직원 자동 불러오기** → 해당 지점 직원 + 당월 `schedules` 집계
3. 화면에서 수동 수정 (월급여·근무일·초과시간·시급 등)
4. **저장** → `64_payroll` + `64_payroll_items` (지점·연·월 유니크)
5. **A4 인쇄** → 인건비 현황 양식
6. (선택) **지급 처리** → 세무 확정액 입력 후 계좌별 입금 리스트 인쇄

상태: `작성중` → `완료` → `지급완료`

---

## 2. 데이터 모델

### 2.1 헤더 `payrolls` (원본 `64_payroll`)

| 필드 | 타입 | 설명 |
|------|------|------|
| id | PK | |
| branch_id | FK | 지점 |
| year, month | int | 대상 연월 |
| tax_type | `세전` \| `세후` | 화면·인쇄 표시 기준 |
| status | `작성중` \| `완료` \| `지급완료` | |
| memo | text | 내부 메모 (인쇄 제외) |
| UNIQUE(branch_id, year, month) | | 지점당 월 1건 |

### 2.2 항목 `payroll_items` (원본 `64_payroll_items`)

| 필드 | 설명 |
|------|------|
| employee_id | NULL 허용 (수기 행) |
| sort_order | 정렬. **≥100** 이면 4대보험 **입퇴사 소표** 행 |
| employee_category | `정직원(4대보험)` \| `사업소득자(3.3%)` \| `일용직` |
| employee_name, ssn, hire_date | |
| monthly_salary | 월급제: 계약월급여 / 파트·일용: 시급 또는 지급액 의미 혼용 |
| actual_hours | 실근무시간 (휴게 차감 후) |
| work_days / off_days | 근무일 / 휴무일 |
| week_mode | 5=주5일(÷252), 6=주6일(÷260). 4대보험 시급 참고는 ÷209 |
| overtime_hours | 초과시간 |
| is_full_attendance | 만근 |
| is_hired / is_retired | 당월 입사 / 퇴사(또는 퇴사 상태) |
| base_pay, overtime_pay, total_pay | 기본급, 초과수당, 세전 합계 |
| tax_amount, net_pay | 공제, 세후 |
| item_notes | 비고 |
| confirmed_net_pay | 확정 실지급 (지급처리) |
| confirmed_4ins | 확정 4대보험 공제 |
| confirmed_income_tax / confirmed_local_tax | 확정 소득세·지방세 |

직원 마스터 연동:

- `employees.monthly_salary` — 정직원·사업소득자=월급여, **파트타임=시급**
- `employees.insurance_type` — `4대보험` \| `3.3%`
- 파트타임은 강제 `3.3%` 카테고리로 취급

---

## 3. 직원 자동 불러오기 (`get_employees`)

### 3.1 대상 직원

지점 `branch_id` 기준:

- `status = 근무` **또는**
- 당월 해당 지점 `schedules` 이력이 있는 퇴사자

이름+`employee_type` 중복 제거.

### 3.2 스케줄 → 시간 집계 (일별)

각 `schedules` 행 (`work_type !== 휴무`):

1. `start_time` ~ `end_time` 시간 차 (종료 ≤ 시작이면 +24h)
2. **휴게**: 평일(월~금)이고 근무시간 > 5시간이면 **1.5시간** 차감. 주말은 휴게 없음
3. `actual_hours +=` 일 실근무
4. `work_days++` (휴무는 `off_days++` 만)

초과시간 (총량):

```text
overtime_hours = max(0, actual_hours - work_days × 10)
```

### 3.3 입·퇴사 · 만근 플래그

- `is_hired`: `hire_date` 가 해당 연월 안
- `is_retired`: `status !== 근무`
- `is_full_attendance`: `work_days > 0` 이고 입사·퇴사 아님

### 3.4 카테고리 매핑

| 조건 | employee_category |
|------|-------------------|
| insurance 4대보험 (파트 아님) | 정직원(4대보험) |
| 3.3% 또는 파트타임 | 사업소득자(3.3%) |
| (수기) 일용직 섹션 | 일용직 |

자동 불러오기 API는 주로 4대보험 / 3.3%(+파트)를 채우고, 일용직은 화면 수기·최소 빈 행으로 둔다.

---

## 4. 급여 계산 공식 (재구현 필수)

공통 상수:

| 이름 | 값 | 용도 |
|------|-----|------|
| 주5일 시급 분모 | **252** | 사업소득자 시급 = 월급÷252 |
| 주6일 시급 분모 | **260** | 주6일 선택 시 |
| 4대보험 시급 참고 분모 | **209** | UI 참고 시급 (자동 세전은 월급 고정) |
| 일 소정 | **10h** | 초과 = 총실근무 − 근무일×10 |
| 평일 휴게 | **1.5h** | 평일 5h 초과 근무일 |

가이드(`guide.php`)의 월평균 근거:

```text
(주 소정 50h + 주휴 8h) × 4.345 ≈ 252h
시급 = 월급 ÷ 252
```

### 4.1 정직원 (4대보험)

```text
base_pay  = monthly_salary
total_pay = monthly_salary   // 세전 = 계약월급여 그대로
overtime_hours = 참고용 표시 (자동 반영으로 세전을 바꾸지 않음 — API 기준)
tax = calcTax4(total_pay)
net = total_pay - tax
```

`calcTax4` (근로자 부담 근사):

```text
국민연금   = pay × 0.045
건강보험   = pay × 0.03545
장기요양   = 건강보험 × 0.1281
고용보험   = pay × 0.009
tax_amount = round(합)
```

### 4.2 사업소득자 3.3% (월급제)

시급: `ovtRate = round(monthly_salary / (week_mode===6 ? 260 : 252))`

**만근** (`is_full_attendance`):

```text
base_pay     = monthly_salary
overtime_pay = round(overtime_hours × ovtRate)
total_pay    = base_pay + overtime_pay
```

**미만근** (입·퇴사 달 등):

```text
weekdays     = 해당월 월~금 일수 (공휴일도 평일이면 포함)
dailyRate    = monthly_salary / weekdays
base_pay     = round(work_days × dailyRate)
overtime_pay = round(overtime_hours × ovtRate)
total_pay    = base_pay + overtime_pay
```

> `guide.php` 퇴사자 분리 공식(기본급=일×10×시급 + 주휴=⌊일/5⌋×8×시급)은 **기준서 문서**에 있고,  
> **자동 불러오기 API의 미만근은 일급×근무일** 방식을 사용한다.  
> Next 재구현 시: API는 현행 API와 맞추고, 가이드 페이지는 별도 문서로 유지.

### 4.3 파트타임 (시급제 → 화면상 3.3% 섹션)

```text
hourly_rate = employees.monthly_salary   // 컬럼을 시급으로 사용
base_pay    = round(hourly_rate × actual_hours)
total_pay   = base_pay
overtime_pay = 0
```

저장 시 화면의 “월급여액” 칸에는 **계산된 지급액**이 들어갈 수 있음 (readonly).

### 4.4 일용직

```text
total_pay = round(hourly_rate × actual_hours)  // 화면에서 시급·시간 입력
또는 지급금액 수기
tax = calcTax33(total_pay)
```

비고 문구: *3개월 미만, 월 8일 미만 and 60시간 미만자*

### 4.5 3.3% 공제 `calcTax33`

```text
incomeTax = floor(pay × 0.03 / 10) × 10     // 10원 절사
localTax  = floor(incomeTax × 0.1 / 10) × 10
tax_amount = incomeTax + localTax
net_pay = pay - tax_amount
```

### 4.6 세전/세후 토글

- **세전 표시**: `total_pay`
- **세후 표시**: `net_pay = total_pay - tax_amount`
- 헤더 `tax_type` 저장. 인쇄 시 컬럼 헤더·금액 모두 현재 토글 기준.

---

## 5. 화면 구성 (`create`)

### 5.1 상단 컨트롤 (인쇄 시 숨김 `.no-print`)

- 지점 / 연도 / 월
- 세전↔세후 토글
- 상태 (작성중/완료)
- 직원 자동 불러오기 / 저장 / **A4 인쇄** / 목록

### 5.2 섹션 1 — 정직원 (4대보험) `bg-blue-50`

**편집 컬럼**

| 컬럼 | 인쇄 |
|------|------|
| 구분(NO) | O |
| 성함 | O |
| 퇴사 체크 | X |
| 주민등록번호 | O |
| 입사년월일 | O |
| 월급여액 (+인쇄용 지급액 span) | O (인쇄 시 input 숨기고 `print-pay-val`) |
| 세전/세후 금액 | O |
| 근무제 주5/주6 | X |
| 근무/휴무 일수 | X |
| 근무시간 | X |
| 초과시간 | X |
| 시급 | X |
| 비고 | O |

합계 행: 세전/세후 금액 합.

**입퇴사 소표** (인쇄 포함): 입사/퇴사, 성함, 주민번호, 입퇴사일, 계약월급여(입사), 계약직여부, 퇴사사유.  
안내: *퇴사사유 미기재 시 과태료 대상.*

### 5.3 섹션 2 — 사업소득자 (3.3%) `bg-yellow-50`

컬럼 구성은 4대보험과 유사. 파트타임 행은 월급여 readonly·시급 입력으로 `calc33Pay`.

### 5.4 섹션 3 — 일용직 `bg-orange-50`

인쇄에도 **근무일수** 컬럼 노출. 시급×시간 또는 지급금액 수기.

### 5.5 메모

`.no-print` — 저장만, 인쇄 제외.

### 5.6 빈 행

카테고리별 최소 행 수 (원본): 4대보험 6, 3.3% 9, 일용 4.  
이름 없는 행은 인쇄 시 `print-blank-row` (값 숨김, 칸만 유지).

---

## 6. A4 인쇄 양식 (인건비 현황)

### 6.1 페이지

```css
@page { size: A4 landscape; margin: 8mm 10mm; }  /* create.php 기준 가로 */
/* payment·guide 는 portrait 10~15mm */
```

`window.print()` 사용. 별도 PDF 라이브러리 없음.

### 6.2 타이틀

```text
육식사관학교  {지점명}  {N}월 인건비 현황
```

상·하 1.5pt 실선. 화면에서는 `#printTitle` 숨김, 인쇄 직전 표시.

### 6.3 인쇄 시 변환 규칙

| 화면 | 인쇄 |
|------|------|
| `.no-print` | 숨김 |
| `월급여액` input | 숨김 → `.print-pay-val` 에 세전/세후 금액 |
| `세전/세후` 헤더 | 현재 토글 문자열로 교체 |
| 금액 옆 | CSS `::after` 로 ` (세전)` / ` (세후)` (스타일에 따라) |
| 빈 이름 행 | 입력값 투명, NO만 보이도록 |
| 배경색 | `print-color-adjust: exact` 로 섹션 헤더색 유지 |

### 6.4 인쇄용 테이블 골격 (재현용)

```text
[타이틀]
1. 정직원 (4대보험 가입)
   | NO | 성함 | 주민등록번호 | 입사년월일 | 월급여/지급액 | 세전|세후 | 비고 |
   |----|------|--------------|------------|---------------|----------|------|
   | 합계 ... |

   * 4대보험 입사/퇴사자 발생시 작성
   | 입사/퇴사 | 성함 | 주민번호 | 입퇴사일 | 계약월급여 | 계약직 | 퇴사사유 |

2. 사업소득자 (3.3% 프리랜서)
   (동일 골격)

3. 일용직 (아르바이트)
   | NO | 이름 | 주민번호 | 입사년월일 | 지급금액 | 세전|세후 | 근무일수 | 비고 |
```

폰트: 본문 ~8–11pt, 헤더 배경 `#e8f0fe`, 테두리 `#9ca3af`.

### 6.5 구현 팁 (Next.js)

- `@media print` 를 global CSS + 페이지 전용 클래스로 이식
- 인쇄 전 `document.title` / 타이틀 DOM 세팅 후 `window.print()`
- 서버 PDF가 필요하면 2차로 `react-to-print` 또는 Playwright PDF — 1차는 브라우저 인쇄와 동일하게

---

## 7. 지급 처리 인쇄 (`payment`)

세무회계에서 받은 **확정 급여대장** 기준으로 입력.

### 7.1 섹션

1. **정직원**: NO, 성명, 세전금액, 확정 실지급(세후), 4대보험 공제, 은행, 계좌, 예금주  
2. **3.3%**: 세전, 확정 실지급, 소득세, 지방소득세, 계좌  
3. **일용직**: 3.3%와 동일 공제 컬럼  

하단 전체 합계 + **계좌별 입금 요청 리스트** (계좌 있는 직원만).

### 7.2 인쇄 타이틀

```text
육식사관학교 {지점} {년}년 {월}월 급여 지급 현황
```

`@page { size: A4; margin: 10mm 12mm; }` (세로).

---

## 8. 계산 기준서 인쇄 (`guide`)

별도 문서. 사업소득자 3.3% 중심.

포함 섹션:

1. 시급 산정 (252h)
2. 만근 지급
3. 미만근 지급 (근무일/평일수 × 월급)
4. 퇴사자 정산 (일×10×시급 + ⌊일/5⌋×8×시급 + 초과)
5. 공식 검증 (22일 → 월급)
6. 3.3% 세금
7. 근거 법령

Next 앱: `/payroll/guide` 정적·마크다운 렌더 + 인쇄 버튼으로 이식 가능.

---

## 9. API 계약 (재구현)

| action / method | 설명 |
|-----------------|------|
| GET list | 지점·연월 필터 목록 |
| GET get?id= | 헤더+items |
| GET get_employees?branch_id&year&month | 자동 불러오기 페이로드 (§3–4) |
| POST save | upsert 헤더, items 전체 교체 |
| POST confirm_payment | confirmed_* 저장 |
| POST update_status | 작성중/완료/지급완료 |

자동 불러오기 응답 항목 예시:

```json
{
  "employee_id": 1,
  "employee_name": "홍길동",
  "employee_category": "사업소득자(3.3%)",
  "employee_type": "직원",
  "ssn": "900101-1******",
  "hire_date": "2024-01-01",
  "monthly_salary": 3000000,
  "hourly_rate": 0,
  "is_part_time_hourly": 0,
  "actual_hours": 210.5,
  "work_days": 20,
  "off_days": 2,
  "week_mode": 5,
  "overtime_hours": 10.5,
  "is_full_attendance": 1,
  "base_pay": 3000000,
  "overtime_pay": 125000,
  "total_pay": 3125000,
  "tax_amount": 103120,
  "net_pay": 3021880,
  "is_hired": 0,
  "is_retired": 0,
  "item_notes": ""
}
```

---

## 10. Next.js 구현 체크리스트

### Phase A — 엔진

- [ ] `lib/payroll/calc.ts`: `countWeekdays`, `calcTax4`, `calcTax33`, 카테고리별 `computePay`
- [ ] `lib/payroll/fromSchedules.ts`: 휴게 1.5h, 초과 = hours − days×10
- [ ] Prisma 모델에 `confirmed_*`, `week_mode`, `overtime_hours`, `sort_order` 반영 (마이그레이션)
- [ ] API: employees 자동집계 / save / status / payment confirm

### Phase B — 작성 UI

- [ ] `/payroll` 목록
- [ ] `/payroll/[id]` 또는 `/payroll/create` 3섹션 테이블 + 토글 + 저장
- [ ] 입퇴사 소표 (sort_order ≥ 100)
- [ ] 권한: 사장·지점장 + 세션 지점 범위

### Phase C — 인쇄

- [ ] A4 인건비 현황 `@media print` (§6)
- [ ] 지급 현황 페이지 + 인쇄 (§7)
- [ ] `/payroll/guide` 기준서 (§8)

### Phase D — 검증 시나리오

- [ ] 만근 3.3% 월급 300만 + 초과 5h → 시급 11905, 초과수당 59525
- [ ] 미만근 18/22 평일 → 기본급 2,454,545
- [ ] 3.3% 공제 10원 절사
- [ ] 파트: 시급×시간
- [ ] 4대보험: 세전=월급, 공제 4종 합
- [ ] 인쇄 시 no-print 숨김, 타이틀·합계·빈행 동작

---

## 11. 원본 대비 주의점

1. **가이드 퇴사 공식 ≠ API 미만근 공식** — 둘 다 문서화하고 제품에서는 API 방식을 기본으로 한다. 퇴사 정산을 가이드식으로 바꾸려면 명시적 토글/플래그가 필요.
2. **파트타임 `monthly_salary` 의미 이중** — 마스터=시급, 급여 행 표시=지급액일 수 있음. UI에 `hourly_rate` 필드를 분리하는 편이 안전.
3. **주민번호** — 원본은 암호화 저장·복호화 표시. Next에서는 암호화 또는 마스킹 정책을 먼저 정한다.
4. **일용직** — 자동 집계보다 수기 비중이 큼.
5. **세율 상수** — 2026 기준 하드코딩. 설정 테이블화 여지는 후순위.

---

## 12. 참고 경로 (SKADI)

```text
skadi admin/64/payroll/index.php
skadi admin/64/payroll/create.php          ← 인쇄 CSS·3섹션·printPayroll()
skadi admin/64/payroll/payroll_api.php     ← getEmployees, calcTax, countWeekdays
skadi admin/64/payroll/payment.php
skadi admin/64/payroll/guide.php
skadi admin/64/payroll/create_payroll_tables.sql
```

---

## 변경 이력

| 날짜 | 내용 |
|------|------|
| 2026-03-25 | SKADI 64 급여대장 생성·출력 분석 스펙 초안 |
