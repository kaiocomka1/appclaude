"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useRef } from "react";
import type { CategoriaOption } from "@/lib/actions/categorias";
import type { CartaoOption } from "@/lib/actions/cartoes";

type Props = {
  categorias: CategoriaOption[];
  cartoes: CartaoOption[];
};

export default function FiltrosLancamentos({ categorias, cartoes }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const formRef = useRef<HTMLFormElement>(null);

  function aplicar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const params = new URLSearchParams();
    params.set("pagina", "1");
    for (const [k, v] of fd.entries()) {
      if (v && String(v).trim()) params.set(k, String(v));
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  function limpar() {
    formRef.current?.reset();
    router.push(pathname);
  }

  const val = (key: string) => searchParams.get(key) ?? "";

  return (
    <form
      ref={formRef}
      onSubmit={aplicar}
      className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4 mb-4"
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-neutral-500 font-medium">Data início</label>
          <input
            type="date"
            name="dataInicio"
            defaultValue={val("dataInicio")}
            className="input-field"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-neutral-500 font-medium">Data fim</label>
          <input
            type="date"
            name="dataFim"
            defaultValue={val("dataFim")}
            className="input-field"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-neutral-500 font-medium">Escopo</label>
          <select name="escopo" defaultValue={val("escopo")} className="input-field">
            <option value="">Todos</option>
            <option value="PESSOAL">Pessoal</option>
            <option value="EMPRESARIAL">Empresarial</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-neutral-500 font-medium">Tipo</label>
          <select name="tipo" defaultValue={val("tipo")} className="input-field">
            <option value="">Todos</option>
            <option value="ENTRADA">Entrada</option>
            <option value="SAIDA">Saída</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-neutral-500 font-medium">Categoria</label>
          <select name="categoriaId" defaultValue={val("categoriaId")} className="input-field">
            <option value="">Todas</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-neutral-500 font-medium">Cartão</label>
          <select name="cartaoId" defaultValue={val("cartaoId")} className="input-field">
            <option value="">Todos</option>
            {cartoes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-neutral-500 font-medium">Status</label>
          <select name="status" defaultValue={val("status")} className="input-field">
            <option value="">Todos</option>
            <option value="CONFIRMADO">Confirmado</option>
            <option value="PREVISTO">Previsto</option>
            <option value="CANCELADO">Cancelado</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-neutral-500 font-medium">Origem</label>
          <select name="origem" defaultValue={val("origem")} className="input-field">
            <option value="">Todas</option>
            <option value="MANUAL">Manual</option>
            <option value="FOTO">Foto</option>
            <option value="RECORRENTE">Recorrente</option>
          </select>
        </div>
        <div className="flex flex-col gap-1 col-span-2 sm:col-span-1">
          <label className="text-xs text-neutral-500 font-medium">Busca</label>
          <input
            type="text"
            name="busca"
            defaultValue={val("busca")}
            placeholder="Descrição..."
            className="input-field"
          />
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <button type="submit" className="btn-primary">
          Filtrar
        </button>
        <button type="button" onClick={limpar} className="btn-secondary">
          Limpar
        </button>
      </div>
    </form>
  );
}
