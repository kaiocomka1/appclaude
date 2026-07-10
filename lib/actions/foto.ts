"use server";

import prisma from "@/lib/prisma";
import { z } from "zod";

function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export type DuplicataCheck = { duplicata: boolean; motivo?: string };

export async function verificarDuplicata(params: {
  hash?: string;
  valor?: number;
  data?: string;
  estabelecimento?: string;
}): Promise<DuplicataCheck> {
  if (params.hash) {
    const porHash = await prisma.lancamento.findFirst({
      where: { hashAnexo: params.hash, status: { not: "CANCELADO" } },
      select: { id: true },
    });
    if (porHash) return { duplicata: true, motivo: "Imagem já registrada anteriormente." };
  }

  if (params.valor && params.data && params.estabelecimento) {
    const inicio = new Date(params.data);
    inicio.setUTCHours(0, 0, 0, 0);
    const fim = new Date(params.data);
    fim.setUTCHours(23, 59, 59, 999);

    const estabNorm = normalizar(params.estabelecimento);

    const candidatos = await prisma.lancamento.findMany({
      where: {
        valor: params.valor,
        data: { gte: inicio, lte: fim },
        status: { not: "CANCELADO" },
      },
      select: { id: true, descricao: true },
    });

    const match = candidatos.find(
      (c) => normalizar(c.descricao).includes(estabNorm) || estabNorm.includes(normalizar(c.descricao))
    );
    if (match) {
      return {
        duplicata: true,
        motivo: "Lançamento com mesmo valor, data e estabelecimento já registrado.",
      };
    }
  }

  return { duplicata: false };
}

export type SugestaoRegraDesignacao = {
  escopo: string;
  categoriaId: string;
  categoriaNome: string;
} | null;

export async function buscarSugestao(estabelecimento: string): Promise<SugestaoRegraDesignacao> {
  if (!estabelecimento?.trim()) return null;
  const chave = normalizar(estabelecimento);
  const regra = await prisma.regraDesignacao.findFirst({
    where: { estabelecimento: chave },
    include: { categoria: { select: { nome: true } } },
  });
  if (!regra) return null;
  return {
    escopo: regra.escopo,
    categoriaId: regra.categoriaId,
    categoriaNome: regra.categoria.nome,
  };
}

export async function salvarRegra(params: {
  estabelecimento: string;
  escopo: string;
  categoriaId: string;
}): Promise<void> {
  const chave = normalizar(params.estabelecimento);
  await prisma.regraDesignacao.upsert({
    where: { estabelecimento: chave },
    create: { estabelecimento: chave, escopo: params.escopo as "PESSOAL" | "EMPRESARIAL", categoriaId: params.categoriaId },
    update: { escopo: params.escopo as "PESSOAL" | "EMPRESARIAL", categoriaId: params.categoriaId },
  });
}

export type FormStateFoto = { erro?: string; sucesso?: boolean };

const schema = z.object({
  tipo: z.enum(["ENTRADA", "SAIDA"]),
  escopo: z.enum(["PESSOAL", "EMPRESARIAL"]),
  categoriaId: z.string().min(1),
  descricao: z.string().min(1).max(255),
  valor: z.coerce.number().positive(),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  formaPagamento: z.enum(["PIX", "CARTAO_CREDITO", "CARTAO_DEBITO", "DINHEIRO", "BOLETO", "PLATAFORMA"]),
  status: z.enum(["CONFIRMADO", "PREVISTO"]).default("CONFIRMADO"),
  hashAnexo: z.string().optional(),
  estabelecimento: z.string().optional(),
});

export async function salvarDaFoto(
  _prev: FormStateFoto,
  formData: FormData
): Promise<FormStateFoto> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { erro: parsed.error.message ?? "Dados inválidos." };
  }
  const d = parsed.data;

  try {
    await prisma.lancamento.create({
      data: {
        tipo: d.tipo,
        escopo: d.escopo,
        categoriaId: d.categoriaId,
        descricao: d.descricao,
        valor: d.valor,
        data: new Date(d.data + "T12:00:00Z"),
        formaPagamento: d.formaPagamento,
        status: d.status,
        origem: "FOTO",
        hashAnexo: d.hashAnexo || null,
      },
    });

    if (d.estabelecimento?.trim()) {
      await salvarRegra({
        estabelecimento: d.estabelecimento,
        escopo: d.escopo,
        categoriaId: d.categoriaId,
      });
    }

    return { sucesso: true };
  } catch (err) {
    console.error(err);
    return { erro: "Erro ao salvar lançamento." };
  }
}
