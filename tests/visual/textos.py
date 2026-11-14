"""R0 (W41): build docs/design/textos-pt.md from the texts captured on the prototype.

Input: extraido/textos.json (written by `node capture.mjs --extract`), default variable
(temperature) at 1280 px. Pure numbers, units and axis ticks are left out: they come
from data and belong to docs/design/inventario-dados.md.
Usage: python -I textos.py > ../../docs/design/_textos-capturados.md
"""

import json
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")

# Strings with no letters at all (numbers, signs, ticks) are data, not copy.
NUMERIC = re.compile(r"^[^A-Za-zÀ-ÿ]*$")

# Exact strings that break CLAUDE.md or docs/02 rules, with the reason.
REVIEW = {
    "O planeta não aquece": "afirmação sobre o planeta real feita com dados sintéticos (princípio 1 de docs/00); o título vem de meta.variable.copy.opening",
    "ao mesmo ritmo": "parte do título acima",
    "em todo o lado.": "parte do título acima",
    "Uma leitura de 24 anos de temperatura do ar, aqui com dados sintéticos, e de onde a mudança é real.":
        "\"onde a mudança é real\" só com significância calculada e a regra p < 0,05 dita ao lado (W40); 24 vem de meta.period",
    "Mais calor aqui. Menos calor ali.": "com estes dados nenhuma região arrefece de forma significativa (abertura: \"Nenhuma região desce\"); texto fixo em meta.variable.copy.headline",
    "A mudança não tem a mesma direcção em todo o lado.": "afirmação não verificada nos dados mostrados (ver linha acima)",
    "Um planeta.": "título editorial ligado à afirmação \"dois sinais\"",
    "Dois sinais.": "com temperatura sintética quase todo o mapa sobe; confirmar por variável",
    ". Uma média global pequena pode esconder regiões com sinais opostos, como mostra o mapa a seguir.":
        "comparação com a média global: só se o mapa mostrar de facto sinais opostos calculados nos mesmos dados (docs/02)",
    "Significativa: o acaso explica mal esta tendência.": "interpretação do valor-p a validar pela Ciência; falta a regra fixa de W40",
    "NASA GPM · IMERG": "texto fixo no código (AtlasFooter.tsx): diz que o IMERG é a fonte de referência mesmo com temperatura sintética seleccionada",
    "é a fonte de referência do atlas.": "ver linha acima",
    "PODE FICAR CLARA EM ATÉ 20 ANOS": "o 20 está escrito à mão no componente (EmergenceSection.tsx), embora o cálculo use HORIZON_BUCKETS",
    "SISTEMA TERRA / ATLAS 001": "rótulo decorativo sem origem; confirmar se fica",
}


def main() -> None:
    data = json.load(open("extraido/textos.json", encoding="utf-8"))
    names = {
        "_title": "Título da página", "_meta": "Meta description", "_cabecalho": "Cabeçalho",
        "abertura": "#abertura", "panorama": "#panorama", "o-que": "#o-que", "onde": "#onde",
        "quando": "#quando", "regioes": "#regioes", "significativo": "#significativo",
        "metodo": "#metodo", "_rodape": "Rodapé (#fontes)",
    }
    order = ["_title", "_meta", "_cabecalho", "abertura", "panorama", "o-que", "onde", "quando",
             "regioes", "significativo", "metodo", "_rodape"]
    n_review = 0
    for key in order:
        items = data.get(key, [])
        print(f"\n### {names[key]}\n")
        seen = []
        for it in items:
            t = it["text"]
            if t in seen or NUMERIC.match(t):
                continue
            seen.append(t)
            tag = it["tag"]
            flag = ""
            if t in REVIEW:
                flag = f" **[REVER]** {REVIEW[t]}"
                n_review += 1
            elif re.search(r"devido a|por culpa|causa", t, re.I) and "atribuição causal" not in t and "não porquê" not in t:
                flag = " **[REVER]** possível linguagem de causa"
                n_review += 1
            print(f"- `{tag}` {t}{flag}")
    print(f"\n<!-- {n_review} marcas [REVER] geradas automaticamente -->")


if __name__ == "__main__":
    main()
