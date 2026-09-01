# DOCX rendering fixes

- English question and option text: 12 pt.
- Hindi question and option text: 10 pt.
- Options render as (1) (2) (3) (4).
- Common fractions are emitted as native editable Word OMML fractions.
- Source diagrams returned as SVG are rasterized to PNG before embedding so Word always has a real image payload.
- Source questions that explicitly reference a figure/graph/plot/diagram are QA-checked for a captured diagram.
