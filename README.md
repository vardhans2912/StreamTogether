# StreamTogether

A real-time Watch Party web application with synchronized video playback, chat, and screen sharing using microservices architecture.

## 📦 Tech Stack

- **Frontend:** React, TailwindCSS, Vite
- **Backend:** Spring Boot (microservices)
- **Discovery Server:** Eureka
- **Realtime:** STOMP over WebSocket — playback sync, chat and presence on per-room topics
- **Authentication:** JWT (OAuth 2.0 / Firebase in a later phase)
- **Streaming:** WebRTC (later phase)

## ⚡ How sync works

Every client holds one WebSocket to the realtime hub (`stream-service`), reached through the
gateway at `/media-service/ws`. The host's play/pause/seek is published to
`/app/rooms/{roomId}/state`; the server verifies the sender is the host, persists the room's
single authoritative playback state, then broadcasts the persisted state on
`/topic/rooms/{roomId}/state` — so every client, host included, converges on the same row in
well under a second. The same connection delivers live chat and presence. If the socket can't
be established the Room page falls back to periodic refresh, so a blocked upgrade costs
latency rather than function.

## 📁 Project Structure

```
/StreamTogether
├── backend/
│   ├── discovery-service/   # Eureka registry      :8761
│   ├── gateway-service/     # Spring Cloud Gateway :8080 (see note below)
│   ├── auth-service/        # register / login     :8081  auth_db
│   ├── room-service/        # rooms, participants  :8082  room_db
│   ├── chat-service/        # chat messages        :8083  chat_db
│   ├── stream-service/      # media, playback state, realtime hub :8084  media_db
│   └── user-service/        # profiles             :8085  user_db
└── frontend/
    └── streamtogether-fe/   # React + Vite SPA     :5173
```

> `stream-service` registers with Eureka as **`MEDIA-SERVICE`**, so the SPA addresses it as
> `/media-service/...`. That is deliberate, not a typo.

## 🚀 Getting Started

### Just the UI (no backend needed)

The SPA ships with a complete in-memory mock backend, which is the fastest way to see it work:

```bash
cd frontend/streamtogether-fe
npm install
npm run dev                  # http://localhost:5173
```

Set `VITE_USE_MOCK=true` in `.env` first — the committed `.env` sets it to `false`, which points
the app at a real gateway.

Open the same room in two tabs and playback, chat and the media queue sync across them via
`BroadcastChannel`. (Live presence is real-backend only — it needs actual socket sessions to
track.) Everything below is only needed for the real distributed stack.

### Prerequisites

| Need | Version | Notes |
|---|---|---|
| JDK | **21** | Running under 17 fails with `release version 21 not supported` / `UnsupportedClassVersionError`. |
| Maven | — | Use the bundled wrapper (`./mvnw`); nothing to install. |
| Node | 20.19+ or 22.12+ | Vite 7 requirement. |
| MySQL | 8 | Local, or Docker (below). |

### 1. Database

Five databases, one per service — no shared tables. Flyway creates the *schemas* on startup,
but the databases themselves must exist first:

```bash
# Optional: MySQL in Docker
docker run -d --name streamtogether-mysql \
  -e MYSQL_ROOT_PASSWORD=password -p 3306:3306 mysql:8.0

mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS auth_db;
                     CREATE DATABASE IF NOT EXISTS user_db;
                     CREATE DATABASE IF NOT EXISTS room_db;
                     CREATE DATABASE IF NOT EXISTS chat_db;
                     CREATE DATABASE IF NOT EXISTS media_db;"
```

All services connect as `root` to `localhost:3306`.

### 2. Environment variables

Export these in **every** terminal that starts a service (see `backend/auth-service/.env.example`):

```bash
export DB_PASSWORD="your_mysql_password"
export JWT_SECRET="$(openssl rand -base64 64)"    # must be the SAME for all services
```

`JWT_SECRET` is what lets a token minted by auth-service be verified by every other service —
if it differs between two services, cross-service auth fails with 401s.

Optional overrides:

| Variable | Default | When you need it |
|---|---|---|
| `SERVER_PORT` | per-service | Free up a clashing port. |
| `GATEWAY_URL` | `http://localhost:8080` | **Must match the gateway's real port** — see the note below. |
| `REALTIME_ALLOWED_ORIGINS` | `http://localhost:5173` | stream-service only — origins allowed to open the WebSocket handshake (comma-separated). |

### 3. Start the backend, in this order

Eureka must be up first — services register on boot, and the gateway routes by looking them up.
One terminal each:

```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 21)   # macOS, if 21 isn't your default JDK
cd backend/<service> && ./mvnw spring-boot:run
```

1. `discovery-service`
2. `gateway-service`
3. `auth-service`, `user-service`, `room-service`, `chat-service`, `stream-service` (any order)

### 4. Frontend

```bash
cd frontend/streamtogether-fe
npm install
npm run dev
```

`.env` should point at the gateway:

```
VITE_USE_MOCK=false
VITE_API_BASE_URL=http://localhost:8888
```

`VITE_WS_URL` is optional — the realtime socket defaults to `VITE_API_BASE_URL` over `ws://`
at `/media-service/ws`.

> ### ⚠️ The gateway port trap
> `gateway-service` defaults to **8080**, but the committed frontend `.env` expects **8888**
> (8080 was occupied on the original dev machine). Pick one and be consistent:
>
> ```bash
> # Option A — run the gateway on 8888 to match the committed .env
> SERVER_PORT=8888 GATEWAY_URL=http://localhost:8888 ./mvnw spring-boot:run
>
> # Option B — keep 8080 and change VITE_API_BASE_URL to http://localhost:8080
> ```
>
> Note `GATEWAY_URL` in **Option A**: services call each other *through* the gateway, so if it
> still points at 8080 those calls fail. They're all best-effort, so nothing crashes — it
> degrades quietly instead: display names fall back to usernames, chat messages save but
> aren't pushed live, and playback host-verification falls open. Worth getting right.

### 5. Check it actually came up

```bash
curl http://localhost:8761/eureka/apps            # expect 6 apps UP (incl. MEDIA-SERVICE)
curl http://localhost:8888/auth-service/auth/login # expect 4xx, not a connection refused
```

In the app: open a room in two browsers. The player strip shows a mint **“Live”** badge when
the WebSocket is connected — if it says **“Reconnecting…”**, realtime is down and the room has
fallen back to polling (still works, just seconds behind instead of instant).

### Running the tests

```bash
cd backend/stream-service
export JAVA_HOME=$(/usr/libexec/java_home -v 21)
./mvnw test -Dtest='PresenceServiceTest,StompAuthChannelInterceptorTest,RoomAuthorizationServiceTest'
```

These cover the realtime layer (socket auth, presence, host authorization) and need no database.
A bare `./mvnw test` also runs the default `contextLoads` tests, which require MySQL.

## 📚 More detail

- **`PROJECT_REPORT.md`** — full architecture, service-by-service design, schema, security,
  sequence flows, and an honest limitations section.
- **`PRESENTATION_BRIEF.md`** — condensed talking points and demo script.
- **`DESIGN.md`** — the design system (colors, typography, components).
- **`CONTRIBUTE.md`** — branching and PR workflow.
