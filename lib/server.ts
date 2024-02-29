import { renderToReadableStream } from "react-dom/server";
import { createElement } from "react";
import { file } from "bun";
import { bundle } from "./bundler";
import { crawl } from "./react-tree-crawler";

await bundle();
const bundled = await import("../.build/App");
const resolvedTree = await crawl(createElement(bundled.App));
const resolvedJsx = await crawl(resolvedTree, {
  client: async (jsx, next) => ({
    ...jsx,
    type: (jsx.type as any).$$id,
    props: await next(jsx.props),
  }),
});
const server = Bun.serve({
  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname.startsWith("/public/")) {
      // static
      return new Response(file(`.${url.pathname}`), {
        headers: {
          "Content-Type": "text/javascript",
        },
      });
    }
    if (url.pathname === "/_client-tree.json") {
      return new Response(
        JSON.stringify(resolvedJsx, (key, value) => {
          if (key === "$$typeof") {
            return "react.element";
          }
          return value;
        })
      );
    }
    try {
      const stream = await renderToReadableStream(resolvedTree, {
        bootstrapModules: ["public/build/bootstrap.js"],
      });
      return new Response(stream);
    } catch (e) {
      console.error(e);
      return new Response("error :c");
    }
  },
});

console.log(`Listening on ${server.hostname}:${server.port}`);
