"use client";

import { useState } from "react";
import { newAlbum } from "./actions/newAlbum";

export function NewAlbumButton() {
  const [newAlbums, setNewAlbums] = useState<any[]>([]);

  const handleAdd = async () => {
    const album = await newAlbum(3);
    setNewAlbums((prev) => [...prev, album]);
  };

  return (
    <div>
      <button type="submit" onClick={handleAdd}>
        Add New Album
      </button>
      <ul>
        {newAlbums.map((album) => (
          <li key={album.id}>
            <h3>{album.title}</h3>
            <p>{album.songs} songs</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
