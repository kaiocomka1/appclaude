"use client";

import { useActionState, useEffect, useState, useId } from "react";
import { registrarAntecipacao } from "@/lib/actions/operacoes";
import type { RecebívelRow } from "@/lib/actions/operacoes";

type Props = {
  recebiveis: RecebívelRow[];
  onSucesso: () => void;
};

function fmtMoeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtData(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export default function FormAntecipacao({ recebiveis, onSucesso }: Props) {
  const id = useId();
  const [state, dispatch, pending] = useActionState(registrarAntecipacao, {});
  const [bruto, setBruto] = useState("");
  const [liquido, setLiquido] = useState("");
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (state.sucesso) onSucesso();
  }, [state.sucesso, onSucesso]);

  const taxa =
    bruto !== "" && liquido !== ""
      ? Math.max(0, Number(bruto) - Number(liquido))
      : null;

  const totalSelecionado = recebiveis
    .filter((r) => selecionados.has(r.id))
    .reduce((s, r) => s + r.valor, 0);

  function toggleAll() {
    if (selecionados.size === recebiveis.length) {
      setSelecionados(new Set());
    } else {
      setSelecionados(new Set(recebiveis.map((r) => r.id)));
    }
  }

  function toggle(id: string) {
    setSelecionados((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const hoje = new Date().toISOString().split("T")[0];

  return (
    <form action={dispatch} className="space-y-6">
      {state.erro && (
        <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg px-4 py-3">
          {state.erro}
        </div>
      )}

      {/* Campos principais */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 mb-4">
          Dados da antecipação
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label htmlFor={`${id}-desc`} className="label block mb-1">Descrição</label>
            <input
              id={`${id}-desc`}
              name="descricao"
              defaultValue="Antecipação"
              required
              maxLength={255}
              className="input-field"
              placeholder="Ex: Antecipação Hotmart março"
            />
          </div>

          <div>
            <label htmlFor={`${id}-bruto`} className="label block mb-1">
              Valor bruto (R$) *
            </label>
            <input
              id={`${id}-bruto`}
              name="valorBruto"
              type="number"
              min="0.01"
              step="0.01"
              required
              value={bruto}
              onChange={(e) => setBruto(e.target.value)}
              className="input-field"
              placeholder="1000.00"
            />
          </div>

          <div>
            <label htmlFor={`${id}-liquido`} className="label block mb-1">
              Valor líquido recebido (R$) *
            </label>
            <input
              id={`${id}-liquido`}
              name="valorLiquido"
              type="number"
              min="0.01"
              step="0.01"
              required
              value={liquido}
              onChange={(e) => setLiquido(e.target.value)}
              className="input-field"
              placeholder="950.00"
            />
          </div>

          {/* Taxa calculada (read-only) */}
          {taxa !== null && (
            <div className="sm:col-span-2">
              <p className="text-xs text-neutral-500">
                Taxa de antecipação calculada:{" "}
                <span className={`font-semibold ${taxa > 0 ? "text-red-600 dark:text-red-400" : "text-neutral-700 dark:text-neutral-300"}`}>
                  {fmtMoeda(taxa)}
                </span>
                {bruto && liquido && Number(bruto) > 0 && (
                  <span className="ml-2 text-neutral-400">
                    ({((taxa / Number(bruto)) * 100).toFixed(2)}%)
                  </span>
                )}
              </p>
            </div>
          )}

          <div>
            <label htmlFor={`${id}-data`} className="label block mb-1">Data *</label>
            <input
              id={`${id}-data`}
              name="data"
              type="date"
              required
              defaultValue={hoje}
              className="input-field"
            />
          </div>

          <div>
            <label htmlFor={`${id}-escopo`} className="label block mb-1">Escopo *</label>
            <select id={`${id}-escopo`} name="escopo" defaultValue="EMPRESARIAL" className="input-field">
              <option value="PESSOAL">Pessoal</option>
              <option value="EMPRESARIAL">Empresarial</option>
            </select>
          </div>
        </div>
      </div>

      {/* Recebíveis para baixa */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-100 dark:border-neutral-800">
          <div>
            <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
              Recebíveis para baixar (opcional)
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Marque os recebíveis antecipados — eles serão cancelados
            </p>
          </div>
          {recebiveis.length > 0 && (
            <button
              type="button"
              onClick={toggleAll}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              {selecionados.size === recebiveis.length ? "Desmarcar todos" : "Marcar todos"}
            </button>
          )}
        </div>

        {recebiveis.length === 0 ? (
          <p className="px-5 py-4 text-sm text-neutral-500">
            Nenhum recebível previsto encontrado. Registre vendas via plataforma primeiro.
          </p>
        ) : (
          <>
            <ul className="divide-y divide-neutral-100 dark:divide-neutral-800 max-h-72 overflow-y-auto">
              {recebiveis.map((r) => (
                <li key={r.id} className="flex items-center gap-3 px-5 py-2.5">
                  <input
                    type="checkbox"
                    id={`recv-${r.id}`}
                    name="recebivelId"
                    value={r.id}
                    checked={selecionados.has(r.id)}
                    onChange={() => toggle(r.id)}
                    className="h-4 w-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label
                    htmlFor={`recv-${r.id}`}
                    className="flex-1 cursor-pointer min-w-0"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-neutral-800 dark:text-neutral-200 truncate">
                        {r.descricao}
                      </span>
                      <span className="text-sm font-medium text-green-700 dark:text-green-400 shrink-0">
                        {fmtMoeda(r.valor)}
                      </span>
                    </div>
                    <div className="flex gap-3 mt-0.5">
                      <span className="text-xs text-neutral-400">{fmtData(r.data)}</span>
                      <span className="text-xs text-neutral-400">{r.categoriaNome}</span>
                    </div>
                  </label>
                </li>
              ))}
            </ul>
            {selecionados.size > 0 && (
              <div className="px-5 py-2 bg-blue-50 dark:bg-blue-900/20 border-t border-neutral-100 dark:border-neutral-800">
                <p className="text-xs text-blue-700 dark:text-blue-400">
                  {selecionados.size} recebível(s) selecionado(s) ·{" "}
                  <span className="font-semibold">{fmtMoeda(totalSelecionado)}</span>
                </p>
              </div>
            )}
          </>
        )}
      </div>

      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Registrando…" : "Registrar antecipação"}
      </button>
    </form>
  );
}
