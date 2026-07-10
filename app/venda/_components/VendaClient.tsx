"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import FormVenda from "./FormVenda";
import type { CategoriaOption } from "@/lib/actions/categorias";

type Props = {
  categoriasEntrada: CategoriaOption[];
};

export default function VendaClient({ categoriasEntrada }: Props) {
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
          Venda registrada! Recebíveis criados como PREVISTO.
        </p>
        <div className="flex justify-center gap-3">
          <button onClick={() => setConcluido(false)} className="btn-primary">
            Nova venda
          </button>
          <a href="/lancamentos" className="btn-secondary">
            Ver lançamentos
          </a>
          <a href="/antecipacao" className="btn-secondary">
            Antecipar
          </a>
        </div>
      </div>
    );
  }

  return (
    <FormVenda categoriasEntrada={categoriasEntrada} onSucesso={handleSucesso} />
  );
}
