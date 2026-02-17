# Online IDE

A web-based code editor that supports Python, C++, and Node.js with Docker-based code execution.

## Features

- **Code Editor**: Monaco Editor (same as VS Code) with syntax highlighting
- **Multi-language Support**: Python 3.11, C++ (GCC 13), Node.js 20
- **Docker Execution**: Secure, isolated code execution in containers
- **File Management**: Save and load files from MongoDB database
- **Output Terminal**: Real-time code execution output
- **Responsive Design**: Works on desktop and tablet

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend  │────▶│   Backend   │────▶│   MongoDB   │
│  (React)    │     │  (Node.js)  │     │  (Database) │
└─────────────┘     └──────┬──────┘     └─────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │     Docker Engine      │
              │  ┌───────┬─────┬─────┐ │
              │  │Python │ C++ │Node │ │
              │  └───────┴─────┴─────┘ │
              └────────────────────────┘
```

## Prerequisites

- Docker & Docker Compose
- Git

## Quick Start

1. **Clone and navigate to the project**
   ```bash
   cd online-IDE
   ```

2. **Build and start all services**
   ```bash
   docker compose up --build
   ```

3. **Access the IDE**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

## Development Setup

### Backend Development

```bash
cd backend
npm install
npm run dev
```

### Frontend Development

```bash
cd frontend
npm install
npm start
```

Make sure to set the API URL in frontend:
```
REACT_APP_API_URL=http://localhost:5000/api
```

## API Endpoints

### Execute Code
```
POST /api/execute
Content-Type: application/json

{
  "code": "print('Hello World')",
  "language": "python"  // python | cpp | nodejs
}
```

### Files
```
GET    /api/files          - List all files
GET    /api/files/:id      - Get file by ID
POST   /api/files          - Create new file
PUT    /api/files/:id      - Update file
DELETE /api/files/:id      - Delete file
```

## Project Structure

```
online-IDE/
├── docker compose.yml      # Docker orchestration
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── server.js           # Express server
│       ├── models/
│       │   └── File.js         # MongoDB schema
│       ├── routes/
│       │   ├── execute.js      # Code execution
│       │   └── files.js        # File management
│       └── services/
│           └── dockerService.js # Docker integration
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   ├── public/
│   └── src/
│       ├── App.js
│       ├── components/
│       │   ├── CodeEditor.js
│       │   ├── OutputTerminal.js
│       │   ├── LanguageSelector.js
│       │   └── FileManager.js
│       ├── services/
│       │   └── api.js
│       └── styles/
└── Docker/
    ├── python/Dockerfile
    ├── cpp/Dockerfile
    └── nodejs/Dockerfile
```

## Security Features

- Container isolation (no network access)
- Memory limits (128MB per container)
- Execution timeout (30 seconds)
- Non-root user execution
- Read-only code mounting

## Supported Languages

| Language | Version | Image |
|----------|---------|-------|
| Python   | 3.11    | online-ide-python |
| C++      | GCC 13  | online-ide-cpp |
| Node.js  | 20      | online-ide-nodejs |

## License

MIT
