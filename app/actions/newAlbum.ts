"use server";

export async function newAlbum(songs: number) {
  await new Promise((resolve) => setTimeout(resolve, 200));
  return {
    id: Math.random(),
    title: `${
      "document" in global ? "client" : "server"
    } ${Math.random().toString(32)}`,
    songs,
  };
}

export async function noop() {}
