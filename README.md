# Antigravity MongoDB MCP Server

MCP (Model Context Protocol) server that bridges AI assistants (like Gemini via Antigravity) with your MongoDB database. Supports connection via **HTTP/SSE** (`localhost:PORT`).

## Features

Tools available for AI:

| Tool | Description |
|---|---|
| `list_databases` | List all databases in MongoDB |
| `list_collections` | List collections within a database |
| `query_mongodb` | Find documents using MongoDB query |
| `insert_one` | Insert a new document into a collection |
| `update_one` | Update a document based on a filter |
| `delete_one` | Delete a document based on a filter |
| `aggregate` | Run an aggregation pipeline |

---

## 🐳 Running with Docker (Recommended)

This is the easiest and most portable way to run the server — no need to install Node.js or MongoDB manually.

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running

### Option A: Docker Compose (Server + MongoDB bundled)

This runs both the MCP server and a MongoDB instance together. Perfect if you don't have a MongoDB yet.

**1. Clone the repository:**

```bash
git clone https://github.com/your-username/antigravity-mcp-mongodb.git
cd antigravity-mcp-mongodb
```

**2. (Optional) Create a `.env` file** to customize settings. If you skip this, the defaults will be used:

```bash
cp .env.example .env
```

```env
# Leave MONGO_URI as-is if using the bundled MongoDB service in Docker Compose
MONGO_URI=mongodb://mongodb:27017

# Port for the MCP HTTP server
PORT=3000
```

**3. Build and run all services:**

```bash
docker compose up --build -d
```

- `--build` — forces a fresh image build from the Dockerfile
- `-d` — runs in detached (background) mode

**4. Verify it's running:**

```bash
# Check container status
docker compose ps

# Check server logs
docker compose logs -f mcp-server

# Test health endpoint
curl http://localhost:3000/health
```

**5. Stop all services:**

```bash
docker compose down
```

> To also remove the MongoDB data volume (⚠️ this deletes all data!):
> ```bash
> docker compose down -v
> ```

---

### Option B: Docker Only (with your own MongoDB)

Use this if you already have a MongoDB instance (local, Atlas, or remote).

**1. Build the Docker image:**

```bash
docker build -t antigravity-mcp-server .
```

**2. Run the container:**

```bash
docker run -d \
  --name antigravity-mcp-server \
  -p 3000:3000 \
  -e MONGO_URI="mongodb://host.docker.internal:27017" \
  -e PORT=3000 \
  --restart unless-stopped \
  antigravity-mcp-server
```

> ⚠️ **Note:** Use `host.docker.internal` instead of `localhost` to reach MongoDB running on your host machine (Windows/Mac). On Linux, use `--network host` instead.

**3. Stop and remove the container:**

```bash
docker stop antigravity-mcp-server
docker rm antigravity-mcp-server
```

---

### Useful Docker Commands

| Command | Description |
|---|---|
| `docker compose up --build -d` | Build image and start all services in background |
| `docker compose down` | Stop and remove all containers |
| `docker compose logs -f mcp-server` | Stream live logs from the MCP server |
| `docker compose restart mcp-server` | Restart only the MCP server container |
| `docker build -t antigravity-mcp-server .` | Build the Docker image manually |
| `docker images` | List all locally built/downloaded images |
| `docker ps` | List all running containers |

---

## 💻 Running Locally (without Docker)

### Prerequisites

- **Node.js** v18+
- **MongoDB** instance (local or remote)
- **TypeScript** (installed automatically via `npm install`)

### Installation

```bash
npm install
```

Build the TypeScript source:

```bash
npm run build
```

Create a `.env` file in the root directory (you can copy `.env.example`):

```bash
cp .env.example .env
```

Or manually create `.env` with:

```env
# MongoDB Connection
MONGO_URI=mongodb://localhost:27017

# Port for the MCP HTTP server
PORT=3000
```

### Run Server

```bash
# Development (no build needed, uses tsx)
npm run dev

# Production (build first, then run compiled output)
npm run build && npm run start
```

---

## 🔌 MCP Configuration in Antigravity

Regardless of how you run the server (Docker or local), add this to your Antigravity MCP configuration:

```json
{
  "mcpServers": {
    "mongodb-mcp": {
      "serverURL": "http://localhost:3000/mcp"
    }
  }
}
```

The server exposes:
- `POST/GET/DELETE http://localhost:3000/mcp` → Main MCP endpoint (StreamableHTTP)
- `GET http://localhost:3000/health`           → Health check

> **Benefit:** No file path needed, can be accessed from anywhere (remote, Docker container, etc.), and the server stays alive independently.
