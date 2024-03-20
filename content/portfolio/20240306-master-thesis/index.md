---
title: Master Thesis
slug: master-thesis
description: 
  'Event-driven simulation and verification of FRASP systems against
   spatio-temporal properties'
date: '2024-03-06T00:00:00+00:00'
jobDate: 2024
work: [
  collective adaptive systems,
  event-driven simulation,
  aggregate computing, 
  functional reactive programming
]
designs: [Jahrim Gabriele Cesario]
techs: [
  FRASP,
  ScaFi,
  Sodium,
  Scala
]
thumbnail: master-thesis/thumbnail.png
projectUrl: https://github.com/jahrim/master-thesis
---

### Title

Event-driven Simulation and Verification of FRASP Systems Against 
Spatio-Temporal Properties

### Supervisors

**Supervisor**: Prof. Mirko Viroli

**Co-supervisor**: Dr. Roberto Casadei

**Co-supervisor**: Dr. Gianluca Aguzzi

### Abstract

The growing relevance of large-scale distributed systems, including collective
adaptive systems, has inspired the research for novel aggregate computing
paradigms, addressing the complexity of programming macro-level behaviors over
sizeable networks of devices. One of the most recent advancements in this
direction is the development of a reactive execution model for such systems,
embodied in a domain-specific language (DSL) called FRASP (Functional Reactive
Approach to Self-organization Programming), which overcomes several limitations
of the previous round-based execution models, such as redundant
re-computations.

The objective of this thesis is to consolidate FRASP by developing an extensive
test suite, demonstrating the correctness of the current implementation,
supporting future extensions of the language, and providing valuable insights
into the implications of the reactive execution model and the challenges to
overcome. With this goal in mind, the event-driven simulator provided by FRASP
has been re-designed to enable the evaluation of spatio-temporal properties on
the evolution of aggregate systems, focusing on the convergence of
self-stabilizing specifications towards an expected stable state.

In conclusion, the test suite verifies the overall correctness of FRASP, except
for a couple of issues concerning the implementation, which have been
identified and analyzed, so that they may be addressed in future works.
