import { hydrateRoot } from "react-dom/client";
import { crawl, defaultOperations } from "./react-tree-crawler";

const tree = await crawl(window.pageJsx, {
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
hydrateRoot(document.body, tree);
