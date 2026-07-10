"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  onQRDetectado: (qrText: string, blob: Blob) => void;
  onFotoCapturada: (blob: Blob) => void;
};

type EstadoCamera = "INICIANDO" | "ATIVA" | "ERRO_CAMERA" | "SEM_QR";

export default function FotoCaptura({ onQRDetectado, onFotoCapturada }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const jsQRRef = useRef<((data: Uint8ClampedArray, w: number, h: number, opts?: object) => { data: string } | null) | null>(null);
  const lastScanRef = useRef<number>(0);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [estado, setEstado] = useState<EstadoCamera>("INICIANDO");
  const [modoFoto, setModoFoto] = useState(false);
  const [mostrarDica, setMostrarDica] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    import("jsqr").then((m) => { jsQRRef.current = m.default; });
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function iniciar() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setEstado("ATIVA");

        hintTimerRef.current = setTimeout(() => {
          if (!cancelled) setMostrarDica(true);
        }, 8000);

        iniciarLoop();
      } catch {
        if (!cancelled) setEstado("ERRO_CAMERA");
      }
    }

    iniciar();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function iniciarLoop() {
    function scan() {
      rafRef.current = requestAnimationFrame(scan);
      const now = Date.now();
      if (now - lastScanRef.current < 200) return; // 5fps
      lastScanRef.current = now;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2 || !jsQRRef.current) return;

      const w = video.videoWidth;
      const h = video.videoHeight;
      if (!w || !h) return;

      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, w, h);
      const imageData = ctx.getImageData(0, 0, w, h);

      const code = jsQRRef.current(imageData.data, w, h, { inversionAttempts: "attemptBoth" });
      if (code?.data) {
        cancelAnimationFrame(rafRef.current);
        canvas.toBlob((blob) => {
          if (blob) onQRDetectado(code.data, blob);
        }, "image/jpeg", 0.85);
      }
    }
    scan();
  }

  function capturarFoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) onFotoCapturada(blob);
    }, "image/jpeg", 0.85);
  }

  function onArquivoSelecionado(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    onFotoCapturada(file);
  }

  function entrarModoFoto() {
    cancelAnimationFrame(rafRef.current);
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    setModoFoto(true);
    setMostrarDica(false);
  }

  return (
    <div className="relative rounded-2xl overflow-hidden bg-black">
      <video
        ref={videoRef}
        muted
        playsInline
        className="w-full aspect-video object-cover"
        aria-label="Câmera"
      />
      <canvas ref={canvasRef} className="hidden" />

      {estado === "INICIANDO" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70">
          <p className="text-white text-sm animate-pulse">Abrindo câmera…</p>
        </div>
      )}

      {estado === "ERRO_CAMERA" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/80 p-6 text-center">
          <p className="text-white text-sm">Não foi possível acessar a câmera.</p>
          <label className="btn-primary cursor-pointer text-sm">
            Enviar imagem
            <input type="file" accept="image/*" className="sr-only" onChange={onArquivoSelecionado} ref={fileInputRef} />
          </label>
        </div>
      )}

      {estado === "ATIVA" && !modoFoto && (
        <>
          {/* QR frame overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative w-48 h-48 sm:w-64 sm:h-64">
              {/* Corner brackets */}
              <span className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-md" />
              <span className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-md" />
              <span className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-md" />
              <span className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-md" />
            </div>
          </div>

          {/* Instruction text */}
          <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
            <p className="text-white text-sm text-center font-medium mb-3">
              Aponte a câmera para o QR Code da nota
            </p>

            {mostrarDica && (
              <p className="text-yellow-300 text-xs text-center mb-2">
                Não encontrei o QR Code — aproxime a câmera dele
              </p>
            )}

            <div className="flex gap-2 justify-center">
              <button
                type="button"
                onClick={entrarModoFoto}
                className="px-3 py-1.5 rounded-lg bg-white/20 text-white text-xs hover:bg-white/30 transition-colors"
              >
                Este comprovante não tem QR Code
              </button>
              <label className="px-3 py-1.5 rounded-lg bg-white/20 text-white text-xs hover:bg-white/30 transition-colors cursor-pointer">
                Enviar arquivo
                <input type="file" accept="image/*" className="sr-only" onChange={onArquivoSelecionado} />
              </label>
            </div>
          </div>
        </>
      )}

      {estado === "ATIVA" && modoFoto && (
        <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
          <p className="text-white text-sm text-center font-medium mb-3">
            Fotografe o comprovante
          </p>
          <div className="flex gap-2 justify-center">
            <button
              type="button"
              onClick={capturarFoto}
              className="px-4 py-2 rounded-lg bg-white text-neutral-900 text-sm font-medium hover:bg-neutral-100 transition-colors"
            >
              Fotografar
            </button>
            <label className="px-3 py-2 rounded-lg bg-white/20 text-white text-sm hover:bg-white/30 transition-colors cursor-pointer">
              Enviar arquivo
              <input type="file" accept="image/*" className="sr-only" onChange={onArquivoSelecionado} />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
