#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import express from "express";

// Create Express app for HTTP transport
const app = express();
app.use(express.json());

// Health check endpoint for GKE
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Create MCP server
const server = new Server(
  {
    name: "everything-server",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Store request handlers for direct access
const toolsListHandler = async () => {
  return {
    tools: [
      {
        name: "echo",
        description: "Echo back the provided text",
        inputSchema: {
          type: "object",
          properties: {
            text: {
              type: "string",
              description: "Text to echo back",
            },
          },
          required: ["text"],
        },
      },
      {
        name: "add",
        description: "Add two numbers together",
        inputSchema: {
          type: "object",
          properties: {
            a: {
              type: "number",
              description: "First number",
            },
            b: {
              type: "number",
              description: "Second number",
            },
          },
          required: ["a", "b"],
        },
      },
      {
        name: "current_time",
        description: "Get the current time",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
    ],
  };
};

const toolsCallHandler = async (request: any) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "echo":
      const text = args?.text;
      if (typeof text !== "string") {
        throw new Error("Text argument is required and must be a string");
      }
      return {
        content: [
          {
            type: "text",
            text: `Echo: ${text}`,
          },
        ],
      };

    case "add":
      const a = args?.a;
      const b = args?.b;
      if (typeof a !== "number" || typeof b !== "number") {
        throw new Error("Both 'a' and 'b' arguments are required and must be numbers");
      }
      const result = a + b;
      return {
        content: [
          {
            type: "text",
            text: `${a} + ${b} = ${result}`,
          },
        ],
      };

    case "current_time":
      const now = new Date().toISOString();
      return {
        content: [
          {
            type: "text",
            text: `Current time: ${now}`,
          },
        ],
      };

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
};

// Set request handlers
server.setRequestHandler(ListToolsRequestSchema, toolsListHandler);
server.setRequestHandler(CallToolRequestSchema, toolsCallHandler);

// MCP endpoint handler
app.post('/mcp', async (req, res) => {
  try {
    let response;
    
    // Handle different MCP methods
    switch (req.body.method) {
      case 'tools/list':
        response = await toolsListHandler();
        break;
      case 'tools/call':
        response = await toolsCallHandler(req.body);
        break;
      default:
        throw new Error(`Unsupported method: ${req.body.method}`);
    }

    res.json({
      jsonrpc: "2.0",
      id: req.body.id,
      result: response
    });
  } catch (error) {
    console.error('MCP request error:', error);
    res.status(500).json({
      jsonrpc: "2.0",
      id: req.body.id,
      error: {
        code: -32603,
        message: 'Internal error',
        data: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
});

// Basic info endpoint
app.get('/', (req, res) => {
  res.json({
    name: "MCP Everything Server",
    version: "0.1.0",
    transport: "http",
    endpoints: {
      health: "/health",
      mcp: "/mcp"
    }
  });
});

// Start HTTP server
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`MCP Everything Server running on http://${HOST}:${PORT}`);
  console.log(`Health check available at http://${HOST}:${PORT}/health`);
  console.log(`MCP endpoint available at http://${HOST}:${PORT}/mcp`);
  console.log(`Server info available at http://${HOST}:${PORT}/`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});