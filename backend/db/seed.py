# =============================================================================
# DataSpeak — Script de Seed do Banco Simulado SAP
# Uso: python backend/db/seed.py --reset
# =============================================================================

import argparse
import logging
import random
import sqlite3
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

from faker import Faker

# Ajusta path para importar seed_config independente do CWD
sys.path.insert(0, str(Path(__file__).parent))
from seed_config import *

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("seed")

# ---------------------------------------------------------------------------
# Funções auxiliares
# ---------------------------------------------------------------------------

def pareto_choices(items: list, n: int, alpha: float) -> list:
    weights = [1.0 / ((i + 1) ** alpha) for i in range(len(items))]
    return random.choices(items, weights=weights, k=n)


def formatar_codigo(valor: int, padding: int) -> str:
    return str(valor).zfill(padding)


def _data_str_to_date(s: str) -> datetime:
    return datetime.strptime(s, "%Y%m%d")


def _date_to_str(d: datetime) -> str:
    return d.strftime("%Y%m%d")


def _ultimos_dias_uteis(ano: int, mes: int, n: int = 5) -> list[datetime]:
    """Retorna os últimos n dias úteis de um mês."""
    if mes == 12:
        ultimo = datetime(ano + 1, 1, 1) - timedelta(days=1)
    else:
        ultimo = datetime(ano, mes + 1, 1) - timedelta(days=1)
    dias = []
    d = ultimo
    while len(dias) < n:
        if d.weekday() < 5:  # seg–sex
            dias.append(d)
        d -= timedelta(days=1)
    return dias


def _dia_util_aleatorio_no_mes(ano: int, mes: int) -> datetime:
    """Retorna um dia útil aleatório no mês, excluindo os últimos 5 úteis."""
    if mes == 12:
        ultimo = datetime(ano + 1, 1, 1) - timedelta(days=1)
    else:
        ultimo = datetime(ano, mes + 1, 1) - timedelta(days=1)
    primeiro = datetime(ano, mes, 1)
    ultimos5 = set(d.date() for d in _ultimos_dias_uteis(ano, mes, 5))
    uteis = []
    d = primeiro
    while d <= ultimo:
        if d.weekday() < 5 and d.date() not in ultimos5:
            uteis.append(d)
        d += timedelta(days=1)
    if not uteis:
        return primeiro
    return random.choice(uteis)


def gerar_data_com_sazonalidade(data_inicio: str, data_fim: str) -> str:
    inicio = _data_str_to_date(data_inicio)
    fim = _data_str_to_date(data_fim)

    # Coleta todos os meses na janela com pesos crescentes
    meses = []
    pesos = []
    d = datetime(inicio.year, inicio.month, 1)
    idx = 0
    while d <= fim:
        meses.append((d.year, d.month))
        pesos.append((1 + CRESCIMENTO_MENSAL) ** idx)
        idx += 1
        if d.month == 12:
            d = datetime(d.year + 1, 1, 1)
        else:
            d = datetime(d.year, d.month + 1, 1)

    ano, mes = random.choices(meses, weights=pesos, k=1)[0]

    if random.random() < SAZONALIDADE_FIM_MES_PESO:
        candidatos = _ultimos_dias_uteis(ano, mes, 5)
        dia = random.choice(candidatos)
    else:
        dia = _dia_util_aleatorio_no_mes(ano, mes)

    # Garante que está dentro da janela
    if dia < inicio:
        dia = inicio
    if dia > fim:
        dia = fim
    return _date_to_str(dia)


def _data_mestre() -> str:
    """Data aleatória entre 2020 e 2023 para cadastros mestres."""
    inicio = datetime(2020, 1, 1)
    fim = datetime(2023, 12, 31)
    delta = (fim - inicio).days
    return _date_to_str(inicio + timedelta(days=random.randint(0, delta)))


# ---------------------------------------------------------------------------
# Geradores de mestres
# ---------------------------------------------------------------------------

ESTADOS = ["SP", "RJ", "MG", "RS", "PR", "SC", "BA", "GO", "ES", "PE"]


def gerar_kna1(conn: sqlite3.Connection, fake: Faker) -> list[dict]:
    t0 = datetime.now()
    logger.info("Gerando KNA1...")
    n = VOLUMES["KNA1"]
    clientes = []
    for i in range(n):
        kunnr = formatar_codigo(10001 + i, 10)
        clientes.append({
            "KUNNR": kunnr,
            "NAME1": fake.company()[:40],
            "ORT01": fake.city()[:35],
            "LAND1": "BR",
            "REGIO": random.choice(ESTADOS),
            "KTOKD": random.choices(["0001", "0002"], weights=[0.70, 0.30])[0],
            "STCD1": fake.cnpj(),
            "ERDAT": _data_mestre(),
        })
    conn.executemany(
        "INSERT INTO KNA1 VALUES (:KUNNR,:NAME1,:ORT01,:LAND1,:REGIO,:KTOKD,:STCD1,:ERDAT)",
        clientes,
    )
    logger.info(f"KNA1 gerado: {n} linhas em {(datetime.now()-t0).total_seconds():.2f}s")
    return clientes


def gerar_lfa1(conn: sqlite3.Connection, fake: Faker) -> list[dict]:
    t0 = datetime.now()
    logger.info("Gerando LFA1...")
    n = VOLUMES["LFA1"]
    fornecedores = []
    for i in range(n):
        lifnr = formatar_codigo(20001 + i, 10)
        fornecedores.append({
            "LIFNR": lifnr,
            "NAME1": fake.company()[:40],
            "ORT01": fake.city()[:35],
            "LAND1": "BR",
            "REGIO": random.choice(ESTADOS),
            "KTOKK": random.choices(["0001", "0002"], weights=[0.80, 0.20])[0],
            "STCD1": fake.cnpj(),
            "ERDAT": _data_mestre(),
        })
    conn.executemany(
        "INSERT INTO LFA1 VALUES (:LIFNR,:NAME1,:ORT01,:LAND1,:REGIO,:KTOKK,:STCD1,:ERDAT)",
        fornecedores,
    )
    logger.info(f"LFA1 gerado: {n} linhas em {(datetime.now()-t0).total_seconds():.2f}s")
    return fornecedores


def gerar_mara(conn: sqlite3.Connection, fake: Faker) -> list[dict]:
    t0 = datetime.now()
    logger.info("Gerando MARA...")
    n = VOLUMES["MARA"]
    materiais = []
    for i in range(n):
        matnr = formatar_codigo(i + 1, 18)
        brgew = round(random.uniform(0.1, 1000.0), 3)
        materiais.append({
            "MATNR": matnr,
            "MTART": random.choices(MTART_TIPOS, weights=MTART_PESOS)[0],
            "MATKL": random.choice(MATKL_OPCOES),
            "MEINS": random.choices(MEINS_OPCOES, weights=MEINS_PESOS)[0],
            "BRGEW": brgew,
            "NTGEW": round(brgew * random.uniform(0.85, 0.99), 3),
            "GEWEI": "KG",
            "ERSDA": _data_mestre(),
        })
    conn.executemany(
        "INSERT INTO MARA VALUES (:MATNR,:MTART,:MATKL,:MEINS,:BRGEW,:NTGEW,:GEWEI,:ERSDA)",
        materiais,
    )
    logger.info(f"MARA gerado: {n} linhas em {(datetime.now()-t0).total_seconds():.2f}s")
    return materiais


# Vocabulário industrial para MAKT
_SUBST_PT = ["Cabo", "Chapa", "Parafuso", "Válvula", "Motor", "Rolamento", "Tubo",
             "Engrenagem", "Correia", "Bomba", "Filtro", "Sensor", "Vedação",
             "Eixo", "Mola", "Pistão", "Cilindro", "Compressor", "Redutor", "Inversor"]
_SPEC_PT = ["10mm", "industrial", "galvanizado", "standard", "premium", "5mm",
            "inox", "temperado", "borracha", "alumínio", "aço", "20A", "380V",
            "alta pressão", "baixo ruído"]
_SUBST_EN = ["Cable", "Plate", "Bolt", "Valve", "Motor", "Bearing", "Tube",
             "Gear", "Belt", "Pump", "Filter", "Sensor", "Seal",
             "Shaft", "Spring", "Piston", "Cylinder", "Compressor", "Reducer", "Inverter"]
_SPEC_EN = ["10mm", "industrial", "galvanized", "standard", "premium", "5mm",
            "stainless", "hardened", "rubber", "aluminum", "steel", "20A", "380V",
            "high pressure", "low noise"]


def gerar_makt(conn: sqlite3.Connection, fake: Faker, materiais: list[dict]) -> None:
    t0 = datetime.now()
    logger.info("Gerando MAKT...")
    rows = []
    for m in materiais:
        subst_idx = random.randrange(len(_SUBST_PT))
        spec_idx = random.randrange(len(_SPEC_PT))
        rows.append((m["MATNR"], "PT", f"{_SUBST_PT[subst_idx]} {_SPEC_PT[spec_idx]}"))
        rows.append((m["MATNR"], "EN", f"{_SUBST_EN[subst_idx]} {_SPEC_EN[spec_idx]}"))
    conn.executemany("INSERT INTO MAKT VALUES (?,?,?)", rows)
    logger.info(f"MAKT gerado: {len(rows)} linhas em {(datetime.now()-t0).total_seconds():.2f}s")


def gerar_marc(conn: sqlite3.Connection, materiais: list[dict]) -> list[tuple[str, str]]:
    t0 = datetime.now()
    logger.info("Gerando MARC...")
    rows = []
    marc_pares = []
    for m in materiais:
        r = random.random()
        if r < 0.70:
            plantas_mat = ["1000"]
        elif r < 0.90:
            plantas_mat = random.sample(PLANTAS, 2)
        else:
            plantas_mat = PLANTAS[:]
        beskz = "E" if m["MTART"] in ("FERT", "HALB") else "F"
        for werks in plantas_mat:
            rows.append({
                "MATNR": m["MATNR"],
                "WERKS": werks,
                "DISMM": random.choices(["PD", "ND"], weights=[0.80, 0.20])[0],
                "BESKZ": beskz,
                "EKGRP": random.choice(["100", "101", "102", "200", "201"]),
                "DISPO": random.choice(["001", "002", "003"]),
            })
            marc_pares.append((m["MATNR"], werks))
    conn.executemany(
        "INSERT INTO MARC VALUES (:MATNR,:WERKS,:DISMM,:BESKZ,:EKGRP,:DISPO)",
        rows,
    )
    logger.info(f"MARC gerado: {len(rows)} linhas em {(datetime.now()-t0).total_seconds():.2f}s")
    return marc_pares


def gerar_aufk(conn: sqlite3.Connection, fake: Faker) -> list[dict]:
    t0 = datetime.now()
    logger.info("Gerando AUFK...")
    n_pp = VOLUMES["AFKO"]
    n_in = 50
    n = n_pp + n_in
    ordens = []
    for i in range(n):
        aufnr = formatar_codigo(100001 + i, 12)
        auart = "PP01" if i < n_pp else "IN01"
        ordens.append({
            "AUFNR": aufnr,
            "AUART": auart,
            "ERDAT": gerar_data_com_sazonalidade(DATA_INICIO, DATA_FIM),
            "ERNAM": fake.user_name()[:12],
            "WERKS": random.choices(PLANTAS, weights=PLANTAS_PESOS)[0],
            "OBJNR": "OR" + aufnr,
            "KTEXT": f"Produção lote {100 + i}",
        })
    conn.executemany(
        "INSERT INTO AUFK VALUES (:AUFNR,:AUART,:ERDAT,:ERNAM,:WERKS,:OBJNR,:KTEXT)",
        ordens,
    )
    logger.info(f"AUFK gerado: {n} linhas em {(datetime.now()-t0).total_seconds():.2f}s")
    return ordens


# ---------------------------------------------------------------------------
# Geradores de transações SD
# ---------------------------------------------------------------------------

def _marc_por_material(marc_pares: list[tuple[str, str]]) -> dict[str, list[str]]:
    d: dict[str, list[str]] = {}
    for matnr, werks in marc_pares:
        d.setdefault(matnr, []).append(werks)
    return d


def gerar_vbrk(conn: sqlite3.Connection, fake: Faker, clientes: list[dict]) -> list[dict]:
    t0 = datetime.now()
    logger.info("Gerando VBRK...")
    n = VOLUMES["VBRK"]
    kunnrs = [c["KUNNR"] for c in clientes]
    kunnrs_escolhidos = pareto_choices(kunnrs, n, PARETO_ALPHA_CLIENTES)
    faturas = []
    for i in range(n):
        fkdat = gerar_data_com_sazonalidade(DATA_INICIO, DATA_FIM)
        budat_d = _data_str_to_date(fkdat) + timedelta(days=random.randint(0, 2))
        faturas.append({
            "VBELN": formatar_codigo(9000000001 + i, 10),
            "FKART": random.choices(FKART_OPCOES, weights=FKART_PESOS)[0],
            "FKDAT": fkdat,
            "BUDAT": _date_to_str(budat_d),
            "KUNNR": kunnrs_escolhidos[i],
            "NETWR": 0.0,
            "MWSBK": 0.0,
            "WAERK": WAERS_PADRAO,
            "BUKRS": BUKRS_PADRAO,
        })
    conn.executemany(
        "INSERT INTO VBRK VALUES (:VBELN,:FKART,:FKDAT,:BUDAT,:KUNNR,:NETWR,:MWSBK,:WAERK,:BUKRS)",
        faturas,
    )
    logger.info(f"VBRK gerado: {n} linhas em {(datetime.now()-t0).total_seconds():.2f}s")
    return faturas


_ITEM_DIST = [1, 2, 3, 4, 5, 6, 7, 8]
_ITEM_PESOS = [0.20, 0.25, 0.20, 0.15, 0.10, 0.05, 0.03, 0.02]


def gerar_vbrp(
    conn: sqlite3.Connection,
    faturas: list[dict],
    materiais: list[dict],
    marc_por_mat: dict[str, list[str]],
) -> None:
    t0 = datetime.now()
    logger.info("Gerando VBRP...")
    matnrs = [m["MATNR"] for m in materiais]
    meins_map = {m["MATNR"]: m["MEINS"] for m in materiais}
    matnrs_escolhidos = pareto_choices(matnrs, VOLUMES["VBRK"] * 5, PARETO_ALPHA_MATERIAIS)
    mat_idx = 0
    rows = []
    netwr_por_vbeln: dict[str, float] = {}

    for fatura in faturas:
        vbeln = fatura["VBELN"]
        n_itens = random.choices(_ITEM_DIST, weights=_ITEM_PESOS)[0]
        soma = 0.0
        for j in range(n_itens):
            matnr = matnrs_escolhidos[mat_idx % len(matnrs_escolhidos)]
            mat_idx += 1
            plantas_validas = marc_por_mat.get(matnr, ["1000"])
            pesos_validos = [PLANTAS_PESOS[PLANTAS.index(p)] for p in plantas_validas]
            werks = random.choices(plantas_validas, weights=pesos_validos)[0]
            fkimg = round(random.uniform(1, 1000), 3)
            preco_unit = round(random.uniform(10, 5000), 2)
            netwr_item = round(fkimg * preco_unit, 2)
            kzwi1 = round(netwr_item * random.uniform(1.05, 1.20), 2)
            soma += netwr_item
            rows.append((
                vbeln,
                formatar_codigo((j + 1) * 10, 6),
                matnr,
                werks,
                fkimg,
                meins_map.get(matnr, "UN"),
                netwr_item,
                kzwi1,
            ))
        netwr_por_vbeln[vbeln] = round(soma, 2)

    conn.executemany("INSERT INTO VBRP VALUES (?,?,?,?,?,?,?,?)", rows)

    # Atualiza NETWR e MWSBK no cabeçalho
    upd = [(round(v, 2), round(v * 0.18, 2), k) for k, v in netwr_por_vbeln.items()]
    conn.executemany("UPDATE VBRK SET NETWR=?, MWSBK=? WHERE VBELN=?", upd)
    logger.info(f"VBRP gerado: {len(rows)} linhas em {(datetime.now()-t0).total_seconds():.2f}s")


# ---------------------------------------------------------------------------
# Geradores de transações MM
# ---------------------------------------------------------------------------

def gerar_ekko(conn: sqlite3.Connection, fake: Faker, fornecedores: list[dict]) -> list[dict]:
    t0 = datetime.now()
    logger.info("Gerando EKKO...")
    n = VOLUMES["EKKO"]
    lifnrs = [f["LIFNR"] for f in fornecedores]
    lifnrs_escolhidos = pareto_choices(lifnrs, n, PARETO_ALPHA_FORNECEDORES)
    pedidos = []
    for i in range(n):
        pedidos.append({
            "EBELN": formatar_codigo(4000000001 + i, 10),
            "BSART": random.choices(BSART_OPCOES, weights=BSART_PESOS)[0],
            "BEDAT": gerar_data_com_sazonalidade(DATA_INICIO, DATA_FIM),
            "LIFNR": lifnrs_escolhidos[i],
            "EKORG": random.choice(["1000", "2000"]),
            "EKGRP": random.choice(["100", "101", "102"]),
            "WAERS": WAERS_PADRAO,
            "BUKRS": BUKRS_PADRAO,
        })
    conn.executemany(
        "INSERT INTO EKKO VALUES (:EBELN,:BSART,:BEDAT,:LIFNR,:EKORG,:EKGRP,:WAERS,:BUKRS)",
        pedidos,
    )
    logger.info(f"EKKO gerado: {n} linhas em {(datetime.now()-t0).total_seconds():.2f}s")
    return pedidos


def gerar_ekpo(
    conn: sqlite3.Connection,
    pedidos: list[dict],
    materiais: list[dict],
    marc_por_mat: dict[str, list[str]],
) -> None:
    t0 = datetime.now()
    logger.info("Gerando EKPO...")
    matnrs = [m["MATNR"] for m in materiais]
    meins_map = {m["MATNR"]: m["MEINS"] for m in materiais}
    matnrs_escolhidos = pareto_choices(matnrs, VOLUMES["EKKO"] * 5, PARETO_ALPHA_MATERIAIS)
    mat_idx = 0
    rows = []

    for pedido in pedidos:
        ebeln = pedido["EBELN"]
        n_itens = random.choices(_ITEM_DIST, weights=_ITEM_PESOS)[0]
        for j in range(n_itens):
            matnr = matnrs_escolhidos[mat_idx % len(matnrs_escolhidos)]
            mat_idx += 1
            plantas_validas = marc_por_mat.get(matnr, ["1000"])
            pesos_validos = [PLANTAS_PESOS[PLANTAS.index(p)] for p in plantas_validas]
            werks = random.choices(plantas_validas, weights=pesos_validos)[0]
            menge = round(random.uniform(1, 500), 3)
            netpr = round(random.uniform(5, 3000), 2)
            rows.append((
                ebeln,
                formatar_codigo((j + 1) * 10, 5),
                matnr,
                werks,
                menge,
                meins_map.get(matnr, "UN"),
                netpr,
                round(menge * netpr, 2),
            ))

    conn.executemany("INSERT INTO EKPO VALUES (?,?,?,?,?,?,?,?)", rows)
    logger.info(f"EKPO gerado: {len(rows)} linhas em {(datetime.now()-t0).total_seconds():.2f}s")


# ---------------------------------------------------------------------------
# Geradores de transações PP
# ---------------------------------------------------------------------------

def gerar_afko(
    conn: sqlite3.Connection,
    ordens_aufk: list[dict],
    materiais: list[dict],
) -> list[dict]:
    t0 = datetime.now()
    logger.info("Gerando AFKO...")
    fert_matnrs = [m["MATNR"] for m in materiais if m["MTART"] == "FERT"]
    if not fert_matnrs:
        fert_matnrs = [materiais[0]["MATNR"]]
    meins_map = {m["MATNR"]: m["MEINS"] for m in materiais}
    ordens_pp = [o for o in ordens_aufk if o["AUART"] == "PP01"]
    ferts_escolhidos = pareto_choices(fert_matnrs, len(ordens_pp), PARETO_ALPHA_MATERIAIS)

    afko_lista = []
    for i, ordem in enumerate(ordens_pp):
        plnbez = ferts_escolhidos[i]
        gltrp_d = _data_str_to_date(gerar_data_com_sazonalidade(DATA_INICIO, DATA_FIM))
        gstrp_d = gltrp_d - timedelta(days=random.randint(5, 30))
        gamng = round(random.uniform(100, 10000), 0)
        afko_lista.append({
            "AUFNR": ordem["AUFNR"],
            "GLTRP": _date_to_str(gltrp_d),
            "GSTRP": _date_to_str(gstrp_d),
            "GAMNG": gamng,
            "GMEIN": meins_map.get(plnbez, "UN"),
            "PLNBEZ": plnbez,
            "FEVOR": random.choice(["001", "002", "003"]),
        })

    conn.executemany(
        "INSERT INTO AFKO VALUES (:AUFNR,:GLTRP,:GSTRP,:GAMNG,:GMEIN,:PLNBEZ,:FEVOR)",
        afko_lista,
    )
    logger.info(f"AFKO gerado: {len(afko_lista)} linhas em {(datetime.now()-t0).total_seconds():.2f}s")
    return afko_lista


def gerar_afpo(
    conn: sqlite3.Connection,
    afko_lista: list[dict],
    materiais: list[dict],
) -> None:
    t0 = datetime.now()
    logger.info("Gerando AFPO...")
    matnrs = [m["MATNR"] for m in materiais]
    meins_map = {m["MATNR"]: m["MEINS"] for m in materiais}
    rows = []
    for afko in afko_lista:
        n_itens = random.randint(1, 3)
        for j in range(n_itens):
            # Primeiro item é o material principal, demais são componentes
            if j == 0:
                matnr = afko["PLNBEZ"]
            else:
                matnr = random.choice(matnrs)
            psmng = round(afko["GAMNG"] * random.uniform(0.1, 1.0), 3)
            rows.append((
                afko["AUFNR"],
                formatar_codigo(j + 1, 4),
                matnr,
                psmng,
                meins_map.get(matnr, "UN"),
                afko.get("WERKS", "1000"),
            ))
    conn.executemany("INSERT INTO AFPO VALUES (?,?,?,?,?,?)", rows)
    logger.info(f"AFPO gerado: {len(rows)} linhas em {(datetime.now()-t0).total_seconds():.2f}s")


# ---------------------------------------------------------------------------
# Gerador MSEG
# ---------------------------------------------------------------------------

def gerar_mseg(
    conn: sqlite3.Connection,
    fake: Faker,
    materiais: list[dict],
    marc_por_mat: dict[str, list[str]],
    ordens_aufk: list[dict],
    clientes: list[dict],
    fornecedores: list[dict],
) -> None:
    t0 = datetime.now()
    logger.info("Gerando MSEG...")
    n = VOLUMES["MSEG"]
    matnrs = [m["MATNR"] for m in materiais]
    meins_map = {m["MATNR"]: m["MEINS"] for m in materiais}
    aufnrs_pp = [o["AUFNR"] for o in ordens_aufk if o["AUART"] == "PP01"]
    kunnrs = [c["KUNNR"] for c in clientes]
    lifnrs = [f["LIFNR"] for f in fornecedores]

    matnrs_escolhidos = pareto_choices(matnrs, n, PARETO_ALPHA_MATERIAIS)

    rows = []
    # Contador de MBLNR por ano (reseta a cada ano)
    mblnr_counter: dict[int, int] = {}

    for i in range(n):
        bwart = random.choices(BWART_OPCOES, weights=BWART_PESOS)[0]
        budat = gerar_data_com_sazonalidade(DATA_INICIO, DATA_FIM)
        mjahr = int(budat[:4])
        mblnr_counter[mjahr] = mblnr_counter.get(mjahr, 5000000000) + 1
        mblnr = formatar_codigo(mblnr_counter[mjahr], 10)

        matnr = matnrs_escolhidos[i]
        plantas_validas = marc_por_mat.get(matnr, ["1000"])
        pesos_validos = [PLANTAS_PESOS[PLANTAS.index(p)] for p in plantas_validas]
        werks = random.choices(plantas_validas, weights=pesos_validos)[0]

        aufnr = None
        kunnr = None
        lifnr = None
        if bwart == "261" and aufnrs_pp:
            aufnr = random.choice(aufnrs_pp)
        elif bwart == "601":
            kunnr = pareto_choices(kunnrs, 1, PARETO_ALPHA_CLIENTES)[0]
        elif bwart == "101":
            lifnr = pareto_choices(lifnrs, 1, PARETO_ALPHA_FORNECEDORES)[0]

        rows.append((
            mblnr,
            mjahr,
            "001",
            bwart,
            matnr,
            werks,
            random.choice(["0001", "0002", "0003"]),
            round(random.uniform(1, 500), 3),
            meins_map.get(matnr, "UN"),
            aufnr,
            budat,
            kunnr,
            lifnr,
        ))

    conn.executemany("INSERT INTO MSEG VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)", rows)
    logger.info(f"MSEG gerado: {len(rows)} linhas em {(datetime.now()-t0).total_seconds():.2f}s")


# ---------------------------------------------------------------------------
# Gerador BKPF + BSEG
# ---------------------------------------------------------------------------

def gerar_bkpf_bseg(
    conn: sqlite3.Connection,
    fake: Faker,
    faturas_vbrk: list[dict],
    pedidos_ekko: list[dict],
    clientes: list[dict],
    fornecedores: list[dict],
) -> None:
    t0 = datetime.now()
    logger.info("Gerando BKPF + BSEG...")

    bkpf_rows = []
    bseg_rows = []

    # Contador BELNR por ano
    belnr_counter: dict[int, int] = {}

    def next_belnr(gjahr: int) -> str:
        belnr_counter[gjahr] = belnr_counter.get(gjahr, 100000000) + 1
        return formatar_codigo(belnr_counter[gjahr], 10)

    def add_doc(bukrs, gjahr, blart, budat, xblnr, usnam, linhas):
        belnr = next_belnr(gjahr)
        bkpf_rows.append((bukrs, belnr, gjahr, blart, budat, budat, xblnr, usnam, WAERS_PADRAO))
        for buzei, shkzg, dmbtr, hkont, kunnr, lifnr, matnr in linhas:
            bseg_rows.append((bukrs, belnr, gjahr, buzei, shkzg, dmbtr, dmbtr, hkont, kunnr, lifnr, matnr))

    # a) Documentos RV derivados de VBRK
    for fatura in faturas_vbrk:
        gjahr = int(fatura["BUDAT"][:4])
        valor = fatura["NETWR"] if fatura["NETWR"] else 1.0
        add_doc(
            BUKRS_PADRAO, gjahr, "RV", fatura["BUDAT"], fatura["VBELN"],
            fake.user_name()[:12],
            [
                ("001", "S", valor, HKONT_CLIENTE, fatura["KUNNR"], None, None),
                ("002", "H", valor, HKONT_RECEITA, None, None, None),
            ],
        )

    # b) Documentos RE derivados de EKKO (usa valor estimado)
    for pedido in pedidos_ekko:
        gjahr = int(pedido["BEDAT"][:4])
        # Busca valor real do EKPO via query
        cur = conn.cursor()
        cur.execute("SELECT COALESCE(SUM(NETWR),0) FROM EKPO WHERE EBELN=?", (pedido["EBELN"],))
        valor = cur.fetchone()[0] or 1000.0
        add_doc(
            BUKRS_PADRAO, gjahr, "RE", pedido["BEDAT"], pedido["EBELN"],
            fake.user_name()[:12],
            [
                ("001", "S", valor, HKONT_CUSTO, None, None, None),
                ("002", "H", valor, HKONT_FORNECEDOR, None, pedido["LIFNR"], None),
            ],
        )

    # c) Documentos manuais SA
    n_manual = VOLUMES["BKPF_MANUAL"]
    hkonts_sa = [HKONT_CAIXA, HKONT_RECEITA, HKONT_CUSTO, HKONT_CLIENTE, HKONT_FORNECEDOR]
    for _ in range(n_manual):
        budat = gerar_data_com_sazonalidade(DATA_INICIO, DATA_FIM)
        gjahr = int(budat[:4])
        valor = round(random.uniform(100, 50000), 2)
        n_linhas = random.randint(2, 4)
        # Primeira linha débito, restantes dividem crédito (garantindo balanço)
        linhas = [("001", "S", valor, random.choice(hkonts_sa), None, None, None)]
        if n_linhas == 2:
            linhas.append(("002", "H", valor, random.choice(hkonts_sa), None, None, None))
        else:
            # Divide crédito em partes que somam valor
            partes = sorted([random.uniform(0, 1) for _ in range(n_linhas - 2)])
            partes = [0.0] + partes + [1.0]
            for k in range(n_linhas - 1):
                frac = round(valor * (partes[k + 1] - partes[k]), 2)
                if k == n_linhas - 2:
                    # Último: ajusta para garantir balanço exato
                    frac = round(valor - sum(l[2] for l in linhas[1:]), 2)
                if frac <= 0:
                    frac = 0.01
                buzei = formatar_codigo(k + 2, 3)
                linhas.append((buzei, "H", frac, random.choice(hkonts_sa), None, None, None))
        add_doc(BUKRS_PADRAO, gjahr, "SA", budat, None, fake.user_name()[:12], linhas)

    conn.executemany(
        "INSERT INTO BKPF VALUES (?,?,?,?,?,?,?,?,?)",
        bkpf_rows,
    )
    conn.executemany(
        "INSERT INTO BSEG VALUES (?,?,?,?,?,?,?,?,?,?,?)",
        bseg_rows,
    )
    logger.info(
        f"BKPF gerado: {len(bkpf_rows)} linhas | BSEG: {len(bseg_rows)} linhas "
        f"em {(datetime.now()-t0).total_seconds():.2f}s"
    )


# ---------------------------------------------------------------------------
# Validações
# ---------------------------------------------------------------------------

def validar_seed(conn: sqlite3.Connection) -> None:
    cur = conn.cursor()
    falhas = []

    cur.execute("SELECT COUNT(*) FROM VBRK WHERE VBELN NOT IN (SELECT DISTINCT VBELN FROM VBRP)")
    n = cur.fetchone()[0]
    if n > 0:
        falhas.append(f"{n} faturas VBRK sem itens VBRP")

    cur.execute("""
        SELECT k.VBELN, k.NETWR, COALESCE(SUM(p.NETWR), 0) as soma_itens
        FROM VBRK k LEFT JOIN VBRP p ON k.VBELN = p.VBELN
        GROUP BY k.VBELN, k.NETWR
        HAVING ABS(k.NETWR - soma_itens) > 0.01
    """)
    rows = cur.fetchall()
    if rows:
        falhas.append(f"{len(rows)} faturas com NETWR cabeçalho ≠ soma de itens (primeira: {rows[0]})")

    cur.execute("SELECT COUNT(*) FROM EKKO WHERE EBELN NOT IN (SELECT DISTINCT EBELN FROM EKPO)")
    n = cur.fetchone()[0]
    if n > 0:
        falhas.append(f"{n} pedidos EKKO sem itens EKPO")

    cur.execute("SELECT COUNT(*) FROM AFKO WHERE AUFNR NOT IN (SELECT AUFNR FROM AUFK)")
    n = cur.fetchone()[0]
    if n > 0:
        falhas.append(f"{n} AFKO órfãos (sem AUFK correspondente)")

    cur.execute("""
        SELECT BUKRS, BELNR, GJAHR,
               SUM(CASE WHEN SHKZG='S' THEN DMBTR ELSE 0 END) as deb,
               SUM(CASE WHEN SHKZG='H' THEN DMBTR ELSE 0 END) as cred
        FROM BSEG
        GROUP BY BUKRS, BELNR, GJAHR
        HAVING ABS(deb - cred) > 0.01
    """)
    rows = cur.fetchall()
    if rows:
        falhas.append(f"{len(rows)} documentos BKPF/BSEG desbalanceados (primeiro: {rows[0]})")

    cur.execute("SELECT COUNT(*) FROM VBRK WHERE KUNNR NOT IN (SELECT KUNNR FROM KNA1)")
    n = cur.fetchone()[0]
    if n > 0:
        falhas.append(f"{n} VBRK com KUNNR inexistente em KNA1")

    cur.execute("SELECT COUNT(*) FROM EKKO WHERE LIFNR NOT IN (SELECT LIFNR FROM LFA1)")
    n = cur.fetchone()[0]
    if n > 0:
        falhas.append(f"{n} EKKO com LIFNR inexistente em LFA1")

    if falhas:
        logger.error("VALIDAÇÃO FALHOU:")
        for f in falhas:
            logger.error(f"  - {f}")
        sys.exit(1)

    logger.info("✅ Todas as 7 validações automáticas passaram.")


def imprimir_resumo(conn: sqlite3.Connection) -> None:
    tabelas = ["KNA1", "LFA1", "MARA", "MAKT", "MARC", "AUFK",
               "VBRK", "VBRP", "EKKO", "EKPO", "AFKO", "AFPO",
               "MSEG", "BKPF", "BSEG"]
    cur = conn.cursor()
    logger.info("=" * 40)
    logger.info("RESUMO DO SEED")
    logger.info("=" * 40)
    total = 0
    for t in tabelas:
        cur.execute(f"SELECT COUNT(*) FROM {t}")
        n = cur.fetchone()[0]
        total += n
        logger.info(f"  {t:<8} {n:>8,} linhas")
    logger.info("-" * 40)
    logger.info(f"  {'TOTAL':<8} {total:>8,} linhas")
    logger.info("=" * 40)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

TABELAS_ORDEM_REVERSA = [
    "BSEG", "BKPF", "MSEG", "AFPO", "AFKO",
    "EKPO", "EKKO", "VBRP", "VBRK",
    "AUFK", "MARC", "MAKT", "MARA", "LFA1", "KNA1",
]

TABELAS_ESPERADAS = set(TABELAS_ORDEM_REVERSA)


def main() -> None:
    parser = argparse.ArgumentParser(description="Popula o banco simulado SAP do DataSpeak.")
    parser.add_argument("--reset", action="store_true", default=False,
                        help="Apaga dados existentes antes de popular (obrigatório se banco não estiver vazio).")
    parser.add_argument("--seed", type=int, default=RANDOM_SEED,
                        help="Seed para reproducibilidade (default: RANDOM_SEED do config).")
    parser.add_argument("--scale", type=float, default=1.0,
                        help="Multiplicador de volume (ex: 2.0 dobra tudo).")
    parser.add_argument("--db", type=str, default=DB_PATH,
                        help="Caminho para o banco SQLite.")
    args = parser.parse_args()

    logger.info(f"DataSpeak Seed | seed={args.seed} | scale={args.scale} | db={args.db}")

    # Reproducibilidade
    random.seed(args.seed)
    fake = Faker(FAKER_LOCALE)
    fake.seed_instance(args.seed)

    # Valida schema.sql
    schema_path = Path(SCHEMA_PATH)
    if not schema_path.exists():
        logger.error(f"schema.sql não encontrado em {SCHEMA_PATH}. Abortando.")
        sys.exit(1)

    # Abre banco
    db_path = Path(args.db)
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(db_path))
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=OFF")

    # Verifica que as 15 tabelas existem
    cur = conn.cursor()
    cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tabelas_existentes = {row[0].upper() for row in cur.fetchall()}
    faltando = TABELAS_ESPERADAS - tabelas_existentes
    if faltando:
        logger.error(f"Tabelas não encontradas: {faltando}. Execute o schema.sql primeiro.")
        logger.error("  sqlite3 backend/data/dataspeak.db < backend/db/schema.sql")
        conn.close()
        sys.exit(1)

    # Verifica se banco já tem dados
    cur.execute("SELECT COUNT(*) FROM KNA1")
    tem_dados = cur.fetchone()[0] > 0
    if tem_dados and not args.reset:
        logger.error("Banco já contém dados. Use --reset para apagar e repopular.")
        conn.close()
        sys.exit(1)

    # Limpa se --reset
    if args.reset and tem_dados:
        logger.info("Limpando banco existente...")
        for tabela in TABELAS_ORDEM_REVERSA:
            conn.execute(f"DELETE FROM {tabela}")
        conn.commit()
        logger.info("Banco limpo.")

    # Aplica scale
    if args.scale != 1.0:
        for k in VOLUMES:
            VOLUMES[k] = max(1, int(VOLUMES[k] * args.scale))
        logger.info(f"Volumes ajustados com scale={args.scale}")

    # Geração na ordem correta
    clientes = gerar_kna1(conn, fake)
    fornecedores = gerar_lfa1(conn, fake)
    materiais = gerar_mara(conn, fake)
    gerar_makt(conn, fake, materiais)
    marc_pares = gerar_marc(conn, materiais)
    marc_por_mat = _marc_por_material(marc_pares)
    ordens_aufk = gerar_aufk(conn, fake)

    faturas_vbrk = gerar_vbrk(conn, fake, clientes)
    gerar_vbrp(conn, faturas_vbrk, materiais, marc_por_mat)

    pedidos_ekko = gerar_ekko(conn, fake, fornecedores)
    gerar_ekpo(conn, pedidos_ekko, materiais, marc_por_mat)

    afko_lista = gerar_afko(conn, ordens_aufk, materiais)
    gerar_afpo(conn, afko_lista, materiais)

    gerar_mseg(conn, fake, materiais, marc_por_mat, ordens_aufk, clientes, fornecedores)
    gerar_bkpf_bseg(conn, fake, faturas_vbrk, pedidos_ekko, clientes, fornecedores)

    conn.commit()
    logger.info("Commit realizado.")

    validar_seed(conn)
    imprimir_resumo(conn)
    conn.close()
    logger.info("Seed concluído com sucesso.")


if __name__ == "__main__":
    main()
