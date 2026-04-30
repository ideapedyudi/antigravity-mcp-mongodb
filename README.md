# Antigravity MongoDB MCP Server

MCP (Model Context Protocol) server that bridges AI assistants (like Gemini via Antigravity) with your MongoDB database. Supports two connection modes: **Stdio** (via file path) and **HTTP/SSE** (via `localhost:PORT`).

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

## Prerequisites

- **Node.js** v18+
- **MongoDB** instance (local or remote)
- **TypeScript** (installed automatically via `npm install`)

## Installation

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

# Mode: "stdio" (default) or "http" (backend service)
MCP_MODE=stdio

# Port for HTTP mode
PORT=3000
```

---

## Mode 1: Stdio (Default)

This mode is used when Antigravity **directly launches** the server as a subprocess via file path. No need to run the server separately.

Build the project first:

```bash
npm run build
```

### MCP Configuration in Antigravity

```json
{
  "mcpServers": {
    "mongodb-mcp": {
      "command": "node",
      "args": ["D:/ideapedyudi/antigravity-mcp-mongodb/dist/index.js"]
    }
  }
}
```

> **Note:** Adjust the `args` path to the location of the compiled `dist/index.js` on your computer (use forward slash `/` or double backslash `\\`).

---

## Mode 2: HTTP/SSE (Backend Service)

This mode is suitable if you want to run the server as a **background service** (including via Docker), and then the MCP client connects via `localhost` + port. No need to include the file path in the MCP configuration.

### Run Server

```bash
# Development (no build needed, uses tsx)
npm run dev:http

# Production (build first, then run compiled output)
npm run build
npm run start:http
```

The server will run at:
- `POST/GET/DELETE http://localhost:3000/mcp` → Main MCP endpoint (StreamableHTTP)
- `GET http://localhost:3000/health`           → Health check

### MCP Configuration in Antigravity (HTTP Mode)

```json
{
  "mcpServers": {
    "mongodb-mcp": {
      "serverURL": "http://localhost:3000/mcp"
    }
  }
}
```

> **Benefit of this mode:** No file path needed, can be accessed from anywhere (remote, Docker container, etc.), and the server stays alive independently.

---

## Mode Comparison

| | Stdio Mode | HTTP/SSE Mode |
|---|---|---|
| **Connection Method** | File path to `index.js` | URL `localhost:PORT` |
| **Server Lifecycle** | Managed by Antigravity | Managed by you |
| **Suitable for** | Simple local use | Backend service, Docker, remote |
| **Configuration** | `command` + `args` | `serverURL` |
