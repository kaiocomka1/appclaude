import { Suspense } from "react";
import Link from "next/link";
import { listarCartoesComStats, listarCartoesCompleto } from "@/lib/actions/cartoes";
import ListaCartoes from "./_components/ListaCartoes";

export default async function CartoesPage() {
  const [ativos, todos] = await Promise.all([
    listarCartoesComStats(),
    listarCartoesCompleto(),
  ]);

  const inativas = todos.filter((c) => !c.ativo);

  return (
    <main className="min-h-screen bg-neutral-50 dark:bg-neutral-950 p-4 sm:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              Cartões
            </h1>
            <p className="text-sm text-neutral-500 mt-0.5">
              Gestão de cartões de crédito — limites e faturas
            </p>
          </div>
          <Link href="/lancamentos" className="btn-secondary text-sm">
            ← Lançamentos
          </Link>
        </div>

        <Suspense>
          <ListaCartoes cartoes={ativos} inativas={inativas} />
        </Suspense>
      </div>
    </main>
  );
}
