import { hydrateRoot } from "react-dom/client";
import { crawl, deserialize } from "./crawler";

function parse(jsx) {
  return crawl(jsx, {
    native: deserialize,
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
