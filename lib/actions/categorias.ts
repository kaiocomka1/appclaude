"use server";

import prisma from "@/lib/prisma";

export type CategoriaOption = {
  id: string;
  nome: string;
  tipo: string;
};

export async function listarCategorias(): Promise<CategoriaOption[]> {
  const cats = await prisma.categoria.findMany({
    orderBy: [{ tipo: "asc" }, { nome: "asc" }],
  });
  return cats.map((c) => ({ id: c.id, nome: c.nome, tipo: c.tipo }));
}
