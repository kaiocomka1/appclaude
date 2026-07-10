import { Suspense } from "react";
import { listarLancamentos } from "@/lib/actions/lancamentos";
import { listarCategorias } from "@/lib/actions/categorias";
import { listarCartoes } from "@/lib/actions/cartoes";
import FiltrosLancamentos from "./_components/FiltrosLancamentos";
import TabelaLancamentos from "./_components/TabelaLancamentos";
import BotaoNovoLancamento from "./_components/BotaoNovoLancamento";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function sp(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function LancamentosPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  const filtros = {
    dataInicio: sp(params.dataInicio),
    dataFim: sp(params.dataFim),
    escopo: sp(params.escopo),
    tipo: sp(params.tipo),
    categoriaId: sp(params.categoriaId),
    cartaoId: sp(params.cartaoId),
    status: sp(params.status),
    origem: sp(params.origem),
    busca: sp(params.busca),
    pagina: Number(sp(params.pagina) ?? "1"),
  };

  const [pagina, categorias, cartoes] = await Promise.all([
    listarLancamentos(filtros),
    listarCategorias(),
    listarCartoes(),
  ]);

  return (
    <main className="min-h-screen bg-neutral-50 dark:bg-neutral-950 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              Lançamentos
            </h1>
            <p className="text-sm text-neutral-500 mt-0.5">
              Financeiro — livro-razão permanente
            </p>
          </div>
          <Suspense>
            <BotaoNovoLancamento categorias={categorias} cartoes={cartoes} />
          </Suspense>
        </div>

        {/* Filtros */}
        <Suspense>
          <FiltrosLancamentos categorias={categorias} cartoes={cartoes} />
        </Suspense>

        {/* Tabela */}
        <Suspense>
          <TabelaLancamentos
            itens={pagina.itens}
            total={pagina.total}
            pagina={pagina.pagina}
            totalPaginas={pagina.totalPaginas}
            totais={pagina.totais}
            filtros={filtros}
            categorias={categorias}
            cartoes={cartoes}
          />
        </Suspense>
      </div>
    </main>
  );
}
