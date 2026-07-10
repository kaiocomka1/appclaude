"use client";

import { useActionState, useEffect, useId, useState } from "react";
import type { CategoriaOption } from "@/lib/actions/categorias";
import type { CartaoOption } from "@/lib/actions/cartoes";
import type { DadosNota } from "@/lib/extrator";
import {
  buscarSugestao,
  verificarDuplicata,
  salvarDaFoto,
} from "@/lib/actions/foto";

const THRESHOLD = 0.85;

function campoClass(confianca?: number) {
  if (confianca === undefined || confianca >= THRESHOLD) return "input-field";
  return "input-field border-yellow-400 dark:border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20";
}

function BadgeRevisar() {
  return (
    <span className="ml-1 text-xs font-medium text-yellow-700 dark:text-yellow-400">
      ⚠ Revisar
    </span>
  );
}

type Props = {
  dados: DadosNota;
  hash: string;
  categorias: CategoriaOption[];
  cartoes: CartaoOption[];
  onSucesso: () => void;
  onVoltar: () => void;
};

export default function FotoRevisao({
  dados,
  hash,
  categorias,
  cartoes,
  onSucesso,
  onVoltar,
}: Props) {
  const id = useId();
  const [state, dispatch, pending] = useActionState(salvarDaFoto, {});

  const [duplicataAviso, setDuplicataAviso] = useState<string | null>(null);
  const [sugestaoAplicada, setSugestaoAplicada] = useState(false);
  const [escopo, setEscopo] = useState("PESSOAL");
  const [categoriaId, setCategoriaId] = useState("");
  const [tipo, setTipo] = useState("SAIDA");

  useEffect(() => {
    if (state.sucesso) onSucesso();
  }, [state.sucesso, onSucesso]);

  const estab = dados.estabelecimento?.valor;

  useEffect(() => {
    async function carregar() {
      // Buscar sugestão de RegraDesignacao
      if (estab && !sugestaoAplicada) {
        const sug = await buscarSugestao(estab);
        if (sug) {
          setEscopo(sug.escopo);
          setCategoriaId(sug.categoriaId);
          setSugestaoAplicada(true);
        }
      }

      // Verificar duplicata
      const check = await verificarDuplicata({
        hash: hash || undefined,
        valor: dados.valor?.valor,
        data: dados.data?.valor?.toISOString().split("T")[0],
        estabelecimento: estab,
      });
      if (check.duplicata) {
        setDuplicataAviso(check.motivo ?? "Possível lançamento duplicado.");
      }
    }
    carregar();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hoje = new Date().toISOString().split("T")[0];
  const dataValor = dados.data?.valor
    ? dados.data.valor.toISOString().split("T")[0]
    : hoje;
  const valorStr = dados.valor?.valor?.toFixed(2) ?? "";

  const categoriasFiltradas = categorias.filter((c) => c.tipo === tipo);

  return (
    <form action={dispatch} className="space-y-4">
      {state.erro && (
        <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg px-4 py-3">
          {state.erro}
        </div>
      )}

      {duplicataAviso && (
        <div className="text-sm text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-lg px-4 py-3">
          ⚠ {duplicataAviso}
        </div>
      )}

      <input type="hidden" name="hashAnexo" value={hash} />
      <input type="hidden" name="estabelecimento" value={estab ?? ""} />

      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
          Revisar dados extraídos
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Tipo */}
          <div>
            <label htmlFor={`${id}-tipo`} className="label block mb-1">Tipo *</label>
            <select
              id={`${id}-tipo`}
              name="tipo"
              value={tipo}
              onChange={(e) => { setTipo(e.target.value); setCategoriaId(""); }}
              className="input-field"
            >
              <option value="SAIDA">Saída</option>
              <option value="ENTRADA">Entrada</option>
            </select>
          </div>

          {/* Escopo */}
          <div>
            <label htmlFor={`${id}-escopo`} className="label block mb-1">Escopo *</label>
            <select
              id={`${id}-escopo`}
              name="escopo"
              value={escopo}
              onChange={(e) => setEscopo(e.target.value)}
              className="input-field"
            >
              <option value="PESSOAL">Pessoal</option>
              <option value="EMPRESARIAL">Empresarial</option>
            </select>
          </div>

          {/* Descrição / Estabelecimento */}
          <div className="sm:col-span-2">
            <label htmlFor={`${id}-desc`} className="label block mb-1">
              Descrição *
              {dados.estabelecimento && dados.estabelecimento.confianca < THRESHOLD && <BadgeRevisar />}
            </label>
            <input
              id={`${id}-desc`}
              name="descricao"
              defaultValue={dados.estabelecimento?.valor ?? ""}
              required
              maxLength={255}
              className={campoClass(dados.estabelecimento?.confianca)}
              placeholder="Nome do estabelecimento"
            />
          </div>

          {/* Valor */}
          <div>
            <label htmlFor={`${id}-valor`} className="label block mb-1">
              Valor (R$) *
              {dados.valor && dados.valor.confianca < THRESHOLD && <BadgeRevisar />}
            </label>
            <input
              id={`${id}-valor`}
              name="valor"
              type="number"
              min="0.01"
              step="0.01"
              required
              defaultValue={valorStr}
              className={campoClass(dados.valor?.confianca)}
              placeholder="0.00"
            />
          </div>

          {/* Data */}
          <div>
            <label htmlFor={`${id}-data`} className="label block mb-1">
              Data *
              {dados.data && dados.data.confianca < THRESHOLD && <BadgeRevisar />}
            </label>
            <input
              id={`${id}-data`}
              name="data"
              type="date"
              required
              defaultValue={dataValor}
              className={campoClass(dados.data?.confianca)}
            />
          </div>

          {/* Categoria */}
          <div>
            <label htmlFor={`${id}-cat`} className="label block mb-1">Categoria *</label>
            <select
              id={`${id}-cat`}
              name="categoriaId"
              required
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
              className="input-field"
            >
              <option value="">Selecione…</option>
              {categoriasFiltradas.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>

          {/* Forma de pagamento */}
          <div>
            <label htmlFor={`${id}-fp`} className="label block mb-1">
              Forma de pagamento *
              {dados.formaPagamento && dados.formaPagamento.confianca < THRESHOLD && <BadgeRevisar />}
            </label>
            <select
              id={`${id}-fp`}
              name="formaPagamento"
              defaultValue={dados.formaPagamento?.valor ?? "PIX"}
              className={campoClass(dados.formaPagamento?.confianca)}
            >
              <option value="PIX">PIX</option>
              <option value="CARTAO_CREDITO">Cartão de crédito</option>
              <option value="CARTAO_DEBITO">Cartão de débito</option>
              <option value="DINHEIRO">Dinheiro</option>
              <option value="BOLETO">Boleto</option>
              <option value="PLATAFORMA">Plataforma</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label htmlFor={`${id}-status`} className="label block mb-1">Status</label>
            <select id={`${id}-status`} name="status" defaultValue="CONFIRMADO" className="input-field">
              <option value="CONFIRMADO">Confirmado</option>
              <option value="PREVISTO">Previsto</option>
            </select>
          </div>

          {/* Chave de acesso (informativo, apenas se disponível) */}
          {dados.chaveAcesso && (
            <div className="sm:col-span-2">
              <p className="text-xs text-neutral-400">
                Chave NFC-e: <span className="font-mono break-all">{dados.chaveAcesso.valor}</span>
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        <button type="button" onClick={onVoltar} className="btn-secondary flex-1">
          Voltar
        </button>
        <button type="submit" disabled={pending} className="btn-primary flex-1">
          {pending ? "Salvando…" : "Salvar lançamento"}
        </button>
      </div>
    </form>
  );
}
