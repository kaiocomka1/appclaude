import Link from "next/link";
import { listarCategorias } from "@/lib/actions/categorias";
import { listarCartoes } from "@/lib/actions/cartoes";
import FotoClient from "./_components/FotoClient";

export default async function FotoPage() {
  const [categorias, cartoes] = await Promise.all([
    listarCategorias(),
    listarCartoes(),
  ]);

  return (
    <main className="min-h-screen bg-neutral-50 dark:bg-neutral-950 p-4 sm:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              Nota Fiscal
            </h1>
            <p className="text-sm text-neutral-500 mt-0.5">
              Fotografe o QR Code ou o comprovante para registrar automaticamente
            </p>
          </div>
          <Link href="/lancamentos" className="btn-secondary text-sm">
            ← Lançamentos
          </Link>
        </div>

        <FotoClient categorias={categorias} cartoes={cartoes} />
      </div>
    </main>
  );
}
