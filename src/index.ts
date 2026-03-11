import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { loadConfig } from "./config.js";
import { JpoClient } from "./jpo/client.js";
import { registerJpoTools } from "./jpo/tools.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const client = new JpoClient(config);

  const server = new McpServer({
    name: "j-platpat-mcp",
    version: "0.1.0",
    websiteUrl: "https://github.com/yamayued/j-platpat-mcp"
  }, {
    capabilities: {
      logging: {}
    }
  });

  registerJpoTools(server, client);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("j-platpat-mcp is ready on stdio.");
}

main().catch((error) => {
  console.error("Fatal error while starting j-platpat-mcp.");
  console.error(error);
  process.exit(1);
});
