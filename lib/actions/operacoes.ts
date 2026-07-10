"use server";

import { z } from "zod";
import prisma from "@/lib/prisma";
import { calcularAntecipacao, calcularVendaPlataforma } from "@/lib/logic";
import {
  TipoLancamento,
  StatusLancamento,
  FormaPagamento,
  Escopo,
} from "@/app/generated/prisma/enums";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type RecebívelRow = {
  id: string;
  descricao: string;
  valor: number;
  data: string;
  categoriaNome: string;
  grupoId: string | null;
  parcela: number | null;
  totalParcelas: number | null;
};

export type FormStateOp = { erro?: string; sucesso?: boolean };

// ---------------------------------------------------------------------------
// Listar recebíveis para baixa na antecipação
// ---------------------------------------------------------------------------

export async function listarRecebiveis(): Promise<RecebívelRow[]> {
  const items = await prisma.lancamento.findMany({
    where: {
      tipo: TipoLancamento.ENTRADA,
      status: StatusLancamento.PREVISTO,
      formaPagamento: FormaPagamento.PLATAFORMA,
    },
    include: { categoria: true },
    orderBy: { data: "asc" },
  });
  return items.map((l) => ({
    id: l.id,
    descricao: l.descricao,
    valor: l.valor.toNumber(),
    data: l.data.toISOString(),
    categoriaNome: l.categoria.nome,
    grupoId: l.grupoId,
    parcela: l.parcela ?? null,
    totalParcelas: l.totalParcelas ?? null,
  }));
}

// ---------------------------------------------------------------------------
// Antecipação
// ---------------------------------------------------------------------------

const schemaAntecipacao = z.object({
  descricao: z.string().min(1).max(255).default("Antecipação"),
  valorBruto: z.coerce.number().positive(),
  valorLiquido: z.coerce.number().positive(),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  escopo: z.enum([Escopo.PESSOAL, Escopo.EMPRESARIAL]),
});

export async function registrarAntecipacao(
  _prev: FormStateOp,
  formData: FormData,
): Promise<FormStateOp> {
  const raw = Object.fromEntries(formData);
  const recebivelIds = formData.getAll("recebivelId").map(String).filter(Boolean);

  const parsed = schemaAntecipacao.safeParse(raw);
  if (!parsed.success) {
    return { erro: parsed.error.issues.map((e) => e.message).join("; ") };
  }

  const d = parsed.data;

  if (d.valorLiquido > d.valorBruto) {
    return { erro: "Valor líquido não pode ser maior que o valor bruto." };
  }

  const [catAntecipacao, catTaxa] = await Promise.all([
    prisma.categoria.findFirst({ where: { nome: "ANTECIPACAO" } }),
    prisma.categoria.findFirst({ where: { nome: "TAXA_ANTECIPACAO" } }),
  ]);
  if (!catAntecipacao || !catTaxa) {
    return { erro: "Categorias de sistema não encontradas. Execute o seed." };
  }

  const grupoId = crypto.randomUUID();
  const dataFato = new Date(d.data + "T12:00:00.000Z");

  const efeito = calcularAntecipacao({
    valorBruto: d.valorBruto,
    valorLiquido: d.valorLiquido,
    data: dataFato,
    grupoId,
    categoriaAntecipacaoId: catAntecipacao.id,
    categoriaTaxaId: catTaxa.id,
    escopo: d.escopo,
    descricao: d.descricao,
    recebivelIds,
  });

  await prisma.$transaction(async (tx) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await tx.lancamento.createMany({ data: efeito.lancamentos as any[] });
    if (efeito.cancelar.length > 0) {
      await tx.lancamento.updateMany({
        where: { id: { in: efeito.cancelar } },
        data: { status: StatusLancamento.CANCELADO },
      });
    }
  });

  return { sucesso: true };
}

// ---------------------------------------------------------------------------
// Venda parcelada via plataforma
// ---------------------------------------------------------------------------

const schemaVenda = z.object({
  descricao: z.string().min(1).max(255),
  valorBruto: z.coerce.number().positive(),
  taxaPercentual: z.coerce.number().min(0).max(100),
  totalParcelas: z.coerce.number().int().min(1).max(60),
  dataInicial: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  escopo: z.enum([Escopo.PESSOAL, Escopo.EMPRESARIAL]),
  categoriaVendaId: z.string().min(1),
});

export async function registrarVendaPlataforma(
  _prev: FormStateOp,
  formData: FormData,
): Promise<FormStateOp> {
  const raw = Object.fromEntries(formData);
  const parsed = schemaVenda.safeParse(raw);
  if (!parsed.success) {
    return { erro: parsed.error.issues.map((e) => e.message).join("; ") };
  }

  const d = parsed.data;

  const catTaxa = await prisma.categoria.findFirst({
    where: { nome: "TAXA_PLATAFORMA" },
  });
  if (!catTaxa) {
    return { erro: "Categoria TAXA_PLATAFORMA não encontrada. Execute o seed." };
  }

  const grupoId = crypto.randomUUID();
  const dataInicial = new Date(d.dataInicial + "T12:00:00.000Z");

  const lancamentos = calcularVendaPlataforma({
    descricao: d.descricao,
    valorBruto: d.valorBruto,
    taxaPercentual: d.taxaPercentual,
    totalParcelas: d.totalParcelas,
    dataInicial,
    grupoId,
    categoriaTaxaPlataformaId: catTaxa.id,
    categoriaVendaId: d.categoriaVendaId,
    escopo: d.escopo,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await prisma.lancamento.createMany({ data: lancamentos as any[] });
  return { sucesso: true };
}
