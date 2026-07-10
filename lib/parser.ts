/**
 * lib/parser.ts — Parsers de texto extraído por OCR (Fase 5B).
 * Usa regex sobre o texto bruto retornado pelo Tesseract.js "por".
 */

/** Extrai o valor total do texto (prioriza linhas com "TOTAL") */
export function extrairValor(texto: string): number | null {
  const patterns = [
    /TOTAL\s+A\s+PAGAR[:\s]+R?\$?\s*(\d{1,3}(?:\.\d{3})*,\d{2})/i,
    /VALOR\s+TOTAL[:\s]+R?\$?\s*(\d{1,3}(?:\.\d{3})*,\d{2})/i,
    /TOTAL[:\s]+R?\$?\s*(\d{1,3}(?:\.\d{3})*,\d{2})/i,
    /R\$\s*(\d{1,3}(?:\.\d{3})*,\d{2})/,
    /(\d{1,3}(?:\.\d{3})*,\d{2})/,
  ];

  for (const p of patterns) {
    const m = texto.match(p);
    if (m?.[1]) {
      const n = parseFloat(m[1].replace(/\./g, "").replace(",", "."));
      if (n > 0 && n < 1_000_000) return n;
    }
  }
  return null;
}

/** Extrai a data no formato DD/MM/YYYY ou DD/MM/YY */
export function extrairData(texto: string): Date | null {
  const m = texto.match(/(\d{2})\/(\d{2})\/(\d{2,4})/);
  if (!m) return null;
  let ano = parseInt(m[3]);
  if (ano < 100) ano += 2000;
  const mes = parseInt(m[2]) - 1;
  const dia = parseInt(m[1]);
  if (mes < 0 || mes > 11 || dia < 1 || dia > 31) return null;
  const d = new Date(Date.UTC(ano, mes, dia, 12, 0, 0));
  return isNaN(d.getTime()) ? null : d;
}

/** Extrai CNPJ formatado (XX.XXX.XXX/XXXX-XX) ou 14 dígitos sequenciais */
export function extrairCnpj(texto: string): string | null {
  const m1 = texto.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/);
  if (m1) return m1[0].replace(/[.\-/]/g, "");
  const m2 = texto.match(/\b(\d{14})\b/);
  if (m2) return m2[1];
  return null;
}

/** Identifica forma de pagamento: PIX, CRÉDITO, DÉBITO, DINHEIRO, BOLETO */
export function extrairFormaPagamento(texto: string): string | null {
  const up = texto.toUpperCase();
  if (up.includes("PIX")) return "PIX";
  if (/CR[ÉE]DITO|CREDIT/.test(up)) return "CARTAO_CREDITO";
  if (/D[ÉE]BITO|DEBIT/.test(up)) return "CARTAO_DEBITO";
  if (/DINHEIRO|ESP[ÉE]CIE|CASH/.test(up)) return "DINHEIRO";
  if (up.includes("BOLETO")) return "BOLETO";
  return null;
}

/** Detecta parcelamento: "3x", "3 PARCELAS", "EM 3 VEZES" → retorna 3 */
export function extrairParcelas(texto: string): number | null {
  const m1 = texto.match(/(\d+)\s*[Xx]\s/);
  if (m1) {
    const n = parseInt(m1[1]);
    if (n >= 2 && n <= 60) return n;
  }
  const m2 = texto.match(/(\d+)\s*(?:VEZES|PARCELAS?)/i);
  if (m2) {
    const n = parseInt(m2[1]);
    if (n >= 2 && n <= 60) return n;
  }
  return null;
}

/** Extrai nome do estabelecimento das primeiras linhas com texto alfabético */
export function extrairEstabelecimento(texto: string): string | null {
  const linhas = texto
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 3 && /[A-Za-zÀ-ú]{3,}/.test(l));

  for (const linha of linhas.slice(0, 8)) {
    if (/^\d{2}\/\d{2}/.test(linha)) continue;
    if (/R\$|\d{14}|\d{3}\.\d{3}/.test(linha)) continue;
    if (/CNPJ|CPF|TOTAL|VALOR|SUBTOTAL|DESCONTO|TROCO/i.test(linha)) continue;
    return linha.substring(0, 80);
  }
  return null;
}
