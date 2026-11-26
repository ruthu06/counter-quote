# Draw a counter, quote a counter

Build a tool a countertop shop could use to **draw a counter and see its price**.

**We're not expecting a finished product. Please don't spend more than a few hours on this.** We want to see your reasoning, research, attention to detail and UI/UX skills. A few things done well beat everything done roughly.

**At a minimum:**
- Draw a rectangle, an L and a U
- Include things that affect the price, such as material, edges, corners and sinks
- Show a price, based on what you learn about how shops charge

**Optional, if you want to go further:**
- Angles (including legs that don't meet at 90°) and bumpouts
- Freehand shapes, or shapes with more than three legs

How it looks, how it works and what else you add are your choice. The starter app saves jobs; change anything in it.

**Use any AI tools you like.** We know AI can build a version of this by itself. We're interested in what you bring: what you looked into, what you decided and what you noticed. If we move forward, we'll ask you to walk us through it.

## Run it

**With Docker:**

```
docker compose up --build
```

**Without Docker** (.NET SDK 8 or newer, Node 20.19+ or 22.12+), in two terminals, both from the project folder:

```
cd backend/CounterQuote.Api
dotnet run
```

```
cd frontend
npm install
npm run dev
```

Then open http://localhost:5173. Use one way or the other, not both at once.

On Windows, if you see "An Application Control policy has blocked this file", use Docker.

Stuck on setup, or have a question? Reply to our email and we'll answer within a day.

## Changing what gets saved

Jobs save to a SQLite database that is created on first run, so there's nothing to install. It only stores the basics of a job. Add whatever your design needs; `DEVELOPMENT.md` has the steps.

## When you're done

Fill in `ANSWERS.md`, zip your project without `node_modules`, `bin` and `obj`, and make sure it runs from a fresh unzip. Upload it to the link in our email by the date there. Please don't attach it; mail filters block it.
