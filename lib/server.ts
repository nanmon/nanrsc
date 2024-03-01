import { renderToReadableStream } from "react-dom/server";
import { createElement, type ReactElement } from "react";
import { file } from "bun";
import { bundle } from "./bundler";
import { crawl } from "./react-tree-crawler";

const { App, actions } = await bundle();
const serverApp = await crawl(createElement(App));
const clientApp = await crawl(serverApp, {
  client: async (jsx, next) => ({
    ...jsx,
    type: (jsx.type as any).$$id,
    props: await next(jsx.props),
  }),
});
const bodyContents = (clientApp as ReactElement).props.children[1].props
  .children;
const clientJson = JSON.stringify(bodyContents, function (key, value) {
  if (key === "$$typeof") return "react.element";
  if (key === "_store") return { validated: true }; // remove all 'missing key' warnings ¯\_(ツ)_/¯
  return value;
});

const server = Bun.serve({
  async fetch(req) {
    const url = new URL(req.url);
    // console.log(url.pathname);
    if (url.pathname.startsWith("/.build/client")) {
      // static
      return new Response(file(`.${url.pathname}`), {
        headers: {
          "Content-Type": "text/javascript",
        },
      });
    }
    if (url.pathname === "/_client-tree.json") {
      return new Response(clientJson);
    }
    if (url.pathname === "/server-action") {
      const args = (await req.json()) as any[];
      const filepath = url.searchParams.get("file");
      const actionName = url.searchParams.get("action")!;
      const action = (await import(`../.build/server/${filepath}`))[actionName];
      const body = await action(...args);
      return new Response(JSON.stringify(body), {
        headers: {
          "Content-Type": "application/json",
        },
      });
    }
    try {
      const stream = await renderToReadableStream(serverApp, {
        bootstrapModules: [".build/client/lib/bootstrap.client.js"],
      });
      return new Response(stream);
    } catch (e) {
      console.error(e);
      return new Response("error :c");
    }
  },
});

console.log(`Listening on ${server.hostname}:${server.port}`);
