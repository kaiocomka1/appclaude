import { Suspense } from "react";
import Link from "next/link";
import { listarRecebiveis } from "@/lib/actions/operacoes";
import AntecipacaoClient from "./_components/AntecipacaoClient";

export default async function AntecipacaoPage() {
  const recebiveis = await listarRecebiveis();

  return (
    <main className="min-h-screen bg-neutral-50 dark:bg-neutral-950 p-4 sm:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              Antecipação
            </h1>
            <p className="text-sm text-neutral-500 mt-0.5">
              Registra ENTRADA bruta + SAIDA de taxa, cancela recebíveis antecipados
            </p>
          </div>
          <Link href="/lancamentos" className="btn-secondary text-sm">
            ← Lançamentos
          </Link>
        </div>

        <Suspense>
          <AntecipacaoClient recebiveis={recebiveis} />
        </Suspense>
      </div>
    </main>
  );
}
