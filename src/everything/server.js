import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Last-Event-ID'],
  credentials: false
}));

app.use(express.json());

// Simple session management
const sessions = new Map();

// Generate session ID
function generateSessionId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// MCP Server capabilities
const serverInfo = {
  name: 'mcp-everything-server',
  version: '1.0.0'
};

const capabilities = {
  tools: {},
  resources: {},
  prompts: {}
};

// Available tools
const tools = [
  {
    name: 'echo',
    description: 'Echo back the provided text',
    inputSchema: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'Text to echo back'
        }
      },
      required: ['text']
    }
  },
  {
    name: 'add',
    description: 'Add two numbers together',
    inputSchema: {
      type: 'object',
      properties: {
        a: { type: 'number', description: 'First number' },
        b: { type: 'number', description: 'Second number' }
      },
      required: ['a', 'b']
    }
  },
  {
    name: 'current_time',
    description: 'Get the current time',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  }
];

// Handle tool calls
function handleToolCall(name, args) {
  switch (name) {
    case 'echo':
      return {
        content: [
          {
            type: 'text',
            text: args.text
          }
        ]
      };
    
    case 'add':
      return {
        content: [
          {
            type: 'text',
            text: `${args.a} + ${args.b} = ${args.a + args.b}`
          }
        ]
      };
    
    case 'current_time':
      return {
        content: [
          {
            type: 'text',
            text: new Date().toISOString()
          }
        ]
      };
    
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// Handle MCP requests
function handleMCPRequest(request) {
  const { method, params, id } = request;
  
  switch (method) {
    case 'initialize':
      return {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2025-03-26',
          capabilities,
          serverInfo
        }
      };
      
    case 'tools/list':
      return {
        jsonrpc: '2.0',
        id,
        result: { tools }
      };
      
    case 'tools/call':
      try {
        const result = handleToolCall(params.name, params.arguments);
        return {
          jsonrpc: '2.0',
          id,
          result
        };
      } catch (error) {
        return {
          jsonrpc: '2.0',
          id,
          error: {
            code: -32603,
            message: error.message
          }
        };
      }
      
    default:
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32601,
          message: `Method not found: ${method}`
        }
      };
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    transport: 'sse',
    server: serverInfo,
    capabilities 
  });
});

// SSE endpoint
app.get('/sse', (req, res) => {
  const sessionId = generateSessionId();
  
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Send initial connection event
  res.write(`event: endpoint\n`);
  res.write(`data: /messages?session_id=${sessionId}\n\n`);
  
  // Store session
  sessions.set(sessionId, { res, connected: true });
  
  // Send ping every 30 seconds
  const pingInterval = setInterval(() => {
    if (sessions.has(sessionId)) {
      res.write(`event: ping\n`);
      res.write(`data: ${new Date().toISOString()}\n\n`);
    } else {
      clearInterval(pingInterval);
    }
  }, 30000);

  // Handle client disconnect
  req.on('close', () => {
    sessions.delete(sessionId);
    clearInterval(pingInterval);
    console.log(`Session ${sessionId} disconnected`);
  });

  console.log(`New SSE connection established: ${sessionId}`);
});

// Messages endpoint
app.post('/messages', (req, res) => {
  const sessionId = req.query.session_id;
  
  if (!sessionId || !sessions.has(sessionId)) {
    return res.status(400).json({
      jsonrpc: '2.0',
      id: req.body.id || null,
      error: {
        code: -32602,
        message: 'Invalid session'
      }
    });
  }

  try {
    const response = handleMCPRequest(req.body);
    res.json(response);
    
    // Also send via SSE if needed for notifications
    const session = sessions.get(sessionId);
    if (session && session.connected && req.body.method === 'initialize') {
      session.res.write(`event: initialized\n`);
      session.res.write(`data: ${JSON.stringify(response.result)}\n\n`);
    }
  } catch (error) {
    console.error('Error handling MCP request:', error);
    res.status(500).json({
      jsonrpc: '2.0',
      id: req.body.id || null,
      error: {
        code: -32603,
        message: 'Internal error',
        data: error.message
      }
    });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'MCP Everything Server with SSE Transport',
    endpoints: {
      health: '/health',
      sse: '/sse',
      messages: '/messages'
    },
    server: serverInfo,
    capabilities
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`MCP Everything Server with SSE transport running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`SSE endpoint: http://localhost:${PORT}/sse`);
  console.log(`Messages endpoint: http://localhost:${PORT}/messages`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully');
  process.exit(0);
});
