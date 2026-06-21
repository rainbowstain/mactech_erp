# MacTech ERP

## Paleta de colores (OBLIGATORIA)

Toda edición de UI/estilos debe respetar esta paleta. No introducir colores de marca
fuera de ella (los colores semánticos de estado —verde éxito, amarillo aviso, rojo
peligro— sí se mantienen).

| Hex       | Rol                                              |
|-----------|--------------------------------------------------|
| `#1f1556` | Morado profundo — `--brand-ink`, superficies hondas, sidebar (claro) |
| `#7c4dff` | Morado principal — acento, **líneas delgadas**, focus, botón primario |
| `#ffffff` | Blanco — base en modo claro                      |
| `#121212` | Casi negro — base en modo oscuro                 |
| `#a594ff` | Morado claro — acento secundario, hover, acento en modo oscuro |

**Intención de diseño:** las superficies son blancas (claro) / casi negras (oscuro);
el morado aparece sobre todo en líneas finas y acentos pequeños para resaltar por
minimalismo. Evitar grandes bloques de color.

La fuente única de verdad de los tokens vive en `app/styles.css` (`:root` y
`.dark-mode`): `--brand`, `--brand-strong`, `--brand-soft`, `--brand-ink`, `--accent`,
`--line`, `--line-strong`, `--ring`, etc. Usar estas variables en vez de hex sueltos.
