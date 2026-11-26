# 직원 · 일정 마이그레이션 (SKADI 64 → yuksa-64)

## 구조 요약

### SKADI (원본)

| 테이블 | 핵심 |
|--------|------|
| `64_branches` | `branch_id`, `branch_name` |
| `employees` | `name`, `employee_type`(`직원`/`파트타임`), `status`(`근무`/`퇴사`), `branch_id`, 연락처·급여·보험 등 |
| `schedules` | `employee_id`, `branch_id`, `work_type`(`오픈`…`휴무`), `work_date`, 시간 |

- 로그인 계정은 `members`와 분리. 근무 직원 테이블에 비밀번호 없음.
- 활성 = **`근무`** (「근무중」 아님).

### yuksa-64 (대상)

| 모델 | 매핑 |
|------|------|
| `Branch` | `SP01` 육식사관학교 송파점 / `YT01` 육식사관학교 분당야탑점 |
| `Employee` | `role` STAFF\|PARTTIME, `loginId`=`s:{branchId}:{name}`, `passwordHash`, `status=ACTIVE` |
| `Schedule` | `WorkType` enum + optional `BranchShift` |

## 이관 규칙

1. `status = 근무` 만
2. **정래형, 홍승수** 제외 (이미 OWNER)
3. 비밀번호 전원 **`1234`**
4. `직원` → STAFF, `파트타임` → PARTTIME
5. 지점명에 송파 → SP01, 야탑/분당 → YT01
6. 일정은 이관된 직원만, `work_type` 한글 → WorkType / BranchShift 이름 매칭

## 실행

### 1) SKADI에서 JSON보내기

브라우저(admin/64 로그인):

`https://{스카디}/64/export_employees_schedules_json.php`

저장:

`yuksa-64/scripts/data/skadi-employees-schedules.json`

또는 `json_data/export_employees_schedules.json` 를 같은 경로로 복사.

또는 서버:

```bash
php 64/export_employees_schedules_json.php > /tmp/skadi-employees-schedules.json
```

### 2) yuksa-64에서 적용

로컬(Neon `DATABASE_URL` 필요):

```bash
cd yuksa-64
npm run emp:migrate:dry -- --file scripts/data/skadi-employees-schedules.json
npm run emp:migrate -- --file scripts/data/skadi-employees-schedules.json
```

프로덕션 DB에 시크릿 pull이 안 되면 `scripts/vercel-build.sh` 에 일시 one-shot 후 `vercel --prod` (적용 후 one-shot 제거).

스크립트: `scripts/migrate-skadi-employees-schedules.ts`  
샘플: `scripts/data/skadi-employees-schedules.sample.json`

## 로그인

- 직원/파트타임: 지점 선택 후 **이름** + 비밀번호 `1234` (staff 로그인 모드)
- 사장(정래형·홍승수): 기존 OWNER 계정 그대로
