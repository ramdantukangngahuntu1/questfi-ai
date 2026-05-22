# 🎲 QuestFi AI v3.0

> AI-powered GameFi dungeon crawler. Unique adventures every playthrough.

Built with **Next.js 14**, **TypeScript**, **Tailwind CSS**, and powered by **Llama 3.3 70B** (Groq) with MiMo fallback.

## ✨ Features

- 🗡️ **AI Dungeon Master** — Unique encounters, NPCs, and treasures every time
- ⚔️ **6 Character Classes** — Warrior, Mage, Rogue, Paladin, Necromancer, Ranger
- 📊 **Character Stats** — HP, Attack, Defense, Magic with visual stat bars
- 📜 **Quest Tracking** — Active/completed/failed quest log
- 💾 **Session History** — Resume any previous adventure (localStorage)
- 🔑 **Multi-Provider AI** — Groq (free) → MiMo → Demo mode fallback
- 🎮 **Quick Choices** — Click buttons to choose your action

## 🚀 Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 🔑 API Keys (Optional)

| Provider | Cost | Rate Limit | Priority |
|----------|------|------------|----------|
| **Groq** | Free | 30 RPM | Primary |
| **MiMo** | Free tier | Variable | Fallback |
| **Demo** | Free | Unlimited | No key needed |

1. Get free Groq key at [console.groq.com/keys](https://console.groq.com/keys)
2. Enter it in Settings tab
3. Or leave empty for Demo mode with mock responses

## 🛠 Tech Stack

- **Frontend:** Next.js 14, TypeScript, Tailwind CSS
- **AI:** Llama 3.3 70B (Groq) + MiMo V2.5 fallback
- **Storage:** localStorage (no database needed)
- **Deployment:** Vercel / Netlify

## 📂 Project Structure

```
src/app/
├── api/generate/route.ts   # AI endpoint (Groq + MiMo + mock)
├── globals.css              # Game theme styles
├── layout.tsx               # Root layout
└── page.tsx                 # Main UI (all-in-one)
```

## 🎮 How to Play

1. Choose your character class and name
2. Type your action in the input field
3. Or click the quick-choice buttons
4. Explore the dungeon, fight monsters, find treasure!
5. Your progress is saved automatically

---

<div align="center">

**🎲 QuestFi AI V3.0** — Built with Next.js 14 & MiMo AI by [ramdantukangngahuntu1](https://github.com/ramdantukangngahuntu1)

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38bdf8?logo=tailwindcss)](https://tailwindcss.com)
[![Groq](https://img.shields.io/badge/Groq-Llama_3.3_70B-green)](https://groq.com)

</div>
