# Quibly notes

## Run it

```bash
python3 server.py
```

Then open http://127.0.0.1:8000 in a browser.

## What's done

- Version 1 turns notes into a short AI study quiz with answer choices, XP, and bonus challenges.
- Notes can be pasted, typed, or uploaded as a TXT/MD file before building the game.
- The layout now opens with a warmer welcome, a low-pressure start cue, and encouraging quiz feedback.
- The visual system now uses softer mint, peach, lavender, and navy colors with a rounder, friendlier type hierarchy.
- The OpenAI key is read only by the local server from `.env`; it is never sent to the page.
- The AI receives the full project brief from `BRIEF.md` as its instructions on every game request.
- AI instructions now treat uploaded text as untrusted content, stay grounded in the notes, handle off-topic and unsafe requests safely, and avoid silently adding outside facts.
- Sample notes and generated games save in browser localStorage through one small file: `public/storage.js`.
- Saves on this computer only for now.
- OpenAI model: `gpt-5.6-luna`.

## Maybe Later

- Add a report-a-mistake button and a teacher review view.
- Add a break timer and more game types.
- Replace browser storage with a real database.
- Add a small project demo mode for the 4-minute video.
