const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { StreamableHTTPServerTransport } = require("@modelcontextprotocol/sdk/server/streamableHttp.js");
const { isInitializeRequest } = require("@modelcontextprotocol/sdk/types.js");
const { CallToolRequestSchema, ListToolsRequestSchema } = require("@modelcontextprotocol/sdk/types.js");
const { MongoClient } = require("mongodb");
const { randomUUID } = require("crypto");
const express = require("express");
require("dotenv").config();

// ==========================
// CONFIGURATION
// ==========================
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017";
const PORT = process.env.PORT || 3000;

// Mode: "stdio" (default, Antigravity uses file path)
//       "http"  (backend service, connects via localhost:PORT)
const MCP_MODE = process.env.MCP_MODE || "stdio";

const client = new MongoClient(MONGO_URI);
let isConnected = false;

// Ensure MongoDB connection is active before querying
async function ensureConnection() {
    if (!isConnected) {
        await client.connect();
        isConnected = true;
        console.error("MongoDB connected");
    }
}

// ==========================
// FACTORY: Create new MCP Server instance
// (Each HTTP session needs its own server instance)
// ==========================
function createMcpServer() {
    const server = new Server(
        { name: "mongodb-mcp-server", version: "2.0.0" },
        { capabilities: { tools: {} } }
    );

    // ==========================
    // LIST TOOLS
    // ==========================
    server.setRequestHandler(ListToolsRequestSchema, async () => ({
        tools: [
            // QUERY
            {
                name: "query_mongodb",
                description: "Find documents in a MongoDB collection",
                inputSchema: {
                    type: "object",
                    properties: {
                        db: { type: "string" },
                        collection: { type: "string" },
                        query: { type: "object" },
                        projection: { type: "object" },
                        limit: { type: "number", default: 10 }
                    },
                    required: ["db", "collection", "query"]
                }
            },

            // DATABASE
            {
                name: "list_databases",
                description: "List all databases in MongoDB",
                inputSchema: { type: "object", properties: {} }
            },
            {
                name: "list_collections",
                description: "List all collections in a specific database",
                inputSchema: {
                    type: "object",
                    properties: { db: { type: "string" } },
                    required: ["db"]
                }
            },

            // INSERT
            {
                name: "insert_one",
                description: "Insert one document into a collection",
                inputSchema: {
                    type: "object",
                    properties: {
                        db: { type: "string" },
                        collection: { type: "string" },
                        document: { type: "object" }
                    },
                    required: ["db", "collection", "document"]
                }
            },

            // UPDATE
            {
                name: "update_one",
                description: "Update one document based on a filter",
                inputSchema: {
                    type: "object",
                    properties: {
                        db: { type: "string" },
                        collection: { type: "string" },
                        filter: { type: "object" },
                        update: { type: "object" }
                    },
                    required: ["db", "collection", "filter", "update"]
                }
            },

            // DELETE
            {
                name: "delete_one",
                description: "Delete one document based on a filter",
                inputSchema: {
                    type: "object",
                    properties: {
                        db: { type: "string" },
                        collection: { type: "string" },
                        filter: { type: "object" }
                    },
                    required: ["db", "collection", "filter"]
                }
            },

            // AGGREGATE
            {
                name: "aggregate",
                description: "Run a MongoDB aggregation pipeline",
                inputSchema: {
                    type: "object",
                    properties: {
                        db: { type: "string" },
                        collection: { type: "string" },
                        pipeline: {
                            type: "array",
                            items: { type: "object" }
                        }
                    },
                    required: ["db", "collection", "pipeline"]
                }
            }
        ]
    }));

    // ==========================
    // TOOL EXECUTION
    // ==========================
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name, arguments: args } = request.params;

        try {
            await ensureConnection();

            const database = args.db ? client.db(args.db) : null;
            const col = args.collection ? database.collection(args.collection) : null;

            if (name === "query_mongodb") {
                const { query, projection, limit = 10 } = args;
                const results = await col.find(query, { projection, maxTimeMS: 5000 }).limit(limit).toArray();
                return { content: [{ type: "text", text: JSON.stringify(results, null, 2) }] };
            }

            if (name === "list_databases") {
                const dbs = await client.db().admin().listDatabases();
                return { content: [{ type: "text", text: JSON.stringify(dbs.databases.map(d => d.name), null, 2) }] };
            }

            if (name === "list_collections") {
                const collections = await database.listCollections().toArray();
                return { content: [{ type: "text", text: JSON.stringify(collections.map(c => c.name), null, 2) }] };
            }

            if (name === "insert_one") {
                const result = await col.insertOne(args.document);
                return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
            }

            if (name === "update_one") {
                const result = await col.updateOne(args.filter, args.update);
                return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
            }

            if (name === "delete_one") {
                const result = await col.deleteOne(args.filter);
                return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
            }

            if (name === "aggregate") {
                const results = await col.aggregate(args.pipeline, { maxTimeMS: 5000 }).toArray();
                return { content: [{ type: "text", text: JSON.stringify(results, null, 2) }] };
            }

            throw new Error(`Unknown tool: ${name}`);

        } catch (error) {
            return {
                content: [{ type: "text", text: `Error: ${error.message}` }],
                isError: true
            };
        }
    });

    return server;
}

// ==========================
// STDIO MODE
// Antigravity launches this server as a subprocess via file path
// ==========================
async function runStdio() {
    const server = createMcpServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("MongoDB MCP Server v2 running [STDIO mode]");
}

// ==========================
// HTTP MODE (StreamableHTTP)
// Server runs as a backend service, clients connect via localhost:PORT
// Uses StreamableHTTPServerTransport (MCP SDK v1.x)
// ==========================
async function runHttp() {
    const app = express();
    app.use(express.json());

    // Map to store transports per active session
    // Key: sessionId (UUID), Value: StreamableHTTPServerTransport instance
    const transports = {};

    // ============================================================
    // Main /mcp endpoint
    // Handles: POST (initialize + JSON-RPC messages) and GET (SSE stream)
    // ============================================================
    app.all("/mcp", async (req, res) => {

        // --- Handle POST: initialize or client messages ---
        if (req.method === "POST") {
            const sessionId = req.headers["mcp-session-id"];

            // If session exists → forward message to the correct transport
            if (sessionId && transports[sessionId]) {
                const transport = transports[sessionId];
                await transport.handleRequest(req, res, req.body);
                return;
            }

            // If no session → must request initialize
            if (!sessionId && isInitializeRequest(req.body)) {
                // Create new server & transport for this session
                const server = createMcpServer();
                const transport = new StreamableHTTPServerTransport({
                    sessionIdGenerator: () => randomUUID(),
                    onsessioninitialized: (id) => {
                        // Save transport to map with its session ID
                        transports[id] = transport;
                        console.error(`[MCP] New session: ${id}`);
                    }
                });

                // Clean up map when session closes
                transport.onclose = () => {
                    if (transport.sessionId) {
                        console.error(`[MCP] Session closed: ${transport.sessionId}`);
                        delete transports[transport.sessionId];
                    }
                };

                await server.connect(transport);
                await transport.handleRequest(req, res, req.body);
                return;
            }

            // Invalid request (sessionId exists but not found, or not initialize)
            res.status(400).json({ error: "Invalid or missing session ID" });
            return;
        }

        // --- Handle GET: client wants to open SSE stream ---
        if (req.method === "GET") {
            const sessionId = req.headers["mcp-session-id"];

            if (!sessionId || !transports[sessionId]) {
                res.status(400).json({ error: "Session not found. Please initialize first." });
                return;
            }

            await transports[sessionId].handleRequest(req, res);
            return;
        }

        // --- Handle DELETE: client closes session ---
        if (req.method === "DELETE") {
            const sessionId = req.headers["mcp-session-id"];

            if (sessionId && transports[sessionId]) {
                await transports[sessionId].close();
                delete transports[sessionId];
                console.error(`[MCP] Session deleted: ${sessionId}`);
            }

            res.status(200).json({ ok: true });
            return;
        }

        res.status(405).json({ error: "Method not allowed" });
    });

    // Health check endpoint
    app.get("/health", (req, res) => {
        res.json({
            status: "ok",
            mode: "http",
            version: "2.0.0",
            activeSessions: Object.keys(transports).length
        });
    });

    app.listen(PORT, () => {
        console.error(`MongoDB MCP Server v2 running [HTTP mode] → http://localhost:${PORT}`);
        console.error(`  MCP endpoint  : http://localhost:${PORT}/mcp`);
        console.error(`  Health check  : http://localhost:${PORT}/health`);
    });
}

// ==========================
// ENTRY POINT
// ==========================
if (MCP_MODE === "http") {
    runHttp().catch(console.error);
} else {
    runStdio().catch(console.error);
}