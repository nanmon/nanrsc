// import { hydrateRoot } from "react-dom/client";
// import { Button as LikeButton } from "./like/Button";
// import { Button } from "./share/Button";

import { hydrateRoot } from "react-dom/client";
import { crawl, defaultOperations } from "../lib/react-tree-crawler";

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

// const albums = [
//   {
//     id: 1,
//     title: "One",
//     songs: 1,
//   },
//   {
//     id: 2,
//     title: "Two",
//     songs: 2,
//   },
//   {
//     id: 3,
//     title: "Three",
//     songs: 3,
//   },
// ];

// hydrateRoot(
//   document.body,
//   <>
//     <ul>
//       {albums.map((album) => (
//         <li key={album.id}>
//           <h3>{album.title}</h3>
//           <p>{album.songs} songs</p>
//           <LikeButton />
//           <Button />
//         </li>
//       ))}
//     </ul>
//   </>
// );
