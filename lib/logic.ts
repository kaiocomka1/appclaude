/**
 * lib/logic.ts — Regras de negócio puras do Financeiro.
 *
 * CONTRATO: funções aqui são puras (sem I/O). Server actions chamam estas
 * funções para calcular efeitos, e depois persistem os resultados.
 * Nenhuma função pode duplicar efeitos se chamada duas vezes (idempotência
 * garantida pelo grupoId + upsert no nível de persistência).
 */

import {
  TipoLancamento,
  StatusLancamento,
  OrigemLancamento,
  FormaPagamento,
} from "@/app/generated/prisma/enums";

// ---------------------------------------------------------------------------
// Tipos auxiliares
// ---------------------------------------------------------------------------

/** Tipo plano para criar lançamentos — sem Decimal, sem relações. */
export type LancamentoParaCriar = {
  tipo: string;
  escopo: string;
  categoriaId: string;
  descricao: string;
  valor: number;
  data: Date;
  formaPagamento: string;
  cartaoId: string | null;
  parcela: number | null;
  totalParcelas: number | null;
  grupoId: string | null;
  status: string;
  origem: string;
  anexoUrl: string | null;
  hashAnexo: string | null;
};

export type EfeitoLancamento = {
  lancamentos: LancamentoParaCriar[];
  /** IDs de lançamentos existentes que devem ter status = CANCELADO */
  cancelar: string[];
};

// ---------------------------------------------------------------------------
// Helpers de data
// ---------------------------------------------------------------------------

/**
 * Calcula a data de vencimento de uma parcela (dia = diaFechamento do mês
 * de competência). Hora fixa 12:00 UTC para evitar drift de fuso.
 *
 * Regra: se o dia da compra for APÓS o diaFechamento, a 1ª parcela cai no
 * mês seguinte. Cada parcela subsequente avança mais um mês.
 */
function dataParcela(
  dataCompra: Date,
  diaFechamento: number,
  numeroParcela: number, // 1-indexed
): Date {
  const diaCompra = dataCompra.getUTCDate();
  const mesCompra = dataCompra.getUTCMonth(); // 0-indexed
  const anoCompra = dataCompra.getUTCFullYear();

  const offsetBase = diaCompra > diaFechamento ? 1 : 0;
  const totalOffset = offsetBase + (numeroParcela - 1);

  const mesAbsoluto = mesCompra + totalOffset;
  const anoAlvo = anoCompra + Math.floor(mesAbsoluto / 12);
  const mesAlvo = mesAbsoluto % 12;

  const ultimoDia = new Date(Date.UTC(anoAlvo, mesAlvo + 1, 0)).getUTCDate();
  const dia = Math.min(diaFechamento, ultimoDia);

  return new Date(Date.UTC(anoAlvo, mesAlvo, dia, 12, 0, 0, 0));
}

/** Avança uma data N meses, mantendo hora 12:00 UTC. */
function addMeses(d: Date, n: number): Date {
  const mesAbsoluto = d.getUTCMonth() + n;
  const ano = d.getUTCFullYear() + Math.floor(mesAbsoluto / 12);
  const mes = mesAbsoluto % 12;
  const ultimoDia = new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
  const dia = Math.min(d.getUTCDate(), ultimoDia);
  return new Date(Date.UTC(ano, mes, dia, 12, 0, 0, 0));
}

// ---------------------------------------------------------------------------
// Fase 3: Cartão de crédito
// ---------------------------------------------------------------------------

/**
 * Dado uma compra com CARTAO_CREDITO, retorna os N lançamentos de parcela
 * que devem ser criados, calculando a competência correta por diaFechamento.
 *
 * 1ª parcela = CONFIRMADO; demais = PREVISTO. Todas compartilham grupoId.
 */
export function calcularParcelasCartao(params: {
  categoriaId: string;
  escopo: string;
  descricao: string;
  valor: number;
  dataCompra: Date;
  formaPagamento: string;
  cartaoId: string;
  diaFechamento: number;
  totalParcelas: number;
  grupoId: string;
  origem?: string;
}): LancamentoParaCriar[] {
  const {
    categoriaId,
    escopo,
    descricao,
    valor,
    dataCompra,
    formaPagamento,
    cartaoId,
    diaFechamento,
    totalParcelas,
    grupoId,
    origem = OrigemLancamento.MANUAL,
  } = params;

  const valorParcela = Math.round((valor / totalParcelas) * 100) / 100;
  const valorUltima =
    Math.round((valor - valorParcela * (totalParcelas - 1)) * 100) / 100;

  return Array.from({ length: totalParcelas }, (_, i) => {
    const numero = i + 1;
    return {
      tipo: TipoLancamento.SAIDA,
      escopo,
      categoriaId,
      descricao:
        totalParcelas === 1
          ? descricao
          : `${descricao} (${numero}/${totalParcelas})`,
      valor: numero === totalParcelas ? valorUltima : valorParcela,
      data: dataParcela(dataCompra, diaFechamento, numero),
      formaPagamento,
      cartaoId,
      parcela: totalParcelas > 1 ? numero : null,
      totalParcelas: totalParcelas > 1 ? totalParcelas : null,
      grupoId,
      status:
        numero === 1 ? StatusLancamento.CONFIRMADO : StatusLancamento.PREVISTO,
      origem,
      anexoUrl: null,
      hashAnexo: null,
    };
  });
}

// ---------------------------------------------------------------------------
// Fase 4: Antecipação
// ---------------------------------------------------------------------------

/**
 * Registra uma antecipação: gera ENTRADA (valor bruto, categoria ANTECIPACAO)
 * e SAIDA (taxa = bruto − líquido, categoria TAXA_ANTECIPACAO) com mesmo grupoId.
 * Se recebivelIds fornecidos, retorna-os na lista `cancelar`.
 */
export function calcularAntecipacao(params: {
  valorBruto: number;
  valorLiquido: number;
  data: Date;
  grupoId: string;
  categoriaAntecipacaoId: string;
  categoriaTaxaId: string;
  escopo: string;
  descricao?: string;
  recebivelIds?: string[];
}): EfeitoLancamento {
  const {
    valorBruto,
    valorLiquido,
    data,
    grupoId,
    categoriaAntecipacaoId,
    categoriaTaxaId,
    escopo,
    descricao = "Antecipação",
    recebivelIds = [],
  } = params;

  const valorTaxa = Math.round((valorBruto - valorLiquido) * 100) / 100;

  const entrada: LancamentoParaCriar = {
    tipo: TipoLancamento.ENTRADA,
    escopo,
    categoriaId: categoriaAntecipacaoId,
    descricao,
    valor: valorBruto,
    data,
    formaPagamento: FormaPagamento.PIX,
    cartaoId: null,
    parcela: null,
    totalParcelas: null,
    grupoId,
    status: StatusLancamento.CONFIRMADO,
    origem: OrigemLancamento.MANUAL,
    anexoUrl: null,
    hashAnexo: null,
  };

  const lancamentos: LancamentoParaCriar[] =
    valorTaxa > 0
      ? [
          entrada,
          {
            tipo: TipoLancamento.SAIDA,
            escopo,
            categoriaId: categoriaTaxaId,
            descricao: `Taxa — ${descricao}`,
            valor: valorTaxa,
            data,
            formaPagamento: FormaPagamento.PIX,
            cartaoId: null,
            parcela: null,
            totalParcelas: null,
            grupoId,
            status: StatusLancamento.CONFIRMADO,
            origem: OrigemLancamento.MANUAL,
            anexoUrl: null,
            hashAnexo: null,
          },
        ]
      : [entrada];

  return { lancamentos, cancelar: recebivelIds };
}

// ---------------------------------------------------------------------------
// Fase 4: Venda parcelada via plataforma
// ---------------------------------------------------------------------------

/**
 * Registra uma venda parcelada via plataforma:
 * - N ENTRADAS PREVISTAS (recebíveis) com valor bruto/N cada
 * - 1 SAIDA CONFIRMADA de taxa (valorBruto × taxaPercentual / 100)
 * Todas compartilham o mesmo grupoId.
 */
export function calcularVendaPlataforma(params: {
  descricao: string;
  valorBruto: number;
  taxaPercentual: number;
  totalParcelas: number;
  dataInicial: Date;
  grupoId: string;
  categoriaTaxaPlataformaId: string;
  categoriaVendaId: string;
  escopo: string;
}): LancamentoParaCriar[] {
  const {
    descricao,
    valorBruto,
    taxaPercentual,
    totalParcelas,
    dataInicial,
    grupoId,
    categoriaTaxaPlataformaId,
    categoriaVendaId,
    escopo,
  } = params;

  const valorTaxa = Math.round((valorBruto * taxaPercentual) / 100 * 100) / 100;
  const valorParcela = Math.round((valorBruto / totalParcelas) * 100) / 100;
  const valorUltima =
    Math.round((valorBruto - valorParcela * (totalParcelas - 1)) * 100) / 100;

  const recebiveis: LancamentoParaCriar[] = Array.from(
    { length: totalParcelas },
    (_, i) => {
      const numero = i + 1;
      return {
        tipo: TipoLancamento.ENTRADA,
        escopo,
        categoriaId: categoriaVendaId,
        descricao:
          totalParcelas === 1
            ? descricao
            : `${descricao} (${numero}/${totalParcelas})`,
        valor: numero === totalParcelas ? valorUltima : valorParcela,
        data: addMeses(dataInicial, i),
        formaPagamento: FormaPagamento.PLATAFORMA,
        cartaoId: null,
        parcela: totalParcelas > 1 ? numero : null,
        totalParcelas: totalParcelas > 1 ? totalParcelas : null,
        grupoId,
        status: StatusLancamento.PREVISTO,
        origem: OrigemLancamento.MANUAL,
        anexoUrl: null,
        hashAnexo: null,
      };
    },
  );

  const taxa: LancamentoParaCriar = {
    tipo: TipoLancamento.SAIDA,
    escopo,
    categoriaId: categoriaTaxaPlataformaId,
    descricao: `Taxa plataforma — ${descricao} (${taxaPercentual}%)`,
    valor: valorTaxa,
    data: dataInicial,
    formaPagamento: FormaPagamento.PLATAFORMA,
    cartaoId: null,
    parcela: null,
    totalParcelas: null,
    grupoId,
    status: StatusLancamento.CONFIRMADO,
    origem: OrigemLancamento.MANUAL,
    anexoUrl: null,
    hashAnexo: null,
  };

  return valorTaxa > 0 ? [...recebiveis, taxa] : recebiveis;
}

// ---------------------------------------------------------------------------
// Fase 6+: Stubs
// ---------------------------------------------------------------------------

export function identificarPrevistoAtrasado(
  lancamentos: Array<{ id: string; status: string; data: Date }>,
  hoje: Date,
): string[] {
  // TODO Fase 6 (runDailyChecks)
  void lancamentos;
  void hoje;
  throw new Error("Não implementado");
}

export function alertaFaturaFechaAmanha(
  cartoes: Array<{ id: string; diaFechamento: number }>,
  hoje: Date,
): typeof cartoes {
  // TODO Fase 6 (runDailyChecks)
  void cartoes;
  void hoje;
  throw new Error("Não implementado");
}

export function calcularROAS(params: {
  entradas: number;
  gastoAds: number;
}): number {
  if (params.gastoAds === 0) return 0;
  return params.entradas / params.gastoAds;
}
