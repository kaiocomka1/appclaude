"use client";

import { useActionState, useCallback } from "react";
import type { CartaoRow } from "@/lib/actions/cartoes";
import { criarCartao, editarCartao } from "@/lib/actions/cartoes";

type Props = {
  cartao?: CartaoRow;
  onSucesso: () => void;
  onCancelar: () => void;
};

const bandeiras = ["VISA", "MASTERCARD", "ELO", "AMEX", "HIPERCARD", "OUTROS"];

export default function FormCartao({ cartao, onSucesso, onCancelar }: Props) {
  const acao = useCallback(
    cartao
      ? editarCartao.bind(null, cartao.id)
      : criarCartao,
    [cartao],
  );

  const [state, dispatch, pending] = useActionState(acao, {});

  if (state.sucesso) {
    onSucesso();
  }

  return (
    <form action={dispatch} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5 space-y-4 max-w-lg">
      <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
        {cartao ? "Editar cartão" : "Novo cartão"}
      </h3>

      {state.erro && (
        <p className="text-xs text-red-600 dark:text-red-400">{state.erro}</p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="label block mb-1">Nome</label>
          <input
            name="nome"
            defaultValue={cartao?.nome}
            required
            maxLength={100}
            placeholder="Ex: Nubank Roxinho"
            className="input-field"
          />
        </div>

        <div>
          <label className="label block mb-1">Bandeira</label>
          <select name="bandeira" defaultValue={cartao?.bandeira ?? "MASTERCARD"} className="input-field">
            {bandeiras.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label block mb-1">Limite (R$)</label>
          <input
            name="limite"
            type="number"
            step="0.01"
            min="0.01"
            defaultValue={cartao?.limite}
            required
            placeholder="5000.00"
            className="input-field"
          />
        </div>

        <div>
          <label className="label block mb-1">Dia de fechamento</label>
          <input
            name="diaFechamento"
            type="number"
            min="1"
            max="28"
            defaultValue={cartao?.diaFechamento}
            required
            placeholder="3"
            className="input-field"
          />
        </div>

        <div>
          <label className="label block mb-1">Dia de vencimento</label>
          <input
            name="diaVencimento"
            type="number"
            min="1"
            max="31"
            defaultValue={cartao?.diaVencimento}
            required
            placeholder="10"
            className="input-field"
          />
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Salvando…" : "Salvar"}
        </button>
        <button type="button" onClick={onCancelar} className="btn-secondary">
          Cancelar
        </button>
      </div>
    </form>
  );
}
