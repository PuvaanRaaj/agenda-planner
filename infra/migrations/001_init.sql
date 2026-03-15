-- Users (mirrored from Supabase Auth)
CREATE TABLE users (
  id         UUID PRIMARY KEY,
  email      TEXT NOT NULL UNIQUE,
  name       TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agendas
CREATE TABLE agendas (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  visibility  TEXT CHECK (visibility IN ('public', 'restricted', 'private')) DEFAULT 'private',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Agenda Items
CREATE TABLE agenda_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agenda_id   UUID REFERENCES agendas(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  location    TEXT,
  date        DATE NOT NULL,
  start_time  TIME NOT NULL,
  end_time    TIME,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Share Tokens
CREATE TABLE share_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agenda_id  UUID REFERENCES agendas(id) ON DELETE CASCADE,
  token      TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::TEXT,
  permission TEXT CHECK (permission IN ('view', 'comment', 'edit')) DEFAULT 'view',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agenda Members (explicit per-user permissions)
CREATE TABLE agenda_members (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agenda_id  UUID REFERENCES agendas(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  role       TEXT CHECK (role IN ('viewer', 'commenter', 'editor')) DEFAULT 'viewer',
  UNIQUE(agenda_id, user_id)
);

-- Comments (user_id NULL for anonymous share-token commenters)
CREATE TABLE comments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id    UUID REFERENCES agenda_items(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  body       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
