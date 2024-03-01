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

  // bundle root app, exclude 'use client' and 'use server' files
  await esbuild.build({
    bundle: true,
    format: "esm",
    logLevel: "error",
    entryPoints: [resolveApp("App.tsx")],
    outdir: resolveBuild("server"),
    outbase: resolveApp(),
    packages: "external",
    plugins: [
      {
        name: "@ben-holmes/resolve-client-imports",
        setup(build) {
          build.onResolve({ filter: /^\./ }, async ({ path: relativePath }) => {
            const path = resolveApp(relativePath);
            const contents = await sourceFile(path).text();
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

  const serverEntryPoints = new Set<string>();
  // bundle client components for the server
  const clientComponentsForServer = await esbuild.build({
    bundle: true,
    format: "esm",
    logLevel: "error",
    entryPoints: [...clientEntryPoints],
    outdir: resolveBuild("server"),
    outbase: resolveApp(),
    write: false,
    packages: "external",
    plugins: [
      {
        name: "resolve-server-imports",
        setup(build) {
          build.onResolve({ filter: /^\./ }, async ({ path: relativePath }) => {
            const path = resolveApp(relativePath);
            const contents = await sourceFile(path).text();
            if (
              contents.startsWith(`'use server'`) ||
              contents.startsWith(`"use server"`)
            ) {
              serverEntryPoints.add(path);
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

  // add identifiers to client component functions
  for (let ofile of clientComponentsForServer.outputFiles) {
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
    		`;
    });

    await write(ofile.path, newContents);
  }

  // bundle server actions for the server
  const serverActionsForServer = await esbuild.build({
    bundle: true,
    format: "esm",
    logLevel: "error",
    entryPoints: [...serverEntryPoints],
    outdir: resolveBuild("server"),
    outbase: resolveApp(),
    write: false,
    packages: "external",
  });

  // save server action mapping
  const serverActionsRefs = new Set<string>();
  for (let ofile of serverActionsForServer.outputFiles) {
    const [, exports] = parse(ofile.text);

    exports.forEach((exp) => {
      const key = `${relative(resolveBuild("server"), ofile.path)}#${exp.n}`;
      serverActionsRefs.add(key);
    });

    await write(ofile.path, ofile.text);
  }
  console.log(serverActionsRefs);

  // bundle client components and bootstrap code for the client
  await esbuild.build({
    bundle: true,
    format: "esm",
    logLevel: "error",
    entryPoints: [resolveLib("bootstrap.client.jsx"), ...clientEntryPoints],
    outdir: resolveBuild("client"),
    splitting: true,
    plugins: [
      {
        name: "resolve-server-imports",
        setup(build) {
          build.onResolve({ filter: /^\./ }, async ({ path: relativePath }) => {
            const path = resolveApp(relativePath);
            const file = sourceFile(path);
            if (file.size === 0) return; // not in /app
            const contents = await file.text();
            if (
              contents.startsWith(`'use server'`) ||
              contents.startsWith(`"use server"`)
            ) {
              // serverEntryPoints.add(path);
              return {
                external: true,
                path: `${relativePath}.js`,
              };
            }
          });
        },
      },
    ],
  });

  for (let serverAction of serverActionsRefs) {
    const [filepath, actionName] = serverAction.split("#");
    write(
      resolveBuild(`client/app/${filepath}`),
      `
      export function ${actionName}(...args) {
        return fetch('/server-action?file=${filepath}&action=${actionName}', {
          method: 'POST',
          body: JSON.stringify(args)
        }).then(res => res.json())
      }
    `
    );
  }

  return {
    ...(await import(resolveBuild("server/App.js"))),
    actions: serverActionsRefs,
  };
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

function sourceFile(path: string) {
  const f = file(`${path}.ts`);
  if (f.size > 0) return f;
  return file(`${path}.tsx`);
}
