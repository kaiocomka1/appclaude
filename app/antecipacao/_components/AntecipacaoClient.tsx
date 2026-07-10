"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import FormAntecipacao from "./FormAntecipacao";
import type { RecebívelRow } from "@/lib/actions/operacoes";

type Props = {
  recebiveis: RecebívelRow[];
};

export default function AntecipacaoClient({ recebiveis }: Props) {
  const router = useRouter();
  const [concluido, setConcluido] = useState(false);

  function handleSucesso() {
    setConcluido(true);
    router.refresh();
  }

  if (concluido) {
    return (
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6 text-center space-y-4">
        <p className="text-green-800 dark:text-green-300 font-medium">
          Antecipação registrada com sucesso!
        </p>
        <div className="flex justify-center gap-3">
          <button
            onClick={() => setConcluido(false)}
            className="btn-primary"
          >
            Nova antecipação
          </button>
          <a href="/lancamentos" className="btn-secondary">
            Ver lançamentos
          </a>
        </div>
      </div>
    );
  }

  return <FormAntecipacao recebiveis={recebiveis} onSucesso={handleSucesso} />;
}
