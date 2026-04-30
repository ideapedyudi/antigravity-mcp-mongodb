# Gemini MongoDB MCP Server

This is a Model Context Protocol (MCP) server that provides a bridge between AI assistants (like Gemini via Antigravity) and your MongoDB databases. It allows the AI to securely and effectively interact with your MongoDB instance.

## Features

This MCP server provides the following tools to the AI:

- `list_databases`: Get a list of all databases available in the MongoDB instance.
- `list_collections`: List all collections within a specific database.
- `query_mongodb`: Find documents in a collection using standard MongoDB queries.
- `insert_one`: Insert a new document into a collection.
- `update_one`: Update an existing document based on a filter.
- `delete_one`: Delete a document based on a filter.
- `aggregate`: Run a MongoDB aggregation pipeline for complex data processing.

## Prerequisites

- **Node.js** (v18 or higher recommended)
- **MongoDB** instance running locally or remotely.

## Installation

1. Clone or download this repository.
2. Install the dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory and add your MongoDB connection string:
   ```env
   MONGO_URI="mongodb://your-username:your-password@your-host:your-port/your-database"
   ```
   *If you don't provide a `.env` file, it will default to `mongodb://localhost:27017`.*

## Usage in Antigravity

To use this MCP server in Antigravity, you need to configure it in your Antigravity MCP settings.

1. Open your Antigravity configuration file for MCP servers.
2. Add the following configuration block:

```json
{
  "mcpServers": {
    "mongodb-mcp": {
      "command": "node",
      "args": [
        "path_file_to_indexjs"
      ]
    }
  }
}
```

*Note: Make sure to adjust the path in `args` if your project directory is located elsewhere.*

Once configured, Antigravity will automatically launch this server when you start a conversation, giving Gemini the ability to read and write to your MongoDB databases directly!
