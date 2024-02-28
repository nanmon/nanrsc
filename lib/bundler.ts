import { file, write } from "bun";
import { fileURLToPath } from "node:url";
import esbuild from "esbuild";
import { parse } from "es-module-lexer";
import { relative } from "node:path";

const appDir = new URL("../app/", import.meta.url);
const buildDir = new URL("../public/build/", import.meta.url);

export async function bundle() {
  const clientEntryPoints = new Set<string>();

  await esbuild.build({
    bundle: true,
    format: "esm",
    logLevel: "error",
    entryPoints: [resolveApp("App.tsx")],
    outdir: resolveBuild(),
    packages: "external",
    plugins: [
      {
        name: "@ben-holmes/resolve-client-imports",
        setup(build) {
          build.onResolve({ filter: /^\./ }, async ({ path: relativePath }) => {
            console.log({ relativePath });
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
  console.log(clientEntryPoints);

  const { outputFiles } = await esbuild.build({
    bundle: true,
    format: "esm",
    logLevel: "error",
    entryPoints: [resolveApp("bootstrap.tsx"), ...clientEntryPoints],
    outdir: resolveBuild(),
    splitting: true,
    plugins: [],
    write: false,
    allowOverwrite: true,
  });

  const clientComponentMap = new Map();
  for (let ofile of outputFiles) {
    const [, exports] = parse(ofile.text);
    let newContents = ofile.text;

    exports.forEach((exp) => {
      const key = `${relative(resolveBuild(), ofile.path)}#${exp.n}`;
      clientComponentMap.set(key, {
        id: "/build/" + ofile.path.split("/").pop(),
        name: exp.n,
        chunks: [],
        async: true,
      });
      newContents += `
    			${exp.ln}.$$typeof = Symbol.for('react.client.reference');
    			${exp.ln}.$$id = ${JSON.stringify(key)}
    		`;
    });

    await write(ofile.path, newContents);
  }
}

function resolveApp(path = "") {
  return fileURLToPath(new URL(path, appDir));
}

function resolveBuild(path = "") {
  return fileURLToPath(new URL(path, buildDir));
}
