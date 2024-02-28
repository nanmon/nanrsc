import { renderToReadableStream } from "react-dom/server";
import { createElement } from "react";
import { App } from "../app/App";
import { file } from "bun";
import { bundle } from "./bundler";
import { traverseJsx } from "./react-tree-crawler";

await bundle();
const bundled = await import("../public/build/App");
console.log(await traverseJsx(createElement(bundled.App)));
const server = Bun.serve({
  async fetch(req) {
    const url = new URL(req.url);
    console.log(url.pathname);
    if (url.pathname.startsWith("/public/")) {
      // static
      return new Response(file(`.${url.pathname}`), {
        headers: {
          "Content-Type": "text/javascript",
        },
      });
    }
    try {
      const stream = await renderToReadableStream(createElement(App), {
        bootstrapModules: ["public/build/bootstrap.js"],
        // @ts-expect-error
        importMap: {},
      });
      return new Response(stream);
    } catch (e) {
      console.error(e);
      return new Response("error :c");
    }
  },
});

console.log(`Listening on ${server.hostname}:${server.port}`);
