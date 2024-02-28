"use client";

import { useState } from "react";

export function Button() {
  const [likes, setLikes] = useState(0);
  return (
    <button onClick={() => setLikes((prev) => prev + 1)}>{likes} Likes</button>
  );
}
