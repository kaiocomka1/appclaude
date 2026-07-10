"use client";

import { useState, useEffect } from "react";
import { listarFatura } from "@/lib/actions/cartoes";
import type { FaturaItem } from "@/lib/actions/cartoes";

type Props = {
  cartaoId: string;
  cartaoNome: string;
};

function competenciaAtual(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function competenciasRecentes(n = 6): string[] {
  const result: string[] = [];
  const d = new Date();
  for (let i = 0; i < n; i++) {
    const mes = d.getUTCMonth() - i;
    const ano = d.getUTCFullYear() + Math.floor(mes / 12);
    const mesNorm = ((mes % 12) + 12) % 12;
    result.push(`${ano}-${String(mesNorm + 1).padStart(2, "0")}`);
  }
  return result;
}

function fmtMoeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtData(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

function fmtCompetencia(c: string) {
  const [ano, mes] = c.split("-");
  const nomes = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  return `${nomes[Number(mes) - 1]}/${ano}`;
}

export default function FaturaCartao({ cartaoId, cartaoNome }: Props) {
  const [competencia, setCompetencia] = useState(competenciaAtual);
  const [fatura, setFatura] = useState<FaturaItem | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    listarFatura(cartaoId, competencia)
      .then(setFatura)
      .finally(() => setLoading(false));
  }, [cartaoId, competencia]);

  const opcoes = competenciasRecentes();

  return (
    <div className="mt-4 border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between bg-neutral-50 dark:bg-neutral-800 px-4 py-3 border-b border-neutral-200 dark:border-neutral-700">
        <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Fatura — {cartaoNome}
        </span>
        <select
          value={competencia}
          onChange={(e) => setCompetencia(e.target.value)}
          className="input-field w-auto text-xs py-1"
        >
          {opcoes.map((c) => (
            <option key={c} value={c}>{fmtCompetencia(c)}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="px-4 py-6 text-sm text-neutral-500 text-center">Carregando…</p>
      ) : fatura && fatura.lancamentos.length > 0 ? (
        <>
          <table className="w-full">
            <thead className="bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-700">
              <tr>
                <th className="th">Descrição</th>
                <th className="th">Parcela</th>
                <th className="th">Vencimento</th>
                <th className="th text-right">Valor</th>
                <th className="th">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {fatura.lancamentos.map((l) => (
                <tr key={l.id}>
                  <td className="td">{l.descricao}</td>
                  <td className="td text-neutral-500">
                    {l.parcela ? `${l.parcela}/${l.totalParcelas}` : "—"}
                  </td>
                  <td className="td text-neutral-500">{fmtData(l.data)}</td>
                  <td className="td text-right font-medium">{fmtMoeda(l.valor)}</td>
                  <td className="td">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      l.status === "CONFIRMADO"
                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                    }`}>
                      {l.status === "CONFIRMADO" ? "Confirmado" : "Previsto"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-neutral-50 dark:bg-neutral-800/50 border-t border-neutral-200 dark:border-neutral-700">
              <tr>
                <td colSpan={3} className="td text-right font-semibold text-neutral-700 dark:text-neutral-300">
                  Total da fatura
                </td>
                <td className="td text-right font-bold text-red-600 dark:text-red-400">
                  {fmtMoeda(fatura.total)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </>
      ) : (
        <p className="px-4 py-6 text-sm text-neutral-500 text-center">
          Nenhum lançamento nesta competência.
        </p>
      )}
    </div>
  );
}
