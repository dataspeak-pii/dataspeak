# backend/tests/results/filter_diagnosis.py
import pandas as pd
from pathlib import Path

RESULTS_DIR = Path(__file__).parent
FILES = {
    "claude":  "anthropic_claude_sonnet_4_5_20260507_180916.csv",
    "gpt4o":   "openai_gpt_4o_20260507_210254.csv",
    "gemini":  "google_gemini_2.0_flash_001_20260507_211530.csv",
}

# Tenta ambos formatos de ID — string "Q004" e numérico 4
TARGET_IDS_STR = ["Q004", "Q016", "Q022", "Q024", "Q026"]
TARGET_IDS_INT = [4, 16, 22, 24, 26]

WANTED_COLS = [
    "id", "pergunta", "modelo", "categoria",
    "tabelas_esperadas", "tabelas_obtidas",
    "status", "sql_gerado", "erro_detalhe"
]

frames = []
for label, fname in FILES.items():
    path = RESULTS_DIR / fname
    if not path.exists():
        print(f"[AVISO] arquivo nao encontrado: {fname}")
        continue

    df = pd.read_csv(path)

    # Tenta filtro como string primeiro, depois como int
    df_str = df[df["id"].astype(str).isin(TARGET_IDS_STR)]
    df_int = df[df["id"].astype(str).isin([str(i) for i in TARGET_IDS_INT])]

    if len(df_str) > 0:
        df_filtered = df_str
        print(f"[{label}] casou {len(df_filtered)} linhas usando IDs string (Q004, Q016, ...)")
    elif len(df_int) > 0:
        df_filtered = df_int
        print(f"[{label}] casou {len(df_filtered)} linhas usando IDs int (4, 16, ...)")
    else:
        print(f"[{label}] NENHUM caso casou. Primeiros IDs no CSV: {df['id'].head(10).tolist()}")
        continue

    cols_present = [c for c in WANTED_COLS if c in df_filtered.columns]
    frames.append(df_filtered[cols_present])

if not frames:
    print("\nNada para extrair. Veja os IDs reais acima e me avise.")
else:
    result = pd.concat(frames, ignore_index=True)
    result = result.sort_values(["id", "modelo"])

    # Trunca SQL pra nao explodir o terminal
    if "sql_gerado" in result.columns:
        result["sql_gerado"] = result["sql_gerado"].astype(str).str.slice(0, 200)

    print("\n=== EXTRATO ===\n")
    print(result.to_string(index=False))

    out_path = RESULTS_DIR / "diagnosis_extract.csv"
    result.to_csv(out_path, index=False)
    print(f"\nSalvo em: {out_path}")