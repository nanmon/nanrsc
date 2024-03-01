"use server";

export async function newAlbum() {
  await new Promise((resolve) => setTimeout(resolve, 200));
  return {
    id: Math.random(),
    title: `${
      "document" in global ? "client" : "server"
    } ${Math.random().toString(32)}`,
    songs: Math.random(),
  };
}
