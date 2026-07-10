"use client";

import { useState, useCallback, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import type { LancamentoRow, TotaisRow, FiltrosLancamentos } from "@/lib/actions/lancamentos";
import { cancelarLancamento } from "@/lib/actions/lancamentos";
import type { CategoriaOption } from "@/lib/actions/categorias";
import type { CartaoOption } from "@/lib/actions/cartoes";
import FormLancamento from "./FormLancamento";

type Props = {
  itens: LancamentoRow[];
  total: number;
  pagina: number;
  totalPaginas: number;
  totais: TotaisRow;
  filtros: FiltrosLancamentos;
  categorias: CategoriaOption[];
  cartoes: CartaoOption[];
};

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const DT = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

const STATUS_BADGE: Record<string, string> = {
  CONFIRMADO: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
  PREVISTO: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400",
  CANCELADO: "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
};

const FP_LABEL: Record<string, string> = {
  PIX: "PIX",
  CARTAO_CREDITO: "Crédito",
  CARTAO_DEBITO: "Débito",
  DINHEIRO: "Dinheiro",
  BOLETO: "Boleto",
  PLATAFORMA: "Plataforma",
};

export default function TabelaLancamentos({
  itens,
  total,
  pagina,
  totalPaginas,
  totais,
  filtros,
  categorias,
  cartoes,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function buildUrl(novaPagina: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("pagina", String(novaPagina));
    return `${pathname}?${params.toString()}`;
  }

  function refresh() {
    startTransition(() => router.refresh());
  }

  const onSucesso = useCallback(() => {
    setEditandoId(null);
    refresh();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function onCancelar(id: string) {
    if (!confirm("Cancelar este lançamento? Esta ação não pode ser desfeita.")) return;
    const res = await cancelarLancamento(id);
    if (res.erro) alert(res.erro);
    else refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Totais */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-3 text-center">
          <div className="text-xs text-green-600 dark:text-green-400 font-medium mb-1">Entradas</div>
          <div className="text-lg font-bold text-green-700 dark:text-green-300">
            {BRL.format(totais.totalEntradas)}
          </div>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 text-center">
          <div className="text-xs text-red-600 dark:text-red-400 font-medium mb-1">Saídas</div>
          <div className="text-lg font-bold text-red-700 dark:text-red-300">
            {BRL.format(totais.totalSaidas)}
          </div>
        </div>
        <div
          className={`border rounded-xl p-3 text-center ${
            totais.saldo >= 0
              ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
              : "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800"
          }`}
        >
          <div className={`text-xs font-medium mb-1 ${totais.saldo >= 0 ? "text-blue-600 dark:text-blue-400" : "text-orange-600 dark:text-orange-400"}`}>
            Saldo
          </div>
          <div className={`text-lg font-bold ${totais.saldo >= 0 ? "text-blue-700 dark:text-blue-300" : "text-orange-700 dark:text-orange-300"}`}>
            {BRL.format(totais.saldo)}
          </div>
        </div>
      </div>

      {/* Contador */}
      <div className="text-sm text-neutral-500">
        {total === 0 ? "Nenhum lançamento encontrado." : `${total} lançamento${total !== 1 ? "s" : ""} encontrado${total !== 1 ? "s" : ""} — página ${pagina} de ${totalPaginas}`}
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
              <th className="th">Data</th>
              <th className="th">Tipo</th>
              <th className="th">Descrição</th>
              <th className="th">Categoria</th>
              <th className="th">Valor</th>
              <th className="th">Pagamento</th>
              <th className="th">Status</th>
              <th className="th">Escopo</th>
              <th className="th text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {itens.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center py-12 text-neutral-400">
                  Nenhum lançamento neste filtro.
                </td>
              </tr>
            )}
            {itens.map((l) => (
              <>
                <tr
                  key={l.id}
                  className={`border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors ${
                    l.status === "CANCELADO" ? "opacity-50" : ""
                  }`}
                >
                  <td className="td whitespace-nowrap">
                    {DT.format(new Date(l.data))}
                  </td>
                  <td className="td">
                    <span className={`font-semibold ${l.tipo === "ENTRADA" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                      {l.tipo === "ENTRADA" ? "▲" : "▼"}
                    </span>
                  </td>
                  <td className="td max-w-[200px] truncate">
                    {l.descricao}
                    {l.parcela && l.totalParcelas && (
                      <span className="ml-1 text-xs text-neutral-400">
                        ({l.parcela}/{l.totalParcelas}x)
                      </span>
                    )}
                  </td>
                  <td className="td text-neutral-600 dark:text-neutral-400">{l.categoriaNome}</td>
                  <td className={`td font-mono font-medium ${l.tipo === "ENTRADA" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                    {BRL.format(l.valor)}
                  </td>
                  <td className="td">
                    <span className="text-xs">{FP_LABEL[l.formaPagamento] ?? l.formaPagamento}</span>
                    {l.cartaoNome && (
                      <span className="block text-xs text-neutral-400">{l.cartaoNome}</span>
                    )}
                  </td>
                  <td className="td">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE[l.status] ?? ""}`}>
                      {l.status}
                    </span>
                  </td>
                  <td className="td">
                    <span className="text-xs text-neutral-500">{l.escopo === "PESSOAL" ? "Pessoal" : "Empresarial"}</span>
                  </td>
                  <td className="td text-right whitespace-nowrap">
                    {l.status !== "CANCELADO" && (
                      <>
                        <button
                          onClick={() => setEditandoId(editandoId === l.id ? null : l.id)}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline mr-3"
                        >
                          {editandoId === l.id ? "Fechar" : "Editar"}
                        </button>
                        <button
                          onClick={() => onCancelar(l.id)}
                          className="text-xs text-red-600 dark:text-red-400 hover:underline"
                        >
                          Cancelar
                        </button>
                      </>
                    )}
                  </td>
                </tr>
                {editandoId === l.id && (
                  <tr key={`edit-${l.id}`} className="bg-neutral-50 dark:bg-neutral-900">
                    <td colSpan={9} className="p-0">
                      <FormLancamento
                        lancamento={l}
                        categorias={categorias}
                        cartoes={cartoes}
                        onSucesso={onSucesso}
                        onCancelar={() => setEditandoId(null)}
                      />
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <a
            href={buildUrl(1)}
            className={`btn-page ${pagina === 1 ? "opacity-40 pointer-events-none" : ""}`}
          >
            «
          </a>
          <a
            href={buildUrl(pagina - 1)}
            className={`btn-page ${pagina === 1 ? "opacity-40 pointer-events-none" : ""}`}
          >
            ‹
          </a>
          {Array.from({ length: Math.min(7, totalPaginas) }, (_, i) => {
            const start = Math.max(1, Math.min(pagina - 3, totalPaginas - 6));
            const p = start + i;
            if (p > totalPaginas) return null;
            return (
              <a
                key={p}
                href={buildUrl(p)}
                className={`btn-page ${p === pagina ? "bg-blue-600 text-white border-blue-600" : ""}`}
              >
                {p}
              </a>
            );
          })}
          <a
            href={buildUrl(pagina + 1)}
            className={`btn-page ${pagina === totalPaginas ? "opacity-40 pointer-events-none" : ""}`}
          >
            ›
          </a>
          <a
            href={buildUrl(totalPaginas)}
            className={`btn-page ${pagina === totalPaginas ? "opacity-40 pointer-events-none" : ""}`}
          >
            »
          </a>
        </div>
      )}
    </div>
  );
}
