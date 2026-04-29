-- =============================================================================
-- DataSpeak — Schema do Banco Simulado SAP (v2)
-- =============================================================================
-- Objetivo: replicar a estrutura de 15 tabelas SAP curadas em SQLite,
-- permitindo execução de queries Text-to-SQL geradas pelo motor de IA.
--
-- Convenções:
--   - Tipos: TEXT (strings, datas YYYYMMDD), INTEGER (inteiros), REAL (decimais)
--   - Datas: armazenadas como TEXT no formato SAP nativo 'YYYYMMDD'
--   - Sem FOREIGN KEY constraints: integridade garantida pela ordem do seed.py
--   - Sem CHECK constraints: validação ocorre via queries de validação pós-seed
--   - Nomenclatura: tudo MAIÚSCULO, replicando convenção SAP original
--   - Comentários inline em PT-BR em cada coluna (documentação executável)
--
-- Ordem de leitura:
--   Seção 1 — Mestres SD (KNA1)
--   Seção 2 — Mestres MM (MARA, MARC, MARD, LFA1)
--   Seção 3 — Transações MM (MKPF, MSEG, EKKO, EKPO)
--   Seção 4 — Transações SD (VBAK, VBAP, VBRK, VBRP)
--   Seção 5 — Transações PP (AFKO, AFPO)
-- =============================================================================

PRAGMA encoding = 'UTF-8';
PRAGMA journal_mode = WAL;

-- =============================================================================
-- SEÇÃO 1 — MESTRES SD (Sales & Distribution)
-- =============================================================================

CREATE TABLE KNA1 (
    KUNNR  TEXT PRIMARY KEY,        -- Número do cliente (Kundennummer), 10 dígitos com zeros à esquerda
    NAME1  TEXT NOT NULL,           -- Nome principal do cliente (razão social)
    NAME2  TEXT,                    -- Nome complementar (linha 2), usado para nomes longos
    LAND1  TEXT,                    -- País (Land), ex: 'BR'
    ORT01  TEXT,                    -- Cidade (Ort)
    REGIO  TEXT,                    -- Estado/região, ex: 'SP', 'RJ'
    KTOKD  TEXT,                    -- Grupo de contas (tipo de cliente): '0001'=industrial, '0002'=varejo
    STCD1  TEXT,                    -- CNPJ no contexto Brasil (Steuernummer 1)
    ERDAT  TEXT                     -- Data de criação do cadastro (YYYYMMDD)
);

-- =============================================================================
-- SEÇÃO 2 — MESTRES MM (Materials Management)
-- =============================================================================

CREATE TABLE MARA (
    MATNR  TEXT PRIMARY KEY,        -- Número do material, até 18 caracteres, zeros à esquerda
    MTART  TEXT,                    -- Tipo de material: FERT=acabado, ROH=matéria-prima, HALB=semi-acabado, HAWA=mercadoria
    MATKL  TEXT,                    -- Grupo de mercadoria (Materialklasse), ex: '001', '010'
    MEINS  TEXT,                    -- Unidade de medida base (KG, UN, L, M, CX)
    MAKTX  TEXT,                    -- Descrição do material em PT-BR (consolidada de MAKT; single-language neste protótipo)
    BRGEW  REAL,                    -- Peso bruto (Bruttogewicht)
    NTGEW  REAL,                    -- Peso líquido (Nettogewicht)
    GEWEI  TEXT,                    -- Unidade do peso (KG, G)
    ERSDA  TEXT                     -- Data de criação do material (YYYYMMDD)
);

CREATE TABLE MARC (
    MATNR  TEXT NOT NULL,           -- Material (referencia MARA.MATNR)
    WERKS  TEXT NOT NULL,           -- Planta/centro (Werk), ex: '1000', '2000', '3000'
    DISMM  TEXT,                    -- Tipo de planejamento de necessidades: PD=MRP, VB=reposição, ND=sem planejamento
    BESKZ  TEXT,                    -- Indicador de aquisição: E=produção própria, F=compra externa, X=ambos
    MINBE  REAL,                    -- Estoque mínimo (Mindestbestand) — nível que dispara reposição
    EISBE  REAL,                    -- Estoque de segurança (Eiserner Bestand) — reserva estratégica
    LGPRO  TEXT,                    -- Depósito de produção padrão (Lagerort Produktion)
    EKGRP  TEXT,                    -- Grupo de compradores responsável (Einkäufergruppe)
    PRIMARY KEY (MATNR, WERKS)
);

CREATE TABLE MARD (
    MATNR  TEXT NOT NULL,           -- Material (referencia MARA.MATNR)
    WERKS  TEXT NOT NULL,           -- Planta (referencia MARC.WERKS)
    LGORT  TEXT NOT NULL,           -- Depósito/local de armazenamento (Lagerort), ex: '0001', '0002'
    LABST  REAL,                    -- Estoque de livre utilização (Frei verwendbarer Bestand) — campo principal de saldo
    EINME  TEXT,                    -- Unidade de medida do estoque
    SPEME  REAL,                    -- Estoque bloqueado (Sperrbestand) — retido para inspeção ou bloqueio
    UMLME  REAL,                    -- Estoque em transferência (Umlagerungsbestand) — entre plantas/depósitos, em trânsito
    PRIMARY KEY (MATNR, WERKS, LGORT)
);

CREATE TABLE LFA1 (
    LIFNR  TEXT PRIMARY KEY,        -- Número do fornecedor (Lieferantennummer), 10 dígitos com zeros à esquerda
    NAME1  TEXT NOT NULL,           -- Nome principal do fornecedor (razão social)
    LAND1  TEXT,                    -- País
    ORT01  TEXT,                    -- Cidade
    REGIO  TEXT,                    -- Estado/região
    KTOKK  TEXT,                    -- Grupo de contas do fornecedor
    STCD1  TEXT,                    -- CNPJ no contexto Brasil
    ERDAT  TEXT                     -- Data de criação do cadastro (YYYYMMDD)
);

-- =============================================================================
-- SEÇÃO 3 — TRANSAÇÕES MM (Estoque e Compras)
-- =============================================================================

CREATE TABLE MKPF (
    MBLNR  TEXT NOT NULL,           -- Número do documento de material (Materialbelegnummer), 10 dígitos
    MJAHR  INTEGER NOT NULL,        -- Ano do documento (Materialbelegjahr) — faz parte da chave primária; numeração reinicia por ano
    BUDAT  TEXT,                    -- Data de lançamento contábil (Buchungsdatum, YYYYMMDD)
    BLDAT  TEXT,                    -- Data do documento original (Belegdatum, YYYYMMDD) — pode diferir de BUDAT
    USNAM  TEXT,                    -- Usuário que criou o documento (User Name)
    MANDT  TEXT,                    -- Mandante SAP (Client), ex: '100' — contexto organizacional de topo
    PRIMARY KEY (MBLNR, MJAHR)
);
-- Nota: MKPF é o cabeçalho do documento de material. Os itens da movimentação
-- ficam em MSEG. Toda query em MSEG que precisar de data ou usuário requer
-- JOIN com MKPF via (MBLNR, MJAHR).

CREATE TABLE MSEG (
    MBLNR  TEXT NOT NULL,           -- Número do documento de material (referencia MKPF.MBLNR)
    MJAHR  INTEGER NOT NULL,        -- Ano do documento (referencia MKPF.MJAHR)
    ZEILE  TEXT NOT NULL,           -- Linha/item dentro do documento, ex: '0001', '0002'
    BWART  TEXT,                    -- Tipo de movimento: 101=entrada compra, 201=consumo geral, 261=consumo para OP, 601=saída venda, 311=transferência entre depósitos
    MATNR  TEXT,                    -- Material movimentado (referencia MARA.MATNR)
    WERKS  TEXT,                    -- Planta (referencia MARC.WERKS)
    LGORT  TEXT,                    -- Depósito de origem/destino (referencia MARD.LGORT)
    MENGE  REAL,                    -- Quantidade movimentada
    MEINS  TEXT,                    -- Unidade de medida
    DMBTR  REAL,                    -- Valor do movimento em moeda local (Betrag in Hauswährung)
    AUFNR  TEXT,                    -- Ordem de produção associada (opcional; preenchido quando BWART=261 ou 101 de OP)
    EBELN  TEXT,                    -- Pedido de compra de origem (opcional; preenchido quando BWART=101, referencia EKKO.EBELN)
    EBELP  TEXT,                    -- Item do pedido de compra (referencia EKPO.EBELP)
    KUNNR  TEXT,                    -- Cliente (preenchido em saídas de venda, BWART=601, referencia KNA1.KUNNR)
    LIFNR  TEXT,                    -- Fornecedor (preenchido em entradas de compra, BWART=101, referencia LFA1.LIFNR)
    PRIMARY KEY (MBLNR, MJAHR, ZEILE)
);

CREATE TABLE EKKO (
    EBELN  TEXT PRIMARY KEY,        -- Número do pedido de compra (Einkaufsbelegnummer), 10 dígitos
    BSART  TEXT,                    -- Tipo de pedido: NB=pedido normal, FO=ordem-quadro, UB=transferência entre plantas
    LIFNR  TEXT,                    -- Fornecedor (referencia LFA1.LIFNR)
    EKORG  TEXT,                    -- Organização de compras (Einkaufsorganisation), ex: '1000'
    BEDAT  TEXT,                    -- Data de criação do pedido (Bestelldatum, YYYYMMDD)
    WAERS  TEXT,                    -- Moeda do pedido: 'BRL', 'USD', 'EUR'
    KDATB  TEXT,                    -- Data início de validade do contrato-quadro (YYYYMMDD)
    KDATE  TEXT,                    -- Data fim de validade do contrato-quadro (YYYYMMDD)
    BUKRS  TEXT                     -- Empresa (Buchungskreis), ex: '1000'
);

CREATE TABLE EKPO (
    EBELN  TEXT NOT NULL,           -- Pedido de compra (referencia EKKO.EBELN)
    EBELP  TEXT NOT NULL,           -- Item dentro do pedido: '00010', '00020'...
    MATNR  TEXT,                    -- Material comprado (referencia MARA.MATNR)
    WERKS  TEXT,                    -- Planta de destino da entrega
    MENGE  REAL,                    -- Quantidade pedida
    MEINS  TEXT,                    -- Unidade de medida
    NETPR  REAL,                    -- Preço unitário líquido (Netto-Preis)
    PEINH  REAL,                    -- Unidade de preço (Preiseinheit) — divisor do NETPR, normalmente 1
    NETWR  REAL,                    -- Valor líquido total do item (MENGE × NETPR / PEINH)
    EINDT  TEXT,                    -- Data de entrega prevista (Einlieferungsdatum, YYYYMMDD)
    ELIKZ  TEXT,                    -- Indicador de entrega encerrada: 'X'=encerrado, NULL=em aberto
    PRIMARY KEY (EBELN, EBELP)
);

-- =============================================================================
-- SEÇÃO 4 — TRANSAÇÕES SD (Vendas e Faturamento)
-- =============================================================================

CREATE TABLE VBAK (
    VBELN  TEXT PRIMARY KEY,        -- Número do pedido de venda (Verkaufsbelegnummer), 10 dígitos
    AUART  TEXT,                    -- Tipo de pedido de venda: ZOR=padrão, RE=devolução, KR=crédito
    KUNNR  TEXT,                    -- Cliente solicitante (referencia KNA1.KUNNR)
    VKORG  TEXT,                    -- Organização de vendas (Verkaufsorganisation), ex: '1000'
    VTWEG  TEXT,                    -- Canal de distribuição (Vertriebsweg), ex: '10'=direto, '20'=varejo
    AUDAT  TEXT,                    -- Data de criação do pedido (Auftragsdatum, YYYYMMDD)
    NETWR  REAL,                    -- Valor líquido total do pedido (soma dos itens)
    WAERK  TEXT                     -- Moeda do pedido: 'BRL', 'USD', 'EUR'
);

CREATE TABLE VBAP (
    VBELN  TEXT NOT NULL,           -- Pedido de venda (referencia VBAK.VBELN)
    POSNR  TEXT NOT NULL,           -- Item dentro do pedido: '000010', '000020'...
    MATNR  TEXT,                    -- Material vendido (referencia MARA.MATNR)
    KWMENG REAL,                    -- Quantidade pedida (Auftragsmenge kumuliert)
    MEINS  TEXT,                    -- Unidade de medida
    NETPR  REAL,                    -- Preço unitário líquido do item
    NETWR  REAL,                    -- Valor líquido do item (KWMENG × NETPR)
    EDATU  TEXT,                    -- Data de entrega confirmada (Einheitliche Lieferwunschdatum, YYYYMMDD)
    FKSTA  TEXT,                    -- Status de faturamento do item: ' '=não faturado, 'A'=parcialmente faturado, 'C'=totalmente faturado
    PRIMARY KEY (VBELN, POSNR)
);

CREATE TABLE VBRK (
    VBELN  TEXT PRIMARY KEY,        -- Número da fatura (Verkaufsbelegnummer), 10 dígitos
    FKART  TEXT,                    -- Tipo de fatura: F2=fatura normal, G2=nota de débito, RE=nota de crédito
    FKDAT  TEXT,                    -- Data de faturamento (Fakturadatum, YYYYMMDD)
    KUNAG  TEXT,                    -- Cliente pagador (Auftraggeber) — referencia KNA1.KUNNR; atenção: campo é KUNAG, não KUNNR
    NETWR  REAL,                    -- Valor líquido total da fatura (Nettowert)
    WAERK  TEXT,                    -- Moeda da fatura: 'BRL', 'USD', 'EUR'
    VKORG  TEXT,                    -- Organização de vendas
    FKSTO  TEXT,                    -- Indicador de fatura cancelada: 'X'=cancelada, NULL=ativa
    BUKRS  TEXT                     -- Empresa (Buchungskreis), ex: '1000'
);

CREATE TABLE VBRP (
    VBELN  TEXT NOT NULL,           -- Fatura (referencia VBRK.VBELN)
    POSNR  TEXT NOT NULL,           -- Item dentro da fatura: '000010', '000020'...
    MATNR  TEXT,                    -- Material faturado (referencia MARA.MATNR)
    FKIMG  REAL,                    -- Quantidade faturada (Fakturierte Menge)
    MEINS  TEXT,                    -- Unidade de medida do item
    NETWR  REAL,                    -- Valor líquido do item (soma dos itens = NETWR do cabeçalho VBRK)
    AUBEL  TEXT,                    -- Pedido de venda de origem (referencia VBAK.VBELN)
    AUPOS  TEXT,                    -- Item do pedido de venda de origem (referencia VBAP.POSNR)
    PRIMARY KEY (VBELN, POSNR)
);

-- =============================================================================
-- SEÇÃO 5 — TRANSAÇÕES PP (Production Planning)
-- =============================================================================

CREATE TABLE AFKO (
    AUFNR  TEXT PRIMARY KEY,        -- Número da ordem de produção (Auftragsnummer), gerado internamente (sem AUFK neste protótipo)
    MATNR  TEXT,                    -- Material a produzir (referencia MARA.MATNR)
    WERKS  TEXT,                    -- Planta de produção (referencia MARC.WERKS)
    GAMNG  REAL,                    -- Quantidade total planejada da ordem (Gesamtmenge)
    GMEIN  TEXT,                    -- Unidade de medida da quantidade da ordem
    GSTRS  TEXT,                    -- Data de início programada (Geplanter Starttermin, YYYYMMDD)
    GLTRS  TEXT,                    -- Data de fim programada (Geplanter Endtermin, YYYYMMDD)
    GSTRI  TEXT,                    -- Data de início real (Tatsächlicher Start, YYYYMMDD)
    GETRI  TEXT,                    -- Data de fim real (Tatsächliches Ende, YYYYMMDD)
    FTRMI  TEXT,                    -- Data de conclusão efetiva (Fertigstellungstermin, YYYYMMDD)
    IGMNG  REAL,                    -- Quantidade já produzida/confirmada (Ist-Gesamtmenge)
    STSTPS TEXT                     -- Status da ordem (texto de status resumido, ex: 'ABER LIAB')
);
-- Nota: AFKO é o cabeçalho da ordem de produção. Os itens de entrega ficam em
-- AFPO. Neste protótipo AFKO tem mestre próprio (campo AUFNR gerado pelo seed),
-- sem dependência da tabela AUFK (fora do escopo MVP).

CREATE TABLE AFPO (
    AUFNR  TEXT NOT NULL,           -- Ordem de produção (referencia AFKO.AUFNR)
    POSNR  TEXT NOT NULL,           -- Item dentro da ordem: '0001', '0002'...
    MATNR  TEXT,                    -- Material do item — produto acabado ou componente a entregar
    LGORT  TEXT,                    -- Depósito de destino da entrega (referencia MARD.LGORT)
    PSMNG  REAL,                    -- Quantidade planejada do item (Plansollmenge)
    WEMNG  REAL,                    -- Quantidade confirmada/recebida (Wareneingangsmenge) — o quanto já foi entregue ao depósito
    MEINS  TEXT,                    -- Unidade de medida
    KDAUF  TEXT,                    -- Pedido de venda de origem (referencia VBAK.VBELN) — preenchido em produção sob encomenda (Make-to-Order)
    PRIMARY KEY (AUFNR, POSNR)
);

-- =============================================================================
-- FIM DO SCHEMA
-- =============================================================================
-- Total: 15 tabelas
-- Mestres  (5): KNA1, MARA, MARC, MARD, LFA1
-- Transações MM (4): MKPF, MSEG, EKKO, EKPO
-- Transações SD (4): VBAK, VBAP, VBRK, VBRP
-- Transações PP (2): AFKO, AFPO
-- =============================================================================