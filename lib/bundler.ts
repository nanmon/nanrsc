import { file, write } from "bun";
import { fileURLToPath } from "node:url";
import esbuild from "esbuild";
import { parse } from "es-module-lexer";
import { relative } from "node:path";

const appDir = new URL("../app/", import.meta.url);
const libDir = new URL(".", import.meta.url);
const buildDir = new URL("../.build/", import.meta.url);

export async function bundle() {
  const clientEntryPoints = new Set<string>();

  await esbuild.build({
    bundle: true,
    format: "esm",
    logLevel: "error",
    entryPoints: [resolveApp("App.tsx")],
    outdir: resolveBuild("server"),
    packages: "external",
    plugins: [
      {
        name: "@ben-holmes/resolve-client-imports",
        setup(build) {
          build.onResolve({ filter: /^\./ }, async ({ path: relativePath }) => {
            const path = resolveApp(`${relativePath}.tsx`);
            const contents = await file(path).text();
            if (
              contents.startsWith(`'use client'`) ||
              contents.startsWith(`"use client"`)
            ) {
              clientEntryPoints.add(path);
              return {
                external: true,
                path: relativePath,
              };
            }
          });
        },
      },
    ],
  });

  const { outputFiles } = await esbuild.build({
    bundle: true,
    format: "esm",
    logLevel: "error",
    entryPoints: [...clientEntryPoints],
    outdir: resolveBuild("server"),
    plugins: [],
    write: false,
    packages: "external",
  });

  for (let ofile of outputFiles) {
    const [, exports] = parse(ofile.text);
    let newContents = ofile.text;

    exports.forEach((exp) => {
      const key = `/.build/client/app/${relative(
        resolveBuild("server"),
        ofile.path
      )}#${exp.n}`;
      newContents += `
    			${exp.ln}.$$typeof = Symbol.for('react.client.reference');
    			${exp.ln}.$$id = ${JSON.stringify(key)}
    			${exp.ln}.displayName = ${JSON.stringify(exp.n)}
    		`;
    });

    await write(ofile.path, newContents);
  }

  await esbuild.build({
    bundle: true,
    format: "esm",
    logLevel: "error",
    entryPoints: [resolveLib("bootstrap.client.jsx"), ...clientEntryPoints],
    outdir: resolveBuild("client"),
    plugins: [],
    splitting: true,
  });

  return import(resolveBuild("server/App.js"));
}

function resolveApp(path = "") {
  return fileURLToPath(new URL(path, appDir));
}

function resolveLib(path = "") {
  return fileURLToPath(new URL(path, libDir));
}

function resolveBuild(path = "") {
  return fileURLToPath(new URL(path, buildDir));
}
