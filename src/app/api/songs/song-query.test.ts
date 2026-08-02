import assert from "node:assert/strict";
import test from "node:test";

import { publicSongQuery } from "./song-query";

test("public song modes keep jukebox, paid catalog, and request shortlist distinct", () => {
  assert.deepEqual(publicSongQuery(new URLSearchParams("jukebox=1")), {
    mode: "jukebox",
    where: { isPublic: true },
    orderBy: [{ jukeboxOrder: "asc" }, { title: "asc" }],
  });
  assert.deepEqual(publicSongQuery(new URLSearchParams("unlock=1")), {
    mode: "unlock",
    where: { paidCatalog: true },
    orderBy: [{ title: "asc" }],
  });
  assert.deepEqual(publicSongQuery(new URLSearchParams()), {
    mode: "request",
    where: { publicShortlist: true, requestable: true },
    orderBy: [{ title: "asc" }],
  });
});
