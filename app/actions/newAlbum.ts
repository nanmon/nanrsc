"use server";

export async function newAlbum(this: Request | void, songs: number) {
  await new Promise((resolve) => setTimeout(resolve, 200));
  return {
    id: Math.random(),
    title: this?.headers.get("Cookie"),
    songs,
  };
}

export async function noop() {}
