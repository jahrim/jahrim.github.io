---
title: Versioned E-Graphs
slug: versioned-egraphs
description:
  'E-graphs encoding multiple equivalence relations at once for conditional
   reasoning'
date: '2026-06-15T00:00:00+00:00'
jobDate: 2026
work: [
  automated theorem proving,
  e-graphs,
  conditional reasoning
]
designs: [
  Jahrim Gabriele Cesario,
  George Zakhour,
  Pascal Weisenburger,
  Guido Salvaneschi
]
techs: [
  Rust,
  Lean
]
thumbnail: versioned-egraphs/thumbnail.png
projectUrl: https://github.com/jahrim/versioned-egraphs
---

### Title

Versioned E-Graphs

### Publication

Proceedings of the ACM on Programming Languages, Volume 10, PLDI, Article 171
(June 2026). Presented at PLDI 2026 in Boulder.

- **Paper**: [doi.org/10.1145/3808249](https://doi.org/10.1145/3808249)
- **Artifact**: [doi.org/10.5281/zenodo.18769553](https://doi.org/10.5281/zenodo.18769553)
- **Code**: [github.com/jahrim/versioned-egraphs](https://github.com/jahrim/versioned-egraphs)
- **Notebook**: [Jupyter notebook (Google Colab)](https://colab.research.google.com/drive/1rSgg13v9yKvtNQIsORHPSskKQFEj4g4s)
- **Seminar**: [EGRAPHS Meeting 2026-10-15: Versioned E-graphs](https://egraphs.zulipchat.com/#narrow/channel/328972-general/topic/EGRAPHS.20Meeting.202026-10-15.3A.20Versioned.20E-graphs/with/633376045)
- **Recording**: [Versioned E-Graphs (YouTube)](https://www.youtube.com/watch?v=92puvPp-zNk)

### Abstract

E-Graphs are an efficient encoding for discovering and maintaining sets of
equalities, commonly adopted in the context of formal proofs, program analysis,
and optimization. In several scenarios, equalities may hold only conditionally,
i.e., under certain assumptions. For example, in automated provers the proof is
often split into multiple branches, such that each branch considers a different
set of equalities. A limitation of traditional e-graphs is that they can only
encode a single set of equalities at a time. Conditional equalities are then
handled by maintaining multiple e-graphs, e.g., one for each branch in the
proof, which is inefficient as equalities shared among branches are simply
replicated many times.

In this paper, we introduce versioned e-graphs, which efficiently encode
multiple equivalence sets at the same time, maximizing shared information among
them. We formalize for versioned e-graphs and prove their correctness. We
evaluate our solution against widely-adopted solutions which maintain multiple
e-graphs and show that versioned e-graphs are up to 5–30% more memory efficient
and up to 4× faster depending on the case study, especially when solution
spaces are large both in explored program terms and number of branches.
