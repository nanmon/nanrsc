import { hydrateRoot } from "react-dom/client";
import { crawl, defaultOperations } from "./react-tree-crawler";

function parse(jsx) {
  return crawl(jsx, {
    native: async (jsx, next) => {
      if (!jsx.type.toString().includes("#"))
        return {
          ...(await defaultOperations.native(jsx, next)),
          $$typeof: Symbol.for("react.element"),
        };
      const [file, importKey] = jsx.type.toString().split("#");
      const Component = (await import(file))[importKey];
      return {
        ...jsx,
        $$typeof: Symbol.for("react.element"),
        type: Component,
        props: await next(jsx.props),
      };
    },
  });
}

const tree = await parse(window.pageJsx);

const root = hydrateRoot(document.body, tree);

document.addEventListener("nanrsc.navigate", async (e) => {
  const url = new URL(e.detail, window.location.href);
  window.history.pushState({}, "", url);
  url.searchParams.set("jsx", "true");
  const res = await fetch(url);
  const jsx = await res.json();
  const newTree = await parse(jsx);
  root.render(newTree);
});
