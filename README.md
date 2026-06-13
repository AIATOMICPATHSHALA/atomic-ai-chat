# Atomic Pathshala — AI Doubt Solver V1

A ChatGPT-style academic doubt solver for Indian school students. Built with Next.js, TypeScript, Tailwind CSS, and Google Gemini.

## Features

- **ChatGPT-style interface** — Sidebar chat history + main conversation area
- **Atomic Pathshala branding** — Orange & blue theme with logo
- **Multilingual** — English, Hindi (हिंदी), and Hinglish responses
- **Text doubts** — Type any academic question
- **Image upload** — Upload photos of textbook pages, handwritten notes, diagrams
- **Mobile camera** — Capture photos directly on mobile devices
- **Gemini API** — Powered by `gemini-2.5-flash` with multimodal (Vision) support
- **Dark mode** — System-aware theme toggle
- **Chat history** — Persisted in browser localStorage
- **Mobile responsive** — Collapsible sidebar, touch-friendly UI

## Prerequisites

- [Node.js](https://nodejs.org/) 18.17 or later
- A [Google AI Studio](https://aistudio.google.com/) API key (Gemini)

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy the example env file and add your Gemini API key:

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```
GEMINI_API_KEY=your_actual_api_key_here
```

### 3. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build for production

```bash
npm run build
npm start
```

## Project Structure

```
src/
├── app/
│   ├── api/chat/route.ts   # Gemini API endpoint
│   ├── globals.css         # Tailwind + Atomic Pathshala theme
│   ├── layout.tsx          # Root layout with theme provider
│   └── page.tsx            # Main page
├── components/
│   ├── ChatApp.tsx         # Main app orchestrator
│   ├── ChatInput.tsx       # Text + image + camera input
│   ├── Sidebar.tsx         # Chat history sidebar
│   ├── MessageBubble.tsx   # Chat message UI
│   └── ...                 # Logo, theme, language, welcome screen
├── lib/
│   ├── gemini.ts           # Gemini client
│   ├── prompts.ts          # Language-aware system prompts
│   └── storage.ts          # localStorage helpers
└── types/
    └── chat.ts             # TypeScript types
```

## Usage Tips

1. Select your preferred language (English / Hindi / Hinglish) before asking
2. Upload an image or use the camera button on mobile for photo-based doubts
3. Chat history is saved automatically in your browser
4. Use "New Doubt" to start a fresh conversation

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **AI:** Google Gemini 2.5 Flash
- **Icons:** Lucide React
- **Theming:** next-themes

---

Built with ❤️ for **Atomic Pathshala** students.
