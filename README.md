# Family Tree

A responsive web app for building and exploring family trees. Sign up with email/password
or Google, complete a short onboarding (you → parents → grandparents), then grow your tree
on a pannable / zoomable canvas where each person is a card connected by 90° lines.

## Stack

- **Next.js 15** (App Router) + **React 19**
- **PostgreSQL** via **Prisma** (hosted on Neon)
- **NextAuth v4** — Google + email/password (Credentials, bcrypt)
- **@xyflow/react** (React Flow) canvas with `@dagrejs/dagre` auto-layout
- **Tailwind v4** + **next-themes** — Notion-style UI, forest-green accent, dark/light

## Setup

1. Install deps:

   ```bash
   npm install
   ```

2. Create the env files (see `.env.example`):

   - `.env` — `DATABASE_URL` (your Neon connection string; used by Prisma)
   - `.env.local` — `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, and optional `GOOGLE_CLIENT_ID` /
     `GOOGLE_CLIENT_SECRET` (leave Google blank to hide the Google buttons)

   Generate a secret with `openssl rand -base64 32`.

3. Apply the schema:

   ```bash
   npx prisma migrate dev --name init
   ```

4. Run it:

   ```bash
   npm run dev
   ```

   Open http://localhost:3000.

## Useful commands

```bash
npm run dev          # dev server
npm run build        # production build
npm run lint         # eslint
npx prisma studio    # inspect the database
npx prisma migrate dev --name <name>   # create + apply a migration
```

## Data model (Prisma)

- `User` / `Account` / `Session` / `VerificationToken` — NextAuth (Prisma adapter)
- `Tree` — one per user (`selfPersonId` points at the user's own card)
- `Person` — name, sex, birth/death, place, persisted canvas `positionX/Y`
- `ParentChild` — directed parent→child edges (source of truth; siblings are derived)
- `Partnership` — couples, used to draw the spouse connector and group co-parents

Adding relatives from a card's **+** menu:

- **Parent** → new person linked as a parent; pairs with an existing parent if present
- **Sibling** → new person sharing the card's parents
- **Child** → new person linked as a child of the card (and its partner, if any)
