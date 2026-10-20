<p align="center">
  <img src="docs/assets/readme-banner.svg" alt="DEEMO — Practice your defense. Find your confidence. Featuring the Deemo owl mascot." width="100%" />
</p>

<p align="center">
  <strong>A voice-based AI mock panel for research defense practice.</strong><br />
  Upload your manuscript. Rehearse with a panel. Turn feedback into your next improvement.
</p>

<p align="center">
  <a href="https://github.com/fersonull/deemo/releases">Releases</a> ·
  <a href="docs/RELEASE_NOTES.md">Release notes</a> ·
  <a href="#getting-started">Getting started</a> ·
  <a href="https://github.com/fersonull/deemo/issues">Report an issue</a>
</p>

## About

DEEMO helps students rehearse Title, Pre-Oral and Final research defenses. The AI panel reads the manuscript, asks questions out loud, challenges inconsistencies and provides rubric-based readiness feedback after practice.

The app accepts manuscripts from any course. It was built for a capstone study with fourth-year BSIT students at PMFTCI; evaluation claims are limited to that study population.

**Android · English · Online · Ages 18+**

DEEMO is a practice tool. It does not replace advisers, panelists or their professional judgment. Release packaging, device acceptance checks and deployment verification are still in progress.

## Features

- **Manuscript-aware practice** — upload PDF or DOCX files, review editable summaries and get questions adapted to your research field and defense stage.
- **A panel with distinct voices** — practice with up to three illustrated AI panelists who question in sequence and share the conversation context.
- **Agenda-based sessions** — cover the stage's research topics with adjustable difficulty and follow-up limits, spoken or typed answers, live transcripts and pause/resume controls.
- **Consistency challenges** — the panel can challenge significant differences between your answers and manuscript, with contradictions included in the report.
- **Actionable reports** — review readiness scores, priority fixes, topic coverage and per-question feedback; practice weak topics in another round.
- **Custom rubrics** — adjust the default weights or upload your panel's own rubric as a PDF, DOCX or photo.
- **Group projects** — join by code, share analysis and rubrics, set individual focus areas and optionally share scores with the group.
- **Progress tracking** — follow your Defense Path, inspect readiness trends and filter or sort your practice history.
- **Account and data controls** — email or Google sign-in, course and avatar settings, consent, JSON data export and account deletion.
- **Notices and administration** — student inbox, announcements and a web admin for users, sessions, groups, notices and audit records. Background push delivery still needs device verification.

### Free and Premium demo

| | Free | Premium demo |
|---|---|---|
| Manuscripts | One, including joined projects | Unlimited |
| Practice starts | Five per Philippine calendar day | Unlimited |
| Defense stages | Title and Pre-Oral | All three stages |
| Panelists | One | Up to three |
| Session safety cap | 30 minutes | 60 minutes |
| Score, fixes, contradictions and transcript | Included | Included |
| Full rubric breakdown, delivery statistics and stronger sample answers | — | Included |
| PDF report export | — | Included |

Premium is simulated for the project. No real payments are collected and nothing renews.

## Architecture

The Android app uses Firebase for sign-in and the DEEMO server for application data. Live audio travels directly between the phone and Gemini Live using a temporary token issued by the server.

```text
Android app ── authentication ── Firebase Auth
     │
     ├── HTTPS ── DEEMO server ── PostgreSQL
     │                 └── Gemini: analysis, rubric reading and scoring
     │
     └── Direct WSS ── Gemini Live: panel conversation

Web admin ── authenticated HTTPS ── DEEMO server
```

AI keys stay on the server. Raw audio is not stored, and raw manuscript uploads are discarded after extraction. Readiness arithmetic runs in code; the model supplies rubric levels and feedback.

| Component | Stack |
|---|---|
| Android app | Expo SDK 57, React Native, Expo Router, TypeScript |
| API | Bun, Express, Zod |
| Database | PostgreSQL, Prisma 7 |
| Authentication and push | Firebase Auth, Firebase Cloud Messaging |
| AI | Gemini Live and Gemini Flash fallback chain |
| Web admin | Next.js 16, Tailwind CSS, shadcn/ui |
| Marketing site | Vite, TypeScript, GSAP, three.js, Lenis |
| Promo video | Remotion, ElevenLabs |

## Repository layout

```text
client/
  mobile/Deemo/       Android app
  web/admin/          Admin dashboard
  web/site/           Public marketing site
  web/presentation/   Interactive defense presentation
  promo/              Remotion promo video
server/               API, Prisma schema and migrations
docs/                 Plans, handoff, release notes and design references
```

## Getting started

### Prerequisites

- Bun and Git.
- A PostgreSQL database.
- A Firebase project with email/password and Google sign-in configured.
- A Gemini API key on the **paid tier** before using real student manuscripts.
- An Android device or emulator with a compatible DEEMO development build, and ADB for the USB connection below.

Expo Go cannot run the app's native Firebase and raw-audio streaming modules. Native builds also require the appropriate Firebase Android configuration and signing setup.

### 1. Clone the repository

```bash
git clone https://github.com/fersonull/deemo.git
cd deemo
```

Each application has its own dependencies. Run `bun install` inside the application you want to use.

### 2. Configure and run the server

```bash
cd server
bun install
```

Copy `server/.env.example` to `server/.env` and fill in:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `FIREBASE_SERVICE_ACCOUNT` | Service-account JSON file path, or its JSON on a deployed host |
| `GEMINI_API_KEY` | Server-side Gemini API key |
| `PORT` | API port; defaults to `3000` |
| `ADMIN_ORIGINS` | Additional allowed web-admin origins; local `http://localhost:3001` is already allowed |

From `server/`, apply migrations to your development database and start the API:

```bash
bun run db:migrate
bun run dev
```

Use `bun run db:deploy` to apply existing migrations in a deployment. Keep service-account files, database credentials and API keys out of version control.

### 3. Run the Android app

In another terminal, from the repository root:

```bash
cd client/mobile/Deemo
bun install
```

Place your Firebase Android app's `google-services.json` in this directory. Use the same Firebase project as the server and configure the signing fingerprints required for Google sign-in.

With a compatible development build installed and an Android device connected:

```bash
adb reverse tcp:3000 tcp:3000
bun start
```

The app defaults to `http://localhost:3000`. For a Wi-Fi device or hosted API, create `client/mobile/Deemo/.env.local`:

```dotenv
EXPO_PUBLIC_API_URL=https://your-api.example.com
```

For UI work with a scripted panel, also set `EXPO_PUBLIC_LIVE_ENGINE=mock`. This replaces the live panel engine; signed-in screens can still need the server. Restart Metro after changing environment variables. Release bundles require an explicit HTTPS API URL.

### Optional: web projects

- **Admin:** install dependencies in `client/web/admin/`, copy `.env.example` to `.env.local`, and configure the API URL and Firebase Web app values. Run `bun run dev` for port `3001`. Grant your first admin from `server/` with `bun scripts/set-admin.ts <email>`.
- **Marketing site:** follow its [setup guide](client/web/site/README.md); run `bun run dev` for port `5056`.
- **Presentation:** serve `client/web/presentation/` with a local static HTTP server.
- **Promo video:** follow the [Remotion guide](client/promo/README.md) for previewing, audio generation and rendering.

## Development checks

From `server/`:

```bash
bunx tsc --noEmit
bun test src
```

From `client/mobile/Deemo/`:

```bash
bunx tsc --noEmit
bunx expo lint
bun test src
bunx expo-doctor
```

Use `bunx expo install <package>` for mobile dependencies so versions match the Expo SDK. Native module or config-plugin changes require a new development build; JavaScript-only changes reload through Metro.

## Documentation

- [Release notes](docs/RELEASE_NOTES.md)
- [Current state and next steps](docs/HANDOFF.md)
- [Task backlog](docs/TASKS.md)
- [Mobile app plan](docs/DEEMO_Mobile_App_Plan.md)
- [Architecture and live-session addendum](docs/DEEMO_Plan_Addendum.md) — overrides the original plan's architecture sections.
- [Admin notices and acceptance checks](docs/ADMIN_NOTICES.md)
- [Design system](docs/DEEMO_DESIGN_SYSTEM.md)

## Contributing

Open an issue to report a bug or discuss a change. Include reproduction steps, Android version and relevant logs, with credentials, manuscript content and student information removed.

Read [AGENTS.md](AGENTS.md) and the instructions in the component you are changing. Small changes go on `dev`; risky changes use a feature branch based on `dev`. Update the handoff and task list with your changes, and run the relevant checks before submitting a pull request.

## License

Licensed under the [MIT License](LICENSE). Third-party dependencies and bundled assets retain their respective licenses.
