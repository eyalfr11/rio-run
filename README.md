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

## Menus and results

Use the Menu button or Esc to pause, resume, start over or return to the title screen and choose a different difficulty. The visible Stop game button ends the current run and immediately returns to difficulty selection. Exit game ends the run, suspends rendering and audio, and shows an exit screen. Browsers may require the player to close the tab manually. The exit screen also offers a separate link to the Rio website.

Enter an optional player name on the title screen. Completed and abandoned runs appear in Recent results. Each difficulty has its own fastest-victory leaderboard. Scores are saved in this browser's localStorage only; they are not shared across devices.

## Publishing an update

When Netlify is connected to this GitHub repository and deploys `main`, a new commit on `main` normally starts a new production deployment automatically. In the existing Netlify project, check Deploys. If necessary, use Trigger deploy > Deploy site (or the equivalent Deploy without cache action). Keep the publish directory set to `dist` and the build command empty.
