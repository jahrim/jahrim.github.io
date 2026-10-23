---
title: Language Models Need Some Space
slug: llm-need-some-space
description:
  'On the sensitivity of constrained decoding to completeness'
date: '2026-06-15T00:00:00+00:00'
jobDate: 2026
work: [
  language models,
  code generation,
  constrained decoding
]
designs: [Jahrim Gabriele Cesario]
techs: [
  Python,
  TOML
]
thumbnail: llm-need-some-space/thumbnail.png
projectUrl: https://doi.org/10.1145/3849733.3849789
---

### Title

Language Models Need Some Space: On the Sensitivity of Constrained Decoding to
Completeness

### Publication

Companion Proceedings of ECOOP 2026 (ACM). Presented at the Student Research
Competition of ECOOP 2026 in Brussels (fourth place), and as a poster at the
Student Research Competition of PLDI 2026 in Boulder.

- **Paper**: [doi.org/10.1145/3849733.3849789](https://doi.org/10.1145/3849733.3849789)
- **ECOOP 2026**: [Student Research Competition](https://2026.ecoop.org/details/ecoop-2026-student-research-competition/4)
- **PLDI 2026**: [Student Research Competition](https://pldi26.sigplan.org/details/pldi-2026-src/4)
- **Preprint**: [PDF](https://programming-group.com/assets/pdf/papers/2026_Language-Models-Need-Some-Space.pdf)

### Abstract

The widespread adoption of language models for code generation makes the
enforcement of formal guarantees on their outputs ever more important. Recent
constrained decoding techniques are promising, but when applied to practical
programming languages they typically face a trade-off between soundness and
completeness, either permitting some invalid programs or rejecting some valid
ones. We argue that invalid programs should be excluded entirely, yet find that
overly restrictive acceptance criteria can significantly impair a model's
ability to follow human intent and generate functionally correct code. We
attribute this degradation to a mismatch between the model's internal
representation of the language and the constrained language induced by the
formal guarantees. To better align the two, we propose reducing variability
through training-set preprocessing, language design, or neural architecture
design.
