# Agenda Planner

A collaborative agenda planner — create time-slotted plans, share them via link, and collaborate with role-based permissions and comments.

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Backend | Go, chi router, raw SQL |
| Database | PostgreSQL 16 |
| Auth | Supabase (email/password + OAuth) |
| MCP Server | TypeScript, `@modelcontextprotocol/sdk` |

## Features

- Create and manage agendas with time-slotted items (date, start/end time, location, description)
- Week-strip navigation — dots indicate days with items
- Share agendas via token link with `view`, `comment`, or `edit` permission
- Role-based members: `viewer`, `commenter`, `editor`
- Inline comments on each agenda item
- MCP server — connect Claude or any MCP-compatible agent to manage agendas via tool calls

## Local Development

### Prerequisites

- Docker + Docker Compose
- Node.js 20+
- Go 1.22+

### Setup

```bash
git clone https://github.com/YOUR_USERNAME/agenda-planner.git
cd agenda-planner
cp .env.example .env
```

Edit `.env` with your Supabase credentials (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_JWT_SECRET`).

```bash
docker compose up
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8080

Migrations run automatically on first DB start.

## Database (Supabase)

To use Supabase as the database instead of local Docker PostgreSQL:

1. Supabase Dashboard → SQL Editor → run `infra/migrations/001_init.sql`
2. Set `DATABASE_URL` to your Supabase connection string:
   ```
   postgresql://postgres:[PASSWORD]@db.your-project.supabase.co:5432/postgres?sslmode=require
   ```

## MCP Server

Lets Claude (or any MCP-compatible agent) manage agendas via tool calls.

**Tools:** `list_agendas`, `create_agenda`, `get_agenda`, `create_item`, `update_item`, `delete_item`, `list_comments`, `create_comment`, `delete_comment`

```bash
cd mcp && npm install
SUPABASE_URL=... SUPABASE_ANON_KEY=... SUPABASE_EMAIL=... SUPABASE_PASSWORD=... npx tsx scripts/get-token.ts
```

Add to `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "agenda-planner": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/mcp/src/index.ts"],
      "env": {
        "AGENDA_API_URL": "http://localhost:8080",
        "SUPABASE_URL": "https://your-project.supabase.co",
        "SUPABASE_ANON_KEY": "your-anon-key",
        "SUPABASE_REFRESH_TOKEN": "your-refresh-token"
      }
    }
  }
}
```

## Deployment

### Backend → Railway

1. New project on [railway.app](https://railway.app), deploy from GitHub, root directory `backend/`
2. Set env vars: `DATABASE_URL`, `SUPABASE_JWT_SECRET`, `PORT=8080`

### Frontend → Vercel

1. Import repo on [vercel.com](https://vercel.com), root directory `frontend/`
2. Set env vars: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Project Structure

```
├── backend/              # Go REST API
│   ├── cmd/api/          # Entry point
│   └── internal/
│       ├── handlers/     # HTTP handlers
│       ├── middleware/   # JWT auth
│       ├── models/       # Domain structs + DTOs
│       └── db/           # Connection pool
├── frontend/             # Next.js app
│   ├── app/              # App Router pages
│   ├── components/       # WeekStrip, CommentThread, ShareModal, TopNav
│   └── lib/              # API client, Supabase client
├── mcp/                  # MCP server
│   ├── src/              # index.ts + api-client.ts
│   └── scripts/          # get-token.ts
├── infra/migrations/     # SQL schema
└── docker-compose.yml
```

## API

All endpoints require `Authorization: Bearer <supabase_jwt>` except `/share/:token`.

| Method | Path | Description |
|---|---|---|
| `POST` | `/auth/sync` | Upsert Supabase user |
| `GET` | `/agendas` | List your agendas |
| `POST` | `/agendas` | Create agenda |
| `GET` | `/agendas/:id` | Get agenda with items |
| `PATCH` | `/agendas/:id` | Update agenda |
| `DELETE` | `/agendas/:id` | Delete agenda (owner only) |
| `POST` | `/agendas/:id/items` | Add item |
| `PATCH` | `/agendas/:id/items/:itemId` | Update item |
| `DELETE` | `/agendas/:id/items/:itemId` | Delete item |
| `POST` | `/agendas/:id/share` | Create share token |
| `GET` | `/share/:token` | Resolve share (no auth) |
| `GET` | `/agendas/:id/members` | List members |
| `PATCH` | `/agendas/:id/members/:userId` | Update member role |
| `GET` | `/items/:itemId/comments` | List comments |
| `POST` | `/items/:itemId/comments` | Add comment |
| `DELETE` | `/comments/:commentId` | Delete comment |
