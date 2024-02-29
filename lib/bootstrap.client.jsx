import { hydrateRoot } from "react-dom/client";
import { crawl, defaultOperations } from "./react-tree-crawler";

fetch("/_client-tree.json").then(async (res) => {
  const json = await res.text();
  const parsed = JSON.parse(json, (key, value) => {
    if (key === "$$typeof") return Symbol.for(value);
    return value;
  });
  const tree = await crawl(parsed, {
    native: async (jsx, next) => {
      if (!jsx.type.toString().includes("#"))
        return defaultOperations.native(jsx, next);
      const [file, importKey] = jsx.type.toString().split("#");
      const Component = (await import(file))[importKey];
      return {
        ...jsx,
        type: Component,
        props: await next(jsx.props),
      };
    },
  });
  hydrateRoot(document.body, tree);
});
