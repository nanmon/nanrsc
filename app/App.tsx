import { Suspense } from "react";
import { Button } from "./Button";

export function App() {
  return (
    <html>
      <head>
        <title>Hell world</title>
      </head>
      <body>
        {/* <Suspense fallback={<p>Loading...</p>}> */}
        {/* @ts-expect-error */}
        <Albums />
        {/* </Suspense> */}
        <Button />
      </body>
    </html>
  );
}

async function Albums() {
  const albums = await getAlbums();
  return (
    <ul>
      {albums.map((album) => (
        <li key={album.id}>
          <h3>{album.title}</h3>
          <p>{album.songs} songs</p>
        </li>
      ))}
    </ul>
  );
}

async function getAlbums() {
  // await new Promise((resolve) => setTimeout(resolve, 3000));
  return [
    {
      id: 1,
      title: "One",
      songs: 1,
    },
    {
      id: 2,
      title: "Two",
      songs: 2,
    },
    {
      id: 3,
      title: "Three",
      songs: 3,
    },
  ];
}
