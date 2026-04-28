-- =============================================================================
-- DataSpeak — Schema do Banco Simulado SAP
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
--   Seção 2 — Mestres MM (MARA, MAKT, MARC, LFA1)
--   Seção 3 — Mestres PP (AUFK)
--   Seção 4 — Transações SD (VBRK, VBRP)
--   Seção 5 — Transações MM (EKKO, EKPO, MSEG)
--   Seção 6 — Transações PP (AFKO, AFPO)
--   Seção 7 — Transações FI (BKPF, BSEG)
-- =============================================================================

PRAGMA encoding = 'UTF-8';
PRAGMA journal_mode = WAL;

-- =============================================================================
-- SEÇÃO 1 — MESTRES SD (Sales & Distribution)
-- =============================================================================

CREATE TABLE KNA1 (
    KUNNR TEXT PRIMARY KEY,         -- Número do cliente (Kundennummer), 10 dígitos
    NAME1 TEXT NOT NULL,            -- Nome principal do cliente (razão social)
    ORT01 TEXT,                     -- Cidade (Ort)
    LAND1 TEXT,                     -- País (Land), ex: 'BR'
    REGIO TEXT,                     -- Estado/região, ex: 'SP'
    KTOKD TEXT,                     -- Grupo de contas (tipo de cliente: '0001'=industrial, '0002'=varejo)
    STCD1 TEXT,                     -- CNPJ (Steuernummer 1) no contexto Brasil
    ERDAT TEXT                      -- Data de criação do cadastro (YYYYMMDD)
);

-- =============================================================================
-- SEÇÃO 2 — MESTRES MM (Materials Management)
-- =============================================================================

CREATE TABLE MARA (
    MATNR TEXT PRIMARY KEY,         -- Número do material, até 18 caracteres
    MTART TEXT,                     -- Tipo de material: FERT=acabado, ROH=matéria-prima, HALB=semi-acabado
    MATKL TEXT,                     -- Grupo de mercadoria (Materialklasse)
    MEINS TEXT,                     -- Unidade de medida base (KG, UN, L, M)
    BRGEW REAL,                     -- Peso bruto (Bruttogewicht)
    NTGEW REAL,                     -- Peso líquido (Nettogewicht)
    GEWEI TEXT,                     -- Unidade do peso (KG, G)
    ERSDA TEXT                      -- Data de criação do material (YYYYMMDD)
);

CREATE TABLE MAKT (
    MATNR TEXT NOT NULL,            -- Material (referencia MARA.MATNR)
    SPRAS TEXT NOT NULL,            -- Idioma da descrição: 'PT', 'EN', 'DE'
    MAKTX TEXT NOT NULL,            -- Texto descritivo do material naquele idioma
    PRIMARY KEY (MATNR, SPRAS)
);

CREATE TABLE MARC (
    MATNR TEXT NOT NULL,            -- Material (referencia MARA.MATNR)
    WERKS TEXT NOT NULL,            -- Planta/centro (Werk), ex: '1000', '2000', '3000'
    DISMM TEXT,                     -- Tipo de planejamento de necessidades (PD=MRP, ND=sem)
    BESKZ TEXT,                     -- Indicador de aquisição (E=produção própria, F=externa)
    EKGRP TEXT,                     -- Grupo de compradores (Einkäufergruppe)
    DISPO TEXT,                     -- Controlador MRP (Disponent)
    PRIMARY KEY (MATNR, WERKS)
);

CREATE TABLE LFA1 (
    LIFNR TEXT PRIMARY KEY,         -- Número do fornecedor (Lieferantennummer), 10 dígitos
    NAME1 TEXT NOT NULL,            -- Nome principal do fornecedor (razão social)
    ORT01 TEXT,                     -- Cidade
    LAND1 TEXT,                     -- País
    REGIO TEXT,                     -- Estado/região
    KTOKK TEXT,                     -- Grupo de contas do fornecedor
    STCD1 TEXT,                     -- CNPJ no contexto Brasil
    ERDAT TEXT                      -- Data de criação do cadastro (YYYYMMDD)
);

-- =============================================================================
-- SEÇÃO 3 — MESTRES PP (Production Planning)
-- =============================================================================

CREATE TABLE AUFK (
    AUFNR TEXT PRIMARY KEY,         -- Número da ordem (Auftragsnummer), 12 dígitos
    AUART TEXT,                     -- Tipo de ordem: PP01=produção, IN01=interna, PM01=manutenção
    ERDAT TEXT,                     -- Data de criação da ordem (YYYYMMDD)
    ERNAM TEXT,                     -- Usuário que criou (Ersteller Name)
    WERKS TEXT,                     -- Planta da ordem
    OBJNR TEXT,                     -- Número do objeto (interno, controla status)
    KTEXT TEXT                      -- Texto curto descritivo da ordem (Kurztext)
);

-- =============================================================================
-- SEÇÃO 4 — TRANSAÇÕES SD (Faturamento)
-- =============================================================================

CREATE TABLE VBRK (
    VBELN TEXT PRIMARY KEY,         -- Número da fatura (Verkaufsbelegnummer), 10 dígitos
    FKART TEXT,                     -- Tipo de fatura: F2=fatura normal, S1=nota de crédito, G2=nota de débito
    FKDAT TEXT,                     -- Data de faturamento (YYYYMMDD)
    BUDAT TEXT,                     -- Data de lançamento contábil (Buchungsdatum, YYYYMMDD)
    KUNNR TEXT,                     -- Cliente faturado (referencia KNA1.KUNNR)
    NETWR REAL,                     -- Valor líquido total da fatura (Nettowert)
    MWSBK REAL,                     -- Valor de imposto (Mehrwertsteuer Betrag Kopf)
    WAERK TEXT,                     -- Moeda da fatura: 'BRL', 'USD', 'EUR'
    BUKRS TEXT                      -- Empresa que emitiu (Buchungskreis), ex: '1000'
);

CREATE TABLE VBRP (
    VBELN TEXT NOT NULL,            -- Fatura (referencia VBRK.VBELN)
    POSNR TEXT NOT NULL,            -- Item dentro da fatura: '000010', '000020', '000030'...
    MATNR TEXT,                     -- Material vendido (referencia MARA.MATNR)
    WERKS TEXT,                     -- Planta de origem (referencia MARC.WERKS)
    FKIMG REAL,                     -- Quantidade faturada (Fakturierte Menge)
    MEINS TEXT,                     -- Unidade de medida do item
    NETWR REAL,                     -- Valor líquido do item (soma de itens = NETWR do cabeçalho)
    KZWI1 REAL,                     -- Subtotal 1 (preço bruto, antes de descontos)
    PRIMARY KEY (VBELN, POSNR)
);

-- =============================================================================
-- SEÇÃO 5 — TRANSAÇÕES MM (Compras e Estoque)
-- =============================================================================

CREATE TABLE EKKO (
    EBELN TEXT PRIMARY KEY,         -- Número do pedido de compra (Einkaufsbelegnummer), 10 dígitos
    BSART TEXT,                     -- Tipo de pedido: NB=normal, UB=transferência, FO=ordem-quadro
    BEDAT TEXT,                     -- Data do pedido (Bestelldatum, YYYYMMDD)
    LIFNR TEXT,                     -- Fornecedor (referencia LFA1.LIFNR)
    EKORG TEXT,                     -- Organização de compras (Einkaufsorganisation)
    EKGRP TEXT,                     -- Grupo de compradores
    WAERS TEXT,                     -- Moeda: 'BRL', 'USD', 'EUR'
    BUKRS TEXT                      -- Empresa
);

CREATE TABLE EKPO (
    EBELN TEXT NOT NULL,            -- Pedido (referencia EKKO.EBELN)
    EBELP TEXT NOT NULL,            -- Item dentro do pedido: '00010', '00020'...
    MATNR TEXT,                     -- Material comprado (referencia MARA.MATNR)
    WERKS TEXT,                     -- Planta de destino
    MENGE REAL,                     -- Quantidade pedida
    MEINS TEXT,                     -- Unidade de medida
    NETPR REAL,                     -- Preço unitário líquido (Netto-Preis)
    NETWR REAL,                     -- Valor líquido total do item (MENGE × NETPR)
    PRIMARY KEY (EBELN, EBELP)
);

CREATE TABLE MSEG (
    MBLNR TEXT NOT NULL,            -- Número do documento de material (Materialbelegnummer), 10 dígitos
    MJAHR INTEGER NOT NULL,         -- Ano do documento (Materialbelegjahr), faz parte da identificação
    ZEILE TEXT NOT NULL,            -- Linha/item dentro do documento
    BWART TEXT,                     -- Tipo de movimento: 101=entrada compra, 261=consumo OP, 601=saída venda, 311=transf
    MATNR TEXT,                     -- Material movimentado
    WERKS TEXT,                     -- Planta
    LGORT TEXT,                     -- Depósito/local de armazenamento (Lagerort)
    MENGE REAL,                     -- Quantidade movimentada
    MEINS TEXT,                     -- Unidade de medida
    AUFNR TEXT,                     -- Ordem de produção (opcional, referencia AUFK quando BWART em 261/101 de OP)
    BUDAT TEXT,                     -- Data do lançamento (YYYYMMDD)
    KUNNR TEXT,                     -- Cliente (preenchido em saídas de venda, BWART=601)
    LIFNR TEXT,                     -- Fornecedor (preenchido em entradas de compra, BWART=101)
    PRIMARY KEY (MBLNR, MJAHR, ZEILE)
);

-- =============================================================================
-- SEÇÃO 6 — TRANSAÇÕES PP (Ordens de Produção)
-- =============================================================================

CREATE TABLE AFKO (
    AUFNR TEXT PRIMARY KEY,         -- Ordem de produção (referencia AUFK.AUFNR)
    GLTRP TEXT,                     -- Data fim básica programada (Geplanter Endtermin, YYYYMMDD)
    GSTRP TEXT,                     -- Data início básica programada (Geplanter Starttermin, YYYYMMDD)
    GAMNG REAL,                     -- Quantidade total da ordem (Gesamtmenge)
    GMEIN TEXT,                     -- Unidade de medida da quantidade
    PLNBEZ TEXT,                    -- Material principal a produzir (referencia MARA.MATNR)
    FEVOR TEXT                      -- Grupo planejador da produção (Fertigungsverantwortlicher)
);

CREATE TABLE AFPO (
    AUFNR TEXT NOT NULL,            -- Ordem (referencia AFKO.AUFNR)
    POSNR TEXT NOT NULL,            -- Item dentro da ordem: '0001', '0002'...
    MATNR TEXT,                     -- Material do item (componente ou subproduto)
    PSMNG REAL,                     -- Quantidade do item (Plansollmenge)
    MEINS TEXT,                     -- Unidade de medida
    DWERK TEXT,                     -- Planta executante (Durchführungswerk)
    PRIMARY KEY (AUFNR, POSNR)
);

-- =============================================================================
-- SEÇÃO 7 — TRANSAÇÕES FI (Contabilidade)
-- =============================================================================

CREATE TABLE BKPF (
    BUKRS TEXT NOT NULL,            -- Empresa (Buchungskreis), ex: '1000'
    BELNR TEXT NOT NULL,            -- Número do documento contábil, 10 dígitos
    GJAHR INTEGER NOT NULL,         -- Ano fiscal (Geschäftsjahr) — numeração reseta anualmente em SAP
    BLART TEXT,                     -- Tipo de documento: RV=fatura SD, RE=fatura MM, SA=manual, KZ=pagamento
    BUDAT TEXT,                     -- Data de lançamento (YYYYMMDD)
    BLDAT TEXT,                     -- Data do documento original (YYYYMMDD)
    XBLNR TEXT,                     -- Número do documento de referência (ex: número da fatura externa)
    USNAM TEXT,                     -- Usuário que criou o lançamento (User Name)
    WAERS TEXT,                     -- Moeda do documento
    PRIMARY KEY (BUKRS, BELNR, GJAHR)
);

CREATE TABLE BSEG (
    BUKRS TEXT NOT NULL,            -- Empresa (referencia BKPF.BUKRS)
    BELNR TEXT NOT NULL,            -- Documento (referencia BKPF.BELNR)
    GJAHR INTEGER NOT NULL,         -- Ano fiscal (referencia BKPF.GJAHR)
    BUZEI TEXT NOT NULL,            -- Linha do documento: '001', '002'...
    SHKZG TEXT,                     -- Indicador débito/crédito: 'S'=Débito (Soll), 'H'=Crédito (Haben)
    DMBTR REAL,                     -- Valor em moeda local (Betrag in Hauswährung)
    WRBTR REAL,                     -- Valor em moeda do documento (Wertbetrag)
    HKONT TEXT,                     -- Conta do Razão Geral (Hauptkonto), ex: '1110001'
    KUNNR TEXT,                     -- Cliente (preenchido em docs de SD)
    LIFNR TEXT,                     -- Fornecedor (preenchido em docs de MM)
    MATNR TEXT,                     -- Material (opcional, em lançamentos com referência a material)
    PRIMARY KEY (BUKRS, BELNR, GJAHR, BUZEI)
);

-- =============================================================================
-- FIM DO SCHEMA
-- =============================================================================
-- Total: 15 tabelas
-- Mestres (6): KNA1, MARA, MAKT, MARC, LFA1, AUFK
-- Transações (9): VBRK, VBRP, EKKO, EKPO, MSEG, AFKO, AFPO, BKPF, BSEG
-- =============================================================================