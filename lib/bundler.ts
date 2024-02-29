import { file, write } from "bun";
import { fileURLToPath } from "node:url";
import esbuild from "esbuild";
import { parse } from "es-module-lexer";
import { relative } from "node:path";

const appDir = new URL("../app/", import.meta.url);
const serverBuildDir = new URL("../.build/", import.meta.url);
const clientBuildDir = new URL("../public/build", import.meta.url);

export async function bundle() {
  const clientEntryPoints = new Set<string>();

  await esbuild.build({
    bundle: true,
    format: "esm",
    logLevel: "error",
    entryPoints: [resolveApp("App.tsx")],
    outdir: resolveServerBuild(),
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

  // await esbuild.build({
  //   format: "esm",
  //   logLevel: "error",
  //   entryPoints: [resolveApp("bootstrap.tsx")],
  //   outdir: resolveBuild(),
  //   plugins: [],
  // });

  const { outputFiles } = await esbuild.build({
    bundle: true,
    format: "esm",
    logLevel: "error",
    entryPoints: [...clientEntryPoints],
    outdir: resolveServerBuild(),
    plugins: [],
    write: false,
    packages: "external",
  });

  const clientComponentMap = new Map();
  for (let ofile of outputFiles) {
    const [, exports] = parse(ofile.text);
    let newContents = ofile.text;

    exports.forEach((exp) => {
      const key = `/public/build/${relative(
        resolveServerBuild(),
        ofile.path
      )}#${exp.n}`;
      clientComponentMap.set(key, {
        id: "public/build/" + ofile.path.split("/").pop(),
        name: exp.n,
        chunks: [],
        async: true,
      });
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
    entryPoints: [resolveApp("bootstrap.tsx"), ...clientEntryPoints],
    outdir: resolveClientBuild(),
    plugins: [],
    splitting: true,
  });
}

function resolveApp(path = "") {
  return fileURLToPath(new URL(path, appDir));
}

function resolveServerBuild(path = "") {
  return fileURLToPath(new URL(path, serverBuildDir));
}

function resolveClientBuild(path = "") {
  return fileURLToPath(new URL(path, clientBuildDir));
}
