"use server";

import { z } from "zod";
import prisma from "@/lib/prisma";
import {
  TipoLancamento,
  Escopo,
  FormaPagamento,
  StatusLancamento,
  OrigemLancamento,
} from "@/app/generated/prisma/enums";

// ---------------------------------------------------------------------------
// Tipos serializados (sem Decimal nem Date nativos — seguros para Client Components)
// ---------------------------------------------------------------------------

export type LancamentoRow = {
  id: string;
  tipo: string;
  escopo: string;
  categoriaId: string;
  categoriaNome: string;
  descricao: string;
  valor: number;
  data: string; // ISO string
  formaPagamento: string;
  cartaoId: string | null;
  cartaoNome: string | null;
  parcela: number | null;
  totalParcelas: number | null;
  grupoId: string | null;
  status: string;
  origem: string;
  criadoEm: string;
};

export type TotaisRow = {
  totalEntradas: number;
  totalSaidas: number;
  saldo: number;
};

export type PaginaLancamentos = {
  itens: LancamentoRow[];
  total: number;
  pagina: number;
  totalPaginas: number;
  totais: TotaisRow;
};

export type FiltrosLancamentos = {
  dataInicio?: string;
  dataFim?: string;
  escopo?: string;
  tipo?: string;
  categoriaId?: string;
  cartaoId?: string;
  status?: string;
  origem?: string;
  busca?: string;
  pagina?: number;
};

// ---------------------------------------------------------------------------
// Listar
// ---------------------------------------------------------------------------

const POR_PAGINA = 50;

export async function listarLancamentos(
  filtros: FiltrosLancamentos,
): Promise<PaginaLancamentos> {
  const pagina = Math.max(1, filtros.pagina ?? 1);
  const skip = (pagina - 1) * POR_PAGINA;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  if (filtros.dataInicio || filtros.dataFim) {
    where.data = {};
    if (filtros.dataInicio) where.data.gte = new Date(filtros.dataInicio);
    if (filtros.dataFim) {
      const fim = new Date(filtros.dataFim);
      fim.setHours(23, 59, 59, 999);
      where.data.lte = fim;
    }
  }
  if (filtros.escopo) where.escopo = filtros.escopo;
  if (filtros.tipo) where.tipo = filtros.tipo;
  if (filtros.categoriaId) where.categoriaId = filtros.categoriaId;
  if (filtros.cartaoId) where.cartaoId = filtros.cartaoId;
  if (filtros.status) where.status = filtros.status;
  if (filtros.origem) where.origem = filtros.origem;
  if (filtros.busca) {
    where.descricao = { contains: filtros.busca };
  }

  const [registros, total, agregacao] = await Promise.all([
    prisma.lancamento.findMany({
      where,
      include: { categoria: true, cartao: true },
      orderBy: [{ data: "desc" }, { criadoEm: "desc" }],
      skip,
      take: POR_PAGINA,
    }),
    prisma.lancamento.count({ where }),
    prisma.lancamento.groupBy({
      by: ["tipo"],
      where,
      _sum: { valor: true },
    }),
  ]);

  let totalEntradas = 0;
  let totalSaidas = 0;
  for (const g of agregacao) {
    const soma = g._sum.valor?.toNumber() ?? 0;
    if (g.tipo === TipoLancamento.ENTRADA) totalEntradas = soma;
    else totalSaidas = soma;
  }

  const itens: LancamentoRow[] = registros.map((l) => ({
    id: l.id,
    tipo: l.tipo,
    escopo: l.escopo,
    categoriaId: l.categoriaId,
    categoriaNome: l.categoria.nome,
    descricao: l.descricao,
    valor: l.valor.toNumber(),
    data: l.data.toISOString(),
    formaPagamento: l.formaPagamento,
    cartaoId: l.cartaoId ?? null,
    cartaoNome: l.cartao?.nome ?? null,
    parcela: l.parcela ?? null,
    totalParcelas: l.totalParcelas ?? null,
    grupoId: l.grupoId ?? null,
    status: l.status,
    origem: l.origem,
    criadoEm: l.criadoEm.toISOString(),
  }));

  return {
    itens,
    total,
    pagina,
    totalPaginas: Math.max(1, Math.ceil(total / POR_PAGINA)),
    totais: { totalEntradas, totalSaidas, saldo: totalEntradas - totalSaidas },
  };
}

// ---------------------------------------------------------------------------
// Schemas de validação
// ---------------------------------------------------------------------------

const schemaLancamento = z.object({
  tipo: z.enum([TipoLancamento.ENTRADA, TipoLancamento.SAIDA]),
  escopo: z.enum([Escopo.PESSOAL, Escopo.EMPRESARIAL]),
  categoriaId: z.string().min(1),
  descricao: z.string().min(1).max(255),
  valor: z.coerce.number().positive(),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  formaPagamento: z.enum([
    FormaPagamento.PIX,
    FormaPagamento.CARTAO_CREDITO,
    FormaPagamento.CARTAO_DEBITO,
    FormaPagamento.DINHEIRO,
    FormaPagamento.BOLETO,
    FormaPagamento.PLATAFORMA,
  ]),
  cartaoId: z.string().optional().nullable(),
  parcela: z.coerce.number().int().positive().optional().nullable(),
  totalParcelas: z.coerce.number().int().positive().optional().nullable(),
  status: z
    .enum([
      StatusLancamento.CONFIRMADO,
      StatusLancamento.PREVISTO,
      StatusLancamento.CANCELADO,
    ])
    .default(StatusLancamento.CONFIRMADO),
  origem: z
    .enum([
      OrigemLancamento.MANUAL,
      OrigemLancamento.FOTO,
      OrigemLancamento.RECORRENTE,
    ])
    .default(OrigemLancamento.MANUAL),
});

export type FormState = { erro?: string; sucesso?: boolean };

// ---------------------------------------------------------------------------
// Criar
// ---------------------------------------------------------------------------

export async function criarLancamento(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const raw = Object.fromEntries(formData);
  const parsed = schemaLancamento.safeParse(raw);
  if (!parsed.success) {
    return { erro: parsed.error.issues.map((e) => e.message).join("; ") };
  }

  const d = parsed.data;
  const dataLocal = new Date(d.data + "T12:00:00.000Z");

  await prisma.lancamento.create({
    data: {
      tipo: d.tipo,
      escopo: d.escopo,
      categoriaId: d.categoriaId,
      descricao: d.descricao,
      valor: d.valor,
      data: dataLocal,
      formaPagamento: d.formaPagamento,
      cartaoId: d.cartaoId || null,
      parcela: d.parcela ?? null,
      totalParcelas: d.totalParcelas ?? null,
      status: d.status,
      origem: d.origem,
    },
  });

  return { sucesso: true };
}

// ---------------------------------------------------------------------------
// Editar
// ---------------------------------------------------------------------------

export async function editarLancamento(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const raw = Object.fromEntries(formData);
  const parsed = schemaLancamento.safeParse(raw);
  if (!parsed.success) {
    return { erro: parsed.error.issues.map((e) => e.message).join("; ") };
  }

  const existente = await prisma.lancamento.findUnique({ where: { id } });
  if (!existente) return { erro: "Lançamento não encontrado." };
  if (existente.status === StatusLancamento.CANCELADO) {
    return { erro: "Não é possível editar um lançamento cancelado." };
  }

  const d = parsed.data;
  const dataLocal = new Date(d.data + "T12:00:00.000Z");

  await prisma.lancamento.update({
    where: { id },
    data: {
      tipo: d.tipo,
      escopo: d.escopo,
      categoriaId: d.categoriaId,
      descricao: d.descricao,
      valor: d.valor,
      data: dataLocal,
      formaPagamento: d.formaPagamento,
      cartaoId: d.cartaoId || null,
      parcela: d.parcela ?? null,
      totalParcelas: d.totalParcelas ?? null,
      status: d.status,
    },
  });

  return { sucesso: true };
}

// ---------------------------------------------------------------------------
// Cancelar (nunca DELETE físico)
// ---------------------------------------------------------------------------

export async function cancelarLancamento(id: string): Promise<FormState> {
  const existente = await prisma.lancamento.findUnique({ where: { id } });
  if (!existente) return { erro: "Lançamento não encontrado." };
  if (existente.status === StatusLancamento.CANCELADO) {
    return { erro: "Lançamento já está cancelado." };
  }

  await prisma.lancamento.update({
    where: { id },
    data: { status: StatusLancamento.CANCELADO },
  });

  return { sucesso: true };
}
