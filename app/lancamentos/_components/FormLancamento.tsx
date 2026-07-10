"use client";

import { useActionState, useEffect } from "react";
import type { CategoriaOption } from "@/lib/actions/categorias";
import type { CartaoOption } from "@/lib/actions/cartoes";
import type { FormState, LancamentoRow } from "@/lib/actions/lancamentos";
import { criarLancamento, editarLancamento } from "@/lib/actions/lancamentos";

type Props = {
  categorias: CategoriaOption[];
  cartoes: CartaoOption[];
  lancamento?: LancamentoRow;
  onSucesso: () => void;
  onCancelar: () => void;
};

const ESTADO_INICIAL: FormState = {};

export default function FormLancamento({
  categorias,
  cartoes,
  lancamento,
  onSucesso,
  onCancelar,
}: Props) {
  const action = lancamento
    ? editarLancamento.bind(null, lancamento.id)
    : criarLancamento;

  const [state, dispatch, pending] = useActionState(action, ESTADO_INICIAL);

  useEffect(() => {
    if (state.sucesso) onSucesso();
  }, [state.sucesso, onSucesso]);

  const tipoAtual = lancamento?.tipo ?? "SAIDA";
  const fpAtual = lancamento?.formaPagamento ?? "";
  const usaCartao = fpAtual === "CARTAO_CREDITO" || fpAtual === "CARTAO_DEBITO";

  const dataStr = lancamento?.data
    ? new Date(lancamento.data).toISOString().split("T")[0]
    : new Date().toISOString().split("T")[0];

  return (
    <form action={dispatch} className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
      <div className="flex flex-col gap-1">
        <label className="label">Tipo *</label>
        <select name="tipo" defaultValue={tipoAtual} required className="input-field">
          <option value="ENTRADA">Entrada</option>
          <option value="SAIDA">Saída</option>
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="label">Escopo *</label>
        <select name="escopo" defaultValue={lancamento?.escopo ?? "PESSOAL"} required className="input-field">
          <option value="PESSOAL">Pessoal</option>
          <option value="EMPRESARIAL">Empresarial</option>
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="label">Categoria *</label>
        <select name="categoriaId" defaultValue={lancamento?.categoriaId ?? ""} required className="input-field">
          <option value="">Selecione...</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.tipo === "ENTRADA" ? "▲" : "▼"} {c.nome}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="label">Descrição *</label>
        <input
          type="text"
          name="descricao"
          defaultValue={lancamento?.descricao ?? ""}
          required
          maxLength={255}
          className="input-field"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="label">Valor (R$) *</label>
        <input
          type="number"
          name="valor"
          defaultValue={lancamento?.valor ?? ""}
          required
          min="0.01"
          step="0.01"
          className="input-field"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="label">Data *</label>
        <input
          type="date"
          name="data"
          defaultValue={dataStr}
          required
          className="input-field"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="label">Forma de pagamento *</label>
        <select name="formaPagamento" defaultValue={fpAtual} required className="input-field">
          <option value="">Selecione...</option>
          <option value="PIX">PIX</option>
          <option value="CARTAO_CREDITO">Cartão de crédito</option>
          <option value="CARTAO_DEBITO">Cartão de débito</option>
          <option value="DINHEIRO">Dinheiro</option>
          <option value="BOLETO">Boleto</option>
          <option value="PLATAFORMA">Plataforma</option>
        </select>
      </div>

      {cartoes.length > 0 && (
        <div className="flex flex-col gap-1">
          <label className="label">Cartão</label>
          <select name="cartaoId" defaultValue={lancamento?.cartaoId ?? ""} className="input-field">
            <option value="">Nenhum</option>
            {cartoes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome} ({c.bandeira})
              </option>
            ))}
          </select>
          {!usaCartao && (
            <span className="text-xs text-neutral-400">Preencha quando a forma for cartão</span>
          )}
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label className="label">Status</label>
        <select name="status" defaultValue={lancamento?.status ?? "CONFIRMADO"} className="input-field">
          <option value="CONFIRMADO">Confirmado</option>
          <option value="PREVISTO">Previsto</option>
          <option value="CANCELADO">Cancelado</option>
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="label">Origem</label>
        <select name="origem" defaultValue={lancamento?.origem ?? "MANUAL"} className="input-field">
          <option value="MANUAL">Manual</option>
          <option value="FOTO">Foto</option>
          <option value="RECORRENTE">Recorrente</option>
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="label">Parcela</label>
        <input
          type="number"
          name="parcela"
          defaultValue={lancamento?.parcela ?? ""}
          min="1"
          className="input-field"
          placeholder="Ex: 1"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="label">Total de parcelas</label>
        <input
          type="number"
          name="totalParcelas"
          defaultValue={lancamento?.totalParcelas ?? ""}
          min="1"
          className="input-field"
          placeholder="Ex: 3"
        />
      </div>

      {state.erro && (
        <div className="col-span-full text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg p-2">
          {state.erro}
        </div>
      )}

      <div className="col-span-full flex gap-2">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Salvando..." : lancamento ? "Salvar alterações" : "Criar lançamento"}
        </button>
        <button type="button" onClick={onCancelar} className="btn-secondary">
          Cancelar
        </button>
      </div>
    </form>
  );
}
