import { createServer } from "node:http";

import { createApp } from "./app.js";

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "0.0.0.0";
const server = createServer(createApp());

server.listen(port, host, () => {
  console.log(`LastResort AI server listening on http://localhost:${port}`);
  console.log(`Network preview available on http://${host}:${port}`);
});
