import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { EmploymentStatus, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type SessionUser = {
  id: string;
  name: string;
  role: Role;
  branchIds: number[];
  loginId: string;
};

declare module "next-auth" {
  interface User {
    role: Role;
    branchIds: number[];
    loginId: string;
  }
  interface Session {
    user: SessionUser;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: Role;
    branchIds?: number[];
    loginId?: string;
  }
}

async function resolveBranchIds(employeeId: number, role: Role, branchId: number | null) {
  if (role === Role.SUPERADMIN) {
    const rows = await prisma.branch.findMany({ select: { id: true } });
    return rows.map((r) => r.id);
  }
  if (role === Role.OWNER) {
    const rows = await prisma.employeeBranch.findMany({
      where: { employeeId },
      select: { branchId: true },
    });
    return rows.map((r) => r.branchId);
  }
  return branchId ? [branchId] : [];
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        loginId: { label: "아이디", type: "text" },
        password: { label: "비밀번호", type: "password" },
      },
      async authorize(credentials) {
        const loginId = String(credentials?.loginId ?? "").trim();
        const password = String(credentials?.password ?? "");
        if (!loginId || !password) return null;

        const employee = await prisma.employee.findUnique({ where: { loginId } });
        if (!employee || employee.status !== EmploymentStatus.ACTIVE) return null;

        const ok = await bcrypt.compare(password, employee.passwordHash);
        if (!ok) return null;

        const branchIds = await resolveBranchIds(employee.id, employee.role, employee.branchId);
        return {
          id: String(employee.id),
          name: employee.name,
          role: employee.role,
          branchIds,
          loginId: employee.loginId,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.branchIds = user.branchIds;
        token.loginId = user.loginId;
        token.sub = user.id;
        token.name = user.name;
      } else if (token.sub) {
        const employee = await prisma.employee.findUnique({
          where: { id: Number(token.sub) },
        });
        if (!employee || employee.status !== EmploymentStatus.ACTIVE) {
          return {};
        }
        token.role = employee.role;
        token.branchIds = await resolveBranchIds(employee.id, employee.role, employee.branchId);
        token.loginId = employee.loginId;
        token.name = employee.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (!token.sub || !token.role) {
        return session;
      }
      session.user = {
        ...session.user,
        id: token.sub,
        name: token.name ?? "",
        role: token.role,
        branchIds: token.branchIds ?? [],
        loginId: token.loginId ?? "",
      };
      return session;
    },
  },
});
