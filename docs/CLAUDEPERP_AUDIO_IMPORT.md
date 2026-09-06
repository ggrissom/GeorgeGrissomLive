# Claude via Perplexity — Production Audio Import Handoff

This document is the exact source map for the seven processed jukebox tracks. The canonical machine-readable source remains `docs/audio-assets.json`.

## Required architecture

Do **not** commit the paid/full-length MP3 files or WAV masters into this public GitHub repository.

Use the connected Google Drive as the source/import location and durable Vercel storage for runtime delivery.

Recommended target:

- 30-second preview MP3s: Vercel Blob, public if acceptable for CDN delivery, or protected if the existing architecture requires it.
- Full purchased MP3s: Vercel Blob with private access; serve only after entitlement verification.
- WAV files: keep archived in Google Drive unless George explicitly changes the product promise.
- Persist durable Blob URL/path/key in the production song record/storage metadata. Never rely on Vercel's ephemeral filesystem.

Before writing song/catalog rows, back up the production database and inspect existing rows. Do not use destructive reseeding or `prisma db push --accept-data-loss` as a deployment/build action.

## Google Drive folders

- Root: `1xVusRvzgfFFGlav2BC668qwAetP5O6bd`
- MP3 folder: `1nehMnQIlk7-JJPfxsRP0Uj3Wh0V2x535`
- Full 320 kbps MP3 folder: `1SBRPXh2yFb9FrjS1K2GvlvPKz3EwhNlI`
- Preview 192 kbps MP3 folder: `1SBAI8m1T4b72Xd1vD9J44l5lSFcxoRaK`
- WAV archive: `1YqW_Byz0XBAqOMsjM-y91_NlxIprVe9m`

If the direct Google Drive connector cannot download a file, use Perplexity Computer/browser automation to open the folder/file and complete the transfer. Exhaust direct connectors, Computer/browser, CLI/API, and Vercel/GitHub UI routes before asking George to do the work manually.

## Track map

| Song | Slug | Preview MP3 Drive file ID | Full MP3 Drive file ID | Duration |
|---|---|---|---|---:|
| One Question | `one-question` | `1wrJfeUUIFt9p82gGvJMjak-PX4AOxRjP` | `1r7oOGiQgoWqnAvHnlm2msOInZ78YnyOV` | 191.8s |
| What a Shame | `what-a-shame` | `1iJZityhJaXkP3cRxXYni-Ss-c8i-lc5B` | `1j-jXKv8XWXjNSpM29ICqPRi_yItIGrk9` | 226.55s |
| This Song Is About You | `this-song-is-about-you` | `1Zh1Z5Sa1hYXgXduAfWpLpgesxU2I4nRF` | `1d6PuYw4EnFQSz8PT5plQlnWN9SQkAlwm` | 221.425s |
| Damnit, Just You Hold On | `damnit-just-you-hold-on` | `1phOuma1b3TPpoeomXgks5734c4bbHxNA` | `1He1tB4oYsn305S2B-OUIim2f6o3TOIcQ` | 159.07s |
| Get In Loser | `get-in-loser` | `1slPcYTIKA0AYe5rgA0HypmTkhN8VI1aD` | `1hOvmSqNd8sJQKhKZnDYoSGzssP4rKpX-` | 257.014s |
| And Another Thing | `and-another-thing-screams` | `1pa9gMR4WN6FVHFNfKmXCFcYBiSomjccM` | `1Op07qVypypgnrBT1XcxzDk3Tjqy6uyd0` | 189.398s |
| Nose to the Grindstone | `nose-to-the-grindstone` | `1WigtdhuZviKYi-7ExH_D_Gvj-7bb0xAz` | `1A5suXnpT6tO-cB_DxGvfpRtbVV3nPnDa` | 177.951s |

## Current product/delivery policy in repository

- Three free full plays per visitor/song.
- After the free full plays are exhausted, serve an approximately 30-second preview.
- Current purchase price: $2.00.
- Current repository policy: purchased delivery is a full-length 320 kbps MP3.
- WAV masters remain archival and are not delivered by the website.

If current public copy or Stripe metadata conflicts with this policy, identify the conflict before changing customer-facing behavior.

## Implementation requirements

1. Read current `main` and open PR #8 before implementing; PR #8 already introduces a Vercel Blob-oriented durable storage abstraction for uploads.
2. Rebase/port useful PR #8 changes onto current `main`; do not overwrite the latest Google Calendar commits.
3. Verify or provision Vercel Blob and `BLOB_READ_WRITE_TOKEN` through the actual Vercel project. Never commit the token.
4. Import each preview and full MP3 from Google Drive to Blob.
5. Update production song records non-destructively so each slug maps to the correct preview/full storage location, duration, public state, and $2 price.
6. Preserve/restore the full broader public song catalog. These seven processed audio tracks are **not** permission to delete or hide all other catalog entries.
7. Verify each of the seven audio tracks from the browser and API.
8. Verify one end-to-end Stripe purchase in the appropriate test/sandbox mode before live-charge testing.
9. Verify persistence after a new Vercel deployment.
10. Record the result in `docs/AGENT_STATE.md` and GitHub issue #10.

## Acceptance evidence

For every processed song, capture evidence for:

`Song row → preview asset → full-play endpoint → free-play count → preview fallback → Stripe Checkout → entitlement → protected full MP3 download`

A successful build without this browser/runtime evidence is not completion.
