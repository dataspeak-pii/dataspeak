"""Seed do banco simulado SAP — DataSpeak.

Uso:  python backend/db/seed.py --reset
      python backend/db/seed.py --reset --scale 2.0
"""

import argparse
import logging
import random
import sqlite3
import sys
from datetime import date, timedelta
from pathlib import Path
from typing import Optional

from faker import Faker

# ---------------------------------------------------------------------------
# Bootstrap: permite rodar como `python backend/db/seed.py` do root do projeto
# ---------------------------------------------------------------------------
sys.path.insert(0, str(Path(__file__).parent))
from seed_config import (
    BUKRS_PADRAO,
    DATA_FIM,
    DATA_INICIO,
    DB_PATH,
    FAKER_LOCALE,
    MANDT_PADRAO,
    PLANTAS,
    PLANTAS_PESOS,
    RANDOM_SEED,
    SCHEMA_PATH,
    WAERS_PADRAO,
)

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("seed")

# ---------------------------------------------------------------------------
# Constantes locais
# ---------------------------------------------------------------------------
TABELAS_OFICIAIS = [
    "MARA", "MARC", "MARD", "KNA1", "LFA1",
    "AFKO", "AFPO", "MKPF", "MSEG",
    "EKKO", "EKPO", "VBAK", "VBAP", "VBRK", "VBRP",
]

VOLUMES_BASE: dict[str, int] = {
    "MARA": 200, "MARC": 400, "MARD": 800,
    "KNA1": 80,  "LFA1": 60,
    "AFKO": 150, "AFPO": 300,
    "MKPF": 300, "MSEG": 900,
    "EKKO": 120, "EKPO": 360,
    "VBAK": 200, "VBAP": 600,
    "VBRK": 180, "VBRP": 540,
}

ESTADOS = ["SP", "RJ", "MG", "RS", "PR", "SC", "BA", "GO", "ES", "PE"]
LGORTS  = ["0001", "0002", "0003", "0004"]
EKGRPS  = ["100", "101", "102", "200", "201"]
VKORGS  = ["1000", "2000"]
VTWEGE  = ["10", "20"]

MTART_OPCOES = ["FERT", "ROH", "HALB", "HAWA"]
MTART_PESOS  = [0.40,   0.30,  0.20,  0.10]

MEINS_OPCOES = ["KG", "UN", "L", "M", "T"]
MEINS_PESOS  = [0.40, 0.30, 0.15, 0.10, 0.05]

BWART_OPCOES = ["101", "201", "261", "601"]
BWART_PESOS  = [0.35,  0.15,  0.30,  0.20]

BSART_OPCOES = ["NB", "FO", "UB"]
BSART_PESOS  = [0.80, 0.12, 0.08]

AUART_OPCOES = ["ZOR", "RE", "KR"]
AUART_PESOS  = [0.85,  0.10, 0.05]

FKART_OPCOES = ["F2", "G2", "RE"]
FKART_PESOS  = [0.90, 0.06, 0.04]

SUBST_PT = [
    "Cabo elétrico", "Chapa de aço", "Parafuso sextavado", "Válvula esfera",
    "Motor elétrico", "Rolamento cônico", "Tubo galvanizado", "Engrenagem helicoidal",
    "Correia dentada", "Bomba centrífuga", "Filtro de linha", "Sensor indutivo",
    "Vedação mecânica", "Eixo temperado", "Mola de compressão", "Pistão hidráulico",
    "Cilindro pneumático", "Compressor parafuso", "Redutor de velocidade", "Inversor de frequência",
]

# ---------------------------------------------------------------------------
# Helpers de data
# ---------------------------------------------------------------------------

def _str_to_date(s: str) -> date:
    return date(int(s[:4]), int(s[4:6]), int(s[6:8]))


def _date_to_str(d: date) -> str:
    return d.strftime("%Y%m%d")


def _rand_date(start: str, end: str) -> str:
    a, b = _str_to_date(start), _str_to_date(end)
    return _date_to_str(a + timedelta(days=random.randint(0, (b - a).days)))


def _rand_mestre_date() -> str:
    return _rand_date("20200101", "20231231")


def _meses_com_pesos(start: str, end: str) -> tuple[list[tuple[int, int]], list[float]]:
    """Lista de (ano, mes) na janela com pesos crescentes (crescimento 1%/mês)."""
    a = _str_to_date(start)
    b = _str_to_date(end)
    meses, pesos = [], []
    d = date(a.year, a.month, 1)
    idx = 0
    while d <= b:
        meses.append((d.year, d.month))
        pesos.append(1.01 ** idx)
        idx += 1
        if d.month == 12:
            d = date(d.year + 1, 1, 1)
        else:
            d = date(d.year, d.month + 1, 1)
    return meses, pesos


_MESES_CACHE: Optional[tuple] = None


def _data_transacao() -> str:
    global _MESES_CACHE
    if _MESES_CACHE is None:
        _MESES_CACHE = _meses_com_pesos(DATA_INICIO, DATA_FIM)
    meses, pesos = _MESES_CACHE
    ano, mes = random.choices(meses, weights=pesos, k=1)[0]
    if mes == 12:
        fim_mes = date(ano + 1, 1, 1) - timedelta(days=1)
    else:
        fim_mes = date(ano, mes + 1, 1) - timedelta(days=1)
    inicio_mes = date(ano, mes, 1)
    # Sazonalidade: 30% concentrado nos últimos 5 dias úteis
    if random.random() < 0.30:
        uteis_fim = []
        d = fim_mes
        while len(uteis_fim) < 5:
            if d.weekday() < 5:
                uteis_fim.append(d)
            d -= timedelta(days=1)
        return _date_to_str(random.choice(uteis_fim))
    dias = (fim_mes - inicio_mes).days
    d = inicio_mes + timedelta(days=random.randint(0, dias))
    return _date_to_str(d)


# ---------------------------------------------------------------------------
# Helper Pareto
# ---------------------------------------------------------------------------

def pareto_sample(pool: list, k: int, alpha: float = 1.5) -> list:
    weights = [1.0 / ((i + 1) ** alpha) for i in range(len(pool))]
    return random.choices(pool, weights=weights, k=k)


# ---------------------------------------------------------------------------
# Helpers de código
# ---------------------------------------------------------------------------

def zfill(n: int, width: int) -> str:
    return str(n).zfill(width)


# ---------------------------------------------------------------------------
# Validação inicial das tabelas
# ---------------------------------------------------------------------------

def validar_tabelas(conn: sqlite3.Connection) -> None:
    cur = conn.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    existentes = {r[0].upper() for r in cur.fetchall()}
    oficiais = set(TABELAS_OFICIAIS)
    faltando = oficiais - existentes
    extras = existentes - oficiais
    if faltando:
        log.error(f"Tabelas faltando no banco: {sorted(faltando)}")
        log.error("Execute: sqlite3 backend/data/dataspeak.db < backend/db/schema.sql")
        sys.exit(1)
    if extras:
        log.warning(f"Tabelas extras (ignoradas): {sorted(extras)}")
    log.info("Tabelas validadas: 15 tabelas oficiais presentes.")


# ---------------------------------------------------------------------------
# Reset
# ---------------------------------------------------------------------------

ORDEM_RESET = [
    "VBRP", "VBRK", "VBAP", "VBAK",
    "EKPO", "EKKO",
    "MSEG", "MKPF",
    "AFPO", "AFKO",
    "LFA1", "KNA1",
    "MARD", "MARC", "MARA",
]


def reset_banco(conn: sqlite3.Connection) -> None:
    log.info("Limpando banco...")
    for t in ORDEM_RESET:
        conn.execute(f"DELETE FROM {t}")
    conn.commit()
    log.info("Banco limpo.")


def banco_tem_dados(conn: sqlite3.Connection) -> bool:
    return conn.execute("SELECT COUNT(*) FROM MARA").fetchone()[0] > 0


# ---------------------------------------------------------------------------
# Geradores
# ---------------------------------------------------------------------------

def seed_mara(conn: sqlite3.Connection, vol: int) -> list[dict]:
    log.info(f"MARA: gerando {vol} materiais...")
    rows = []
    for i in range(vol):
        mtart = random.choices(MTART_OPCOES, weights=MTART_PESOS)[0]
        brgew = round(random.uniform(0.1, 1000.0), 3)
        rows.append({
            "MATNR": zfill(i + 1, 18),
            "MTART": mtart,
            "MATKL": zfill(random.randint(1, 10), 3),
            "MEINS": random.choices(MEINS_OPCOES, weights=MEINS_PESOS)[0],
            "MAKTX": random.choice(SUBST_PT),
            "BRGEW": brgew,
            "NTGEW": round(brgew * random.uniform(0.85, 0.99), 3),
            "GEWEI": "KG",
            "ERSDA": _rand_mestre_date(),
        })
    conn.executemany(
        "INSERT INTO MARA VALUES (:MATNR,:MTART,:MATKL,:MEINS,:MAKTX,:BRGEW,:NTGEW,:GEWEI,:ERSDA)",
        rows,
    )
    log.info(f"MARA: {vol} linhas inseridas.")
    return rows


def seed_marc(conn: sqlite3.Connection, materiais: list[dict], vol: int) -> list[dict]:
    log.info(f"MARC: gerando ~{vol} registros (2 plantas por material)...")
    rows = []
    matnrs = [m["MATNR"] for m in materiais]
    # Cada material em 1 ou 2 plantas (alvo vol ≈ 400 para 200 materiais)
    for m in materiais:
        n_plantas = 1 if random.random() < 0.50 else 2
        plantas_mat = random.sample(PLANTAS, n_plantas)
        beskz = "E" if m["MTART"] in ("FERT", "HALB") else "F"
        for werks in plantas_mat:
            rows.append({
                "MATNR": m["MATNR"],
                "WERKS": werks,
                "DISMM": random.choices(["PD", "VB", "ND"], weights=[0.60, 0.25, 0.15])[0],
                "BESKZ": beskz,
                "MINBE": round(random.uniform(0, 100), 2),
                "EISBE": round(random.uniform(0, 50), 2),
                "LGPRO": random.choice(LGORTS[:2]),
                "EKGRP": random.choice(EKGRPS),
            })
    conn.executemany(
        "INSERT INTO MARC VALUES (:MATNR,:WERKS,:DISMM,:BESKZ,:MINBE,:EISBE,:LGPRO,:EKGRP)",
        rows,
    )
    log.info(f"MARC: {len(rows)} linhas inseridas.")
    return rows


def _marc_index(marc: list[dict]) -> dict[str, list[str]]:
    """MATNR → lista de WERKS válidas."""
    idx: dict[str, list[str]] = {}
    for r in marc:
        idx.setdefault(r["MATNR"], []).append(r["WERKS"])
    return idx


def seed_mard(conn: sqlite3.Connection, marc: list[dict], vol: int) -> None:
    log.info(f"MARD: gerando ~{vol} registros (2 depósitos por MARC)...")
    rows = []
    for r in marc:
        n_lgort = 1 if random.random() < 0.40 else 2
        lgorts_usados = random.sample(LGORTS, n_lgort)
        meins = "KG"  # simplificado
        for lgort in lgorts_usados:
            labst = round(random.uniform(0, 5000), 3)
            rows.append((
                r["MATNR"], r["WERKS"], lgort,
                labst, meins,
                round(labst * random.uniform(0, 0.05), 3),
                round(labst * random.uniform(0, 0.03), 3),
            ))
    conn.executemany("INSERT INTO MARD VALUES (?,?,?,?,?,?,?)", rows)
    log.info(f"MARD: {len(rows)} linhas inseridas.")


def seed_kna1(conn: sqlite3.Connection, fake: Faker, vol: int) -> list[dict]:
    log.info(f"KNA1: gerando {vol} clientes...")
    rows = []
    for i in range(vol):
        rows.append({
            "KUNNR": zfill(10001 + i, 10),
            "NAME1": fake.company()[:40],
            "NAME2": fake.catch_phrase()[:40],
            "LAND1": "BR",
            "ORT01": fake.city()[:35],
            "REGIO": random.choice(ESTADOS),
            "KTOKD": random.choices(["0001", "0002"], weights=[0.70, 0.30])[0],
            "STCD1": fake.cnpj(),
            "ERDAT": _rand_mestre_date(),
        })
    conn.executemany(
        "INSERT INTO KNA1 VALUES (:KUNNR,:NAME1,:NAME2,:LAND1,:ORT01,:REGIO,:KTOKD,:STCD1,:ERDAT)",
        rows,
    )
    log.info(f"KNA1: {vol} linhas inseridas.")
    return rows


def seed_lfa1(conn: sqlite3.Connection, fake: Faker, vol: int) -> list[dict]:
    log.info(f"LFA1: gerando {vol} fornecedores...")
    rows = []
    for i in range(vol):
        rows.append({
            "LIFNR": zfill(20001 + i, 10),
            "NAME1": fake.company()[:40],
            "LAND1": "BR",
            "ORT01": fake.city()[:35],
            "REGIO": random.choice(ESTADOS),
            "KTOKK": random.choices(["0001", "0002"], weights=[0.80, 0.20])[0],
            "STCD1": fake.cnpj(),
            "ERDAT": _rand_mestre_date(),
        })
    conn.executemany(
        "INSERT INTO LFA1 VALUES (:LIFNR,:NAME1,:LAND1,:ORT01,:REGIO,:KTOKK,:STCD1,:ERDAT)",
        rows,
    )
    log.info(f"LFA1: {vol} linhas inseridas.")
    return rows


def seed_afko(
    conn: sqlite3.Connection,
    materiais: list[dict],
    marc_idx: dict[str, list[str]],
    vol: int,
) -> list[dict]:
    log.info(f"AFKO: gerando {vol} ordens de produção...")
    fert = [m["MATNR"] for m in materiais if m["MTART"] in ("FERT", "HALB")]
    if not fert:
        fert = [materiais[0]["MATNR"]]
    meins_map = {m["MATNR"]: m["MEINS"] for m in materiais}
    rows = []
    for i in range(vol):
        matnr = pareto_sample(fert, 1, alpha=1.2)[0]
        werks_validas = marc_idx.get(matnr, [PLANTAS[0]])
        werks = random.choices(
            werks_validas,
            weights=[PLANTAS_PESOS[PLANTAS.index(w)] for w in werks_validas],
        )[0]
        gstrp = _str_to_date(_data_transacao())
        gltrs = gstrp + timedelta(days=random.randint(5, 30))
        gstri = gstrp + timedelta(days=random.randint(0, 2))
        getri = gltrs + timedelta(days=random.randint(-2, 5))
        gamng = round(random.uniform(10, 5000), 3)
        concluida = random.random() < 0.70
        rows.append({
            "AUFNR": zfill(100001 + i, 12),
            "MATNR": matnr,
            "WERKS": werks,
            "GAMNG": gamng,
            "GMEIN": meins_map.get(matnr, "UN"),
            "GSTRS": _date_to_str(gstrp),
            "GLTRS": _date_to_str(gltrs),
            "GSTRI": _date_to_str(gstri),
            "GETRI": _date_to_str(getri) if concluida else None,
            "FTRMI": _date_to_str(getri) if concluida else None,
            "IGMNG": round(gamng * random.uniform(0.90, 1.02), 3) if concluida else round(gamng * random.uniform(0, 0.80), 3),
            "STSTPS": "I0045" if concluida else "I0001",
        })
    conn.executemany(
        "INSERT INTO AFKO VALUES "
        "(:AUFNR,:MATNR,:WERKS,:GAMNG,:GMEIN,:GSTRS,:GLTRS,:GSTRI,:GETRI,:FTRMI,:IGMNG,:STSTPS)",
        rows,
    )
    log.info(f"AFKO: {vol} linhas inseridas.")
    return rows


def seed_mkpf(conn: sqlite3.Connection, fake: Faker, vol: int) -> list[dict]:
    log.info(f"MKPF: gerando {vol} cabeçalhos de documento de material...")
    rows = []
    for i in range(vol):
        budat = _data_transacao()
        mjahr = int(budat[:4])
        rows.append({
            "MBLNR": zfill(5000000001 + i, 10),
            "MJAHR": mjahr,
            "BUDAT": budat,
            "BLDAT": budat,
            "USNAM": fake.user_name()[:12],
            "MANDT": MANDT_PADRAO,
        })
    conn.executemany(
        "INSERT INTO MKPF VALUES (:MBLNR,:MJAHR,:BUDAT,:BLDAT,:USNAM,:MANDT)",
        rows,
    )
    log.info(f"MKPF: {vol} linhas inseridas.")
    return rows


def seed_mseg(
    conn: sqlite3.Connection,
    mkpf_rows: list[dict],
    materiais: list[dict],
    marc_idx: dict[str, list[str]],
    afko_rows: list[dict],
    kna1_rows: list[dict],
    lfa1_rows: list[dict],
    ekko_rows: list[dict],
    ekpo_rows: list[dict],
    vol: int,
) -> None:
    log.info(f"MSEG: gerando ~{vol} linhas (distribuídas nos {len(mkpf_rows)} MKPFs)...")
    matnrs = [m["MATNR"] for m in materiais]
    meins_map = {m["MATNR"]: m["MEINS"] for m in materiais}
    aufnrs = [a["AUFNR"] for a in afko_rows]
    kunnrs = [c["KUNNR"] for c in kna1_rows]
    lifnrs = [f["LIFNR"] for f in lfa1_rows]

    # Índice EKPO por EBELN para referência cruzada
    ekpo_por_ebeln: dict[str, list[dict]] = {}
    for ep in ekpo_rows:
        ekpo_por_ebeln.setdefault(ep["EBELN"], []).append(ep)

    rows = []
    mkpf_pool = mkpf_rows[:]

    # Distribui linhas pelos MKPFs (cada MKPF tem 1..4 linhas de MSEG)
    doc_idx = 0
    linha_count = 0
    while linha_count < vol and doc_idx < len(mkpf_pool):
        mkpf = mkpf_pool[doc_idx % len(mkpf_pool)]
        doc_idx += 1
        n_linhas = random.choices([1, 2, 3, 4], weights=[0.55, 0.25, 0.15, 0.05])[0]
        for z in range(n_linhas):
            if linha_count >= vol:
                break
            bwart = random.choices(BWART_OPCOES, weights=BWART_PESOS)[0]
            matnr = pareto_sample(matnrs, 1, alpha=1.2)[0]
            werks_validas = marc_idx.get(matnr, [PLANTAS[0]])
            werks = random.choices(
                werks_validas,
                weights=[PLANTAS_PESOS[PLANTAS.index(w)] for w in werks_validas],
            )[0]
            menge = round(random.uniform(1, 500), 3)
            preco = round(random.uniform(10, 3000), 2)

            aufnr, ebeln, ebelp, kunnr, lifnr = None, None, None, None, None
            if bwart == "261" and aufnrs:
                aufnr = random.choice(aufnrs)
            elif bwart == "601":
                kunnr = pareto_sample(kunnrs, 1, alpha=1.5)[0]
            elif bwart == "101":
                lifnr = pareto_sample(lifnrs, 1, alpha=1.5)[0]
                # Tenta vincular a um EKPO
                if ekko_rows:
                    ek = random.choice(ekko_rows)
                    ebeln = ek["EBELN"]
                    itens = ekpo_por_ebeln.get(ebeln, [])
                    if itens:
                        ep = random.choice(itens)
                        ebelp = ep["EBELP"]

            rows.append((
                mkpf["MBLNR"], mkpf["MJAHR"], zfill(z + 1, 4),
                bwart, matnr, werks,
                random.choice(LGORTS),
                menge, meins_map.get(matnr, "UN"),
                round(menge * preco, 2),
                aufnr, ebeln, ebelp, kunnr, lifnr,
            ))
            linha_count += 1

    conn.executemany("INSERT INTO MSEG VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", rows)
    log.info(f"MSEG: {len(rows)} linhas inseridas.")


def seed_ekko(
    conn: sqlite3.Connection,
    lfa1_rows: list[dict],
    vol: int,
) -> list[dict]:
    log.info(f"EKKO: gerando {vol} pedidos de compra...")
    lifnrs = [f["LIFNR"] for f in lfa1_rows]
    rows = []
    for i in range(vol):
        bedat = _data_transacao()
        bedat_d = _str_to_date(bedat)
        rows.append({
            "EBELN": zfill(4500000001 + i, 10),
            "BSART": random.choices(BSART_OPCOES, weights=BSART_PESOS)[0],
            "LIFNR": pareto_sample(lifnrs, 1, alpha=1.5)[0],
            "EKORG": random.choice(VKORGS),
            "BEDAT": bedat,
            "WAERS": WAERS_PADRAO,
            "KDATB": _date_to_str(bedat_d),
            "KDATE": _date_to_str(bedat_d + timedelta(days=random.randint(30, 365))),
            "BUKRS": BUKRS_PADRAO,
        })
    conn.executemany(
        "INSERT INTO EKKO VALUES (:EBELN,:BSART,:LIFNR,:EKORG,:BEDAT,:WAERS,:KDATB,:KDATE,:BUKRS)",
        rows,
    )
    log.info(f"EKKO: {vol} linhas inseridas.")
    return rows


def seed_ekpo(
    conn: sqlite3.Connection,
    ekko_rows: list[dict],
    materiais: list[dict],
    marc_idx: dict[str, list[str]],
    vol: int,
) -> list[dict]:
    log.info(f"EKPO: gerando ~{vol} itens de pedido de compra...")
    matnrs = [m["MATNR"] for m in materiais if m["MTART"] in ("ROH", "HALB", "HAWA")]
    if not matnrs:
        matnrs = [m["MATNR"] for m in materiais]
    meins_map = {m["MATNR"]: m["MEINS"] for m in materiais}
    rows = []
    n_por_pedido = max(1, vol // len(ekko_rows)) if ekko_rows else 3
    for ek in ekko_rows:
        n = random.choices(
            [1, 2, 3, 4, 5],
            weights=[0.20, 0.30, 0.25, 0.15, 0.10],
        )[0]
        bedat_d = _str_to_date(ek["BEDAT"])
        for j in range(n):
            matnr = pareto_sample(matnrs, 1, alpha=1.2)[0]
            werks_validas = marc_idx.get(matnr, [PLANTAS[0]])
            werks = random.choice(werks_validas)
            menge = round(random.uniform(1, 1000), 3)
            netpr = round(random.uniform(5, 3000), 2)
            rows.append({
                "EBELN": ek["EBELN"],
                "EBELP": zfill((j + 1) * 10, 5),
                "MATNR": matnr,
                "WERKS": werks,
                "MENGE": menge,
                "MEINS": meins_map.get(matnr, "UN"),
                "NETPR": netpr,
                "PEINH": 1.0,
                "NETWR": round(menge * netpr, 2),
                "EINDT": _date_to_str(bedat_d + timedelta(days=random.randint(7, 60))),
                "ELIKZ": "X" if random.random() < 0.60 else None,
            })
    conn.executemany(
        "INSERT INTO EKPO VALUES "
        "(:EBELN,:EBELP,:MATNR,:WERKS,:MENGE,:MEINS,:NETPR,:PEINH,:NETWR,:EINDT,:ELIKZ)",
        rows,
    )
    log.info(f"EKPO: {len(rows)} linhas inseridas.")
    return rows


def seed_vbak(
    conn: sqlite3.Connection,
    kna1_rows: list[dict],
    vol: int,
) -> list[dict]:
    log.info(f"VBAK: gerando {vol} pedidos de venda...")
    kunnrs = [c["KUNNR"] for c in kna1_rows]
    rows = []
    for i in range(vol):
        rows.append({
            "VBELN": zfill(1000000001 + i, 10),
            "AUART": random.choices(AUART_OPCOES, weights=AUART_PESOS)[0],
            "KUNNR": pareto_sample(kunnrs, 1, alpha=1.5)[0],
            "VKORG": random.choice(VKORGS),
            "VTWEG": random.choice(VTWEGE),
            "AUDAT": _data_transacao(),
            "NETWR": 0.0,
            "WAERK": WAERS_PADRAO,
        })
    conn.executemany(
        "INSERT INTO VBAK VALUES (:VBELN,:AUART,:KUNNR,:VKORG,:VTWEG,:AUDAT,:NETWR,:WAERK)",
        rows,
    )
    log.info(f"VBAK: {vol} linhas inseridas.")
    return rows


def seed_vbap(
    conn: sqlite3.Connection,
    vbak_rows: list[dict],
    materiais: list[dict],
    marc_idx: dict[str, list[str]],
    vol: int,
) -> list[dict]:
    log.info(f"VBAP: gerando ~{vol} itens de pedido de venda...")
    fert_matnrs = [m["MATNR"] for m in materiais if m["MTART"] in ("FERT", "HAWA")]
    if not fert_matnrs:
        fert_matnrs = [m["MATNR"] for m in materiais]
    meins_map = {m["MATNR"]: m["MEINS"] for m in materiais}
    rows = []
    netwr_por_vbeln: dict[str, float] = {}
    for vbak in vbak_rows:
        n = random.choices([1, 2, 3, 4, 5], weights=[0.15, 0.30, 0.25, 0.20, 0.10])[0]
        soma = 0.0
        audat_d = _str_to_date(vbak["AUDAT"])
        for j in range(n):
            matnr = pareto_sample(fert_matnrs, 1, alpha=1.2)[0]
            kwmeng = round(random.uniform(1, 500), 3)
            netpr = round(random.uniform(20, 8000), 2)
            netwr_item = round(kwmeng * netpr, 2)
            soma += netwr_item
            fksta_choices = [" ", "A", "C"]
            fksta_pesos = [0.10, 0.20, 0.70]
            rows.append({
                "VBELN": vbak["VBELN"],
                "POSNR": zfill((j + 1) * 10, 6),
                "MATNR": matnr,
                "KWMENG": kwmeng,
                "MEINS": meins_map.get(matnr, "UN"),
                "NETPR": netpr,
                "NETWR": netwr_item,
                "EDATU": _date_to_str(audat_d + timedelta(days=random.randint(3, 45))),
                "FKSTA": random.choices(fksta_choices, weights=fksta_pesos)[0],
            })
        netwr_por_vbeln[vbak["VBELN"]] = round(soma, 2)
    conn.executemany(
        "INSERT INTO VBAP VALUES (:VBELN,:POSNR,:MATNR,:KWMENG,:MEINS,:NETPR,:NETWR,:EDATU,:FKSTA)",
        rows,
    )
    # Atualiza NETWR no cabeçalho VBAK
    conn.executemany(
        "UPDATE VBAK SET NETWR=? WHERE VBELN=?",
        [(v, k) for k, v in netwr_por_vbeln.items()],
    )
    log.info(f"VBAP: {len(rows)} linhas inseridas.")
    return rows


def seed_vbrk(
    conn: sqlite3.Connection,
    kna1_rows: list[dict],
    vol: int,
) -> list[dict]:
    log.info(f"VBRK: gerando {vol} faturas...")
    kunnrs = [c["KUNNR"] for c in kna1_rows]
    rows = []
    for i in range(vol):
        rows.append({
            "VBELN": zfill(9000000001 + i, 10),
            "FKART": random.choices(FKART_OPCOES, weights=FKART_PESOS)[0],
            "FKDAT": _data_transacao(),
            "KUNAG": pareto_sample(kunnrs, 1, alpha=1.5)[0],
            "NETWR": 0.0,
            "WAERK": WAERS_PADRAO,
            "VKORG": random.choice(VKORGS),
            "FKSTO": "X" if random.random() < 0.03 else None,
            "BUKRS": BUKRS_PADRAO,
        })
    conn.executemany(
        "INSERT INTO VBRK VALUES (:VBELN,:FKART,:FKDAT,:KUNAG,:NETWR,:WAERK,:VKORG,:FKSTO,:BUKRS)",
        rows,
    )
    log.info(f"VBRK: {vol} linhas inseridas.")
    return rows


def seed_vbrp(
    conn: sqlite3.Connection,
    vbrk_rows: list[dict],
    vbak_rows: list[dict],
    vbap_rows: list[dict],
    materiais: list[dict],
    vol: int,
) -> None:
    log.info(f"VBRP: gerando ~{vol} itens de fatura...")
    fert_matnrs = [m["MATNR"] for m in materiais if m["MTART"] in ("FERT", "HAWA")]
    if not fert_matnrs:
        fert_matnrs = [m["MATNR"] for m in materiais]
    meins_map = {m["MATNR"]: m["MEINS"] for m in materiais}
    # Índice VBAK → VBAP para referência AUBEL/AUPOS
    vbap_por_vbak: dict[str, list[dict]] = {}
    for vp in vbap_rows:
        vbap_por_vbak.setdefault(vp["VBELN"], []).append(vp)
    vbak_vbelns = [v["VBELN"] for v in vbak_rows]

    rows = []
    netwr_por_vbeln: dict[str, float] = {}
    for vbrk in vbrk_rows:
        n = random.choices([1, 2, 3, 4, 5], weights=[0.15, 0.30, 0.25, 0.20, 0.10])[0]
        soma = 0.0
        # Tenta referenciar um pedido de venda origem
        aubel = random.choice(vbak_vbelns) if vbak_vbelns and random.random() < 0.80 else None
        itens_origem = vbap_por_vbak.get(aubel, []) if aubel else []
        for j in range(n):
            if itens_origem and j < len(itens_origem):
                orig = itens_origem[j]
                matnr = orig["MATNR"]
                fkimg = orig["KWMENG"]
                netwr_item = orig["NETWR"]
                aupos = orig["POSNR"]
            else:
                matnr = pareto_sample(fert_matnrs, 1, alpha=1.2)[0]
                fkimg = round(random.uniform(1, 500), 3)
                netwr_item = round(fkimg * random.uniform(20, 8000), 2)
                aupos = zfill((j + 1) * 10, 6)
            soma += netwr_item
            rows.append({
                "VBELN": vbrk["VBELN"],
                "POSNR": zfill((j + 1) * 10, 6),
                "MATNR": matnr,
                "FKIMG": fkimg,
                "MEINS": meins_map.get(matnr, "UN"),
                "NETWR": netwr_item,
                "AUBEL": aubel,
                "AUPOS": aupos,
            })
        netwr_por_vbeln[vbrk["VBELN"]] = round(soma, 2)

    conn.executemany(
        "INSERT INTO VBRP VALUES (:VBELN,:POSNR,:MATNR,:FKIMG,:MEINS,:NETWR,:AUBEL,:AUPOS)",
        rows,
    )
    conn.executemany(
        "UPDATE VBRK SET NETWR=? WHERE VBELN=?",
        [(v, k) for k, v in netwr_por_vbeln.items()],
    )
    log.info(f"VBRP: {len(rows)} linhas inseridas.")


def seed_afpo(
    conn: sqlite3.Connection,
    afko_rows: list[dict],
    materiais: list[dict],
    vbak_rows: list[dict],
    vol: int,
) -> None:
    log.info(f"AFPO: gerando ~{vol} itens de ordem de produção...")
    matnrs = [m["MATNR"] for m in materiais]
    meins_map = {m["MATNR"]: m["MEINS"] for m in materiais}
    vbak_vbelns = [v["VBELN"] for v in vbak_rows]
    rows = []
    for afko in afko_rows:
        n = random.choices([1, 2, 3], weights=[0.50, 0.35, 0.15])[0]
        for j in range(n):
            matnr = afko["MATNR"] if j == 0 else random.choice(matnrs)
            psmng = round(afko["GAMNG"] * random.uniform(0.05, 0.30), 3)
            wemng = round(psmng * random.uniform(0.80, 1.05), 3) if afko["STSTPS"] == "I0045" else 0.0
            kdauf = random.choice(vbak_vbelns) if vbak_vbelns and random.random() < 0.25 else None
            rows.append({
                "AUFNR": afko["AUFNR"],
                "POSNR": zfill(j + 1, 4),
                "MATNR": matnr,
                "LGORT": random.choice(LGORTS),
                "PSMNG": psmng,
                "WEMNG": wemng,
                "MEINS": meins_map.get(matnr, "UN"),
                "KDAUF": kdauf,
            })
    conn.executemany(
        "INSERT INTO AFPO VALUES (:AUFNR,:POSNR,:MATNR,:LGORT,:PSMNG,:WEMNG,:MEINS,:KDAUF)",
        rows,
    )
    log.info(f"AFPO: {len(rows)} linhas inseridas.")


# ---------------------------------------------------------------------------
# Validações automáticas
# ---------------------------------------------------------------------------

def validar_seed(conn: sqlite3.Connection) -> None:
    log.info("Executando validações automáticas...")
    cur = conn.cursor()
    falhas = []

    # 1. Toda VBRK tem ao menos 1 VBRP
    cur.execute("SELECT COUNT(*) FROM VBRK WHERE VBELN NOT IN (SELECT DISTINCT VBELN FROM VBRP)")
    n = cur.fetchone()[0]
    if n:
        falhas.append(f"{n} faturas VBRK sem itens VBRP")

    # 2. VBRK.NETWR = soma VBRP.NETWR (tolerância 0.02)
    cur.execute("""
        SELECT COUNT(*) FROM VBRK k
        WHERE ABS(k.NETWR - (SELECT COALESCE(SUM(p.NETWR),0) FROM VBRP p WHERE p.VBELN=k.VBELN)) > 0.02
    """)
    n = cur.fetchone()[0]
    if n:
        falhas.append(f"{n} faturas com NETWR ≠ soma de itens VBRP")

    # 3. Toda EKKO tem ao menos 1 EKPO
    cur.execute("SELECT COUNT(*) FROM EKKO WHERE EBELN NOT IN (SELECT DISTINCT EBELN FROM EKPO)")
    n = cur.fetchone()[0]
    if n:
        falhas.append(f"{n} pedidos EKKO sem itens EKPO")

    # 4. Toda AFKO tem ao menos 1 AFPO
    cur.execute("SELECT COUNT(*) FROM AFKO WHERE AUFNR NOT IN (SELECT DISTINCT AUFNR FROM AFPO)")
    n = cur.fetchone()[0]
    if n:
        falhas.append(f"{n} ordens AFKO sem itens AFPO")

    # 5. Toda MSEG tem MKPF correspondente
    cur.execute("""
        SELECT COUNT(*) FROM MSEG s
        WHERE NOT EXISTS (
            SELECT 1 FROM MKPF m WHERE m.MBLNR=s.MBLNR AND m.MJAHR=s.MJAHR
        )
    """)
    n = cur.fetchone()[0]
    if n:
        falhas.append(f"{n} linhas MSEG sem MKPF correspondente")

    # 6. VBRK.KUNAG existe em KNA1
    cur.execute("SELECT COUNT(*) FROM VBRK WHERE KUNAG NOT IN (SELECT KUNNR FROM KNA1)")
    n = cur.fetchone()[0]
    if n:
        falhas.append(f"{n} VBRK com KUNAG inexistente em KNA1")

    # 7. EKKO.LIFNR existe em LFA1
    cur.execute("SELECT COUNT(*) FROM EKKO WHERE LIFNR NOT IN (SELECT LIFNR FROM LFA1)")
    n = cur.fetchone()[0]
    if n:
        falhas.append(f"{n} EKKO com LIFNR inexistente em LFA1")

    # 8. MARC.MATNR existe em MARA
    cur.execute("SELECT COUNT(*) FROM MARC WHERE MATNR NOT IN (SELECT MATNR FROM MARA)")
    n = cur.fetchone()[0]
    if n:
        falhas.append(f"{n} MARC com MATNR inexistente em MARA")

    # 9. MARD.MATNR/WERKS existe em MARC
    cur.execute("""
        SELECT COUNT(*) FROM MARD d
        WHERE NOT EXISTS (
            SELECT 1 FROM MARC c WHERE c.MATNR=d.MATNR AND c.WERKS=d.WERKS
        )
    """)
    n = cur.fetchone()[0]
    if n:
        falhas.append(f"{n} MARD sem MARC correspondente")

    if falhas:
        log.error("VALIDAÇÕES FALHARAM:")
        for f in falhas:
            log.error(f"  ✗ {f}")
        sys.exit(1)

    log.info("✅ Todas as 9 validações automáticas passaram.")


# ---------------------------------------------------------------------------
# Resumo
# ---------------------------------------------------------------------------

def imprimir_resumo(conn: sqlite3.Connection) -> None:
    log.info("=" * 42)
    log.info("RESUMO DO SEED")
    log.info("=" * 42)
    total = 0
    for t in TABELAS_OFICIAIS:
        n = conn.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]
        total += n
        log.info(f"  {t:<8} {n:>8,} linhas")
    log.info("-" * 42)
    log.info(f"  {'TOTAL':<8} {total:>8,} linhas")
    log.info("=" * 42)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description="Popula o banco simulado SAP — DataSpeak.")
    parser.add_argument("--reset", action="store_true", default=False,
                        help="Apaga dados existentes antes de popular.")
    parser.add_argument("--seed", type=int, default=RANDOM_SEED,
                        help="Seed de aleatoriedade (default: RANDOM_SEED do config).")
    parser.add_argument("--scale", type=float, default=1.0,
                        help="Multiplicador de volumes (ex: 2.0 dobra tudo).")
    parser.add_argument("--db", type=str, default=DB_PATH,
                        help="Caminho para o banco SQLite.")
    args = parser.parse_args()

    log.info(f"seed={args.seed} | scale={args.scale} | db={args.db}")

    random.seed(args.seed)
    fake = Faker(FAKER_LOCALE)
    fake.seed_instance(args.seed)

    db_path = Path(args.db)
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(db_path))
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=OFF")

    validar_tabelas(conn)

    if banco_tem_dados(conn):
        if not args.reset:
            log.error("Banco já contém dados. Use --reset para repopular.")
            conn.close()
            sys.exit(1)
        reset_banco(conn)

    # Aplica escala
    vol = {k: max(1, int(v * args.scale)) for k, v in VOLUMES_BASE.items()}

    # Geração na ordem definida
    materiais = seed_mara(conn, vol["MARA"])
    marc = seed_marc(conn, materiais, vol["MARC"])
    marc_idx = _marc_index(marc)
    seed_mard(conn, marc, vol["MARD"])

    kna1 = seed_kna1(conn, fake, vol["KNA1"])
    lfa1 = seed_lfa1(conn, fake, vol["LFA1"])

    afko = seed_afko(conn, materiais, marc_idx, vol["AFKO"])

    mkpf = seed_mkpf(conn, fake, vol["MKPF"])
    # EKKO/EKPO gerados após MSEG (ordem especificada); MSEG recebe listas vazias
    # para os campos EBELN/EBELP opcionais — integridade garantida pela ordem.
    seed_mseg(conn, mkpf, materiais, marc_idx, afko, kna1, lfa1, [], [], vol["MSEG"])

    ekko = seed_ekko(conn, lfa1, vol["EKKO"])
    ekpo = seed_ekpo(conn, ekko, materiais, marc_idx, vol["EKPO"])

    vbak = seed_vbak(conn, kna1, vol["VBAK"])
    vbap = seed_vbap(conn, vbak, materiais, marc_idx, vol["VBAP"])

    vbrk = seed_vbrk(conn, kna1, vol["VBRK"])
    seed_vbrp(conn, vbrk, vbak, vbap, materiais, vol["VBRP"])

    seed_afpo(conn, afko, materiais, vbak, vol["AFPO"])

    conn.commit()
    log.info("Commit realizado.")

    validar_seed(conn)
    imprimir_resumo(conn)
    conn.close()
    log.info("Seed concluído com sucesso.")


if __name__ == "__main__":
    main()
