-- 사장보다 위인 최고관리자. PostgreSQL 15+ 에서 기존 값 앞에 추가한다.
ALTER TYPE "Role" ADD VALUE 'SUPERADMIN' BEFORE 'OWNER';
