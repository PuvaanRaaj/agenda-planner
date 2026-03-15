# Member Management Design

**Goal:** Let agenda owners view, add, remove, and change the role of members directly from the Share modal.

**Architecture:** Expand the existing `ShareModal.tsx` with a two-tab layout (Link / Members). Two new backend endpoints handle add and remove. No email invitations — the person must already have an account.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, Go/chi, PostgreSQL

---

## Files

- **Modify:** `backend/internal/models/models.go` — add `AddMemberRequest` DTO
- **Modify:** `backend/internal/handlers/share.go` — add `AddMember` and `RemoveMember` handlers
- **Modify:** `backend/cmd/api/main.go` — register the two new routes
- **Modify:** `frontend/lib/api.ts` — add `shareApi.addMember` and `shareApi.removeMember`
- **Modify:** `frontend/components/ShareModal.tsx` — add tabs, Members tab UI

---

## Backend

### New DTO (`models.go`)

```go
type AddMemberRequest struct {
    Email string `json:"email"`
    Role  string `json:"role"`
}
```

### New endpoints

```
POST   /agendas/{id}/members          AddMember    (owner only)
DELETE /agendas/{id}/members/{userId} RemoveMember (owner only)
```

Both use the same owner-only guard already present in `UpdateMember`.

### `POST /agendas/{id}/members`

Request body:
```json
{ "email": "user@example.com", "role": "viewer" }
```

Logic:
1. Verify caller is owner (same guard as `UpdateMember`)
2. Validate `role` is one of `viewer | commenter | editor` → 400 `"role must be viewer, commenter, or editor"` (same message as `UpdateMember`)
3. Look up user by email in `users` table → 404 `user_not_found` if missing
4. Reject if looked-up `user_id == owner_id` → 400 `cannot_add_owner`
5. Insert into `agenda_members(agenda_id, user_id, role)` → 409 `already_member` on unique conflict
6. Return the new `AgendaMember` row (joined with email/name from users) with 201

### `DELETE /agendas/{id}/members/{userId}`

Logic:
1. Verify caller is owner
2. Delete from `agenda_members` where `agenda_id=$1 AND user_id=$2`
3. Return 204 No Content (idempotent — no error if row didn't exist)

Note: the owner is never stored in `agenda_members` (ownership lives in `agendas.owner_id`), so no extra owner-ID guard is needed here. A DELETE on the owner's user ID will simply affect 0 rows and return 204, which is the correct idempotent behaviour.

---

## Frontend — `lib/api.ts`

Two new methods on `shareApi`:

```typescript
addMember: (agendaId: string, body: { email: string; role: string }, token: string) =>
  api<AgendaMember>(`/agendas/${agendaId}/members`, { method: 'POST', body: JSON.stringify(body), token }),

removeMember: (agendaId: string, userId: string, token: string) =>
  api<void>(`/agendas/${agendaId}/members/${userId}`, { method: 'DELETE', token }),
```

---

## Frontend — `ShareModal.tsx`

### Tab layout

Two tabs rendered at the top of the modal: **Link** and **Members**. Default tab is **Link** (preserves existing behaviour). Tab state is local to the modal (`useState`).

### Link tab

Unchanged from today.

### Members tab

**On first tab switch:** call `shareApi.members(agendaId, token)` to load the list. Show a spinner while loading. Subsequent tab switches use the already-loaded list (no re-fetch unless an add/remove mutates it).

**Member list:**
- Owner row at top: name/email + "Owner" badge (non-removable, no role dropdown)
- Each member row: email + role dropdown (`viewer` | `commenter` | `editor`) + remove (×) button
- Role dropdown calls `shareApi.updateMember` on change; shows loading state on the row
- Remove button calls `shareApi.removeMember`; removes row from local state on success
- Inline error per row if the API call fails

**Add member form (below list):**
- Email input (type="email") + role dropdown (default: `viewer`) + "Add" button
- On submit: calls `shareApi.addMember`; prepends new member to list on success; clears form
- Inline error below form: catch the thrown `Error` and check `err.message` exactly:
  - `'user_not_found'` → "No account found with that email."
  - `'already_member'` → "Already a member."
  - `'cannot_add_owner'` → "You are already the owner of this agenda."
  - anything else → display `err.message` directly as a generic fallback

### Error handling

| Scenario | How to detect | UI |
|---|---|---|
| List load fails | any thrown error | "Could not load members." with a Retry link |
| Add — email not found | `err.message === 'user_not_found'` | "No account found with that email." |
| Add — already a member | `err.message === 'already_member'` | "Already a member." |
| Add — own email | `err.message === 'cannot_add_owner'` | "You are already the owner of this agenda." |
| Add — other error | fallthrough | show `err.message` |
| Role change fails | any thrown error | Reverts dropdown to previous value + inline error |
| Remove fails | any thrown error | Keeps row in list + inline error |

---

## Out of scope

- Email invitations to non-users
- Bulk operations
- Member pagination (agendas are not expected to have hundreds of members)
- Transfer of ownership
