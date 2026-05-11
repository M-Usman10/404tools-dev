# 404tools.dev

404tools.dev is a collection of fast, focused developer utilities built for everyday engineering tasks. The site is designed to be free, lightweight, and usable without accounts or setup.

## Live Tools

- **Cron Vision** - Visualize cron expressions, read them in plain English, and preview the next scheduled runs.
- **Confusion Matrix Analyzer** - Paste ground truth and prediction labels to calculate accuracy, precision, recall, F1 score, macro and weighted averages, and class-level metrics.
- **Regex Tester** - Test regular expressions in real time with match highlighting, capture groups, flags, replacement preview, and JavaScript/Python syntax support.

More tools are listed on the homepage as upcoming additions.

## Tech Stack

- [Next.js](https://nextjs.org/) App Router
- [React](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Radix UI](https://www.radix-ui.com/) primitives
- [Lucide React](https://lucide.dev/) icons
- [Vercel Analytics](https://vercel.com/analytics)

## Getting Started

Install dependencies:

```bash
pnpm install
```

Run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

```bash
pnpm dev
```

Starts the local development server.

```bash
pnpm build
```

Creates a production build.

```bash
pnpm start
```

Runs the production build locally.

```bash
pnpm lint
```

Runs ESLint for the project.

## Project Structure

```text
app/
  page.tsx                    Homepage and tool directory
  cronvis/                    Cron Vision tool
  confusion-matrix/           Confusion Matrix Analyzer
  regex/                      Regex Tester
  layout.tsx                  Root layout, metadata, analytics
  robots.ts                   Robots configuration
  sitemap.ts                  Sitemap configuration

components/
  cron-input.tsx              Cron expression input UI
  field-reference.tsx         Cron field reference
  human-readable.tsx          Cron description output
  next-runs.tsx               Upcoming cron run list
  quick-examples.tsx          Cron examples
  ui/                         Shared UI components

lib/
  cron-parser.ts              Cron parsing and scheduling utilities
  confusion-matrix.ts         Model evaluation calculations
  regex-utils.ts              Regex helpers and syntax utilities
  utils.ts                    Shared utility helpers

public/
  icon.svg                    Site icon
  apple-icon.png              Apple touch icon
```

## Notes

- The app uses a dark, minimal interface across all tools.
- Tools run client-side where possible, keeping interactions quick and private.
- The homepage links to live tools and marks planned tools as coming soon.
