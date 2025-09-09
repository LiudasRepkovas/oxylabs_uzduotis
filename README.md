# Oxylabs Test: Simple TCP Broadcast Proxy (TypeScript)

This project implements a minimal TCP proxy/broadcast server in Node.js with TypeScript. Each new TCP client that connects receives a unique ID. Any data sent by a client is broadcast to all other connected clients. The server also enforces a small per-connection traffic limit for demonstration purposes and disconnects clients that exceed it.

## Features
- TCP server built on Node's `net` module
- Each connection gets a generated short ID
- Broadcasts messages from one client to all other clients
- Basic per-client traffic accounting and auto‑disconnect when a limit is reached
- Written in TypeScript with a simple dev workflow

## Prerequisites
- Node.js 18+ (recommended) and npm
- Windows, macOS, or Linux

## Installation
1. Clone or download this repository to your machine.
2. Open a terminal in the project root.
3. Install dependencies:
```
npm install
```

## Build and Run
There are two common ways to run the project: development mode (auto‑rebuild) or a manual build followed by running the compiled output.

### Development mode (watch and run)
This mode automatically compiles TypeScript and starts the compiled server. On subsequent changes, it rebuilds and restarts.
``` 
npm run dev
```
### Manual build then run

``` 
npm run build
```

```
node ./dist/index.js
```

By default, the server listens on TCP port 9000 (see src/config.ts). You can change the port by editing src/config.ts and rebuilding.

## How to Test the Server
You can connect multiple TCP clients (e.g., two terminal sessions) to verify broadcasting:
- On Windows (PowerShell 5.1+), you can use `Test-NetConnection` just to verify the port is listening, but it won't open an interactive session. For interactive testing, use a TCP client tool like `telnet`, `nc` (netcat), or a GUI TCP client.
- Example with `telnet` (if installed):
  ``` 
   telnet 127.0.0.1 9000 
  ```
  - Open a second telnet session to the same address/port. Typing in one window will broadcast to the other.

Each client will receive a welcome message that includes its generated ID. When a client's combined sent/received bytes reach the demo limit, the server sends a notice and closes the connection.

## Project Structure
- src/index.ts
  - Application entry point. Creates and starts the ProxyServer using the configured port from src/config.ts.
- src/services/proxyServer.ts
  - TCP server wrapper. Accepts incoming connections, creates ProxyClient instances, relays data from one client to the others, and handles server errors and disconnects.
- src/services/proxyClient.ts
  - Represents a single TCP client connection. Tracks traffic, sends/receives data, emits data to the server for broadcasting, and disconnects when a demo traffic limit is reached.
- src/config.ts
  - Centralized configuration values, such as PORT (default 9000) and TRAFFIC_LIMIT (default 100).

## Configuration Notes
- Port: Defined as PORT in src/config.ts (default 9000). Change it there and rebuild.
- Traffic limit: Defined as TRAFFIC_LIMIT in src/config.ts (default 100). The ProxyClient reads this value at runtime.
- Encoding and accounting: Incoming data is decoded as UTF‑8 because the server calls socket.setEncoding('utf8'), so inbound traffic is counted by JavaScript string length (characters).
