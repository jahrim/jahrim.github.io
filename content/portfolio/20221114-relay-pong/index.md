---
title: Relay Pong
slug: relay-pong
description: 
  'A web application extending the classic Pong game from two to many players'
date: '2022-11-14T00:00:00+00:00'
jobDate: 2022
work: [
  real-time distributed systems,
  web application,
  multiplayer game
]
designs: [Jahrim Gabriele Cesario]
techs: [
  Angular,
  Express,
  Vert.x,
  Gradle,
  Npm,
  Docker,
  Java,
  Typescript
]
thumbnail: relay-pong/thumbnail.png
projectUrl: https://apice.unibo.it/xwiki/bin/view/Courseproject/DistributedPong
---

### Title

Relay Pong, a Pong-Inspired Web Application

### Abstract

This project concerns the development of a variant of the classic videogame
Pong, in the form of a web application playable via browser, allowing several
players to engage in team-based competitive gameplay. The primary objective of
the project is to explore real-time distributed systems.

The traditional Pong is a simulation of table tennis. During a game, two
players compete by controlling one bar each. The players can use the bars to
hit a ball, scoring points when the ball surpasses the opponent's bar. The goal
of the game is to score a set number of points before the opponent.

In the proposed variant, called Relay Pong, the game is no longer limited to
just two players. During a game, two teams, each with at least one player,
compete by controlling one bar per team. Team members take turns controlling
their team's bar, aiming to score a set number of points before the opponent
team.

The initial goal of this project is to develop a proof-of-concept of the
described service, essentially a prototype demonstrating the feasibility of the
system. The service adopts a client-server architecture, where the server
manages the true state of a game, shared with the clients. Clients transmit
events to the server, reflecting players' intentions, thereby updating the game
state accordingly.

Real-time communication is achieved using the WebSocket protocol, enabling
efficient bidirectional exchanges with low packet overhead. Additional aspects
of interest include the logical model employed for representing a game, the
dynamics governing the evolution of the game, and the synchronization between
the players and the game server.

### Demo

Here follows a demo of the game from the perspective of four different players,
connected to the only available game server, using a static configuration for
the match. The demo shows:
1. Four players joining the only available game server, readying to play;
2. The host of the lobby starting the game;
3. The evolution of a game with each player controlling their team's bar (a bar
   is controlled by a player if it has a white mark in the middle);
4. The host and another player disconnecting during the game;
5. The new host and the other player continuing the game until termination,
   with the state of the game visible.

{{<video source="/videos/relay-pong.mp4">}}
