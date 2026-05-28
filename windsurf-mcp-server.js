// Minimal MCP placeholder server for windsfr-mcp-v1
// Listens on port 3001 and logs incoming requests
const http = require('http');
const PORT = process.env.PORT || 3001;

const requestListener = function (req, res) {
  console.log(`[windsurf-mcp-v1] ${req.method} ${req.url}`);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok', server: 'windsurf-mcp-v1' }));
};

const server = http.createServer(requestListener);
server.listen(PORT, () => {
  console.log(`windsurf-mcp-v1 server running on http://localhost:${PORT}`);
});
