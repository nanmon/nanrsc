import { Suspense } from "react";
import { Link } from "../lib/Link";
import { Wrapper } from "./ButtonWrapper";
import { NewAlbumButton } from "./NewAlbumButton";
import { Button } from "./share/Button";

export function App({ request }: { request: Request }) {
  const url = new URL(request.url);
  return (
    <html>
      <head>
        <title>{url.pathname}</title>
        <style
          dangerouslySetInnerHTML={{
            __html: `
            body {
              background-color: black;
              color: white;
            }
          `,
          }}
        />
      </head>
      <body>
        {url.pathname === "/" ? (
          <Link href="/albums">Albums</Link>
        ) : (
          <Link href="/">Home</Link>
        )}
        <h1>{url.pathname}</h1>
        <Suspense fallback={<p>Loading...</p>}>
          {/* @ts-expect-error */}
          <Albums />
        </Suspense>
        <NewAlbumButton />
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
          <Wrapper />
          <Button />
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
