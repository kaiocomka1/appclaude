import { Suspense } from "react";
import Link from "next/link";
import { listarCategorias } from "@/lib/actions/categorias";
import VendaClient from "./_components/VendaClient";

export default async function VendaPage() {
  const todasCategorias = await listarCategorias();
  // Só categorias de ENTRADA (exceto ANTECIPACAO que é de sistema para outro fluxo)
  const categoriasEntrada = todasCategorias.filter(
    (c) => c.tipo === "ENTRADA" && c.nome !== "ANTECIPACAO",
  );

  return (
    <main className="min-h-screen bg-neutral-50 dark:bg-neutral-950 p-4 sm:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              Venda via plataforma
            </h1>
            <p className="text-sm text-neutral-500 mt-0.5">
              Gera N recebíveis PREVISTOS + SAIDA de taxa da plataforma
            </p>
          </div>
          <Link href="/lancamentos" className="btn-secondary text-sm">
            ← Lançamentos
          </Link>
        </div>

        <Suspense>
          <VendaClient categoriasEntrada={categoriasEntrada} />
        </Suspense>
      </div>
    </main>
  );
}
