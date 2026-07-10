/**
 * lib/parser.ts — Parsers de texto extraído por OCR (Fase 5B).
 * Usa regex para identificar valores R$, datas, CNPJ, forma de pagamento e
 * parcelas ("3x") no texto bruto retornado pelo Tesseract.js.
 */

// Placeholder para Fase 5 — funções implementadas como stubs tipados.

/** Extrai o primeiro valor monetário no formato R$ X.XXX,XX ou X.XXX,XX */
export function extrairValor(_texto: string): number | null {
  // TODO Fase 5
  return null;
}

/** Extrai a data mais provável no formato DD/MM/YYYY */
export function extrairData(_texto: string): Date | null {
  // TODO Fase 5
  return null;
}

/** Extrai CNPJ no formato XX.XXX.XXX/XXXX-XX ou 14 dígitos seguidos */
export function extrairCnpj(_texto: string): string | null {
  // TODO Fase 5
  return null;
}

/** Identifica forma de pagamento: PIX, DÉBITO, CRÉDITO, DINHEIRO */
export function extrairFormaPagamento(_texto: string): string | null {
  // TODO Fase 5
  return null;
}

/** Detecta parcelamento: "3x", "em 3 vezes" → retorna 3 */
export function extrairParcelas(_texto: string): number | null {
  // TODO Fase 5
  return null;
}
