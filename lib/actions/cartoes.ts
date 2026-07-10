"use server";

import prisma from "@/lib/prisma";

export type CartaoOption = {
  id: string;
  nome: string;
  bandeira: string;
};

export async function listarCartoes(): Promise<CartaoOption[]> {
  const cartoes = await prisma.cartao.findMany({
    where: { ativo: true },
    orderBy: { nome: "asc" },
  });
  return cartoes.map((c) => ({ id: c.id, nome: c.nome, bandeira: c.bandeira }));
}
