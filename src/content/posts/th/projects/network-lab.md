---
title: "แผน Network CI lab"
description: "แผนทำ lab ด้วย Containerlab / Ansible สำหรับทดสอบการตั้งค่าและปัญหาเครือข่าย"
date: "2026-11-21"
lang: "th"
category: "projects"
cover: "git"
tags: ["Infrastructure/Networking", "Infrastructure/Ansible", "Infrastructure/Containerlab", "Infrastructure/CI"]
featured: false
---

## สถานะตอนนี้

ยังเป็นแผนครับ ใน repository ยังไม่มี deployment ที่ทำงานได้จริง

lab แรกที่วางไว้คือ Linux client, router และ server ใช้ Containerlab สร้าง topology, Ansible ตั้งค่า และ pytest / GitHub Actions ตรวจสอบ

แผนถัดไปมีการลอง packet loss, latency, link ล่ม และ SD-WAN failover

[อ่านแผนใน GitHub](https://github.com/Dangkeys/netdevops/blob/main/NETWORK_CI_CHAOS_PLAN.md)
