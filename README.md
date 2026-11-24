# 육식사관학교 (64) 독립 관리 사이트

SKADI PHP `/64`와 분리된 Next.js 앱입니다.

## 스택

- Next.js App Router + TypeScript
- Auth.js (Credentials) + bcrypt
- Prisma + PostgreSQL (Neon / Prisma Postgres / Vercel)
- Vercel 배포

## 역할

| 등급 | 권한 |
|------|------|
| 사장 (최대 2명) | 배정된 여러 지점 운영, 지점 등록, 사장 계정 생성 |
| 지점장 | 자기 지점 일정/메모/근태/직원/급여/통계/광고 |
| 직원·파트타임 | 자기 지점 일정 조회만 (메모 숨김) |

## 로컬 실행

```bash
cp .env.example .env
# DATABASE_URL, AUTH_SECRET 설정

npm install
npx prisma migrate dev
npm run db:seed
npm run dev
```

시드 기본 계정: `SEED_OWNER_LOGIN_ID` / `SEED_OWNER_PASSWORD` (기본 `owner` / `change-me-now`)

## Vercel + Neon

1. [Neon](https://neon.tech) 또는 Vercel Storage → Postgres 생성
2. Vercel 프로젝트에 GitHub 저장소 연결
3. Environment Variables
   - `DATABASE_URL`
   - `AUTH_SECRET` (`openssl rand -base64 32`)
   - `AUTH_TRUST_HOST=true`
   - (선택) `AUTH_URL=https://your-domain.com`
4. Build Command: `prisma generate && next build`
5. 배포 후 `npx prisma migrate deploy` 및 `npm run db:seed` (로컬에서 production URL로 1회)

## 임시 Prisma Postgres claim

개발용 임시 DB를 썼다면 만료 전에 claim 하세요. 영구 Neon으로 교체하는 것을 권장합니다.

## GitHub

권장 원격: `https://github.com/ingyw/64`
