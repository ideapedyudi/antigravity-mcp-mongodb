const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { CallToolRequestSchema, ListToolsRequestSchema } = require("@modelcontextprotocol/sdk/types.js");
const { MongoClient } = require("mongodb");

const MONGO_URI = "mongodb://localhost:27017";
const client = new MongoClient(MONGO_URI);

let isConnected = false;

async function ensureConnection() {
    if (!isConnected) {
        await client.connect();
        isConnected = true;
        console.error("MongoDB connected");
    }
}

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
            description: "Find documents",
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
            description: "List all databases",
            inputSchema: { type: "object", properties: {} }
        },
        {
            name: "list_collections",
            description: "List collections in a database",
            inputSchema: {
                type: "object",
                properties: { db: { type: "string" } },
                required: ["db"]
            }
        },

        // INSERT
        {
            name: "insert_one",
            description: "Insert one document",
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
            description: "Update one document",
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
            description: "Delete one document",
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
            description: "Run aggregation pipeline",
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

        // ======================
        // QUERY
        // ======================
        if (name === "query_mongodb") {
            const { query, projection, limit = 10 } = args;

            const cursor = col.find(query, {
                projection,
                maxTimeMS: 5000
            }).limit(limit);

            const results = await cursor.toArray();

            return {
                content: [{ type: "text", text: JSON.stringify(results, null, 2) }]
            };
        }

        // ======================
        // LIST DATABASES
        // ======================
        if (name === "list_databases") {
            const dbs = await client.db().admin().listDatabases();

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(dbs.databases.map(d => d.name), null, 2)
                    }
                ]
            };
        }

        // ======================
        // LIST COLLECTIONS
        // ======================
        if (name === "list_collections") {
            const collections = await database.listCollections().toArray();

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(collections.map(c => c.name), null, 2)
                    }
                ]
            };
        }

        // ======================
        // INSERT
        // ======================
        if (name === "insert_one") {
            const result = await col.insertOne(args.document);

            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
            };
        }

        // ======================
        // UPDATE
        // ======================
        if (name === "update_one") {
            const result = await col.updateOne(args.filter, args.update);

            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
            };
        }

        // ======================
        // DELETE
        // ======================
        if (name === "delete_one") {
            const result = await col.deleteOne(args.filter);

            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
            };
        }

        // ======================
        // AGGREGATE
        // ======================
        if (name === "aggregate") {
            const results = await col.aggregate(args.pipeline, {
                maxTimeMS: 5000
            }).toArray();

            return {
                content: [{ type: "text", text: JSON.stringify(results, null, 2) }]
            };
        }

        throw new Error(`Unknown tool: ${name}`);

    } catch (error) {
        return {
            content: [{ type: "text", text: `Error: ${error.message}` }],
            isError: true
        };
    }
});

// ==========================
// RUN SERVER
// ==========================
async function run() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("MongoDB MCP Server v2 running");
}

run().catch(console.error);