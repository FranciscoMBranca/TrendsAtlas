import re

from app.main import parse_origins


def test_origins_tolerate_quotes_spaces_and_trailing_slash():
    raw = '"https://trends-atlas.vercel.app/" , https://outro.exemplo.pt'
    assert parse_origins(raw) == ["https://trends-atlas.vercel.app", "https://outro.exemplo.pt"]


def test_recommended_preview_regex_matches_previews_only():
    rx = re.compile(r"^https://trends-atlas-[a-z0-9-]+\.vercel\.app$")
    assert rx.fullmatch("https://trends-atlas-abc123-francisco.vercel.app")
    assert not rx.fullmatch("https://trends-atlas.vercel.app")  # production goes in ALLOWED_ORIGINS
    assert not rx.fullmatch("https://trends-atlas-x.vercel.app.malicioso.com")


def test_comma_separated_regex_never_matches():
    # A regex is ONE pattern: a comma-separated list (as first configured) matches nothing.
    bad = re.compile(r"https://trends-atlas-[a-z0-9-]+\\.vercel\\.app$,https://trendsatlas-production.up.railway.app/saude")
    assert not bad.fullmatch("https://trends-atlas-abc123-francisco.vercel.app")
