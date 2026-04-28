"""
RequestContext — contexto que viaja com cada requisição pelo backend.

No MVP, só `request_id` é populado. Os demais campos ficam vazios e existem
para que a interface esteja pronta quando autenticação e multi-tenant forem
introduzidos. Decisão arquitetural D2 — ver "Decisões com lente de produto".
"""

import uuid
from pydantic import BaseModel, Field


class RequestContext(BaseModel):
    """Contexto de uma requisição ao backend."""

    request_id: str = Field(default_factory=lambda: uuid.uuid4().hex)
    user_id: str | None = None
    tenant_id: str | None = None
    permissions: list[str] = Field(default_factory=list)


def new_context() -> RequestContext:
    """Factory de RequestContext anônimo (MVP)."""
    return RequestContext()