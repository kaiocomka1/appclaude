/**
 * Interface única ExtratorDeNota — isola o motor de extração do resto do app.
 * Motores atuais: QrCodeExtrator (Fase 5A) e OcrExtrator (Fase 5B).
 * Um motor de LLM pode ser plugado futuramente sem alterar chamadores.
 */

import {
  extrairValor,
  extrairData,
  extrairCnpj,
  extrairFormaPagamento,
  extrairParcelas,
  extrairEstabelecimento,
} from "@/lib/parser";

export type CampoExtraido<T = string> = {
  valor: T;
  /** 0–1. Campos com confiança < 0,85 abrem em amarelo para revisão manual. */
  confianca: number;
};

export type DadosNota = {
  estabelecimento?: CampoExtraido;
  cnpj?: CampoExtraido;
  valor?: CampoExtraido<number>;
  data?: CampoExtraido<Date>;
  formaPagamento?: CampoExtraido<string>;
  parcelas?: CampoExtraido<number>;
  chaveAcesso?: CampoExtraido;
};

export interface ExtratorDeNota {
  extrair(imagem: File | Blob): Promise<DadosNota | null>;
}

// Module-level BrasilAPI cache to avoid redundant requests
const cnpjCache = new Map<string, string | null>();

async function consultarCnpjBrasil(cnpj: string): Promise<string | null> {
  if (cnpjCache.has(cnpj)) return cnpjCache.get(cnpj)!;
  try {
    const resp = await fetch(
      `https://brasilapi.com.br/api/cnpj/v1/${cnpj}`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!resp.ok) { cnpjCache.set(cnpj, null); return null; }
    const json = await resp.json();
    const nome: string | null =
      json.nome_fantasia?.trim() || json.razao_social?.trim() || null;
    cnpjCache.set(cnpj, nome);
    return nome;
  } catch {
    cnpjCache.set(cnpj, null);
    return null;
  }
}

async function blobParaImageData(imagem: File | Blob): Promise<ImageData | null> {
  try {
    const bitmap = await createImageBitmap(imagem);
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext("2d") as OffscreenCanvasRenderingContext2D | null;
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0);
    return ctx.getImageData(0, 0, bitmap.width, bitmap.height);
  } catch {
    return null;
  }
}

function parseDhEmi(dhEmi: string): Date | null {
  // Formats: YYYYMMDDTHHmmss or YYMMDDTHHmmss (with optional -03:00)
  const clean = dhEmi.replace(/[^0-9T]/g, "");
  const part = clean.split("T")[0];
  if (!part) return null;
  if (part.length === 8) {
    const ano = parseInt(part.slice(0, 4));
    const mes = parseInt(part.slice(4, 6)) - 1;
    const dia = parseInt(part.slice(6, 8));
    const d = new Date(Date.UTC(ano, mes, dia, 12, 0, 0));
    return isNaN(d.getTime()) ? null : d;
  }
  if (part.length === 6) {
    const ano = 2000 + parseInt(part.slice(0, 2));
    const mes = parseInt(part.slice(2, 4)) - 1;
    const dia = parseInt(part.slice(4, 6));
    const d = new Date(Date.UTC(ano, mes, dia, 12, 0, 0));
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function parseNFCeQR(qrText: string): {
  chave: string | null;
  cnpj: string | null;
  valor: number | null;
  data: Date | null;
} {
  let chave: string | null = null;
  let valor: number | null = null;
  let data: Date | null = null;

  try {
    const url = new URL(qrText);
    // Format: ?chNFe=44digits
    const chNFe = url.searchParams.get("chNFe");
    if (chNFe && /^\d{44}$/.test(chNFe)) chave = chNFe;

    // Format: ?p=CHAVE|...|...|VALOR|DATA
    const p = url.searchParams.get("p");
    if (p) {
      const parts = p.split("|");
      if (parts[0] && /^\d{44}$/.test(parts[0])) chave = parts[0];
      // valor is often at index 3 in p= format
      if (parts[3]) {
        const v = parseFloat(parts[3].replace(",", "."));
        if (!isNaN(v) && v > 0) valor = v;
      }
      // data at index 4
      if (parts[4]) data = parseDhEmi(parts[4]);
    }

    // vNF param for value
    const vNF = url.searchParams.get("vNF");
    if (vNF && valor === null) {
      const v = parseFloat(vNF.replace(",", "."));
      if (!isNaN(v) && v > 0) valor = v;
    }
    // dhEmi for date
    const dhEmi = url.searchParams.get("dhEmi");
    if (dhEmi && data === null) data = parseDhEmi(dhEmi);
  } catch {
    // Not a URL — check for raw 44-digit key
    const m = qrText.match(/\b(\d{44})\b/);
    if (m) chave = m[1];
  }

  // Extract CNPJ from chave positions 6–19 (0-indexed)
  const cnpj = chave ? chave.slice(6, 20) : null;

  return { chave, cnpj, valor, data };
}

export class QrCodeExtrator implements ExtratorDeNota {
  async extrair(imagem: File | Blob): Promise<DadosNota | null> {
    const imageData = await blobParaImageData(imagem);
    if (!imageData) return null;

    const { default: jsQR } = await import("jsqr");
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "attemptBoth",
    });
    if (!code?.data) return null;

    return this.extrairDeQRText(code.data);
  }

  async extrairDeQRText(qrText: string): Promise<DadosNota | null> {
    const { chave, cnpj, valor, data } = parseNFCeQR(qrText);
    if (!chave) return null;

    const dados: DadosNota = {};
    dados.chaveAcesso = { valor: chave, confianca: 1.0 };

    if (cnpj) {
      dados.cnpj = { valor: cnpj, confianca: 1.0 };
      const nome = await consultarCnpjBrasil(cnpj);
      if (nome) dados.estabelecimento = { valor: nome, confianca: 1.0 };
    }

    if (valor !== null) dados.valor = { valor, confianca: 1.0 };
    if (data !== null) dados.data = { valor: data, confianca: 1.0 };

    return dados;
  }
}

export class OcrExtrator implements ExtratorDeNota {
  constructor(private onProgress?: (pct: number) => void) {}

  async extrair(imagem: File | Blob): Promise<DadosNota | null> {
    const { createWorker } = await import("tesseract.js");

    const worker = await createWorker("por", 1, {
      logger: (m: { progress?: number }) => {
        if (this.onProgress && typeof m.progress === "number") {
          this.onProgress(Math.round(m.progress * 100));
        }
      },
    });

    try {
      const { data } = await worker.recognize(imagem);
      const texto = data.text ?? "";
      if (!texto.trim()) return null;

      const dados: DadosNota = {};

      const valor = extrairValor(texto);
      if (valor !== null) dados.valor = { valor, confianca: 0.75 };

      const dataExtraida = extrairData(texto);
      if (dataExtraida) dados.data = { valor: dataExtraida, confianca: 0.80 };

      const cnpj = extrairCnpj(texto);
      if (cnpj) {
        dados.cnpj = { valor: cnpj, confianca: 0.90 };
        const nome = await consultarCnpjBrasil(cnpj);
        if (nome) dados.estabelecimento = { valor: nome, confianca: 0.90 };
      }

      const fp = extrairFormaPagamento(texto);
      if (fp) dados.formaPagamento = { valor: fp, confianca: 0.85 };

      const parcelas = extrairParcelas(texto);
      if (parcelas !== null) dados.parcelas = { valor: parcelas, confianca: 0.80 };

      if (!dados.estabelecimento) {
        const estab = extrairEstabelecimento(texto);
        if (estab) {
          // Heuristic: longer/cleaner names get higher confidence
          const confiancaBase = estab.length > 10 ? 0.70 : 0.55;
          dados.estabelecimento = { valor: estab, confianca: confiancaBase };
        }
      }

      // Return null if nothing was extracted
      if (Object.keys(dados).length === 0) return null;
      return dados;
    } finally {
      await worker.terminate();
    }
  }
}
