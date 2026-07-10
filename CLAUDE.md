@AGENTS.md

# Financeiro — CLAUDE.md

Documento de referência da arquitetura e estado do projeto.
**Atualizado ao final de cada fase.**

---

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript |
| Estilo | Tailwind CSS v4 |
| ORM | Prisma 7 (gerador `prisma-client`) |
| Banco | SQLite via `@libsql/client` + `@prisma/adapter-libsql` |
| Validação | Zod 4 |
| OCR (Fase 5) | Tesseract.js (idioma "por") — execução no navegador |
| QR Code (Fase 5) | jsQR — execução no navegador |
| API CNPJ (Fase 5) | BrasilAPI `https://brasilapi.com.br/api/cnpj/v1/{cnpj}` — pública, gratuita, com cache local |

**Nenhuma API paga em nenhuma parte do app.**

---

## Princípios Inegociáveis

1. **Simplicidade** — o app é essencialmente UMA tabela de lançamentos com filtros fortes. Nada de dashboards complexos ou módulos desnecessários.
2. **Livro-razão permanente** — nenhum lançamento é apagado fisicamente; cancelamento é status `CANCELADO`. "Saldo do mês" é filtro por data, nunca reset.
3. **Registro único** — o usuário registra o fato UMA vez e o sistema propaga os efeitos (parcelas, fatura de cartão, taxa de antecipação). Regras que conectam lançamentos vivem em `lib/logic.ts` como funções puras; server actions só validam, gravam e chamam a lógica.
4. **Idempotência** — nenhum efeito automático pode duplicar se rodar duas vezes.

---

## Modelo de Dados

### Lancamento
| Campo | Tipo | Observações |
|---|---|---|
| id | cuid | PK |
| tipo | `ENTRADA\|SAIDA` | |
| escopo | `PESSOAL\|EMPRESARIAL` | |
| categoriaId | FK → Categoria | |
| descricao | String | |
| valor | Decimal | Sempre positivo |
| data | DateTime | Data do fato |
| formaPagamento | enum | PIX, CARTAO_CREDITO, CARTAO_DEBITO, DINHEIRO, BOLETO, PLATAFORMA |
| cartaoId | FK → Cartao? | Preenchido quando formaPagamento = CARTAO_CREDITO ou CARTAO_DEBITO |
| parcela | Int? | Número da parcela atual |
| totalParcelas | Int? | Total de parcelas do grupo |
| grupoId | String? | Liga parcelas irmãs e o par ENTRADA+TAXA de antecipação |
| status | `CONFIRMADO\|PREVISTO\|CANCELADO` | Default: CONFIRMADO |
| origem | `MANUAL\|FOTO\|RECORRENTE` | Default: MANUAL |
| anexoUrl | String? | |
| hashAnexo | String? | Anti-duplicata por hash da imagem |

### Cartao
| Campo | Tipo |
|---|---|
| nome | String |
| bandeira | String |
| limite | Decimal |
| diaFechamento | Int |
| diaVencimento | Int |
| ativo | Boolean |

### Categoria
| Campo | Tipo | Observações |
|---|---|---|
| nome | String | Unique |
| tipo | `ENTRADA\|SAIDA` | |
| deSistema | Boolean | Se true, não pode ser excluída pelo usuário |

Categorias `deSistema = true`: ADS, ANTECIPACAO, TAXA_ANTECIPACAO, TAXA_PLATAFORMA, VENDA_MENTORIA.

### RegraDesignacao
Aprende associações estabelecimento → escopo+categoria para sugerir campos na Fase 5.

| Campo | Tipo |
|---|---|
| estabelecimento | String (unique, normalizado) |
| escopo | `PESSOAL\|EMPRESARIAL` |
| categoriaId | FK → Categoria |

### Settings
Singleton (`id = "singleton"`) para flags de controle (ex: `ultimoCheckDiario`).

---

## Matriz Evento → Efeitos

> **Contrato permanente.** Nunca quebre uma linha existente ao adicionar código novo.

| Evento | Efeitos gerados |
|---|---|
| SAIDA com CARTAO_CREDITO, sem parcelas | Entra na fatura da competência correta por `diaFechamento`; 1 lançamento CONFIRMADO |
| SAIDA com CARTAO_CREDITO, parcelada em N | N lançamentos ligados por `grupoId`: 1º CONFIRMADO na competência atual, demais PREVISTOS |
| Registrar ANTECIPAÇÃO (bruto + líquido + data) | ENTRADA (bruto, cat. ANTECIPACAO) + SAIDA (bruto − líquido, cat. TAXA_ANTECIPACAO), mesmo `grupoId` |
| Antecipação com recebíveis informados | Os lançamentos PREVISTOS indicados ficam com status CANCELADO no mesmo `grupoId` |
| Venda parcelada via plataforma | N ENTRADAS previstas (recebíveis) + 1 SAIDA TAXA_PLATAFORMA, `grupoId` comum |
| Cancelar lançamento com `grupoId` | Perguntar ao usuário se cancela o grupo inteiro |
| Primeiro acesso do dia (`runDailyChecks`) | Idempotente (flag `ultimoCheckDiario` em Settings); marca PREVISTOS vencidos com badge "atrasado"; alerta fatura que fecha amanhã |

---

## Arquitetura de Pastas

```
app/
  layout.tsx              — layout raiz
  page.tsx                — redirect para /lancamentos
  globals.css             — classes utilitárias: input-field, btn-primary, btn-secondary, th, td, label, btn-page
  lancamentos/
    page.tsx              — Server Component: lê searchParams, chama actions em paralelo, passa props
    _components/
      FiltrosLancamentos.tsx   — Client: barra de filtros (9 campos), atualiza URL ao submeter
      TabelaLancamentos.tsx    — Client: tabela com totais, edição inline, paginação por URL
      FormLancamento.tsx       — Client: form criar/editar usando useActionState
      BotaoNovoLancamento.tsx  — Client: toggle que abre FormLancamento para criação
  cartoes/
    page.tsx              — Fase 3: Server Component, carrega stats e lista
    _components/
      ListaCartoes.tsx    — Client: cards com limite/fatura, inline edit, toggle fatura
      FormCartao.tsx      — Client: form criar/editar cartão usando useActionState
      FaturaCartao.tsx    — Client: fatura detalhada por cartão e competência
  antecipacao/
    page.tsx              — Fase 4: Server Component, carrega recebíveis PREVISTOS
    _components/
      AntecipacaoClient.tsx — Client: wrapper com estado de sucesso/reset
      FormAntecipacao.tsx   — Client: form com bruto/líquido + checklist de recebíveis
  venda/
    page.tsx              — Fase 4: Server Component, carrega categorias ENTRADA
    _components/
      VendaClient.tsx     — Client: wrapper com estado de sucesso/reset
      FormVenda.tsx       — Client: form de venda parcelada com preview de valores
  foto/
    page.tsx              — Fase 5: Server Component, carrega categorias e cartões
    _components/
      FotoClient.tsx      — Client: orquestrador de etapas (CAPTURA→PROCESSANDO→REVISAO→SUCESSO)
      FotoCaptura.tsx     — Client: câmera + loop jsQR 5fps + moldura + fallback OCR
      FotoRevisao.tsx     — Client: formulário de revisão com campos amarelos para confiança < 0,85
  indicadores/page.tsx    — Fase 6: ROAS e métricas
  configuracoes/page.tsx  — Fase 6: configurações
  generated/prisma/       — cliente Prisma gerado (não editar)

lib/
  prisma.ts               — singleton do PrismaClient (libsql adapter)
  logic.ts                — funções puras de negócio (sem I/O)
  parser.ts               — parsers regex para OCR (Fase 5)
  actions/
    lancamentos.ts        — listarLancamentos, criarLancamento, editarLancamento, cancelarLancamento
    categorias.ts         — listarCategorias
    cartoes.ts            — listarCartoes, listarCartoesCompleto, listarCartoesComStats, listarFatura, criarCartao, editarCartao, desativarCartao, reativarCartao
    operacoes.ts          — listarRecebiveis, registrarAntecipacao, registrarVendaPlataforma
    foto.ts               — verificarDuplicata, buscarSugestao, salvarRegra, salvarDaFoto
  extrator/
    index.ts              — ExtratorDeNota, QrCodeExtrator (jsQR+BrasilAPI), OcrExtrator (Tesseract.js)

prisma/
  schema.prisma           — schema completo
  seed.ts                 — seed de categorias, cartão e settings
  dev.db                  — banco SQLite de desenvolvimento
  migrations/             — histórico de migrações
```

---

## Configuração do Banco (Prisma 7)

O Prisma 7 usa o gerador `prisma-client` com driver adapters obrigatórios.
Para SQLite local, usamos `@prisma/adapter-libsql` + `@libsql/client`.

- `prisma.config.ts` — URL para migrações (lê `DATABASE_URL` do `.env`)
- `lib/prisma.ts` — singleton com adapter para o Next.js
- `.env` → `DATABASE_URL=file:./prisma/dev.db`

**ATENÇÃO**: `PrismaLibSql` é uma **factory** que recebe um objeto de config `{ url }`,
não uma instância do cliente libsql. Passar uma instância resulta em `URL_INVALID`.

```ts
// CORRETO
const adapter = new PrismaLibSql({ url: "file:/caminho/absoluto/dev.db" });

// ERRADO
const client = createClient({ url: "..." });
const adapter = new PrismaLibSql(client); // ← erro URL_INVALID
```

---

## Interface ExtratorDeNota (Fase 5)

Localizada em `lib/extrator/index.ts`. Qualquer motor de extração implementa:

```ts
interface ExtratorDeNota {
  extrair(imagem: File | Blob): Promise<DadosNota | null>;
}
```

`DadosNota` inclui campos com `confianca` (0–1). Campos com confiança < 0,85
abrem em amarelo para revisão manual; a confirmação manual atualiza `RegraDesignacao`.

**Cascata da Fase 5:**
1. UX: moldura de enquadramento + texto "Aponte a câmera para o QR Code da nota"
2. (A) jsQR lê o QR da NFC-e → chave 44 dígitos, CNPJ (posições 7–20), valor, data → BrasilAPI → confiança 1,0
3. Se QR falhar → mensagem "Não encontrei o QR Code — aproxime a câmera dele" + botão "Este comprovante não tem QR Code"
4. (B) Tesseract.js "por" + parsers regex em `lib/parser.ts` → confiança heurística por campo
5. (C) `RegraDesignacao` sugere escopo+categoria pelo estabelecimento normalizado
6. Anti-duplicata: hash da imagem (`hashAnexo`) + valor+data+estabelecimento

---

## Fases do Projeto

| Fase | Descrição | Status |
|---|---|---|
| **1** | Setup: Prisma + schema + seed + estrutura de pastas + CLAUDE.md | ✅ Concluída |
| **2** | Tabela de lançamentos com CRUD completo, filtros (tipo, escopo, categoria, data, status) e totais por período | ✅ Concluída |
| **3** | Cartões: gestão de cartões, parcelamento via cartão de crédito, visão de fatura por competência | ✅ Concluída |
| **4** | Antecipação e recebíveis: formulário próprio, geração de par ENTRADA+TAXA, cancelamento de recebíveis | ✅ Concluída |
| **5** | Leitura de foto em cascata: QR Code (jsQR) → OCR (Tesseract.js) → sugestão por RegraDesignacao | ✅ Concluída |
| **6** | Indicadores: ROAS, `runDailyChecks` (badge atrasado + alerta fatura), export CSV | 🔜 |

---

## Seed (estado inicial do banco)

- **6 categorias ENTRADA**: VENDA_MENTORIA (sistema), VENDA_OUTROS, ANTECIPACAO (sistema), RENDIMENTO, SALARIO_PROLABORE, OUTRAS_ENTRADAS
- **13 categorias SAIDA**: ADS (sistema), TAXA_PLATAFORMA (sistema), TAXA_ANTECIPACAO (sistema), FERRAMENTAS_SOFTWARE, IMPOSTOS, ALIMENTACAO, MORADIA, TRANSPORTE, SAUDE, EDUCACAO, LAZER, CARTAO_FATURA, OUTRAS_SAIDAS
- **1 cartão de exemplo**: "Nubank Roxinho" / MASTERCARD / limite 5.000 / fecha dia 3 / vence dia 10
- **Settings singleton** com `ultimoCheckDiario = null`
