import { hydrateRoot } from "react-dom/client";
import { Button as LikeButton } from "./like/Button";
import { Button } from "./share/Button";

const albums = [
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

hydrateRoot(
  document.body,
  <>
    <ul>
      {albums.map((album) => (
        <li key={album.id}>
          <h3>{album.title}</h3>
          <p>{album.songs} songs</p>
          <LikeButton />
          <Button />
        </li>
      ))}
    </ul>
  </>
);
