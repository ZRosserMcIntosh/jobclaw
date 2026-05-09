# What Is OpenClaw and How Does It Actually Work?

A plain-English guide. No jargon soup.

---

## The One-Sentence Version

**OpenClaw is a personal AI assistant that runs on your computer (not in a browser tab), stays on 24/7, and can do things — send messages, browse the web, run code, search for jobs — on your behalf, even when you're not looking.**

Think of it like hiring a virtual employee that lives inside your laptop.

---

## How It's Different From ChatGPT / Claude / Copilot

| | ChatGPT / Claude | OpenClaw |
|---|---|---|
| **Where it runs** | Their servers, in a browser tab | On YOUR machine |
| **Memory** | Forgets between sessions (mostly) | Remembers everything you tell it, forever |
| **Can it DO things?** | Only talks back at you | Can browse websites, send Slack messages, run terminal commands, fill out forms |
| **Always on?** | Only when you have the tab open | Runs in the background 24/7 like Spotify |
| **Brain** | Uses their own AI model (GPT, Claude) | You CHOOSE the brain — OpenAI, Ollama local, anything |
| **Cost** | Subscription or pay-per-use | Free if you use local models; pay only if you choose a cloud brain |

---

## The Architecture (In Plain English)

OpenClaw has 4 main pieces. Think of it like a small company:

```
┌─────────────────────────────────────────────────────┐
│                   YOUR COMPUTER                      │
│                                                      │
│  ┌──────────┐    ┌──────────┐    ┌──────────────┐   │
│  │  GATEWAY  │◄──►│  AGENTS  │◄──►│  AI BRAIN    │   │
│  │ (Manager) │    │ (Workers)│    │  (LLM Model) │   │
│  └────┬─────┘    └──────────┘    └──────────────┘   │
│       │                                              │
│       ▼                                              │
│  ┌──────────┐                                        │
│  │ CHANNELS │  Slack, WhatsApp, Web Dashboard, CLI   │
│  └──────────┘                                        │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### 1. The Gateway (The Manager)

- This is the **always-running background service** on your Mac
- It's like a receptionist — it receives messages from you (via Slack, the web dashboard, or the terminal) and routes them to the right agent
- It runs as a macOS LaunchAgent (same way Spotify auto-starts when you log in)
- Lives at: `http://127.0.0.1:18789` (only accessible from your machine)
- **You never interact with it directly** — it just coordinates everything behind the scenes

### 2. The Agents (The Workers)

- An agent is a **personality + workspace + set of instructions**
- You have two: `main` (general assistant) and `katura` (your Slack bot)
- Each agent has:
  - **A workspace** — a folder on your computer where it reads/writes files
  - **Skills** — things it knows how to do (browse the web, search for jobs, write code)
  - **A session** — its memory of your conversation
  - **Identity files** — `USER.md` (who you are), `SOUL.md` (how it should behave)
- Think of agents as different employees who each have their own desk and job description

### 3. The AI Brain (The LLM)

- This is the **language model** that actually thinks and generates responses
- OpenClaw does NOT have its own brain — it plugs into one you choose:
  - **Cloud brains** (cost money): OpenAI GPT-5, Claude, Gemini
  - **Local brains** (free): Ollama running on your machine (what we set up)
  - **Free cloud brains**: Ollama Cloud models (Kimi, MiniMax, GLM — what you just signed up for)
- The brain gets a prompt from the agent, thinks, and sends back either text OR tool calls ("go browse this URL", "run this command")

### 4. Channels (How You Talk To It)

- **Web Dashboard** — `http://127.0.0.1:18789` — chat interface in your browser
- **Slack** — message the bot in your Slack workspace (already connected)
- **Terminal CLI** — `openclaw agent --message "do something"`
- **TUI** — `openclaw tui` — a text chat interface right in your terminal

---

## What Actually Happens When You Send It a Message

Here's the literal sequence of events when you type "Find me remote jobs":

```
1. You type a message in Slack (or dashboard, or CLI)
         │
         ▼
2. The Gateway receives it and looks up which Agent handles this channel
         │
         ▼
3. The Agent loads its context:
   - Your USER.md (who you are, your job search criteria)
   - Its SOUL.md (personality, rules)
   - Any relevant Skills (job-search-agent, browser-automation)
   - The conversation history (session memory)
         │
         ▼
4. All of this gets packaged into a prompt and sent to the AI Brain (LLM)
         │
         ▼
5. The Brain thinks and responds with EITHER:
   a) A text reply → sent back to you through the channel
   b) A tool call → "I need to browse remoteok.com" or "run this search"
         │
         ▼
6. If it's a tool call, the Agent EXECUTES it:
   - Opens a browser and navigates to the URL
   - Runs a shell command
   - Reads/writes files on your computer
   - Sends a Slack message
         │
         ▼
7. The tool result goes back to the Brain, which decides what to do next
   (This loop repeats until the task is done)
         │
         ▼
8. Final response gets sent back to you through whatever channel you used
```

**Key insight:** The AI brain doesn't just talk — it can ACT. It has hands (tools) that let it interact with your computer and the internet.

---

## Skills = Plugins

Skills are like apps on a phone. Each skill teaches the agent how to do one thing:

| Skill | What It Does |
|-------|-------------|
| `browser-automation` | Opens a real Chrome browser, clicks buttons, fills forms, takes screenshots |
| `job-search-agent` | Searches job boards, matches listings to your CV, tracks applications |
| `job` | Full job hunt intelligence — resume help, interview prep, career strategy |
| `coding-agent` | Writes and edits code |
| `slack` | Reads and sends Slack messages |
| `github` | Creates PRs, manages issues, runs CI |
| `weather` | Gets weather forecasts |

You install skills from **ClawHub** (like an app store):
```
openclaw skills install job-search-agent
openclaw skills list
```

---

## The "Local" Part — Why It Matters

When OpenClaw runs locally:

- **Your data never leaves your machine** (unless you choose a cloud brain)
- **No subscription** — the software itself is free
- **You own everything** — conversations, files, agent configs
- **It runs offline** (if using a local AI model via Ollama)

The tradeoff: **you supply the brain.** A cloud brain (OpenAI, etc.) is smart but costs money. A local brain (Ollama) is free but needs good hardware:

| Your Hardware | What Works |
|--------------|------------|
| Apple Silicon Mac (M1/M2/M3+, 16GB+) | Local models run great |
| Intel Mac with 16GB (yours) | Small local models are slow; cloud models recommended |
| Any Mac + Ollama Cloud sign-in | Free cloud models (Kimi, MiniMax, GLM) — no GPU needed |

---

## What We Set Up On Your Machine

```
~/.openclaw/
├── openclaw.json          ← Main config (models, gateway, channels)
├── workspace/
│   ├── USER.md            ← Your profile (name, job criteria, background)
│   ├── SOUL.md            ← Agent personality/behavior rules
│   ├── AGENTS.md          ← Agent identity
│   └── skills/            ← Installed skill plugins
│       ├── job-search-agent/
│       ├── browser-automation/
│       └── job/
├── agents/
│   ├── main/              ← Your main agent
│   │   ├── agent/
│   │   │   ├── auth-profiles.json  ← API keys / auth
│   │   │   └── models.json         ← Model config for this agent
│   │   └── sessions/      ← Conversation memory
│   └── katura/            ← Your Slack bot agent
└── cron/                  ← Scheduled tasks
```

---

## The Ollama Cloud Models You Just Unlocked

By signing into Ollama with GitHub, you now have access to **free cloud models** that:
- ✅ Are fast (run on Ollama's servers, not your CPU)
- ✅ Cost $0
- ✅ Support tool calling (critical for OpenClaw skills to work)
- ✅ Don't need your GPU

Available models include:
- `kimi-k2.5:cloud` — strong reasoning, good for complex tasks
- `minimax-m2.5:cloud` — fast, good for quick tasks  
- `glm-5:cloud` — multilingual, good for EN/PT tasks

---

## How to Use It Day-to-Day

Once configured, you'd interact with OpenClaw like this:

```bash
# Chat in the terminal
openclaw tui

# Send a one-off task
openclaw agent --agent main --message "Search for 20 remote jobs paying $40K+"

# Open the web dashboard
openclaw dashboard

# Message it in Slack
# (just DM your bot or @mention it in a channel)

# Check what it's doing
openclaw logs --follow

# See status
openclaw status
```

---

## TL;DR

OpenClaw = **a personal AI assistant that runs on your laptop, remembers who you are, and can actually do things** (browse the web, send messages, fill out job applications, run code). You talk to it through Slack, a web dashboard, or the terminal. It needs an AI brain to think (you can use free Ollama Cloud models). It's like having a tireless intern who works 24/7 and never asks for a raise.
