# RIO RUN — מלך הבריחות

משחק מרדף בדפדפן, עם שליטה במגע ובמקלדת. אין צורך בשרת יישום או במפתח API.

## Netlify

חברו את הענף המכיל את הקובץ הזה ל־Netlify:

- Base directory: leave empty
- Build command: leave empty
- Publish directory: `dist`

`netlify.toml` כולל את הגדרות הפרסום. קובצי המשחק והנכסים נמצאים ב־`dist` ומוכנים לפרסום.

## Local preview

```sh
python3 -m http.server 4173 --directory dist
```

## Tests

```sh
npm test
```

## Controls

- Left / right arrows or horizontal swipe: change lane.
- Space / up arrow / upward swipe: jump.
- Down arrow / downward swipe: duck.
- Esc: pause / resume.

Collect 8 snacks in Easy, 12 in Normal, or 16 in Hard to catch Rio. Hits cost one heart and one collected snack. Three hearts per run.

## Assets

Attribution and licenses: `dist/assets/CREDITS.txt`, `THREE-LICENSE.txt`, `RUNNER-LICENSE.txt`.
