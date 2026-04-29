"""Constantes e configurações para o seed do banco simulado SAP."""
from typing import Final

RANDOM_SEED: Final[int] = 42
DB_PATH: Final[str] = "backend/data/dataspeak.db"
SCHEMA_PATH: Final[str] = "backend/db/schema.sql"
FAKER_LOCALE: Final[str] = "pt_BR"
MANDT_PADRAO: Final[str] = "100"
BUKRS_PADRAO: Final[str] = "1000"
WAERS_PADRAO: Final[str] = "BRL"

# Volumes
VOLUMES: Final[dict[str, int]] = {
    "KNA1": 50, "LFA1": 30, "MARA": 150,
    "VBAK": 600,    # pedidos de venda
    "VBRK": 800,    # faturas
    "EKKO": 400,    # pedidos de compra
    "AFKO": 300,    # ordens de produção
    "MKPF": 1500,   # documentos de movimento (cabeçalho)
}

# Plantas e depósitos
PLANTAS: Final[list[str]] = ["1000", "2000", "3000"]
PLANTAS_PESOS: Final[list[float]] = [0.50, 0.30, 0.20]
DEPOSITOS: Final[list[str]] = ["0001", "0002", "0003"]
DEPOSITOS_PESOS: Final[list[float]] = [0.60, 0.25, 0.15]

# Janela temporal
DATA_INICIO: Final[str] = "20240101"
DATA_FIM: Final[str] = "20251231"
SAZONALIDADE_FIM_MES_PESO: Final[float] = 0.30
CRESCIMENTO_MENSAL: Final[float] = 0.01

# Pareto (quanto maior alpha, mais concentrado nos primeiros)
PARETO_ALPHA_CLIENTES: Final[float] = 1.5
PARETO_ALPHA_FORNECEDORES: Final[float] = 1.5
PARETO_ALPHA_MATERIAIS: Final[float] = 1.2

# Tipos de material
MTART_TIPOS: Final[list[str]] = ["FERT", "HALB", "ROH", "HAWA"]
MTART_PESOS: Final[list[float]] = [0.40, 0.20, 0.30, 0.10]
MATKL_OPCOES: Final[list[str]] = ["001","002","003","004","005","010","011","020","021","030"]

# Unidades
MEINS_OPCOES: Final[list[str]] = ["KG","UN","L","M","T"]
MEINS_PESOS: Final[list[float]] = [0.40,0.30,0.15,0.10,0.05]

# Tipos de documento
FKART_OPCOES: Final[list[str]] = ["F2","G2","RE"]
FKART_PESOS: Final[list[float]] = [0.92,0.05,0.03]
AUART_OPCOES: Final[list[str]] = ["ZOR","RE","KR"]
AUART_PESOS: Final[list[float]] = [0.92,0.05,0.03]
BSART_OPCOES: Final[list[str]] = ["NB","FO","UB"]
BSART_PESOS: Final[list[float]] = [0.85,0.10,0.05]

# Tipos de movimento MSEG
BWART_OPCOES: Final[list[str]] = ["101","201","261","601"]
BWART_PESOS: Final[list[float]] = [0.30,0.15,0.30,0.25]

# Listas auxiliares
SUBSTANTIVOS_MATERIAL: Final[list[str]] = [
    "Cabo","Chapa","Parafuso","Válvula","Motor","Engrenagem","Rolamento",
    "Filtro","Sensor","Eixo","Cilindro","Compressor","Pistão","Bomba","Redutor"
]
ESPECIFICACOES_MATERIAL: Final[list[str]] = [
    "5mm","10mm","20A","industrial","galvanizado","standard","premium",
    "alumínio","aço","inox","temperado","alta pressão","borracha"
]
ESTADOS_BR: Final[list[str]] = ["SP","RJ","MG","RS","PR","SC","BA","GO","ES","PE"]