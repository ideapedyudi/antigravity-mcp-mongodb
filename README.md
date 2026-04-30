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

# Port for the MCP HTTP server
PORT=3000
```

---

## Running the Server

This MCP server runs as a **background service** (including via Docker), and the MCP client connects via `localhost` + port. No need to include the file path in the MCP configuration.

### Run Server

```bash
# Development (no build needed, uses tsx)
npm run dev

# Production (build first, then run compiled output)
npm run build
npm run start
```

The server will run at:
- `POST/GET/DELETE http://localhost:3000/mcp` → Main MCP endpoint (StreamableHTTP)
- `GET http://localhost:3000/health`           → Health check

### MCP Configuration in Antigravity

```json
{
  "mcpServers": {
    "mongodb-mcp": {
      "serverURL": "http://localhost:3000/mcp"
    }
  }
}
```

> **Benefit:** No file path needed, can be accessed from anywhere (remote, Docker container, etc.), and the server stays alive independently.
