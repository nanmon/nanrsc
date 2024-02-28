import { fileURLToPath } from "node:url";
import esbuild from "esbuild";
import { renderToReadableStream } from "react-dom/server";
import { createElement } from "react";
import { App } from "./app/App";
import { file } from "bun";

const appDir = new URL("./app/", import.meta.url);
const buildDir = new URL("./build/", import.meta.url);

await build();
const server = Bun.serve({
  async fetch(req) {
    const url = new URL(req.url);
    console.log(url.pathname);
    if (url.pathname === "/bootstrap.js") {
      return new Response(file("./build/bootstrap.js"), {
        headers: {
          "Content-Type": "text/javascript",
        },
      });
    }
    try {
      const stream = await renderToReadableStream(createElement(App), {
        bootstrapModules: ["bootstrap.js"],
      });
      return new Response(stream);
    } catch (e) {
      console.error(e);
      return new Response("error :c");
    }
  },
});

console.log(`Listening on ${server.hostname}:${server.port}`);

async function build() {
  await esbuild.build({
    bundle: true,
    format: "esm",
    logLevel: "error",
    entryPoints: [resolveApp("bootstrap.tsx")],
    outdir: resolveBuild(),
    // packages: "external",
  });
}

function resolveApp(path = "") {
  return fileURLToPath(new URL(path, appDir));
}

function resolveBuild(path = "") {
  return fileURLToPath(new URL(path, buildDir));
}
