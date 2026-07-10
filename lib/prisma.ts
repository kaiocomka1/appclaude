import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import path from "path";

// DATABASE_URL must be an absolute file: URL for libsql adapter
const dbUrl = process.env.DATABASE_URL
  ?? `file:${path.resolve(process.cwd(), "prisma/dev.db")}`;

function makePrisma() {
  // PrismaLibSql is a factory that takes a libsql config object
  const adapter = new PrismaLibSql({ url: dbUrl });
  return new PrismaClient({ adapter });
}

declare global {
  // eslint-disable-next-line no-var
  var __prisma: ReturnType<typeof makePrisma> | undefined;
}

const prisma = globalThis.__prisma ?? makePrisma();
if (process.env.NODE_ENV !== "production") globalThis.__prisma = prisma;

export default prisma;
