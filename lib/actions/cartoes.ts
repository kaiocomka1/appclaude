"use server";

import { z } from "zod";
import prisma from "@/lib/prisma";
import { FormaPagamento, StatusLancamento } from "@/app/generated/prisma/enums";

// ---------------------------------------------------------------------------
// Tipos serializados
// ---------------------------------------------------------------------------

export type CartaoOption = {
  id: string;
  nome: string;
  bandeira: string;
};

export type CartaoRow = {
  id: string;
  nome: string;
  bandeira: string;
  limite: number;
  diaFechamento: number;
  diaVencimento: number;
  ativo: boolean;
};

/** Parcela de cartão com totais de fatura por competência */
export type FaturaItem = {
  cartaoId: string;
  cartaoNome: string;
  competencia: string; // "YYYY-MM"
  total: number;
  lancamentos: {
    id: string;
    descricao: string;
    valor: number;
    data: string;
    parcela: number | null;
    totalParcelas: number | null;
    status: string;
  }[];
};

export type CartaoComStats = CartaoRow & {
  limiteUsado: number;
  limiteDisponivel: number;
  /** Fatura em aberto (mês corrente de competência) */
  faturaAberta: number;
};

// ---------------------------------------------------------------------------
// Listar
// ---------------------------------------------------------------------------

export async function listarCartoes(): Promise<CartaoOption[]> {
  const cartoes = await prisma.cartao.findMany({
    where: { ativo: true },
    orderBy: { nome: "asc" },
  });
  return cartoes.map((c) => ({ id: c.id, nome: c.nome, bandeira: c.bandeira }));
}

export async function listarCartoesCompleto(): Promise<CartaoRow[]> {
  const cartoes = await prisma.cartao.findMany({ orderBy: { nome: "asc" } });
  return cartoes.map((c) => ({
    id: c.id,
    nome: c.nome,
    bandeira: c.bandeira,
    limite: c.limite.toNumber(),
    diaFechamento: c.diaFechamento,
    diaVencimento: c.diaVencimento,
    ativo: c.ativo,
  }));
}

export async function listarCartoesComStats(): Promise<CartaoComStats[]> {
  const cartoes = await prisma.cartao.findMany({
    where: { ativo: true },
    orderBy: { nome: "asc" },
  });

  const hoje = new Date();
  const anoAtual = hoje.getUTCFullYear();
  const mesAtual = hoje.getUTCMonth(); // 0-indexed

  const result: CartaoComStats[] = [];

  for (const c of cartoes) {
    const diaFechamento = c.diaFechamento;

    // Competência corrente: início = fechamento do mês passado + 1 dia;
    // fim = fechamento do mês atual
    const inicioCompetencia = new Date(
      Date.UTC(anoAtual, mesAtual - 1, diaFechamento + 1, 0, 0, 0, 0),
    );
    const fimCompetencia = new Date(
      Date.UTC(anoAtual, mesAtual, diaFechamento, 23, 59, 59, 999),
    );

    // Lançamentos CONFIRMADO + PREVISTO com cartaoId = c.id na competência atual
    const lancamentosFatura = await prisma.lancamento.findMany({
      where: {
        cartaoId: c.id,
        formaPagamento: FormaPagamento.CARTAO_CREDITO,
        status: { not: StatusLancamento.CANCELADO },
        data: { gte: inicioCompetencia, lte: fimCompetencia },
      },
      select: { valor: true },
    });

    const faturaAberta = lancamentosFatura.reduce(
      (acc, l) => acc + l.valor.toNumber(),
      0,
    );

    // Limite usado = soma de TODAS as parcelas futuras não canceladas
    const parcelasFuturas = await prisma.lancamento.findMany({
      where: {
        cartaoId: c.id,
        formaPagamento: FormaPagamento.CARTAO_CREDITO,
        status: { not: StatusLancamento.CANCELADO },
        data: { gte: new Date() },
      },
      select: { valor: true },
    });

    const limiteUsado = parcelasFuturas.reduce(
      (acc, l) => acc + l.valor.toNumber(),
      0,
    );

    const limite = c.limite.toNumber();

    result.push({
      id: c.id,
      nome: c.nome,
      bandeira: c.bandeira,
      limite,
      diaFechamento: c.diaFechamento,
      diaVencimento: c.diaVencimento,
      ativo: c.ativo,
      limiteUsado,
      limiteDisponivel: Math.max(0, limite - limiteUsado),
      faturaAberta,
    });
  }

  return result;
}

// ---------------------------------------------------------------------------
// Fatura por cartão e competência
// ---------------------------------------------------------------------------

export async function listarFatura(
  cartaoId: string,
  competencia: string, // "YYYY-MM"
): Promise<FaturaItem | null> {
  const cartao = await prisma.cartao.findUnique({ where: { id: cartaoId } });
  if (!cartao) return null;

  const [ano, mes] = competencia.split("-").map(Number);
  const mesIdx = mes - 1; // 0-indexed

  // Fatura: do dia após fechamento do mês anterior até fechamento do mês alvo
  const inicioFatura = new Date(
    Date.UTC(ano, mesIdx - 1, cartao.diaFechamento + 1, 0, 0, 0, 0),
  );
  const fimFatura = new Date(
    Date.UTC(ano, mesIdx, cartao.diaFechamento, 23, 59, 59, 999),
  );

  const lancamentos = await prisma.lancamento.findMany({
    where: {
      cartaoId,
      formaPagamento: FormaPagamento.CARTAO_CREDITO,
      status: { not: StatusLancamento.CANCELADO },
      data: { gte: inicioFatura, lte: fimFatura },
    },
    orderBy: { data: "asc" },
  });

  const total = lancamentos.reduce((acc, l) => acc + l.valor.toNumber(), 0);

  return {
    cartaoId,
    cartaoNome: cartao.nome,
    competencia,
    total,
    lancamentos: lancamentos.map((l) => ({
      id: l.id,
      descricao: l.descricao,
      valor: l.valor.toNumber(),
      data: l.data.toISOString(),
      parcela: l.parcela ?? null,
      totalParcelas: l.totalParcelas ?? null,
      status: l.status,
    })),
  };
}

// ---------------------------------------------------------------------------
// Schemas de validação
// ---------------------------------------------------------------------------

const schemaCartao = z.object({
  nome: z.string().min(1).max(100),
  bandeira: z.string().min(1).max(50),
  limite: z.coerce.number().positive(),
  diaFechamento: z.coerce.number().int().min(1).max(28),
  diaVencimento: z.coerce.number().int().min(1).max(31),
});

export type FormStateCartao = { erro?: string; sucesso?: boolean };

// ---------------------------------------------------------------------------
// Criar
// ---------------------------------------------------------------------------

export async function criarCartao(
  _prev: FormStateCartao,
  formData: FormData,
): Promise<FormStateCartao> {
  const raw = Object.fromEntries(formData);
  const parsed = schemaCartao.safeParse(raw);
  if (!parsed.success) {
    return { erro: parsed.error.issues.map((e) => e.message).join("; ") };
  }

  const d = parsed.data;
  await prisma.cartao.create({
    data: {
      nome: d.nome,
      bandeira: d.bandeira,
      limite: d.limite,
      diaFechamento: d.diaFechamento,
      diaVencimento: d.diaVencimento,
      ativo: true,
    },
  });

  return { sucesso: true };
}

// ---------------------------------------------------------------------------
// Editar
// ---------------------------------------------------------------------------

export async function editarCartao(
  id: string,
  _prev: FormStateCartao,
  formData: FormData,
): Promise<FormStateCartao> {
  const raw = Object.fromEntries(formData);
  const parsed = schemaCartao.safeParse(raw);
  if (!parsed.success) {
    return { erro: parsed.error.issues.map((e) => e.message).join("; ") };
  }

  const existente = await prisma.cartao.findUnique({ where: { id } });
  if (!existente) return { erro: "Cartão não encontrado." };

  const d = parsed.data;
  await prisma.cartao.update({
    where: { id },
    data: {
      nome: d.nome,
      bandeira: d.bandeira,
      limite: d.limite,
      diaFechamento: d.diaFechamento,
      diaVencimento: d.diaVencimento,
    },
  });

  return { sucesso: true };
}

// ---------------------------------------------------------------------------
// Desativar (nunca DELETE físico)
// ---------------------------------------------------------------------------

export async function desativarCartao(id: string): Promise<FormStateCartao> {
  const existente = await prisma.cartao.findUnique({ where: { id } });
  if (!existente) return { erro: "Cartão não encontrado." };
  if (!existente.ativo) return { erro: "Cartão já está inativo." };

  await prisma.cartao.update({ where: { id }, data: { ativo: false } });
  return { sucesso: true };
}

export async function reativarCartao(id: string): Promise<FormStateCartao> {
  const existente = await prisma.cartao.findUnique({ where: { id } });
  if (!existente) return { erro: "Cartão não encontrado." };
  if (existente.ativo) return { erro: "Cartão já está ativo." };

  await prisma.cartao.update({ where: { id }, data: { ativo: true } });
  return { sucesso: true };
}
