"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import FormLancamento from "./FormLancamento";
import type { CategoriaOption } from "@/lib/actions/categorias";
import type { CartaoOption } from "@/lib/actions/cartoes";

type Props = {
  categorias: CategoriaOption[];
  cartoes: CartaoOption[];
};

export default function BotaoNovoLancamento({ categorias, cartoes }: Props) {
  const [aberto, setAberto] = useState(false);
  const router = useRouter();

  const onSucesso = useCallback(() => {
    setAberto(false);
    router.refresh();
  }, [router]);

  return (
    <div>
      <button onClick={() => setAberto((v) => !v)} className="btn-primary">
        {aberto ? "Fechar" : "+ Novo lançamento"}
      </button>
      {aberto && (
        <div className="mt-3">
          <FormLancamento
            categorias={categorias}
            cartoes={cartoes}
            onSucesso={onSucesso}
            onCancelar={() => setAberto(false)}
          />
        </div>
      )}
    </div>
  );
}
