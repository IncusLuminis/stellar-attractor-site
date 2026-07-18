from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parent.parent

TOKENS_PATH = ROOT / "style" / "SA_styles.json"
CSS_OUT = ROOT / "style" / "stellar-attractor.css"
PY_OUT = ROOT / "style" / "hud_style_tokens.py"


def css_var(group: str, key: str) -> str:
    return "--sa-" + group.replace("_", "-") + "-" + key.replace("_", "-")


def py_name(group: str, key: str) -> str:
    return "SA_" + group.upper() + "_" + key.upper()


def hex_to_rgb(value: str):
    if isinstance(value, str) and re.fullmatch(r"#[0-9a-fA-F]{6}", value):
        return tuple(int(value[i:i+2], 16) for i in (1, 3, 5))
    return None


tokens = json.loads(TOKENS_PATH.read_text(encoding="utf-8"))

css = [":root {"]
for group, values in tokens.items():
    for key, value in values.items():
        css.append(f"  {css_var(group, key)}: {value};")
css.append("}")

css += """
.sa-hud {
  position: relative;
  font-family: var(--sa-font-mono);
  color: var(--sa-colors-text-main);
}

.sa-panel-bg {
  fill: var(--sa-colors-panel-bg);
  stroke: none;
}

.sa-frame-outer {
  fill: none;
  stroke: var(--sa-colors-cyan-deep);
  stroke-width: 2.4;
  stroke-opacity: 0.95;
  filter: drop-shadow(0 0 5px rgba(90,240,255,0.55));
}

.sa-frame-inner {
  fill: none;
  stroke: var(--sa-colors-cyan);
  stroke-width: 1;
  stroke-opacity: 0.48;
}

.sa-frame-micro {
  fill: none;
  stroke: var(--sa-colors-cyan);
  stroke-width: 1;
  stroke-opacity: 0.18;
}

.sa-accent {
  fill: rgba(64,210,245,0.82);
  stroke: var(--sa-colors-cyan-bright);
  stroke-width: 1.2;
  stroke-opacity: 1;
  filter: drop-shadow(0 0 6px rgba(90,240,255,0.45));
}

.sa-title {
  color: var(--sa-colors-cyan-bright);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  text-shadow: 0 0 14px rgba(90,240,255,0.55);
}

.sa-text {
  color: var(--sa-colors-text-dim);
  line-height: 1.65;
}
""".strip().splitlines()

CSS_OUT.parent.mkdir(parents=True, exist_ok=True)
CSS_OUT.write_text("\n".join(css) + "\n", encoding="utf-8")

py = ["# Auto-generated. Do not edit manually.", ""]
for group, values in tokens.items():
    for key, value in values.items():
        rgb = hex_to_rgb(value)
        py.append(f"{py_name(group, key)} = {rgb!r}" if rgb else f"{py_name(group, key)} = {value!r}")

PY_OUT.write_text("\n".join(py) + "\n", encoding="utf-8")

print(f"Saved: {CSS_OUT}")
print(f"Saved: {PY_OUT}")