---
title: Landscape Generator
slug: landscape-generator
description:
  'A generative model for pictures of diverse landscapes'
date: '2023-12-08T00:00:00+00:00'
jobDate: 2023
work: [
  deep learning,
  generative models,
  conditional variational auto-encoder,
  image generation
]
designs: [Jahrim Gabriele Cesario]
techs: [
  Keras, 
  Tensorflow, 
  Python
]
thumbnail: landscape-generator/thumbnail.png
projectUrl: https://github.com/jahrim/dl-project
---

### Title

Conditional Variational Auto-Encoding for Landscape Generation

### Abstract

This project concerns the development of a model capable of generating diverse
landscape images, including coasts, forests, deserts, glaciers and mountains.

The employed strategy is to design a Conditional Variational Auto-Encoder
(CVAE), trained to reconstruct landscape images from the training set
with minimal information. The encoding component of the CVAE is trained to
extract the most relevant information from the input, learning a
transformation from the space of landscape images to an under-dimensioned
space, called latent space. The decoding component of the CVAE is trained to
learn the inverse transformation, generating landscape images from points in
the latent space.

Constraints on the regularity of the latent space enable the application of
the decoder to random samples of the latent space, generating new landscape
images different from those of the training set. Furthermore, training the
CVAE with knowledge about the observed landscape types, that is a condition,
allows specifying the desired landscape type during generation.

In conclusion, the results obtained by several configurations of the model
have been analyzed, identifying possible improvements and ideas for future
explorations, such as designing more complex conditions.
