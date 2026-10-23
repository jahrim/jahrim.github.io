---
title: Vegie
slug: vegie
description:
  'A lightweight automated inductive theorem prover built around versioned
   e-graphs'
date: '2026-06-29T00:00:00+00:00'
jobDate: 2026
work: [
  proof extraction,
  e-graphs,
  equality saturation
]
designs: [
  George Zakhour,
  Jahrim Gabriele Cesario,
  Pascal Weisenburger,
  Guido Salvaneschi
]
techs: [Rust]
thumbnail: vegie/thumbnail.png
projectUrl: https://github.com/gzakhour/vegie
---

### Title

Proof Primitives for Equality Saturation-based Automated Provers

### Publication

VeriLang 2026, co-located with ECOOP 2026 in Brussels.

- **VeriLang 2026**: [Proof Primitives for Equality Saturation-based Automated Provers](https://2026.ecoop.org/details/verilang-2026-verilang-2026/2)
- **Preprint**: [PDF](https://programming-group.com/assets/pdf/papers/2026_Proof-Primitives-for-Equality-Saturation-Based-Automated-Provers.pdf)
- **Code**: [github.com/gzakhour/vegie](https://github.com/gzakhour/vegie)

### Abstract

We present a proof extraction algorithm for versioned e-graphs, an extension of
e-graphs that supports branching reasoning contexts and proof by cases. In the
setting of algebraic datatypes, the algorithm handles rewrites, congruence,
injectivity, contradictions, induction, and case splits. We implement it in
Vegie, a lightweight automated inductive theorem prover. An early case study
suggests that the produced proofs are smaller than those of a state-of-the-art
e-graph prover.
