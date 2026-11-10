# Quibly notes

## Run it

```bash
python3 server.py
```

Then open http://127.0.0.1:8000 in a browser.

## What's done

- Version 1 turns notes into a short AI study quiz with answer choices, XP, and bonus challenges.
- The OpenAI key is read only by the local server from `.env`; it is never sent to the page.
- The AI receives the full project brief from `BRIEF.md` as its instructions on every game request.
- Sample notes and generated games save in browser localStorage through one small file: `public/storage.js`.
- Saves on this computer only for now.
- OpenAI model: `gpt-5.6-luna`.

## Maybe Later

- Add a report-a-mistake button and a teacher review view.
- Add a break timer and more game types.
- Replace browser storage with a real database.
- Add a small project demo mode for the 4-minute video.
