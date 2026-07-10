"use client";

import { useActionState, useEffect, useState, useId } from "react";
import { registrarVendaPlataforma } from "@/lib/actions/operacoes";
import type { CategoriaOption } from "@/lib/actions/categorias";

type Props = {
  categoriasEntrada: CategoriaOption[];
  onSucesso: () => void;
};

function fmtMoeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function FormVenda({ categoriasEntrada, onSucesso }: Props) {
  const fid = useId();
  const [state, dispatch, pending] = useActionState(registrarVendaPlataforma, {});
  const [bruto, setBruto] = useState("");
  const [taxa, setTaxa] = useState("10");
  const [parcelas, setParcelas] = useState("1");

  useEffect(() => {
    if (state.sucesso) onSucesso();
  }, [state.sucesso, onSucesso]);

  const valorBrutoNum = Number(bruto) || 0;
  const taxaNum = Number(taxa) || 0;
  const parcelasNum = Math.max(1, Number(parcelas) || 1);
  const valorTaxa = Math.round(valorBrutoNum * taxaNum / 100 * 100) / 100;
  const valorLiquido = valorBrutoNum - valorTaxa;
  const valorParcela = parcelasNum > 0 ? valorBrutoNum / parcelasNum : 0;

  const hoje = new Date().toISOString().split("T")[0];

  return (
    <form action={dispatch} className="space-y-6">
      {state.erro && (
        <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg px-4 py-3">
          {state.erro}
        </div>
      )}

      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
          Dados da venda
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label htmlFor={`${fid}-desc`} className="label block mb-1">Descrição *</label>
            <input
              id={`${fid}-desc`}
              name="descricao"
              required
              maxLength={255}
              className="input-field"
              placeholder="Ex: Mentoria Premium — turma jan/2026"
            />
          </div>

          <div>
            <label htmlFor={`${fid}-escopo`} className="label block mb-1">Escopo *</label>
            <select id={`${fid}-escopo`} name="escopo" defaultValue="EMPRESARIAL" className="input-field">
              <option value="PESSOAL">Pessoal</option>
              <option value="EMPRESARIAL">Empresarial</option>
            </select>
          </div>

          <div>
            <label htmlFor={`${fid}-cat`} className="label block mb-1">Categoria dos recebíveis *</label>
            <select id={`${fid}-cat`} name="categoriaVendaId" required className="input-field">
              <option value="">Selecione…</option>
              {categoriasEntrada.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor={`${fid}-bruto`} className="label block mb-1">Valor bruto (R$) *</label>
            <input
              id={`${fid}-bruto`}
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
            <label htmlFor={`${fid}-taxa`} className="label block mb-1">Taxa da plataforma (%)</label>
            <input
              id={`${fid}-taxa`}
              name="taxaPercentual"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={taxa}
              onChange={(e) => setTaxa(e.target.value)}
              className="input-field"
              placeholder="10"
            />
          </div>

          <div>
            <label htmlFor={`${fid}-parc`} className="label block mb-1">Número de parcelas *</label>
            <input
              id={`${fid}-parc`}
              name="totalParcelas"
              type="number"
              min="1"
              max="60"
              required
              value={parcelas}
              onChange={(e) => setParcelas(e.target.value)}
              className="input-field"
              placeholder="1"
            />
          </div>

          <div>
            <label htmlFor={`${fid}-data`} className="label block mb-1">Data da 1ª parcela *</label>
            <input
              id={`${fid}-data`}
              name="dataInicial"
              type="date"
              required
              defaultValue={hoje}
              className="input-field"
            />
          </div>
        </div>
      </div>

      {/* Preview dos valores */}
      {valorBrutoNum > 0 && (
        <div className="bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4 space-y-2 text-sm">
          <p className="font-medium text-neutral-700 dark:text-neutral-300 mb-2">Resumo</p>
          <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
            <span>Valor bruto</span>
            <span className="font-medium">{fmtMoeda(valorBrutoNum)}</span>
          </div>
          {taxaNum > 0 && (
            <div className="flex justify-between text-red-600 dark:text-red-400">
              <span>Taxa plataforma ({taxa}%)</span>
              <span className="font-medium">− {fmtMoeda(valorTaxa)}</span>
            </div>
          )}
          <div className="flex justify-between text-green-700 dark:text-green-400 border-t border-neutral-200 dark:border-neutral-700 pt-2">
            <span>Líquido a receber</span>
            <span className="font-semibold">{fmtMoeda(valorLiquido)}</span>
          </div>
          {parcelasNum > 1 && (
            <div className="flex justify-between text-neutral-500 dark:text-neutral-400 text-xs">
              <span>Valor por parcela (bruto)</span>
              <span>{fmtMoeda(valorParcela)}</span>
            </div>
          )}
          <div className="flex justify-between text-neutral-500 dark:text-neutral-400 text-xs pt-1">
            <span>Lançamentos criados</span>
            <span>
              {parcelasNum} recebível(is) PREVISTO{parcelasNum > 1 ? "S" : ""}
              {taxaNum > 0 ? " + 1 SAIDA taxa" : ""}
            </span>
          </div>
        </div>
      )}

      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Registrando…" : "Registrar venda"}
      </button>
    </form>
  );
}
