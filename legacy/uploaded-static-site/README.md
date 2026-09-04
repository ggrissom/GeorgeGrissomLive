# georgegrissomDotCom

Archived first-pass static concept rebuild for George Grissom's music site.

> Archived: the production deployment now builds the Next.js application from the repository root using `netlify.toml`. This directory is retained only for historical reference.

## Included
- Sticky header with static branding
- Dark/light adaptive environment concept
- Jukebox UI with 2 free plays per song
- Paywall modal after free plays are used
- Calendar section
- Setlist/requests placeholder
- Promote-me reward concept form
- Fan upload concept area
- Downloads section
- Booking form

## Files
- `index.html`
- `styles.css`
- `script.js`
- `assets/README.txt`
- `transcript/chat_so_far.txt`

## Notes
- Audio sources are placeholders. Add files under `assets/audio/` and set the `src` values in `script.js`.
- Uploads are front-end demo only. Production needs cloud storage, moderation, auth, and database support.
- Payments are not wired up. Connect the paywall button to Stripe, Square, PayPal, or another payment flow.
- This package does not include scraped media from the live site.

## Historical next-phase notes
1. Replace placeholder songs and media
2. Add real event data
3. Add payment checkout and credit tracking
4. Add admin dashboard for songs, events, photos, and fan uploads
5. Convert this into React/Next.js if needed
