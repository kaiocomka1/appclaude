/**
 * Interface única ExtratorDeNota — isola o motor de extração do resto do app.
 * Motores atuais: QrCodeExtrator (Fase 5A) e OcrExtrator (Fase 5B).
 * Um motor de LLM pode ser plugado futuramente sem alterar chamadores.
 */

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
  /**
   * Extrai dados de uma nota a partir de uma imagem (File ou Blob).
   * Retorna null se o motor não conseguiu extrair nada utilizável.
   */
  extrair(imagem: File | Blob): Promise<DadosNota | null>;
}

// Fase 5A — placeholder
export class QrCodeExtrator implements ExtratorDeNota {
  async extrair(_imagem: File | Blob): Promise<DadosNota | null> {
    // TODO Fase 5: usar jsQR para ler QR Code, extrair chave de 44 dígitos,
    // consultar BrasilAPI para CNPJ nas posições 7–20, confiança 1,0.
    throw new Error("QrCodeExtrator não implementado");
  }
}

// Fase 5B — placeholder
export class OcrExtrator implements ExtratorDeNota {
  async extrair(_imagem: File | Blob): Promise<DadosNota | null> {
    // TODO Fase 5: Tesseract.js idioma "por" + parser regex em lib/parser.ts
    // Confiança heurística por campo; campos < 0,85 abrem em amarelo.
    throw new Error("OcrExtrator não implementado");
  }
}
