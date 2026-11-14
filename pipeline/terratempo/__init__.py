"""Terra Tempo pipeline.

Each formula from ``docs/05-metodo-e-formulas.md`` lives in exactly one place in
this package. The API imports it; it never re-implements it.
"""

SCHEMA_VERSION = "0.1.0"

LABEL_REAL = "real"
LABEL_DEMO = "demonstracao"

__all__ = ["SCHEMA_VERSION", "LABEL_REAL", "LABEL_DEMO"]
