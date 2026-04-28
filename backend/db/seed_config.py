# =============================================================================
# DataSpeak — Configurações do Seed do Banco Simulado SAP
# Apenas constantes tipadas. Sem lógica, sem funções.
# =============================================================================

# Determinismo
RANDOM_SEED: int = 42

# Caminhos
DB_PATH: str = "backend/data/dataspeak.db"
SCHEMA_PATH: str = "backend/db/schema.sql"

# Locale
FAKER_LOCALE: str = "pt_BR"

# Volumes (multiplicados por --scale na CLI; default scale=1)
VOLUMES: dict[str, int] = {
    "KNA1": 50,
    "LFA1": 30,
    "MARA": 150,
    "VBRK": 800,
    "EKKO": 400,
    "AFKO": 300,
    "MSEG": 3000,
    "BKPF_MANUAL": 200,
}

# Plantas e seus pesos (perfil de distribuição)
PLANTAS: list[str] = ["1000", "2000", "3000"]
PLANTAS_PESOS: list[float] = [0.50, 0.30, 0.20]

# Idiomas para MAKT
IDIOMAS_MAKT: list[str] = ["PT", "EN"]

# Empresa (BUKRS) — única no banco simulado
BUKRS_PADRAO: str = "1000"

# Janela temporal das transações (formato YYYYMMDD)
DATA_INICIO: str = "20240101"
DATA_FIM: str = "20251231"

# Sazonalidade: peso extra para últimos 5 dias úteis do mês
SAZONALIDADE_FIM_MES_PESO: float = 0.30

# Crescimento mensal (simulando empresa em expansão)
CRESCIMENTO_MENSAL: float = 0.01

# Pareto: alpha controla concentração (maior = mais concentrado nos primeiros itens)
PARETO_ALPHA_CLIENTES: float = 1.5
PARETO_ALPHA_FORNECEDORES: float = 1.5
PARETO_ALPHA_MATERIAIS: float = 1.2

# Tipos de material (MARA.MTART) e pesos
MTART_TIPOS: list[str] = ["FERT", "ROH", "HALB"]
MTART_PESOS: list[float] = [0.45, 0.35, 0.20]

# Grupos de mercadoria (MARA.MATKL)
MATKL_OPCOES: list[str] = ["001", "002", "003", "004", "005", "010", "011", "020", "021", "030"]

# Unidades de medida (MEINS) e pesos
MEINS_OPCOES: list[str] = ["KG", "UN", "L", "M", "T"]
MEINS_PESOS: list[float] = [0.40, 0.30, 0.15, 0.10, 0.05]

# Tipos de fatura SD (VBRK.FKART) e pesos
FKART_OPCOES: list[str] = ["F2", "S1", "G2"]
FKART_PESOS: list[float] = [0.92, 0.05, 0.03]

# Tipos de pedido de compra (EKKO.BSART) e pesos
BSART_OPCOES: list[str] = ["NB", "UB", "FO"]
BSART_PESOS: list[float] = [0.85, 0.10, 0.05]

# Tipos de ordem (AUFK.AUART) e pesos
AUART_OPCOES: list[str] = ["PP01", "IN01"]
AUART_PESOS: list[float] = [0.85, 0.15]

# Tipos de movimento (MSEG.BWART) com contexto de parceiro
BWART_OPCOES: list[str] = ["101", "261", "601", "311"]
BWART_PESOS: list[float] = [0.30, 0.30, 0.30, 0.10]

# Tipos de documento contábil (BKPF.BLART)
BLART_OPCOES: list[str] = ["RV", "RE", "SA"]

# Contas contábeis (HKONT) usadas em BSEG
HKONT_RECEITA: str = "3110001"
HKONT_CUSTO: str = "4110001"
HKONT_CLIENTE: str = "1130001"
HKONT_FORNECEDOR: str = "2110001"
HKONT_CAIXA: str = "1110001"

# Moeda padrão
WAERS_PADRAO: str = "BRL"
