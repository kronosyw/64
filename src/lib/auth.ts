import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { EmploymentStatus, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { needsStaffLogin } from "@/lib/employees";

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
        mode: { label: "mode", type: "text" },
        loginId: { label: "아이디", type: "text" },
        branchId: { label: "지점", type: "text" },
        name: { label: "이름", type: "text" },
        password: { label: "비밀번호", type: "password" },
      },
      async authorize(credentials) {
        const mode = String(credentials?.mode ?? "admin").trim();
        const password = String(credentials?.password ?? "");
        if (!password) return null;

        let employee =
          mode === "staff"
            ? null
            : await (async () => {
                const loginId = String(credentials?.loginId ?? "").trim();
                if (!loginId) return null;
                return prisma.employee.findUnique({ where: { loginId } });
              })();

        if (mode === "staff") {
          const branchId = Number(credentials?.branchId);
          const name = String(credentials?.name ?? "").trim();
          if (!branchId || !name) return null;
          employee = await prisma.employee.findFirst({
            where: {
              branchId,
              name,
              role: { in: [Role.STAFF, Role.PARTTIME] },
              status: EmploymentStatus.ACTIVE,
            },
          });
        }

        if (!employee || employee.status !== EmploymentStatus.ACTIVE) return null;

        // Staff portal rejects manager+ accounts even if somehow matched
        if (mode === "staff" && !needsStaffLogin(employee.role)) return null;
        // Admin portal rejects staff accounts (they use staff login)
        if (mode !== "staff" && needsStaffLogin(employee.role)) return null;

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
