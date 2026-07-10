-- CreateTable
CREATE TABLE "Lancamento" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tipo" TEXT NOT NULL,
    "escopo" TEXT NOT NULL,
    "categoriaId" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL NOT NULL,
    "data" DATETIME NOT NULL,
    "formaPagamento" TEXT NOT NULL,
    "cartaoId" TEXT,
    "parcela" INTEGER,
    "totalParcelas" INTEGER,
    "grupoId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'CONFIRMADO',
    "origem" TEXT NOT NULL DEFAULT 'MANUAL',
    "anexoUrl" TEXT,
    "hashAnexo" TEXT,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL,
    CONSTRAINT "Lancamento_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Lancamento_cartaoId_fkey" FOREIGN KEY ("cartaoId") REFERENCES "Cartao" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Cartao" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "bandeira" TEXT NOT NULL,
    "limite" DECIMAL NOT NULL,
    "diaFechamento" INTEGER NOT NULL,
    "diaVencimento" INTEGER NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Categoria" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "deSistema" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "RegraDesignacao" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "estabelecimento" TEXT NOT NULL,
    "escopo" TEXT NOT NULL,
    "categoriaId" TEXT NOT NULL,
    "atualizadoEm" DATETIME NOT NULL,
    CONSTRAINT "RegraDesignacao_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "ultimoCheckDiario" DATETIME,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "Lancamento_data_idx" ON "Lancamento"("data");

-- CreateIndex
CREATE INDEX "Lancamento_grupoId_idx" ON "Lancamento"("grupoId");

-- CreateIndex
CREATE INDEX "Lancamento_status_idx" ON "Lancamento"("status");

-- CreateIndex
CREATE INDEX "Lancamento_escopo_idx" ON "Lancamento"("escopo");

-- CreateIndex
CREATE INDEX "Lancamento_hashAnexo_idx" ON "Lancamento"("hashAnexo");

-- CreateIndex
CREATE UNIQUE INDEX "Categoria_nome_key" ON "Categoria"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "RegraDesignacao_estabelecimento_key" ON "RegraDesignacao"("estabelecimento");

-- CreateIndex
CREATE INDEX "RegraDesignacao_estabelecimento_idx" ON "RegraDesignacao"("estabelecimento");
