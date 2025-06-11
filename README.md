
# MCP Everything Server for GKE

This project customizes Docker images to support running the MCP Everything Server for HTTP transport, specifically tailored for deployment on a Google Kubernetes Engine (GKE) cluster as a remote server.

## Reference

This project is developed in reference to the official GitHub repository of the MCP Everything Server: [Official Repository](https://github.com/modelcontextprotocol/servers/tree/main/src/everything).

## Overview

The goal of this project is to facilitate the deployment of the MCP Everything Server on a GKE cluster, enabling remote server functionality with HTTP transport support.

## Directory Structure

```
├── README.md
└── src
   └── everything
```

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
```

### 2. Navigate to the Project Directory

```bash
cd mcp-everything-server-for-gke
```

### 3. Build Docker Image

Use the Dockerfile to build your custom Docker image that supports HTTP transport.

```bash
docker build -t my-mcp-everything-server:latest .
```

### 4. Deploy on GKE

Create a Kubernetes deployment using the developed Docker image. Ensure your GKE cluster is properly configured.

## Post GKE Server Deployment Validation

### 1. Port Forward for Local Testing

Set up port forwarding to access the service locally:

```bash
kubectl port-forward service/mcp-everything-server-service 8080:80
kubectl port-forward pod/<pod-name> 8080:3000
```

### 2. Basic Health Checks

Once port forwarding is active, test the endpoints:

```bash
curl http://localhost:8080/health
curl http://localhost:8080/
curl http://localhost:8080/mcp
```

### 3. List Available Tools

Inspect the available tools:

```bash
curl -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {
        "name": "test-client",
        "version": "1.0.0"
      }
    }
  }'

curl -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list",
    "params": {}
  }'
```

### 4. Test a Specific Tool

Example: Test the web search tool:

```bash
curl -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "web_search",
      "arguments": {
        "query": "kubernetes test"
      }
    }
  }'
```

### 5. Pod-Level Debugging

Check pod logs and status:

```bash
kubectl logs -f deployment/mcp-everything-server
kubectl describe pod <pod-name>
kubectl exec -it <pod-name> -- /bin/sh
```

### 6. Service Connectivity Test

Test service connectivity from within the cluster:

```bash
kubectl run test-pod --image=curlimages/curl --rm -it -- /bin/sh
curl http://mcp-everything-server-service/health
curl http://mcp-everything-server-service/
```

## Available Tools

The server currently has these tools available:

- **echo**: Echo back provided text
- **add**: Add two numbers together
- **current_time**: Get the current time

### Testing the Available Tools

```bash
# Test the echo tool
curl -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 4,
    "method": "tools/call",
    "params": {
      "name": "echo",
      "arguments": {
        "text": "Hello from GKE!"
      }
    }
  }'

# Test the add tool
curl -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 5,
    "method": "tools/call",
    "params": {
      "name": "add",
      "arguments": {
        "a": 10,
        "b": 25
      }
    }
  }'

# Test the current_time tool
curl -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 6,
    "method": "tools/call",
    "params": {
      "name": "current_time",
      "arguments": {}
    }
  }'
```

## Contributing

Contributions are welcome. Please read the contributing guidelines.
