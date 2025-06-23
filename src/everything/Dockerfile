# Minimal working approach - avoid complex builds
FROM node:22-alpine

WORKDIR /app

# Install just what we need
RUN npm install -g @modelcontextprotocol/server-everything || echo "Build failed, trying alternative..."

# If the global install fails, create a simple MCP server manually
RUN if [ ! -f /usr/local/bin/npx ] || ! npx @modelcontextprotocol/server-everything --version; then \
        echo "Creating fallback server..."; \
        npm init -y; \
        npm install express cors; \
    fi

# Create a fallback server script with proper MCP tools support
COPY <<'EOF' /app/fallback-server.js
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
        return;
    }
    next();
});

// HEALTH CHECK ENDPOINT
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        server: 'fallback-mcp-server',
        port: port
    });
});

// Root endpoint for basic info
app.get('/', (req, res) => {
    res.json({ 
        message: 'MCP Everything Server (Fallback)', 
        endpoints: ['/health', '/sse', '/message'],
        status: 'running',
        supportedProtocols: ['2024-11-05', '2025-03-26']
    });
});

// SSE endpoint for MCP
app.get('/sse', (req, res) => {
    console.log('SSE connection requested');
    
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*'
    });
    
    // MCP session setup
    const sessionId = Date.now().toString();
    res.write('event: endpoint\n');
    res.write(`data: /message?sessionId=${sessionId}\n\n`);
    
    // Send MCP initialization
    setTimeout(() => {
        res.write('event: message\n');
        res.write('data: {"jsonrpc":"2.0","id":1,"result":{"protocolVersion":"2025-03-26","capabilities":{"tools":{}}}}\n\n');
    }, 100);
    
    // Keep alive
    const keepAlive = setInterval(() => {
        res.write('event: message\n');
        res.write('data: {"method":"notifications/message","params":{"level":"info","data":"Server alive"},"jsonrpc":"2.0"}\n\n');
    }, 30000);
    
    req.on('close', () => {
        clearInterval(keepAlive);
    });
});

// Message endpoint for MCP
app.post('/message', (req, res) => {
    console.log('MCP message:', JSON.stringify(req.body, null, 2));
    
    const { method, id, params } = req.body;
    
    // Handle initialize method
    if (method === 'initialize') {
        const clientProtocol = params?.protocolVersion || '2024-11-05';
        console.log(`Client requesting protocol version: ${clientProtocol}`);
        
        const response = {
            jsonrpc: "2.0",
            id: id,
            result: {
                protocolVersion: clientProtocol,
                capabilities: {
                    tools: {
                        listChanged: true
                    },
                    resources: {
                        subscribe: true,
                        listChanged: true
                    },
                    prompts: {
                        listChanged: true
                    },
                    logging: {}
                },
                serverInfo: {
                    name: "fallback-mcp-server",
                    version: "1.0.0"
                }
            }
        };
        
        console.log('Sending initialize response');
        res.json(response);
        return;
    }
    
    // Handle tools/list method - FIXED VERSION!
    if (method === 'tools/list') {
        const response = {
            jsonrpc: "2.0",
            id: id,
            result: {
                tools: [
                    {
                        name: "echo",
                        description: "Echo back the input text - a simple test tool",
                        inputSchema: {
                            type: "object",
                            properties: {
                                text: {
                                    type: "string",
                                    description: "Text to echo back"
                                }
                            },
                            required: ["text"]
                        }
                    },
                    {
                        name: "get_current_time",
                        description: "Get the current server time",
                        inputSchema: {
                            type: "object",
                            properties: {},
                            additionalProperties: false
                        }
                    },
                    {
                        name: "calculate",
                        description: "Perform basic mathematical calculations",
                        inputSchema: {
                            type: "object",
                            properties: {
                                expression: {
                                    type: "string",
                                    description: "Mathematical expression to evaluate (e.g., '2 + 2', '10 * 5')"
                                }
                            },
                            required: ["expression"]
                        }
                    },
                    {
                        name: "generate_uuid",
                        description: "Generate a random UUID",
                        inputSchema: {
                            type: "object",
                            properties: {},
                            additionalProperties: false
                        }
                    }
                ]
            }
        };
        console.log('Sending tools/list response with', response.result.tools.length, 'tools');
        res.json(response);
        return;
    }
    
    // Handle tools/call method
    if (method === 'tools/call') {
        const toolName = params?.name;
        const args = params?.arguments || {};
        
        console.log(`Calling tool: ${toolName} with args:`, args);
        
        if (toolName === 'echo') {
            const response = {
                jsonrpc: "2.0",
                id: id,
                result: {
                    content: [
                        {
                            type: "text",
                            text: `Echo: ${args.text || 'No text provided'}`
                        }
                    ]
                }
            };
            res.json(response);
            return;
        }
        
        if (toolName === 'get_current_time') {
            const response = {
                jsonrpc: "2.0",
                id: id,
                result: {
                    content: [
                        {
                            type: "text",
                            text: `Current server time: ${new Date().toISOString()}`
                        }
                    ]
                }
            };
            res.json(response);
            return;
        }
        
        if (toolName === 'calculate') {
            try {
                // Simple expression evaluation (be careful in production!)
                const result = Function('"use strict"; return (' + args.expression + ')')();
                const response = {
                    jsonrpc: "2.0",
                    id: id,
                    result: {
                        content: [
                            {
                                type: "text",
                                text: `${args.expression} = ${result}`
                            }
                        ]
                    }
                };
                res.json(response);
                return;
            } catch (error) {
                const response = {
                    jsonrpc: "2.0",
                    id: id,
                    error: {
                        code: -32000,
                        message: "Calculation error",
                        data: error.message
                    }
                };
                res.json(response);
                return;
            }
        }
        
        if (toolName === 'generate_uuid') {
            // Simple UUID v4 generation
            const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                const r = Math.random() * 16 | 0;
                const v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
            
            const response = {
                jsonrpc: "2.0",
                id: id,
                result: {
                    content: [
                        {
                            type: "text",
                            text: `Generated UUID: ${uuid}`
                        }
                    ]
                }
            };
            res.json(response);
            return;
        }
        
        // Unknown tool
        const response = {
            jsonrpc: "2.0",
            id: id,
            error: {
                code: -32601,
                message: "Unknown tool",
                data: `Tool '${toolName}' not found`
            }
        };
        res.json(response);
        return;
    }
    
    // Handle resources/list method
    if (method === 'resources/list') {
        const response = {
            jsonrpc: "2.0",
            id: id,
            result: {
                resources: []
            }
        };
        res.json(response);
        return;
    }
    
    // Handle prompts/list method
    if (method === 'prompts/list') {
        const response = {
            jsonrpc: "2.0",
            id: id,
            result: {
                prompts: []
            }
        };
        res.json(response);
        return;
    }
    
    // Default response for unhandled methods
    console.log(`Unhandled method: ${method}`);
    res.json({
        jsonrpc: "2.0",
        id: id || null,
        result: {}
    });
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Fallback MCP server running on port ${port}`);
    console.log(`Health check available at: http://0.0.0.0:${port}/health`);
    console.log(`Available tools: echo, get_current_time, calculate, generate_uuid`);
});
EOF

# Create startup script that tries the real server first, falls back if needed
COPY <<'EOF' /app/start.sh
#!/bin/sh
echo "Starting MCP server..."

# Try the real server first
if command -v npx >/dev/null 2>&1 && npx @modelcontextprotocol/server-everything --version >/dev/null 2>&1; then
    echo "Using real MCP server"
    while true; do
        PORT=${PORT:-3000} npx @modelcontextprotocol/server-everything sse || {
            echo "Real server crashed, restarting in 2 seconds..."
            sleep 2
        }
    done
else
    echo "Using fallback MCP server"
    node /app/fallback-server.js
fi
EOF

RUN chmod +x /app/start.sh

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S mcp -u 1001 -G nodejs && \
    chown -R mcp:nodejs /app

USER mcp

ENV PORT=3000
EXPOSE 3000

CMD ["/app/start.sh"]
