---
title: Chess Microservices
slug: chess-microservices
description:
  'The microservice architecture applied to a web application for playing
   chess'
date: '2023-09-29T00:00:00+00:00'
jobDate: 2023
work: [
  devops, 
  continuous integration, 
  domain-driven design, 
  microservices, 
  web application, 
  multiplayer game
]
designs: [
  Jahrim Gabriele Cesario, 
  Madina Kentpayeva
]
techs: [
  Vue.js, 
  Express, 
  MongoDB, 
  Vert.x, 
  Gradle, 
  Npm, 
  Docker, 
  GitHub Actions, 
  Scala, 
  Typescript, 
  Kotlin, 
  Java
]
thumbnail: chess-microservices/thumbnail.png
projectUrl: https://github.com/orgs/ldss-project/repositories
---

### Title

Chess Microservices, a Web Application for Playing Chess

### Abstract

This project concerns the development of a web application for playing chess,
leveraging a previously implemented chess engine.

The application is decomposed into autonomous microservices following the best
practices of Domain-Driven Design (DDD). First, the problem space is explored
through knowledge crunching, analyzing processes via domain storytelling, 
evaluating the complexity and business value of subdomains, and formalizing 
domain concepts in a ubiquitous language. Secondly, multiple bounded contexts 
are defined to manage the subdomains: each context is described by its own 
bounded context canvas and their relations are outlined with a context map.
Finally, concrete services are designed to manage the bounded contexts,
selecting the technologies employed for communication and defining their
contracts.

Throughout development, we adhere to the best practices of DevOps, including: 
a formal workflow organization, based on git flow; a standard versioning
protocol, namely semantic versioning; a build automation process supporting
quality assurance, artifact generation and artifact publication across
various platforms; a continuous integration process supporting continuous
testing and continuous delivery for rolling releases; a semi-automated 
deployment process for integrating all microservices within the application.

Additionally, the project includes the publication of several artifacts in
support of the development process, comprising an internal domain-specific
language (DSL), enforcing a standard declarative definition of microservices,
and a gradle plugin, checking the quality of Scala code.

### Demo

Here follows a demo of the application from the perspective of two different
players, showcasing the integration of all microservices. The demo shows:
1. The registration of a new user;
2. Their profile, initial statistics and the global leaderboard;
3. The configuration and creation of a private game;
4. The authentication of an already registered user;
5. The participation to a private game;
6. A private game between two authenticated users;
7. The updated statistics and leaderboard after the game;
8. The logout of the authenticated users;
9. The configuration and creation of a public game;
10. The participation to a public game;
11. A public game between two non-authenticated users;
12. The termination of a game server after the disconnection of a player.

{{<video source="demo.mp4">}}
