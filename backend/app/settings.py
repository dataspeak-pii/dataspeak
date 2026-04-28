"""
Configuração centralizada do backend.

Lida de variáveis de ambiente (com fallback para .env) via pydantic-settings.
Decisão arquitetural D3 — ver "Decisões com lente de produto" no Notion.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Settings do backend. Todos os campos podem ser sobrescritos por
    variáveis de ambiente com o mesmo nome (case-insensitive).
    """

    # Caminho do banco simulado, relativo ao diretório onde o uvicorn roda
    database_path: str = "data/dataspeak.db"

    # Limites de execução de SQL
    query_timeout_seconds: float = 5.0
    max_rows_returned: int = 100      # quantas linhas o frontend recebe
    max_rows_scanned: int = 10_000    # quantas linhas o executor lê do cursor

    # Integração com OpenRouter (já existia em os.getenv)
    openrouter_api_key: str = ""

    # Logging
    log_level: str = "INFO"

    # CORS
    cors_allow_origins: list[str] = ["http://localhost:3000"]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


# Instância única reutilizada em todo o backend
settings = Settings()