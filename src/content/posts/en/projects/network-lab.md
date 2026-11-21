---
title: "Network CI lab: the plan"
description: "A planned Containerlab / Ansible lab for network configuration and failure testing."
date: "2026-11-21"
lang: "en"
category: "projects"
cover: "git"
tags: ["Infrastructure/Networking", "Infrastructure/Ansible", "Infrastructure/Containerlab", "Infrastructure/CI"]
featured: false
---

## Current status

A design plan. The repository does not contain a working deployment yet.

The first planned lab is a Linux client, router, and server. Containerlab would create the topology, Ansible would configure it, and pytest / GitHub Actions would validate it.

Later scenarios in the plan include packet loss, latency, link outages, and SD-WAN failover.

[Read the plan](https://github.com/Dangkeys/netdevops/blob/main/NETWORK_CI_CHAOS_PLAN.md)
