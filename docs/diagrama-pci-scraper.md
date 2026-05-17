# Diagrama: PCI Scraper + Concurso

## Visao geral: duas zonas separadas

```
+=====================================================================+
|                        ZONA DE STAGING (PCI)                        |
|                   Dados brutos, fonte-especifica                    |
|                                                                     |
|  +-----------------+         +------------------+                   |
|  |   ScraperRun    |         |  PciExamEntry    |                   |
|  |-----------------|    1:N  |------------------|                   |
|  | id              |-------->| id               |                   |
|  | startedAt       |         | downloadUrl (UQ) |                   |
|  | finishedAt      |         | examName         |                   |
|  | status          |         | year             |                   |
|  | cargoSlugs[]    |         | institution      |                   |
|  | totalPages      |         | examBoardRaw     |                   |
|  | totalEntries    |         | cargoSlug        |                   |
|  | newEntries      |         | cargoRaw         |                   |
|  | lastCargoSlug   |         | governmentScope? |                   |
|  | lastPage        |         | state?           |                   |
|  | errorLog        |         | city?            |                   |
|  +-----------------+         | priorityScore    |                   |
|                              | status (enum)    |                   |
|                              | promotedToId?  -------- (UUID solto, |
|                              | pageUrl          |       nao e FK)   |
|                              | scrapedAt        |                   |
|                              +------------------+                   |
|                                                                     |
|  * Autocontida: nao depende de nenhuma tabela de producao           |
|  * promotedToId guarda o UUID do ExamBase criado, mas sem FK        |
|  * Pode ser descartada/recriada sem afetar producao                 |
+=====================================================================+

        |  PROMOVER (acao manual do admin)
        |  Cria ExamBase + vincula a Concurso
        v

+=====================================================================+
|                    ZONA DE PRODUCAO (App real)                       |
|                  Dados curados, fonte-agnostica                     |
|                                                                     |
|  +-----------------+         +------------------+                   |
|  |   Concurso      |         |    ExamBase       |                  |
|  |-----------------|    1:N  |------------------|                   |
|  | id              |-------->| id               |                   |
|  | institution     |         | name             |                   |
|  | year            |         | slug             |                   |
|  | governmentScope |         | institution      |                   |
|  | state?          |         | role             |                   |
|  | city?           |         | governmentScope  |                   |
|  | examBoardId? ------+      | state?           |                   |
|  | createdAt       |  |      | city?            |                   |
|  +-----------------+  |      | examDate         |                   |
|                       |      | examBoardId? ------+                 |
|  +--------------------+      | concursoId?      |  |               |
|  |                           | published        |  |               |
|  |                           | processingPhase  |  |               |
|  |                           | (... demais)     |  |               |
|  |                           +------------------+  |               |
|  |                                                  |               |
|  |  +------------------+                            |               |
|  +->|   ExamBoard      |<---------------------------+               |
|     |------------------|                                            |
|     | id               |                                            |
|     | name             |                                            |
|     | alias?           |                                            |
|     | websiteUrl?      |                                            |
|     | logoUrl?         |                                            |
|     +------------------+                                            |
|                                                                     |
|  * Concurso agrupa ExamBases do mesmo evento                        |
|  * ExamBoard e compartilhado (banca e universal)                    |
|  * Nenhuma dependencia da zona de staging                           |
+=====================================================================+
```

## Fluxo de dados

```
  PCI Concursos (web)
        |
        | scraping (admin dispara manualmente)
        v
  +------------------+
  |  PciExamEntry    |  <- dados brutos, milhares de linhas
  |  (staging)       |     ordenados por priorityScore
  +------------------+
        |
        | admin escolhe quais provas processar
        | clica "Promover"
        v
  +------------------+     +------------------+
  |  Concurso        |<----|  ExamBase         |  <- prova real
  |  (agrupador)     |     |  (producao)       |     entra no pipeline:
  +------------------+     +------------------+     Edital -> Prova ->
                                  |                  Gabarito -> Revisao ->
                                  v                  Explicacoes -> Publicar
                           +------------------+
                           | ExamBaseQuestion  |
                           | (questoes)        |
                           +------------------+
```

## Por que separar?

| Aspecto | Staging (PCI) | Producao |
|---------|---------------|----------|
| Fonte | PCI Concursos (scraping) | Qualquer (manual, PCI, futuras fontes) |
| Volume | Milhares (bruto) | Dezenas/centenas (curado) |
| Qualidade | Dados crus, possiveis erros | Revisado, normalizado |
| Lifecycle | Pode ser re-scraped, descartado | Permanente, tem questoes/tentativas |
| Dependencia | Zero FKs para producao | Zero FKs para staging |

## O que muda vs o schema atual

O schema atual tem `PciExamEntry.concursoId` (FK -> Concurso) e `PciExamEntry.examBoardId` (FK -> ExamBoard). Para separar as zonas:

1. **Remover** `concursoId` de `PciExamEntry` (staging nao aponta para producao)
2. **Remover** `examBoardId` de `PciExamEntry` (staging nao aponta para producao)
3. **Remover** relacao reversa `pciEntries` de `ExamBoard`
4. **Manter** `promotedToId` como UUID solto (sem FK) — apenas referencia
5. **Manter** `Concurso` como tabela de producao, limpa e fonte-agnostica
