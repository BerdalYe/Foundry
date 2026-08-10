export type Example = {
  label: string;
  kind: string;
  prompt: string;
};

/** Short chips under the hero composer — one tap to fill the box. */
export const QUICK_PROMPTS: Example[] = [
  {
    label: "Coffee roaster",
    kind: "Shop",
    prompt:
      "A landing page for a small-batch coffee roaster in Oslo called Nordlys Kaffe. Warm editorial feel, a hero with the current single-origin, three brew guides, a subscription section with three tiers and prices in NOK, and a visit-us block with opening hours and a map placeholder.",
  },
  {
    label: "Developer portfolio",
    kind: "Personal",
    prompt:
      "A one-page portfolio for a backend engineer. Quiet, typographic, almost no colour. Short intro, four selected projects with the problem and the result for each, a skills strip, a writing list, and a contact section. Include a working dark mode toggle.",
  },
  {
    label: "SaaS pricing page",
    kind: "Product",
    prompt:
      "A pricing page for a time-tracking SaaS. Three plans with a monthly/yearly toggle that actually updates the prices, a feature comparison table, a short FAQ accordion, and a testimonial row. Clean and trustworthy, blue-grey palette.",
  },
  {
    label: "Podcast",
    kind: "Media",
    prompt:
      "A site for a weekly interview podcast about city architecture called Concrete Hours. Latest episode up top with show notes, an archive of past episodes with dates and durations, two host bios, subscribe links for the main apps, and a short pitch for prospective guests. Dark, typographic, one bright accent.",
  },
];

/** Longer, more ambitious examples shown in the gallery section. */
export const SHOWCASE: Example[] = [
  {
    kind: "Restaurant",
    label: "A neighbourhood trattoria",
    prompt:
      "A site for a family-run trattoria called Osteria Bianca. Full menu in three courses with prices, the family's story, a photo strip, opening hours, and a reservation form with date, time, and party size that validates before submitting. Terracotta and cream, serif headings.",
  },
  {
    kind: "Event",
    label: "A two-day design conference",
    prompt:
      "A conference site for a two-day design summit. Hero with dates and venue, a schedule with a tab per day, twelve speaker cards, ticket tiers with an early-bird badge, sponsor logos as inline SVG, and a venue section with travel notes. Bold, high-contrast, editorial grid.",
  },
  {
    kind: "Non-profit",
    label: "A river conservation charity",
    prompt:
      "A site for a river conservation charity. Impact numbers that count up when scrolled into view, three programme areas, a volunteer sign-up form, a donation block with preset amounts, and a transparency section showing where money goes. Calm blues and greens, trustworthy tone.",
  },
];
