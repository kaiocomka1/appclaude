import { PrismaClient, TipoLancamento } from "../app/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import path from "path";

// Always resolve DB path from project root (CWD) to match DATABASE_URL convention
const dbPath = path.resolve(process.cwd(), "prisma/dev.db");

// PrismaLibSql is a factory that takes a libsql config, not a client instance
const adapter = new PrismaLibSql({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Categorias de ENTRADA
  const entradas: { nome: string; deSistema: boolean }[] = [
    { nome: "VENDA_MENTORIA", deSistema: true },
    { nome: "VENDA_OUTROS", deSistema: false },
    { nome: "ANTECIPACAO", deSistema: true },
    { nome: "RENDIMENTO", deSistema: false },
    { nome: "SALARIO_PROLABORE", deSistema: false },
    { nome: "OUTRAS_ENTRADAS", deSistema: false },
  ];

  for (const cat of entradas) {
    await prisma.categoria.upsert({
      where: { nome: cat.nome },
      update: {},
      create: { nome: cat.nome, tipo: TipoLancamento.ENTRADA, deSistema: cat.deSistema },
    });
  }

  // Categorias de SAIDA
  const saidas: { nome: string; deSistema: boolean }[] = [
    { nome: "ADS", deSistema: true },
    { nome: "TAXA_PLATAFORMA", deSistema: true },
    { nome: "TAXA_ANTECIPACAO", deSistema: true },
    { nome: "FERRAMENTAS_SOFTWARE", deSistema: false },
    { nome: "IMPOSTOS", deSistema: false },
    { nome: "ALIMENTACAO", deSistema: false },
    { nome: "MORADIA", deSistema: false },
    { nome: "TRANSPORTE", deSistema: false },
    { nome: "SAUDE", deSistema: false },
    { nome: "EDUCACAO", deSistema: false },
    { nome: "LAZER", deSistema: false },
    { nome: "CARTAO_FATURA", deSistema: false },
    { nome: "OUTRAS_SAIDAS", deSistema: false },
  ];

  for (const cat of saidas) {
    await prisma.categoria.upsert({
      where: { nome: cat.nome },
      update: {},
      create: { nome: cat.nome, tipo: TipoLancamento.SAIDA, deSistema: cat.deSistema },
    });
  }

  // Cartão de exemplo
  await prisma.cartao.upsert({
    where: { id: "cartao-exemplo" },
    update: {},
    create: {
      id: "cartao-exemplo",
      nome: "Nubank Roxinho",
      bandeira: "MASTERCARD",
      limite: 5000,
      diaFechamento: 3,
      diaVencimento: 10,
      ativo: true,
    },
  });

  // Settings singleton
  await prisma.settings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });

  console.log("Seed concluído: 6 entradas + 13 saídas + 1 cartão + settings.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
