# Vercel 배포 가이드

## 1. Neon Postgres

1. https://console.neon.tech 에서 프로젝트 생성 (또는 Vercel → Storage → Neon)
2. Connection string 복사 → `DATABASE_URL`

## 2. GitHub → Vercel

1. https://vercel.com/new 에서 저장소 연결  
   - 현재 원격: `https://github.com/kronosyw/64`  
   - 원하시면 `ingyw/64`로 transfer 후 재연결
2. Framework: Next.js
3. Build Command: `prisma generate && next build`
4. Install Command: `npm install`

## 3. Environment Variables

| Key | Value |
|-----|--------|
| `DATABASE_URL` | Neon connection string (`?sslmode=require`) |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `AUTH_TRUST_HOST` | `true` |
| `AUTH_URL` | `https://your-domain.com` (도메인 연결 후) |
| `SEED_OWNER_LOGIN_ID` | 사장 아이디 (시드용) |
| `SEED_OWNER_PASSWORD` | 사장 초기 비밀번호 |

## 4. 마이그레이션 · 시드

배포 전/후 로컬에서 production DB로 1회:

```bash
DATABASE_URL="postgresql://..." npx prisma migrate deploy
DATABASE_URL="postgresql://..." npm run db:seed
```

## 5. 도메인

Vercel → Project → Settings → Domains 에서 커스텀 도메인 추가.

## 임시 Prisma Postgres

개발 중 `create-db`로 만든 DB는 24시간 후 삭제됩니다.  
영구 사용하려면 claim URL을 열어 계정에 붙이거나 Neon으로 교체하세요.
