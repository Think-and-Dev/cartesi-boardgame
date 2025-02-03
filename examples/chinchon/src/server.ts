import { Server, Sqlite } from '@think-and-dev/cartesi-boardgame/server';
import { Chinchon } from "./Game";
import cors from '@koa/cors';
// import path from "path";
// import serve from "koa-static";

const PORT = 8000;
const database = new Sqlite();

async function main() {
  const server = Server({
    games: [Chinchon],
    db: database,
    origins: ['http://127.0.0.1:8081', 'http://127.0.0.1:8082', 'http://127.0.0.1:1234', 'http://127.0.0.1:3000', 'http://127.0.0.1:5004', '*'],
  });

  server.app.use(cors({
    origin: '*',
    credentials: true,
    allowMethods: ['GET', 'HEAD', 'PUT', 'POST', 'DELETE', 'PATCH', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'Accept', '*'],
  }));

  // Build path relative to the server.js file
  // const frontEndAppBuildPath = path.resolve(__dirname, "../build");
  // server.app.use(
  //   serve(frontEndAppBuildPath, { maxAge: 3.154e10 }) // 1 year
  // );

  server.run(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    // server.app.use(
    //   async (ctx, next) =>
    //     await serve(frontEndAppBuildPath)(
    //       Object.assign(ctx, { path: "index.html" }),
    //       next
    //     )
    // );
  });
}

main().catch(console.error);
