/**
 * lib/logic.ts — Regras de negócio puras do Financeiro.
 *
 * CONTRATO: funções aqui são puras (sem I/O). Server actions chamam estas
 * funções para calcular efeitos, e depois persistem os resultados.
 * Nenhuma função pode duplicar efeitos se chamada duas vezes (idempotência
 * garantida pelo grupoId + upsert no nível de persistência).
 */

import type { Cartao, Lancamento } from "@/app/generated/prisma/client";

// ---------------------------------------------------------------------------
// Tipos auxiliares
// ---------------------------------------------------------------------------

export type LancamentoParaCriar = Omit<
  Lancamento,
  "id" | "criadoEm" | "atualizadoEm" | "cartao" | "categoria"
>;

export type EfeitoLancamento = {
  lancamentos: LancamentoParaCriar[];
  /** IDs de lançamentos existentes que devem ter status = CANCELADO */
  cancelar: string[];
};

// ---------------------------------------------------------------------------
// Funções previstas — implementadas na Fase 3+
// ---------------------------------------------------------------------------

/**
 * Dado um lançamento de SAIDA com CARTAO_CREDITO, retorna os N lançamentos
 * de parcela que devem ser criados, calculando a competência correta por
 * diaFechamento do cartão.
 *
 * Regra: se a data da compra é após o diaFechamento, a 1ª parcela cai na
 * fatura do mês seguinte.
 */
export function calcularParcelasCartao(
  _lancamento: LancamentoParaCriar,
  _cartao: Cartao,
  _grupoId: string,
): LancamentoParaCriar[] {
  // TODO Fase 3
  throw new Error("Não implementado");
}

/**
 * Registrar antecipação: recebe valor bruto + valor líquido + data.
 * Retorna dois lançamentos (ENTRADA bruto categoria ANTECIPACAO +
 * SAIDA taxa categoria TAXA_ANTECIPACAO) com mesmo grupoId.
 * Se recebivelIds fornecidos, retorna também os IDs para cancelar.
 */
export function calcularAntecipacao(params: {
  valorBruto: number;
  valorLiquido: number;
  data: Date;
  grupoId: string;
  categoriaAntecipacaoId: string;
  categoriaTaxaId: string;
  escopo: "PESSOAL" | "EMPRESARIAL";
  recebivelIds?: string[];
}): EfeitoLancamento {
  // TODO Fase 4
  void params;
  throw new Error("Não implementado");
}

/**
 * Venda parcelada via plataforma: gera N ENTRADAS previstas (recebíveis)
 * + 1 SAIDA de TAXA_PLATAFORMA, com grupoId comum.
 */
export function calcularVendaPlataforma(params: {
  valorBruto: number;
  taxaPercentual: number;
  totalParcelas: number;
  dataInicial: Date;
  grupoId: string;
  categoriaTaxaPlataformaId: string;
  categoriaVendaId: string;
  escopo: "PESSOAL" | "EMPRESARIAL";
}): LancamentoParaCriar[] {
  // TODO Fase 4
  void params;
  throw new Error("Não implementado");
}

/**
 * Verifica lançamentos PREVISTOS vencidos (data < hoje) e retorna os IDs
 * que devem receber um badge de "atrasado" (sem mudar status).
 * Idempotente: pode ser chamada múltiplas vezes sem efeito cumulativo.
 */
export function identificarPrevistoAtrasado(
  lancamentos: Pick<Lancamento, "id" | "status" | "data">[],
  hoje: Date,
): string[] {
  // TODO Fase 6 (runDailyChecks)
  void lancamentos;
  void hoje;
  throw new Error("Não implementado");
}

/**
 * Retorna as datas de fatura que fecham amanhã, dado os cartões ativos.
 */
export function alertaFaturaFechaAmanha(
  cartoes: Cartao[],
  hoje: Date,
): Cartao[] {
  // TODO Fase 6 (runDailyChecks)
  void cartoes;
  void hoje;
  throw new Error("Não implementado");
}

/**
 * ROAS = soma das ENTRADAS da categoria ADS ÷ soma das SAIDAS da categoria ADS
 * no período informado.
 */
export function calcularROAS(params: {
  entradas: number;
  gastoAds: number;
}): number {
  // TODO Fase 6
  if (params.gastoAds === 0) return 0;
  return params.entradas / params.gastoAds;
}
