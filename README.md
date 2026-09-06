# SAO Messenger — Backend

NestJS + Prisma + PostgreSQL + Socket.io backend for the SAO messenger (1v1 chat, auth, profiles, avatars, search).

## Stack
- NestJS 12, TypeScript
- PostgreSQL + Prisma 7
- Socket.io (namespace `/ws`) for realtime chat
- JWT — **access token only** (no refresh token / no token rotation)
- argon2 password hashing
- Cloudinary for avatar storage (no local disk uploads)

## Setup

```bash
npm install
cp .env.example .env
# edit .env: set DATABASE_URL, JWT_ACCESS_SECRET, and Cloudinary credentials

npx prisma migrate dev --name init
npm run start:dev
```

Get Cloudinary credentials (cloud name, API key, API secret) from your Cloudinary dashboard → they go into `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.

API base: `http://localhost:3000/api`
WebSocket: `ws://localhost:3000/ws` (send JWT access token as `auth: { token }` on connect)

## Auth model
- `POST /api/auth/register` and `POST /api/auth/login` return `{ user, accessToken }` — that's it, no refresh token.
- Token lifetime is controlled by `JWT_ACCESS_EXPIRES_IN` (default `7d`). When it expires, the client just logs in again.
- `POST /api/auth/logout` marks the user offline; since there's no refresh-token store, this doesn't revoke the JWT itself (it's stateless) — it naturally expires per `JWT_ACCESS_EXPIRES_IN`.

## REST endpoints

**Auth**
- `POST /api/auth/register` — { email, username, password, displayName? }
- `POST /api/auth/login` — { login, password } (login = email or username)
- `POST /api/auth/logout` — (Bearer access token)

**Users**
- `GET /api/users/me`
- `PATCH /api/users/me` — { displayName?, bio?, username? }
- `PATCH /api/users/me/password` — { currentPassword, newPassword }
- `PATCH /api/users/me/avatar` — multipart/form-data, field `avatar` → uploaded straight to Cloudinary, `avatarUrl` saved as the returned `secure_url`
- `GET /api/users/search?q=...&saveHistory=true`
- `GET /api/users/search/history`
- `DELETE /api/users/search/history` / `DELETE /api/users/search/history/:id`

**Chats**
- `GET /api/chats` — list of chats with last message
- `POST /api/chats` — { targetUserId } → get or create a 1v1 chat
- `GET /api/chats/:id`

**Messages**
- `GET /api/chats/:chatId/messages?cursor=&limit=`
- `POST /api/chats/:chatId/messages` — { text } (REST fallback; prefer socket for realtime)
- `POST /api/chats/:chatId/read`
- `PATCH /api/messages/:id` — { text }
- `DELETE /api/messages/:id` — soft delete

All routes above (except register/login) require `Authorization: Bearer <accessToken>`.

## WebSocket events (namespace `/ws`)

Connect with:
```js
io('http://localhost:3000/ws', { auth: { token: accessToken } })
```

Client → Server:
- `chat:join` `{ chatId }`
- `chat:leave` `{ chatId }`
- `message:send` `{ chatId, text }`
- `message:update` `{ messageId, text }`
- `message:delete` `{ messageId }`
- `chat:read` `{ chatId }`
- `typing:start` / `typing:stop` `{ chatId }`

Server → Client (broadcast to chat room):
- `message:new`, `message:update`, `message:delete`, `chat:read`
- `typing:start`, `typing:stop`
- `user:online`, `user:offline` (global)

## Notes
- 1v1 chats are deduplicated: calling `POST /api/chats` twice with the same `targetUserId` returns the same chat.
- Messages are soft-deleted (`deletedAt` set, text cleared) rather than removed from the DB.
- Avatars go straight to Cloudinary (folder `sao-messenger/avatars`, auto-cropped to 512x512 face-centered) — nothing is written to local disk.
