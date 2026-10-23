---
title: Dis/Equality Graphs
slug: disequality-egraphs
description:
  'An extension of e-graphs with direct support for disequalities'
date: '2025-01-19T00:00:00+00:00'
jobDate: 2025
work: [
  automated theorem proving,
  e-graphs,
  disequalities
]
designs: [
  George Zakhour,
  Pascal Weisenburger,
  Jahrim Gabriele Cesario,
  Guido Salvaneschi
]
techs: [
  Rust,
  Scala
]
thumbnail: disequality-egraphs/thumbnail.png
projectUrl: https://doi.org/10.1145/3704913
---

### Title

Dis/Equality Graphs

### Publication

Proceedings of the ACM on Programming Languages, Volume 9, POPL, Article 77
(January 2025). Presented at POPL 2025 in Denver.

- **Paper**: [doi.org/10.1145/3704913](https://doi.org/10.1145/3704913)
- **Artifact**: [doi.org/10.5281/zenodo.13938878](https://doi.org/10.5281/zenodo.13938878)

### Abstract

E-graphs are a data structure to compactly represent a program space and reason
about equality of program terms. E-graphs have been successfully applied to a
number of domains, including program optimization and automated theorem
proving. In many applications, however, it is necessary to reason about
disequality of terms as well as equality. While disequality reasoning can be
encoded, direct support for disequalities increases performance and simplifies
the metatheory.

In this paper, we develop a framework independent of a specific implementation
to formally reason about e-graphs. For the first time, we prove the equivalence
of e-graphs to the reflexive, symmetric, transitive, and congruent closure of
the equivalence relation they are expected to encode. We use these results to
present the first formalization of an extension of e-graphs that directly
supports disequalities and prove an analytical result about their superior
efficiency compared to embedding techniques that are commonly used in SMT
solvers and automated verifiers. We further profile an SMT solver and find that
it spends a measurable amount of time handling disequalities.

We implement our approach in an extension to egg, a popular e-graph Rust
library. We evaluate our solution in an SMT solver and an automated theorem
prover using standard benchmarks. The results indicate that direct support for
disequalities outperforms other encodings based on equality embedding,
confirming the results obtained analytically.
