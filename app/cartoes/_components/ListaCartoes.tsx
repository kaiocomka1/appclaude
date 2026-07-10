"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { CartaoComStats, CartaoRow } from "@/lib/actions/cartoes";
import { desativarCartao, reativarCartao } from "@/lib/actions/cartoes";
import FormCartao from "./FormCartao";
import FaturaCartao from "./FaturaCartao";

type Props = {
  cartoes: CartaoComStats[];
  inativas: CartaoRow[];
};

function fmtMoeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function pct(usado: number, limite: number) {
  if (limite === 0) return 0;
  return Math.min(100, Math.round((usado / limite) * 100));
}

export default function ListaCartoes({ cartoes, inativas }: Props) {
  const router = useRouter();
  const [editando, setEditando] = useState<string | null>(null);
  const [faturandoId, setFaturandoId] = useState<string | null>(null);
  const [novoAberto, setNovoAberto] = useState(false);

  const refresh = useCallback(() => {
    setEditando(null);
    setNovoAberto(false);
    router.refresh();
  }, [router]);

  async function handleDesativar(id: string) {
    if (!confirm("Desativar este cartão? Lançamentos existentes são preservados.")) return;
    await desativarCartao(id);
    router.refresh();
  }

  async function handleReativar(id: string) {
    await reativarCartao(id);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* Botão novo cartão */}
      <div>
        <button onClick={() => setNovoAberto((v) => !v)} className="btn-primary">
          {novoAberto ? "Fechar" : "+ Novo cartão"}
        </button>
        {novoAberto && (
          <div className="mt-3">
            <FormCartao onSucesso={refresh} onCancelar={() => setNovoAberto(false)} />
          </div>
        )}
      </div>

      {/* Cartões ativos */}
      {cartoes.length === 0 && (
        <p className="text-sm text-neutral-500">Nenhum cartão ativo. Crie um acima.</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cartoes.map((c) => {
          const uso = pct(c.limiteUsado, c.limite);
          const corBarra = uso >= 90 ? "bg-red-500" : uso >= 70 ? "bg-yellow-500" : "bg-green-500";

          return (
            <div key={c.id} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden">
              {/* Cabeçalho */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100 dark:border-neutral-800">
                <div>
                  <p className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">{c.nome}</p>
                  <p className="text-xs text-neutral-400">{c.bandeira}</p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setEditando(editando === c.id ? null : c.id)}
                    className="btn-secondary text-xs px-2 py-1"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDesativar(c.id)}
                    className="btn-secondary text-xs px-2 py-1 text-red-600 dark:text-red-400"
                  >
                    Desativar
                  </button>
                </div>
              </div>

              {/* Stats */}
              <div className="px-4 py-3 space-y-2">
                <div className="flex justify-between text-xs text-neutral-600 dark:text-neutral-400">
                  <span>Limite total</span>
                  <span className="font-medium">{fmtMoeda(c.limite)}</span>
                </div>
                <div className="flex justify-between text-xs text-neutral-600 dark:text-neutral-400">
                  <span>Limite usado</span>
                  <span className="font-medium text-red-600 dark:text-red-400">{fmtMoeda(c.limiteUsado)}</span>
                </div>
                <div className="flex justify-between text-xs text-neutral-600 dark:text-neutral-400">
                  <span>Disponível</span>
                  <span className="font-medium text-green-600 dark:text-green-400">{fmtMoeda(c.limiteDisponivel)}</span>
                </div>

                {/* Barra de uso */}
                <div className="h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                  <div className={`h-full ${corBarra} transition-all`} style={{ width: `${uso}%` }} />
                </div>

                <div className="flex justify-between text-xs text-neutral-500 pt-1">
                  <span>Fatura aberta</span>
                  <span className="font-semibold text-red-600 dark:text-red-400">{fmtMoeda(c.faturaAberta)}</span>
                </div>
                <div className="flex justify-between text-xs text-neutral-500">
                  <span>Fecha dia {c.diaFechamento} · Vence dia {c.diaVencimento}</span>
                </div>
              </div>

              {/* Form de edição inline */}
              {editando === c.id && (
                <div className="border-t border-neutral-100 dark:border-neutral-800 p-3">
                  <FormCartao
                    cartao={c}
                    onSucesso={refresh}
                    onCancelar={() => setEditando(null)}
                  />
                </div>
              )}

              {/* Toggle fatura */}
              <div className="border-t border-neutral-100 dark:border-neutral-800 px-4 py-2">
                <button
                  onClick={() => setFaturandoId(faturandoId === c.id ? null : c.id)}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {faturandoId === c.id ? "Ocultar fatura" : "Ver fatura detalhada"}
                </button>
              </div>

              {faturandoId === c.id && (
                <div className="px-2 pb-3">
                  <FaturaCartao cartaoId={c.id} cartaoNome={c.nome} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Cartões inativos */}
      {inativas.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300">
            Cartões inativos ({inativas.length})
          </summary>
          <div className="mt-3 space-y-2">
            {inativas.map((c) => (
              <div key={c.id} className="flex items-center justify-between bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg px-4 py-2">
                <div>
                  <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">{c.nome}</span>
                  <span className="text-xs text-neutral-400 ml-2">{c.bandeira}</span>
                </div>
                <button
                  onClick={() => handleReativar(c.id)}
                  className="btn-secondary text-xs px-2 py-1"
                >
                  Reativar
                </button>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
