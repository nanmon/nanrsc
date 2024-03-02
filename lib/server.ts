import { renderToReadableStream } from "react-dom/server";
import { file } from "bun";
import { bundle } from "./bundler";
import { crawl } from "./react-tree-crawler";
import { createElement } from "react";
import { URL } from "node:url";

const { App } = await bundle();
const server = Bun.serve({
  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname.startsWith("/.build/client")) {
      return serveStatic(url);
    }
    if (url.pathname === "/server-action") {
      return callServerAction(req, url);
    }
    return renderApp(req, url);
  },
});

console.log(`Listening on ${server.hostname}:${server.port}`);

function serveStatic(url: URL) {
  const js = url.pathname.endsWith(".js");
  return new Response(file(`.${url.pathname}`), {
    headers: {
      "Content-Type": js ? "text/javascript" : "application/json",
    },
  });
}

async function renderApp(request: Request, url: URL) {
  // resolve async components
  const resolvedApp = await crawl(createElement(App, { request }));

  // jsx json to send to client
  const serializedApp = await crawl(resolvedApp, {
    client: async (jsx, next) => ({
      ...jsx,
      type: (jsx.type as any).$$id,
      props: await next(jsx.props),
    }),
  });

  const stringifiedApp = JSON.stringify(serializedApp, function (key, value) {
    if (key === "$$typeof") return "react.element";
    if (key === "_store") return { validated: true }; // remove all 'missing key' warnings ¯\_(ツ)_/¯
    return value;
  });

  if (url.searchParams.has("jsx")) {
    return new Response(stringifiedApp, {
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  try {
    const stream = await renderToReadableStream(resolvedApp, {
      bootstrapModules: [".build/client/lib/bootstrap.client.js"],
      bootstrapScriptContent: `
        window.pageJsx = ${stringifiedApp}
      `,
    });
    return new Response(stream);
  } catch (e) {
    console.error(e);
    return new Response("error :c");
  }
}

async function callServerAction(req: Request, url: URL) {
  const args = (await req.json()) as any[];
  const filepath = url.searchParams.get("file");
  const actionName = url.searchParams.get("action")!;
  const action: Function = (await import(`../.build/server/${filepath}`))[
    actionName
  ];
  const body = await action.bind(req)(...args);
  return new Response(JSON.stringify(body), {
    headers: {
      "Content-Type": "application/json",
    },
  });
}
