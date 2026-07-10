"use client";

import { useState } from "react";
import type { CategoriaOption } from "@/lib/actions/categorias";
import type { CartaoOption } from "@/lib/actions/cartoes";
import type { DadosNota } from "@/lib/extrator";
import { QrCodeExtrator, OcrExtrator } from "@/lib/extrator";
import FotoCaptura from "./FotoCaptura";
import FotoRevisao from "./FotoRevisao";

type Etapa = "CAPTURA" | "PROCESSANDO_QR" | "PROCESSANDO_OCR" | "REVISAO" | "SUCESSO";

type Props = {
  categorias: CategoriaOption[];
  cartoes: CartaoOption[];
};

async function calcularHash(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const hashBuf = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export default function FotoClient({ categorias, cartoes }: Props) {
  const [etapa, setEtapa] = useState<Etapa>("CAPTURA");
  const [progresso, setProgresso] = useState(0);
  const [dados, setDados] = useState<DadosNota | null>(null);
  const [hash, setHash] = useState<string>("");
  const [erro, setErro] = useState<string | null>(null);

  async function handleQRDetectado(qrText: string, blob: Blob) {
    setEtapa("PROCESSANDO_QR");
    setErro(null);
    try {
      const [extrator, h] = await Promise.all([
        Promise.resolve(new QrCodeExtrator()),
        calcularHash(blob),
      ]);
      setHash(h);
      const resultado = await extrator.extrairDeQRText(qrText);
      if (resultado) {
        setDados(resultado);
        setEtapa("REVISAO");
      } else {
        // QR found but not an NFC-e — fall back to OCR
        setErro("QR Code lido, mas não reconhecido como nota fiscal. Tentando OCR…");
        await runOcr(blob, h);
      }
    } catch {
      setErro("Erro ao processar QR Code. Tente OCR.");
      setEtapa("CAPTURA");
    }
  }

  async function handleFotoCapturada(blob: Blob) {
    setErro(null);
    const h = await calcularHash(blob);
    setHash(h);
    await runOcr(blob, h);
  }

  async function runOcr(blob: Blob, h: string) {
    setEtapa("PROCESSANDO_OCR");
    setProgresso(0);
    try {
      const extrator = new OcrExtrator((pct) => setProgresso(pct));
      const resultado = await extrator.extrair(blob);
      setHash(h);
      if (resultado) {
        setDados(resultado);
        setEtapa("REVISAO");
      } else {
        setErro("Não foi possível extrair dados da imagem. Preencha manualmente.");
        setDados({});
        setEtapa("REVISAO");
      }
    } catch {
      setErro("Erro ao processar imagem com OCR.");
      setEtapa("CAPTURA");
    }
  }

  function reiniciar() {
    setEtapa("CAPTURA");
    setDados(null);
    setHash("");
    setErro(null);
    setProgresso(0);
  }

  if (etapa === "SUCESSO") {
    return (
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl p-8 text-center space-y-4">
        <div className="text-4xl">✓</div>
        <p className="text-lg font-semibold text-neutral-800 dark:text-neutral-200">
          Lançamento registrado com sucesso!
        </p>
        <button type="button" onClick={reiniciar} className="btn-primary">
          Registrar outra nota
        </button>
      </div>
    );
  }

  if (etapa === "PROCESSANDO_QR") {
    return (
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl p-8 text-center space-y-3">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto" />
        <p className="text-sm text-neutral-600 dark:text-neutral-400">Lendo QR Code e consultando dados…</p>
        {erro && <p className="text-xs text-yellow-600 dark:text-yellow-400">{erro}</p>}
      </div>
    );
  }

  if (etapa === "PROCESSANDO_OCR") {
    return (
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl p-8 text-center space-y-4">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto" />
        <p className="text-sm text-neutral-600 dark:text-neutral-400">Reconhecendo texto com OCR…</p>
        {progresso > 0 && (
          <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${progresso}%` }}
            />
          </div>
        )}
      </div>
    );
  }

  if (etapa === "REVISAO" && dados !== null) {
    return (
      <FotoRevisao
        dados={dados}
        hash={hash}
        categorias={categorias}
        cartoes={cartoes}
        onSucesso={() => setEtapa("SUCESSO")}
        onVoltar={reiniciar}
      />
    );
  }

  return (
    <div className="space-y-4">
      {erro && (
        <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg px-4 py-3">
          {erro}
        </div>
      )}
      <FotoCaptura onQRDetectado={handleQRDetectado} onFotoCapturada={handleFotoCapturada} />
    </div>
  );
}
