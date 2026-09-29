/**
 * The in-app Help guides, as data. One guide per slug in GUIDE_SLUGS
 * (./where.ts). The pages under /help render these, scripts/build-guides.ts
 * writes them to docs/guides/*.md, scripts/help-screenshots.ts captures the
 * screenshots they reference, and scripts/check-guides.ts checks them.
 *
 * Writing rules:
 * - The product's name is always the token {app}. It is replaced with the
 *   brand's name when a guide is shown (resellers rebrand the platform).
 * - Plain words, second person, short paragraphs. **Bold** marks the exact
 *   words of a button, tab or field on screen (the only markup supported).
 * - "everyone" guides never name an AI vendor or model: say "the AI".
 */
import { GUIDE_SLUGS, type GuideSlug } from "./where";

export type Audience = "everyone" | "operators" | "admin";
export type GuideGroup = "build" | "publish" | "account" | "platform";

/** What scripts/help-screenshots.ts does before taking a screenshot. */
export type ShotAction =
  | { click: string }
  | { waitFor: string }
  | { pause: number };

/**
 * How to capture a screenshot. `path` may contain :project, :page, :flow and
 * :design, filled with the first app, page, flow and AI design the signed-in
 * account has.
 */
export type ShotSpec = {
  path: string;
  /** A selector to wait for before doing anything else. */
  waitFor?: string;
  /** Clicks and waits, in order, after the page is ready. */
  actions?: ShotAction[];
  /** Capture only this element instead of the whole window. */
  clip?: string;
};

export type Screenshot = {
  /** "<slug>-<n>.webp", stored in public/help/. */
  file: string;
  alt: string;
  caption: string;
  shot: ShotSpec;
};

export type GuideSection = {
  heading: string;
  body: string[];
  /** Numbered steps for a procedure. */
  steps?: string[];
  /** A short list of points, for "Good to know" and similar. */
  bullets?: string[];
  screenshot?: Screenshot;
};

export type Guide = {
  slug: GuideSlug;
  title: string;
  /** One sentence. */
  summary: string;
  audience: Audience;
  group: GuideGroup;
  sections: GuideSection[];
  related: GuideSlug[];
};

export const GROUPS: Array<{ id: GuideGroup; title: string }> = [
  { id: "build", title: "Build your app" },
  { id: "publish", title: "Publish and grow" },
  { id: "account", title: "Your account" },
  { id: "platform", title: "Running the platform" },
];

const GUIDE_LIST: Guide[] = [
  // ── Build your app ────────────────────────────────────────────────────
  {
    slug: "getting-started",
    title: "Getting started",
    summary: "Find your way around {app} and make your first app, whichever way suits you.",
    audience: "everyone",
    group: "build",
    sections: [
      {
        heading: "Your dashboard",
        body: [
          "When you sign in you land on your dashboard. You can always get back to it with **My apps** in the top bar.",
          "Under **Your apps**, each app has a card with a small picture of its home page, how many pages and flows it has, and whether it is **Live** (published) or a **Draft** (only you can see it). Use **All apps**, **Live** and **Drafts** and the **Find an app…** box to narrow the list.",
          "Click the picture on a card to carry on editing. Click the app's name to open its Overview. The line beside **Your apps** shows your plan, how many apps you have, and how many AI actions you've used this month. Click it to open **Billing & plan**.",
        ],
        screenshot: {
          file: "getting-started-1.webp",
          alt: "The dashboard, with the idea box at the top and a card for each app below.",
          caption: "Your dashboard. Each card is one of your apps.",
          shot: { path: "/dashboard", waitFor: "#projects-heading" },
        },
      },
      {
        heading: "Six ways to start an app",
        body: ["Pick whichever suits you. Every way ends with an app you can keep changing in the same tools."],
        bullets: [
          "**Describe it.** Type what you want in your own words. The AI suggests a plan you can check and change, then builds the pages, forms and data.",
          "**AI Designer.** Chat with the AI and shape your app step by step. See the guide Design with the AI Designer.",
          "**Templates.** Start from a finished design, like a restaurant or a portfolio, and change every word, picture and colour.",
          "**Copy a website.** Bring up to 30 pages of a website you own into a new app you can edit.",
          "**Blank app.** Start with a simple page and build it yourself with drag-and-drop blocks.",
          "**Import an app.** Bring back an app from a backup .zip file, made on this server or another one.",
        ],
      },
      {
        heading: "Describe your app and check the plan",
        body: [
          "If the AI isn't set up on this server, this way and the AI Designer aren't offered. Start from a template instead.",
        ],
        steps: [
          "On your dashboard, type a sentence about your app in the box, for example “Bookings for my dog walking business”, and press **Plan my app**. You can also press **More ways to start** and use the big box there.",
          "Say who uses the app and what they do in it. Stuck? Tap one of the example ideas under the box, then change it.",
          "Wait a moment while the AI reads your idea. Nothing is built yet.",
          "Check the plan under **Here's what I'll build**: the app's name, its look (click the colour swatch to pick another), its **Pages**, **What it saves** and **I assumed**. Remove a page you don't want with its bin icon.",
          "Want something different? Type it under **Want something different?**, for example “Add a prices page”, and press **Update plan**.",
          "Press **Build my app**. It usually takes a few minutes. You can leave the page: the build keeps going and will be there when you come back.",
          "When it's ready, your app opens in the page editor with a short welcome.",
        ],
        screenshot: {
          file: "getting-started-2.webp",
          alt: "The new app screen, asking What do you want to make?, with a large text box and example ideas.",
          caption: "Describe your app in your own words. You see a plan before anything is built.",
          shot: { path: "/new", waitFor: "main textarea, main h1" },
        },
      },
      {
        heading: "The other ways to start",
        body: [
          "**Templates.** Click a template to see it bigger, type a name for your app and press **Create app from this template**. Use the search box and the category buttons to narrow the list.",
          "**Copy a website.** Type the site's address, for example mybusiness.com, and press **Copy my site**. Only copy sites you own or have permission to use. Press **Stop** to cancel; nothing is saved.",
          "**Blank app.** Type a name and press **Create app**. You get a simple welcome page with your app's name to build on, plus pages for signing in and signing up.",
          "**Import an app.** Choose the backup .zip file, type a new name if you like, and press **Import app**. You get a copy with its pages, flows, data and pictures. Passwords of the app's own members aren't in backups, so they use Forgot password once.",
        ],
      },
      {
        heading: "Your app's Overview",
        body: [
          "Each app has tabs along the top: **Overview**, **Pages**, **Features**, **Flows**, **Data**, **Notifications**, **Theme**, **Domains** and **Mobile app**, with **Preview** and **Publish** on the right. Apps made with the AI Designer have a **Designer** tab instead of Overview.",
          "The Overview shows whether your app is live and its address, a **Launch checklist** of the next things to do, a code to scan to open it on your phone, your app icon, the latest things visitors sent you, and email alerts. **Continue editing** takes you back to your pages.",
        ],
        screenshot: {
          file: "getting-started-3.webp",
          alt: "An app's Overview tab, with the app's name, counts of pages and flows, and the launch checklist.",
          caption: "The Overview: your app at a glance, with a checklist of next steps.",
          shot: { path: "/projects/:project", waitFor: "#launch-heading" },
        },
      },
      {
        heading: "Good to know",
        body: [],
        bullets: [
          "Your work saves as you go. There's no Save button in the page editor.",
          "Nothing is public until you publish. **Preview** lets you try your app first.",
          "To delete an app, use the bin icon on its card on the dashboard. Download a backup first: deleting can't be undone.",
          "Your plan may limit how many apps you can make. When you reach it, see **Billing & plan**.",
          "Hold your mouse over a button to see a short tip about it. You can turn tips off in **Settings**.",
        ],
      },
    ],
    related: ["ai-designer", "page-editor", "features", "publishing"],
  },
  {
    slug: "ai-designer",
    title: "Design with the AI Designer",
    summary: "Describe your app in plain words, then shape it by chatting with the AI and clicking on what you want changed.",
    audience: "everyone",
    group: "build",
    sections: [
      {
        heading: "Start a design",
        body: [],
        steps: [
          "Click **Designer** in the top bar. On a phone, go to **More ways to start** on your dashboard and choose **Design it together**.",
          "Under **What do you want to make?**, describe your app. Say who it's for and what visitors should be able to do, like book a time or send a message. You can also tap one of the example ideas and change it.",
          "Press **Design it**.",
          "The AI may ask **A few quick questions first**. Tap an answer, type your own, or skip any of them. Press **Build it**, or **Skip questions** to let the AI decide.",
        ],
        screenshot: {
          file: "ai-designer-1.webp",
          alt: "The AI Designer home, with a box to describe your app, example ideas and a list of your designs.",
          caption: "Describe what you want, then press Design it.",
          shot: { path: "/designer", waitFor: "#designer-prompt" },
        },
      },
      {
        heading: "Watch it build",
        body: [
          "While the AI works, the conversation on the left shows **Working on it…** with each step as it happens, and the preview on the right fills in. A first design can take a few minutes.",
          "To stop part-way, press the square stop button next to the message box. Nothing from that run is kept.",
          "Once the first build is done, your design has its own app. **Open app** at the top of the conversation takes you to it, where you'll find its data, flows and publishing.",
        ],
      },
      {
        heading: "Ask for changes",
        body: [],
        steps: [
          "Type what you want changed in the **Ask for a change** box, in your own words. For example: “make the header darker” or “add a page with our prices”.",
          "Press Enter, or the send button. Shift+Enter starts a new line.",
          "The AI updates the design and saves it as a new version.",
        ],
        screenshot: {
          file: "ai-designer-2.webp",
          alt: "A design open in the AI Designer: the conversation on the left and a preview of the app on the right.",
          caption: "The conversation is on the left, the live preview on the right.",
          shot: { path: "/designer/:design", waitFor: "iframe[title='Design preview']", actions: [{ pause: 2500 }] },
        },
      },
      {
        heading: "Point at what you want changed",
        body: ["Sometimes it's easier to show the AI than to describe it."],
        steps: [
          "Press **Comment** above the preview. It changes to **Click anything to comment**.",
          "Click the part of the preview you want changed.",
          "Type what should change, for example “make this bigger”, and press **Add**. Your note waits above the message box.",
          "Add as many notes as you like, then press send to make all the changes at once. To drop a note, press its x.",
        ],
      },
      {
        heading: "Check every page and screen size",
        body: [
          "Use the **Page** menu above the preview to see each page of your design. The three screen buttons show it at computer, tablet and phone width. The arrow button opens the page on its own in a new tab.",
          "On a phone, switch between **Conversation** and **Preview** at the top of the screen.",
        ],
      },
      {
        heading: "Go back to an earlier version",
        body: ["Every change is saved as a version, so you can always go back."],
        steps: [
          "Press **Versions**. Every version is listed, newest first.",
          "Press **View** to show an older version in the preview. You can also press **See this version** under a message in the conversation.",
          "Press **Restore** (or **Restore it** in the yellow bar) to make that version the current one. The version you had stays in the list, so you can switch back.",
          "To stop looking at an old version, press **Back to the current version**.",
        ],
        screenshot: {
          file: "ai-designer-3.webp",
          alt: "The Versions list open next to the preview, with View and Restore buttons for each version.",
          caption: "Versions: look at any earlier version and bring it back.",
          shot: {
            path: "/designer/:design",
            waitFor: "iframe[title='Design preview']",
            actions: [{ click: "button:has-text('Versions')" }, { waitFor: "aside[aria-label='Versions']" }, { pause: 800 }],
          },
        },
      },
      {
        heading: "Download it, or move it to the page builder",
        body: [
          "**Download** saves every page of your design as one .zip file.",
          "**Move to page builder** hands the app over to the drag-and-drop page editor. After that the AI Designer can't change it any more. If you want to keep designing with the AI, press **Make a copy to keep designing**: you get a separate copy, and the app in the page builder stays as it is.",
        ],
      },
      {
        heading: "Your designs",
        body: [
          "The Designer home lists **Your designs**. Click a card to open one. The **…** button on a card lets you **Rename**, **Make a copy** or **Delete** it.",
          "Deleting a design also deletes its app, unless the app was moved to the page builder. It can't be undone.",
        ],
      },
      {
        heading: "Good to know",
        body: [],
        bullets: [
          "Asking the AI for a design or a change uses your plan's monthly AI allowance, if it has one.",
          "In a Designer app, the pages come from the design. Change them here, not in the page editor.",
          "Your app's data, flows, domains and publishing are on its tabs, the same as any other app. Publish it with the **Publish** button.",
        ],
      },
    ],
    related: ["getting-started", "publishing", "page-editor"],
  },
  {
    slug: "page-editor",
    title: "Edit your pages",
    summary: "Change words, pictures and layout by clicking and dragging, or ask the AI to do it for you.",
    audience: "everyone",
    group: "build",
    sections: [
      {
        heading: "Find your way around",
        body: [
          "Open the **Pages** tab. On the left are **Blocks**, **Features** and **Assets** (free photos). In the middle is your page. On the right are **Design**, **Layers**, **Settings** and **Theme**.",
          "The bar above your page has undo and redo, whether your work is saved, the screen size buttons and **Preview**. The panel buttons at each end hide or show the side panels when you want more room.",
        ],
        screenshot: {
          file: "page-editor-1.webp",
          alt: "The page editor: blocks on the left, the page in the middle and design settings on the right.",
          caption: "The page editor. Click anything on your page to change it.",
          shot: { path: "/projects/:project/pages/:page/edit", waitFor: ".gjs-frame", actions: [{ pause: 2500 }] },
        },
      },
      {
        heading: "Change words and pictures",
        body: [
          "Click any words on the page and type to change them.",
          "Double-click a picture to swap it for another one. You can also pick a picture and then tap a photo in **Assets**. Double-click an icon to choose a different icon.",
        ],
      },
      {
        heading: "Add blocks",
        body: [],
        steps: [
          "Click the part of your page you want the new piece to go under.",
          "In **Blocks** on the left, find what you want. Blocks are grouped, for example Layout, Sections, Content, Forms and Media. Type in **Search blocks...** to find one fast, like “button” or “photo”.",
          "Tap the block to add it below the part you picked, or drag it to exactly where you want it.",
        ],
      },
      {
        heading: "Select, move and delete",
        body: [
          "Click something on your page to select it. Its name shows at the top of the right-hand panel, and a small toolbar appears next to it: **Select the part around this**, **Move up**, **Move down**, **Drag to move**, **Duplicate** and **Delete**.",
          "The **Layers** tab lists every piece of your page in order. Click a row to select a piece that's hard to click, or drag rows to move pieces. The eye icon hides a piece while you work on the rest.",
        ],
      },
      {
        heading: "Change how things look",
        body: [
          "Select something and open **Design** on the right. Change its text, colours, spacing, size and corners, and the page updates straight away.",
          "**Advanced** shows more options, like fonts, shadows and how pieces line up inside a box, plus styles for when the mouse is over something. For colours and fonts across your whole app, use **Theme**.",
        ],
      },
      {
        heading: "Settings for links, buttons, forms and lists",
        body: [
          "Select a link, picture, button, form or list and open **Settings** on the right. For example:",
        ],
        bullets: [
          "**Goes to** sets where a link takes people. Use /page-name for your own pages, or a full https:// address for another site.",
          "**Picture description** describes a picture for people who can't see it, and for search engines.",
          "**When sent, run** (on a form) picks the flow that runs when someone sends it. **When pressed, run** does the same for a button.",
          "**Show items from** (on a list) picks where the list gets its items, like your bookings or products.",
        ],
      },
      {
        heading: "Ask the AI",
        body: [],
        steps: [
          "Press **Ask AI** at the bottom right.",
          "To change just one part, select it on the page first. The panel then says **Changes apply to the selected…**. Press **Whole page instead** to change the whole page.",
          "Type what you want, like “add a pricing section”, and press Enter or **Send**. You can attach a picture too, like a screenshot of a design you like.",
          "The page changes in the editor. If you don't like it, press undo.",
        ],
        screenshot: {
          file: "page-editor-2.webp",
          alt: "The AI Assistant panel open over the page editor, with suggested changes to try.",
          caption: "Ask AI: say what to change and it changes the page for you.",
          shot: {
            path: "/projects/:project/pages/:page/edit",
            waitFor: ".gjs-frame",
            actions: [{ pause: 2000 }, { click: "button:has-text('Ask AI')" }, { waitFor: "text=AI Assistant" }, { pause: 600 }],
          },
        },
      },
      {
        heading: "Your pages",
        body: [
          "Click the page name at the top, next to **EDITING**, to see **Your pages**. Click a page to open it. Your changes on the page you're leaving are saved first.",
          "To add a page, press **Add page**, type its name and press **Add page** again. It shows up in your app's menu.",
          "Next to each page: the gear opens **Page settings** (rename it, choose who can see it, its place in the menu, or **Duplicate** it), the house makes it your home page, and the bin deletes it after you confirm. Deleting a page can't be undone.",
        ],
      },
      {
        heading: "Check it on a phone, then preview",
        body: [
          "The **Desktop**, **Tablet** and **Mobile** buttons show your page at each size. Always check Mobile: most visitors use phones.",
          "**Preview** opens the page in a new tab so you can try it, with its buttons and forms working. It shows your latest changes. Visitors don't see them until you publish.",
        ],
      },
      {
        heading: "Undo and saving",
        body: [
          "The curved arrows at the top left undo and redo your last changes, including changes the AI made.",
          "Your changes save by themselves. The bar shows **Saving…** and then **Saved**. If it says **Not saved**, check your connection: it keeps trying, and **Retry** tries again straight away. If your changes didn't reach the server before you closed the tab, you'll be offered **Restore** the next time you open the page.",
        ],
      },
      {
        heading: "Good to know",
        body: [],
        bullets: [
          "Changes stay in your draft. Visitors see them after you publish.",
          "Apps made with the AI Designer get their pages from the design, so change them in the Designer.",
          "If a ready-made block asks **Wire this up?**, **Yes, connect it** sets up a place to keep what people send and connects the form. **No, I'll handle it** adds the block as it is.",
        ],
      },
    ],
    related: ["look-and-feel", "features", "members-and-sign-in", "publishing"],
  },
  {
    slug: "look-and-feel",
    title: "Colours and fonts",
    summary: "Pick a ready-made theme, or set your own colours, fonts and corners for every page of your app.",
    audience: "everyone",
    group: "build",
    sections: [
      {
        heading: "Pick a theme",
        body: [],
        steps: [
          "Open the **Theme** tab.",
          "Look through **Light themes** and **Dark themes**.",
          "Click one. The **Live preview** on the right shows it straight away. Switch between **Your home page** and **Sample** to see it on different things.",
          "That's it: changes save by themselves, and **Saved** appears at the top.",
        ],
        screenshot: {
          file: "look-and-feel-1.webp",
          alt: "The Theme tab with light and dark theme choices on the left and a live preview on the right.",
          caption: "Click a theme and the preview updates straight away.",
          shot: { path: "/projects/:project/theme", waitFor: "text=Live preview", actions: [{ pause: 1500 }] },
        },
      },
      {
        heading: "Make it your own",
        body: [
          "Under **Customize** you can change any part of the theme:",
        ],
        bullets: [
          "**Mode**: light or dark.",
          "**Body font** for normal text and **Display font** for headings. A sample line shows each one.",
          "**Colors**: **Primary** is your main colour, used for buttons and links. **Primary hover** is the shade when someone points at them; it follows Primary when you change it. Then **Accent**, **Background**, **Surface** and **Surface 2** (cards and panels), **Border**, **Text** and **Text muted**.",
          "**Corners**: **Radius** for buttons and cards, and **Radius sm** for small things. 0 is square; bigger numbers are rounder.",
        ],
      },
      {
        heading: "Change it while you edit",
        body: [
          "In the page editor, the **Theme** tab on the right has the same colour and font settings, so you can adjust them without leaving your page.",
        ],
      },
      {
        heading: "Good to know",
        body: [],
        bullets: [
          "The theme applies to every page of your app.",
          "Click a colour box to pick a colour, or type a colour code like #3366ff.",
          "**Reset** puts back the theme you had when you opened the Theme tab.",
          "Visitors see theme changes after you publish.",
        ],
      },
    ],
    related: ["page-editor", "publishing"],
  },
  {
    slug: "features",
    title: "Add features",
    summary: "Add ready-made parts like bookings, a shop or a blog, complete with their own pages and saved data.",
    audience: "everyone",
    group: "build",
    sections: [
      {
        heading: "What a feature is",
        body: [
          "A feature is a ready-made part of an app, like bookings, a shop, a contact form or a blog. Adding one gives your app new pages, the lists where it keeps what people send, and the flows that make its buttons and forms work. You can then change its pages like any other page.",
        ],
      },
      {
        heading: "Add a feature",
        body: [],
        steps: [
          "Open the **Features** tab.",
          "Search, for example “bookings” or “shop”, or pick a group like Commerce or Community.",
          "To see what a feature adds, open **Details** on its card. It says how many pages, lists of saved items and flows it adds.",
          "Click the card (**Add to my app**).",
          "Answer its few questions, if it has any. Fields marked * must be filled in. Your app's name is filled in for you where it asks for a business name.",
          "Press **Add to my app**. The editor opens on the feature's first page.",
        ],
        screenshot: {
          file: "features-1.webp",
          alt: "The Features tab: a search box, category buttons and a grid of features to add.",
          caption: "Pick a feature. Details shows what it adds.",
          shot: { path: "/projects/:project/modules", waitFor: "input[type='search']", actions: [{ pause: 800 }] },
        },
      },
      {
        heading: "Add a feature while editing",
        body: [
          "In the page editor, the **Features** tab on the left does the same thing. When the feature is added, a message says its pages are in the menu, with a button to **Open the new page**.",
        ],
        screenshot: {
          file: "features-2.webp",
          alt: "The Add a feature dialog asking a few questions, with Cancel and Add to my app buttons.",
          caption: "Answer a couple of questions and the feature is added.",
          shot: {
            path: "/projects/:project/modules",
            waitFor: "input[type='search']",
            actions: [{ click: "button:has-text('Add to my app')" }, { waitFor: "[role='dialog']" }, { pause: 600 }],
            clip: "[role='dialog']",
          },
        },
      },
      {
        heading: "Where to find what it added",
        body: [
          "Its pages are in your app's menu and in the page list in the editor. What it saves (for example bookings) is on the **Data** tab. Its flows are on the **Flows** tab. Pages meant only for you, like a list of bookings, are listed on the Overview under **Your app's admin area**.",
        ],
      },
      {
        heading: "Good to know",
        body: [],
        bullets: [
          "A card marked **Added** is already in your app. Adding it again makes another copy, with its own pages and lists.",
          "If a feature needs another one first, the message offers a button to add that one.",
          "Some features send email, and say **Needs email to be set up on the server**. If email isn't set up, ask whoever runs {app} for you.",
          "There's no one-step remove. You can delete the pages a feature added, like any page; what it saved stays on the Data tab.",
          "Adding a feature changes your draft. Visitors see it after you publish.",
        ],
      },
    ],
    related: ["page-editor", "forms-and-data", "flows"],
  },
  {
    slug: "forms-and-data",
    title: "Forms and your data",
    summary: "See, search, change and download everything your app saves, like messages, bookings and sign-ups.",
    audience: "everyone",
    group: "build",
    sections: [
      {
        heading: "Where form answers go",
        body: [
          "When someone sends a form, makes a booking or signs up, your app saves it as a row in a table. A table is like a spreadsheet: one row for each entry and one column for each answer. Tables are on the **Data** tab. The five newest entries also show on your app's Overview under **Latest submissions**.",
          "A form saves answers when it's connected to a flow that saves them. Forms that come with features, and forms in apps the AI builds, are already connected. For a form you add yourself, select it in the page editor, open **Settings** and choose a flow under **When sent, run**.",
        ],
      },
      {
        heading: "Open a table",
        body: [],
        steps: [
          "Open the **Data** tab.",
          "Click a table. Each one shows how many rows it has, or **Empty**.",
          "To go back to the list, press **All tables**.",
        ],
        screenshot: {
          file: "forms-and-data-1.webp",
          alt: "The Data tab listing the app's tables, each with its number of rows.",
          caption: "Everything your app saves, one table at a time.",
          shot: { path: "/projects/:project/data", waitFor: "main h1", actions: [{ pause: 800 }] },
        },
      },
      {
        heading: "Find, change and add rows",
        body: [
          "Type in **Search** to find rows. Click a column's name to sort by it. When there are lots of rows, use **Newer** and **Older** at the bottom.",
        ],
        steps: [
          "To change one answer, click it, type the new value and save.",
          "To change a whole row, press the pencil at the end of it.",
          "To add a row yourself, press **Add a row**.",
          "To delete rows, tick them, press **Delete** (it says how many rows) and then **Yes, delete**. Press **Keep them** if you change your mind.",
        ],
        screenshot: {
          file: "forms-and-data-2.webp",
          alt: "A table open on the Data tab, with a search box, Add a row and Download CSV buttons, and the rows below.",
          caption: "A table: search it, change it, or download it.",
          shot: {
            path: "/projects/:project/data",
            waitFor: "main h1",
            actions: [{ click: "ul[aria-label='Your tables'] li button" }, { waitFor: "text=Download CSV" }, { pause: 800 }],
          },
        },
      },
      {
        heading: "Download a copy",
        body: [
          "**Download CSV** saves the table as a file you can open in Excel, Numbers or Google Sheets. It downloads what you're looking at, so search or sort first if you only want some rows.",
        ],
      },
      {
        heading: "Get an email for every new entry",
        body: [
          "On your app's Overview, **Alerts** lists each table that collects things from visitors, with an On and Off switch. Alerts go to your account's email address, and you can add up to three more under **Also send to**. Press **Save alerts**, then **Send a test** to check it works.",
          "Alerts need email to be set up on the server. If it isn't, the card says so.",
        ],
      },
      {
        heading: "Privacy requests",
        body: [
          "People can ask what your app keeps about them, or ask for it to be deleted. Open **Privacy requests** on the Data tab to find one person by email or phone number, then **Download a copy** of their data or **Erase** it. People who asked to delete their account from your app are listed under **Waiting for your approval**.",
        ],
      },
      {
        heading: "Good to know",
        body: [],
        bullets: [
          "Deleting rows or erasing a person can't be undone.",
          "Some tables can only be viewed here, for example ones kept in a Google Sheet.",
          "**Advanced**, at the bottom of the Data tab, shows where your data is stored and lets you make new tables by hand. Most people never need it.",
          "A backup from the Publish tab includes every table and row.",
        ],
      },
    ],
    related: ["flows", "features", "members-and-sign-in"],
  },
  {
    slug: "flows",
    title: "Automate with flows",
    summary: "Make things happen by themselves when someone uses your app, like saving a booking and emailing you, or run jobs on a schedule.",
    audience: "everyone",
    group: "build",
    sections: [
      {
        heading: "What a flow is",
        body: [
          "A flow is a short list of steps your app follows by itself. Something happens (someone sends a form or presses a button, or it's a set time), your steps run (save the answers, send an email), and your visitor gets a result (a thank-you message).",
          "Apps the AI builds, and features you add, come with their flows already set up. You can open and change them like any flow.",
        ],
      },
      {
        heading: "Your flows",
        body: [
          "The **Flows** tab lists each flow with how it starts (with a form, with a request, or on a schedule) and how many steps it has. Click one to open it.",
          "Each flow has an **On** / **Paused** switch, on the list and inside the flow. A paused flow doesn't run: anything in your app that uses it, like a form, gets an error instead. Pausing and turning back on apply to your live app straight away, with no need to publish.",
        ],
        screenshot: {
          file: "flows-1.webp",
          alt: "The Flows tab listing the app's flows, each with how it starts and its number of steps.",
          caption: "Your app's flows.",
          shot: { path: "/projects/:project/flows", waitFor: "main h1" },
        },
      },
      {
        heading: "Make a flow",
        body: [],
        steps: [
          "On the Flows tab, press **New flow**, type a name like “Submit contact form” and press **Create**.",
          "The flow opens with its start step, **When the app calls this**.",
          "Under **Add step** on the left, click a step to add it. Type in **Find a step…** to search. Steps are grouped: Start, Saved data, Decisions and values, Send and connect, AI, Accounts and Finish.",
          "Connect the steps in the order they should run: drag from the right edge of one step to the next step.",
          "Click a step to set it up in the panel on the right, for example which table to save to.",
          "Your changes save by themselves.",
        ],
        screenshot: {
          file: "flows-2.webp",
          alt: "A flow open in the flow editor: steps to add on the left, connected steps in the middle, settings on the right.",
          caption: "Add steps on the left, connect them, and set each one up on the right.",
          shot: { path: "/projects/:project/flows/:flow", waitFor: ".react-flow", actions: [{ pause: 1500 }] },
        },
      },
      {
        heading: "Use what people typed",
        body: [
          "Most step settings let you insert values instead of typing fixed text. Under **From the request**, type the name of a form field, like email, and press **Add**. **From previous steps** lists values that earlier steps made, like the record a step found.",
        ],
      },
      {
        heading: "Connect a form or button",
        body: [],
        steps: [
          "Open the page in the page editor and select the form or button.",
          "Open **Settings** on the right.",
          "For a form, choose your flow under **When sent, run**. For a button, use **When pressed, run**. For a list, **Show items from** picks a flow that finds the items.",
        ],
      },
      {
        heading: "Common recipes",
        body: ["These are the usual shapes. Features set most of them up for you."],
        bullets: [
          "**Contact form that emails you**: When the app calls this, then **Add a record** (your messages table), then **Send an email** to yourself with the person's message inserted, then **Reply** with a thank-you.",
          "**Booking**: When the app calls this, then **Count or add up records** to count bookings at that time, then **If this, otherwise that**. If the time is free, **Add a record** and **Send an email** to confirm; if not, **Reply** that it's taken. The Bookings feature does all this for you.",
          "**Sign-in**: the Sign-in and accounts feature adds these flows. Signing up uses **Protect a password**, **Add a record** and **Sign the person in**. Signing in uses **Find records**, **Check a password** and **Sign the person in**.",
          "**Daily summary**: on the **Schedule** tab choose **On a schedule** and **Every day**, then **Count or add up records** and **Send an email** with the total.",
        ],
      },
      {
        heading: "Try it with a test run",
        body: [
          "Press **Test run** to run the flow once, straight away, with your latest changes. The result shows under the steps. It really does its steps, so it saves records and sends emails, and it appears in Activity.",
        ],
      },
      {
        heading: "See what happened",
        body: [
          "The **Activity** tab lists each time the flow ran: **Went through**, **Answered**, **Finished with a problem** or **Failed**. Press **Only problems** to see just the ones that went wrong, and open a run to see what the person sent.",
          "Problems also show on your app's Overview under **Problems in the last 24 hours**, and as a number on the app's card on your dashboard.",
        ],
        screenshot: {
          file: "flows-3.webp",
          alt: "The Activity tab of a flow, listing recent runs and whether each went through.",
          caption: "Activity: every run, and what went wrong if something did.",
          shot: { path: "/projects/:project/flows/:flow?tab=activity", waitFor: "#activity-heading", actions: [{ pause: 800 }] },
        },
      },
      {
        heading: "Run it on a schedule",
        body: [],
        steps: [
          "Open the flow's **Schedule** tab.",
          "Choose **On a schedule** instead of **When your app uses it**.",
          "Under **How often**, pick **Every few minutes**, **Every hour**, **Every day**, **Monday to Friday** or **Once a week**, then the time and your time zone.",
          "Save, then publish your app. Schedules only run in the published app.",
        ],
      },
      {
        heading: "Good to know",
        body: [],
        bullets: [
          "To remove a step, select it and press its bin, or press Delete on your keyboard.",
          "Flow changes are part of your draft. Visitors get them after you publish.",
          "**Send an email** only sends when email is set up on the server. If it isn't, your app's Overview warns you.",
          "The **Ask AI** step uses your plan's AI allowance each time it runs.",
          "Pausing or turning a flow back on applies straight away, including its schedule. You don't need to publish.",
          "Some plans don't include scheduled flows. The Schedule tab says so.",
          "**Web address (for developers)** is only needed to start a flow from outside {app}.",
        ],
      },
    ],
    related: ["forms-and-data", "members-and-sign-in", "publishing"],
  },
  {
    slug: "members-and-sign-in",
    title: "Members, sign-in and private pages",
    summary: "Let people make accounts in your app, and choose which pages everyone, signed-in members or only admins can open.",
    audience: "everyone",
    group: "build",
    sections: [
      {
        heading: "Sign-in pages",
        body: [
          "The **Sign-in and accounts** feature gives your app **Log in**, **Sign up** and **Profile** pages, and the flows behind them. New apps usually have it already. If yours doesn't, add it from the Features tab.",
          "People who sign up are members of your app. Their accounts are separate from your own {app} account.",
        ],
      },
      {
        heading: "Make a page private",
        body: [],
        steps: [
          "In the page editor, click the page name at the top to open **Your pages**.",
          "Press the gear next to the page (**Page settings**).",
          "Under **Who can see this page**, choose **Everyone**, **Signed-in people** (visitors sign in first; anyone can make an account) or **Admins only** (only you and the people you make admins).",
          "Press **Save**.",
        ],
        screenshot: {
          file: "members-and-sign-in-1.webp",
          alt: "The Page settings dialog, with the page's name, who can see it, and its place in the menu.",
          caption: "Page settings: choose who can open the page.",
          shot: {
            path: "/projects/:project/pages/:page/edit",
            waitFor: ".gjs-frame",
            actions: [
              { click: "button[aria-controls='editor-page-list']" },
              { waitFor: "#editor-page-list" },
              { click: "button[aria-label^='Page settings for']" },
              { waitFor: "[role='dialog']" },
              { pause: 800 },
            ],
            clip: "[role='dialog']",
          },
        },
      },
      {
        heading: "The menu",
        body: [
          "In **Page settings**, **Show in menu** puts a link to the page in your app's menu, and **Move up** and **Move down** set its place. The home page always comes first. A page that isn't in the menu can still be opened by anyone with its link, if they're allowed to see it.",
        ],
      },
      {
        heading: "Your app's admin area",
        body: [
          "On your app's Overview, **Your app's admin area** lists the pages that are only for you and your team, like a list of bookings. Click one to open it without signing in to your app. Before you publish, they open in Preview.",
        ],
      },
      {
        heading: "Give your team an admin login",
        body: [],
        steps: [
          "On your app's Overview, find **Admin logins for your team**.",
          "Type their **Email** and a **Password** of at least 10 characters.",
          "Press **Add admin**. They can now sign in on your app's sign-in page and open its admin pages.",
        ],
        screenshot: {
          file: "members-and-sign-in-2.webp",
          alt: "The Your app's admin area card on the Overview, with admin pages and a form to add an admin login.",
          caption: "Open your admin pages, or give someone an admin login.",
          shot: { path: "/projects/:project", waitFor: "#app-admin", clip: "#app-admin" },
        },
      },
      {
        heading: "Good to know",
        body: [],
        bullets: [
          "Using the email of someone who already has an account in your app makes them an admin and changes their password.",
          "If a page is private but your app has no sign-in page yet, only you can open it. Page settings warns you.",
          "Changes to who can see a page are part of your draft. Publish to apply them.",
          "Members can delete their own account. Requests to delete show on the Data tab under **Privacy requests**.",
          "Members' passwords aren't in backups. After an import, members use Forgot password once.",
        ],
      },
    ],
    related: ["page-editor", "flows", "forms-and-data"],
  },

  // ── Publish and grow ──────────────────────────────────────────────────
  {
    slug: "publishing",
    title: "Publish and share your app",
    summary: "Put your app online, share its link, update it safely and bring back an earlier version if you need to.",
    audience: "everyone",
    group: "publish",
    sections: [
      {
        heading: "Draft and live",
        body: [
          "You always work on a draft. Visitors see the version you last published. Your changes, including the AI's, stay in the draft until you publish again, so nobody sees half-finished pages.",
        ],
      },
      {
        heading: "Publish for the first time",
        body: [],
        steps: [
          "Press **Publish** at the top right of your app's tabs.",
          "Press **Publish app**.",
          "You'll see **Your app is live. Ready to share.** and the status changes to **Live**.",
        ],
        screenshot: {
          file: "publishing-1.webp",
          alt: "The Publish tab showing the app's status, the publish button and its web address.",
          caption: "Publish, and copy your app's link to share it.",
          shot: { path: "/projects/:project/publish", waitFor: "main h1" },
        },
      },
      {
        heading: "Share the link",
        body: [
          "Your app's web address is on the Publish tab, with a button to copy it. On the Overview there's a code you can scan with your phone's camera to open it.",
          "**Search and sharing** sets the description search engines and chat apps show with your link. Turn on **Hide from search engines** if you don't want your app listed on Google; anyone with the link can still open it.",
        ],
      },
      {
        heading: "Publish your changes",
        body: [
          "When you've changed something since publishing, the status says **Live · you have unpublished changes**. Press **Publish changes** to make them live. When there's nothing new, the button says **Up to date**.",
          "Want to try your changes first? **Preview**, at the top right, opens your draft in a new tab. Only you can open it.",
        ],
      },
      {
        heading: "Go back to an earlier version",
        body: ["Every time you publish, the version is kept under **Release history**, newest first, with the live one marked **Live**."],
        steps: [
          "Find the version you want under **Release history**.",
          "Press **Make live** and confirm.",
          "Visitors see that version straight away. Your draft isn't changed, so you can fix things and publish again.",
        ],
        screenshot: {
          file: "publishing-2.webp",
          alt: "The Release history list, with a Make live button next to earlier versions.",
          caption: "Release history: bring back any recent version.",
          shot: { path: "/projects/:project/publish", waitFor: "main h1", clip: "xpath=//h2[normalize-space()='Release history']/.." },
        },
      },
      {
        heading: "Take it offline",
        body: [
          "**Take offline** stops visitors opening your app until you publish again. Nothing is deleted.",
        ],
      },
      {
        heading: "Back up or move your app",
        body: [
          "**Download backup (.zip)** saves one file with every page, flow, table and row, your theme and your pictures. Keep it somewhere safe, or bring it back with **Import an app** when you start a new app, here or on another {app} server. Members' passwords aren't included.",
        ],
      },
      {
        heading: "Install it on computers and phones",
        body: [
          "Under **Install on devices**: **Download offline app (.zip)** gives a copy that works on one computer without the internet, keeping its data on that computer. **Desktop shortcut (online)** puts a shortcut to your live app on a Windows or Mac desktop. For phones, see the guide Phone apps and notifications.",
        ],
      },
      {
        heading: "Good to know",
        body: [],
        bullets: [
          "Your plan may limit how many apps you can have published at once.",
          "Release history shows your 20 most recent versions.",
          "Scheduled flows only run once your app is published.",
          "You can connect your own web address on the Domains tab.",
        ],
      },
    ],
    related: ["custom-domains", "phone-apps", "getting-started"],
  },
  {
    slug: "custom-domains",
    title: "Use your own domain",
    summary: "Put your app on a web address you own, like www.yourbusiness.com.",
    audience: "everyone",
    group: "publish",
    sections: [
      {
        heading: "Before you start",
        body: [
          "You need a domain name you've bought from a domain company, and a way to change its DNS settings. DNS is the address book of the internet: two entries there tell it that your domain belongs to your app. Your domain company's website has a page for it, often called DNS, DNS records or zone.",
          "Your app keeps its free address too.",
        ],
      },
      {
        heading: "Connect your domain",
        body: [],
        steps: [
          "Open the **Domains** tab.",
          "Type your address, for example www.yourbusiness.com (without https://), and press **Add domain**.",
          "You'll see two records to add: a CNAME (or A) record and a TXT record. Each has a **Name / host** and a **Value / points to**. Click a value to copy it.",
          "In another tab, sign in to your domain company, open the DNS settings for your domain, and add both records exactly as shown.",
          "Come back and press **Check now**. When both records are found, it says **Connected**, and visitors can use your address.",
        ],
        screenshot: {
          file: "custom-domains-1.webp",
          alt: "The Domains tab with a box to add a domain and the DNS records to add at your domain company.",
          caption: "Add your domain, then copy the two records to your domain company.",
          shot: { path: "/projects/:project/domains", waitFor: "main h1" },
        },
      },
      {
        heading: "If it doesn't connect yet",
        body: [],
        bullets: [
          "DNS changes usually show up within minutes, but can take a few hours. Press **Check now** again later.",
          "The check says which record it can't find yet: the TXT record, or the one that points your domain here.",
          "Some domain companies add your domain to the end of the name by themselves. If yours does, type only the first part of the name, like www or _verify.www.",
          "For an address without www (yourbusiness.com), some domain companies don't allow a CNAME record. Use an A record pointing to this server's IP address instead; ask whoever runs {app} for you for the address.",
        ],
      },
      {
        heading: "Disconnect a domain",
        body: [
          "Press the bin next to the domain and confirm. Your app stays at its free address.",
        ],
      },
      {
        heading: "Good to know",
        body: [],
        bullets: [
          "A domain can only be connected to one app.",
          "Your plan may limit how many domains you can connect.",
          "Visitors see your published app at your domain, so publish before you share it.",
        ],
      },
    ],
    related: ["publishing", "phone-apps"],
  },
  {
    slug: "phone-apps",
    title: "Phone apps and notifications",
    summary: "Put your app on people's home screens, send them notifications, and build Android and iPhone versions.",
    audience: "everyone",
    group: "publish",
    sections: [
      {
        heading: "Add it to a home screen",
        body: [
          "Every published app can be installed straight from the browser, with no app store. Open your app on the phone (scan the code on the Overview or the Publish tab), then choose **Add to Home Screen** in the browser's menu. On an iPhone it's under the Share button. It then opens like any other app, with your icon.",
          "Set your app's icon on the Overview under **App icon**. You can upload a picture or have the AI make one.",
        ],
      },
      {
        heading: "Send notifications",
        body: [],
        steps: [
          "Open the **Notifications** tab.",
          "If notifications are off, press **Turn on notifications**. This adds a small “Get notified” page your visitors use to sign up.",
          "Publish your app so visitors can sign up.",
          "Write a **Title** and a **Message**. You can add a page to open when the notification is tapped, like /menu.",
          "Press **Send to** (it shows how many people will get it). **Sent** lists what you've sent and how many were delivered.",
        ],
        screenshot: {
          file: "phone-apps-1.webp",
          alt: "The Notifications tab with the number of subscribers and a form to write and send a notification.",
          caption: "Write a notification and send it to everyone who signed up.",
          shot: { path: "/projects/:project/notifications", waitFor: "main h1" },
        },
      },
      {
        heading: "Who can get notifications",
        body: [
          "On Android phones and computers, people turn on notifications from the browser. On iPhone and iPad, they first add your app to their home screen, then turn on notifications there.",
          "Flows can send notifications too, with the **Send a notification** step.",
        ],
      },
      {
        heading: "Build an Android app",
        body: ["The phone app shows your live, published app, so publishing changes updates it without a new build."],
        steps: [
          "Publish your app first.",
          "Open the **Mobile app** tab.",
          "Under **App details**, check the **App name**, the **Bundle / Application ID** (like com.yourbusiness.app; never change it once your app is in a store), **Version**, **Orientation** and colours, then press **Save settings**.",
          "Press **Build test APK** for a copy you can install straight on an Android phone to try it.",
          "When you're ready for Google Play, press **Build for Google Play**. **Put your app on Google Play** walks you through the store's steps.",
        ],
        screenshot: {
          file: "phone-apps-2.webp",
          alt: "The Mobile app tab with the app's details and buttons to build Android versions.",
          caption: "Build a test copy, or the file Google Play asks for.",
          shot: { path: "/projects/:project/native", waitFor: "main h1" },
        },
      },
      {
        heading: "Keep your upload key safe",
        body: [
          "Google Play knows your app by its upload key, a secret file made the first time you build for Google Play. Press **Download key backup** and keep it somewhere private, like a password manager. Without it you can never update your app on Google Play again. Only the app's owner can download it.",
        ],
      },
      {
        heading: "iPhone and iPad",
        body: [
          "Press **Download iPhone project** on the Mobile app tab. Building an iPhone app needs a paid Apple Developer account and either a Mac or a free GitHub account; the instructions inside the download explain both, step by step.",
        ],
      },
      {
        heading: "Good to know",
        body: [],
        bullets: [
          "**Phone features this app uses** lists what your app asks the phone for, like the camera or location. When that list changes, build again and send the stores the new version.",
          "Phones only open apps from a secure address (https). The Mobile app tab warns you if yours isn't.",
          "If it says **Android builds are turned off on this server**, ask whoever runs {app} for you.",
          "Before deleting an app or your account, download its Google Play upload key.",
        ],
      },
    ],
    related: ["publishing", "custom-domains"],
  },

  // ── Your account ──────────────────────────────────────────────────────
  {
    slug: "account-and-billing",
    title: "Your account, plan and settings",
    summary: "Change your name and password, turn help tips on or off, check your plan and AI use, or delete your account.",
    audience: "everyone",
    group: "account",
    sections: [
      {
        heading: "Your details and password",
        body: [],
        steps: [
          "Click your initial at the top right, then **Settings**.",
          "Under **Your details**, change your **Name** and press **Save**. Your email is the one you sign in with and can't be changed here.",
          "Under **Password**, type your **Current password** and a **New password** of at least 8 characters, then press **Change password**. You're signed out on your other devices.",
        ],
        screenshot: {
          file: "account-and-billing-1.webp",
          alt: "The Settings page with your details, password, help tips and account deletion.",
          caption: "Settings: your name, password, help tips and more.",
          shot: { path: "/account", waitFor: "#profile-heading" },
        },
      },
      {
        heading: "Signed up with Google?",
        body: [
          "If you don't know your current password, for example because you signed up with Google, sign out and use **Forgot password** on the sign-in page to set one.",
        ],
      },
      {
        heading: "Help tips and guides",
        body: [
          "Help tips are short notes that appear when you hold your mouse over a button or setting. Turn them on or off in **Settings** under **Help**. Inside an app, the **Help tips** button at the top does the same.",
          "The **Help** link in the top bar opens the guide for the screen you're on. **Help & guides** in the account menu lists every guide.",
        ],
      },
      {
        heading: "Your plan and AI use",
        body: [
          "Click your initial, then **Billing & plan**. It shows your plan and, if your plan has a monthly allowance, how many AI actions you've used this month. Planning, building and changing things with the AI all use AI actions.",
          "When they run out, the AI pauses until next month. Templates and the page editor keep working. If other plans are offered, you can pick one on the same page. Once you pay for a plan, **Manage billing** lets you change your payment details.",
        ],
        screenshot: {
          file: "account-and-billing-2.webp",
          alt: "The Billing page showing your plan and the AI actions you've used this month.",
          caption: "Billing & plan: your plan and this month's AI use.",
          shot: { path: "/billing", waitFor: "main h1" },
        },
      },
      {
        heading: "Delete your account",
        body: [
          "This deletes your account and all your apps, with everything they saved, their files and their web addresses. It can't be undone.",
        ],
        steps: [
          "Go to **Settings** and find **Delete my account**.",
          "Download a **Backup** of each app you might want later. If an app is on Google Play, download its **Google Play upload key** too.",
          "Press **Delete my account…**.",
          "Type your email address to confirm, and tick the upload key box if it's shown.",
          "Press **Delete my account for good**.",
        ],
      },
      {
        heading: "Good to know",
        body: [],
        bullets: [
          "Changing your password signs you out everywhere else.",
          "A paid plan is cancelled straight away when you delete your account.",
          "If your account can't be deleted here, for example because you run a workspace for other people, the Settings page explains why.",
        ],
      },
    ],
    related: ["getting-started", "publishing"],
  },

  // ── Running the platform ──────────────────────────────────────────────
  {
    slug: "running-your-platform",
    title: "Running your platform",
    summary: "Your admin home: set up {app}, look after the people using it, and keep the server healthy.",
    audience: "admin",
    group: "platform",
    sections: [
      {
        heading: "The Admin home",
        body: [
          "Click **Admin** in the top bar. **Run your platform** has a card for each area, with how it stands now: **White-label branding**, **Resellers**, **Payments**, **Plans & limits**, **AI engine**, **Email**, **Users** and **System**. Click a card to open it. **All settings** at the top opens every setting on one page.",
        ],
        screenshot: {
          file: "running-your-platform-1.webp",
          alt: "The Admin home with cards for branding, resellers, payments, plans, AI, email, users and system, and a setup checklist.",
          caption: "The Admin home: every area of the platform, and what still needs doing.",
          shot: { path: "/admin", waitFor: "#control-heading" },
        },
      },
      {
        heading: "Setup checklist",
        body: ["The **Setup checklist** ticks itself off as you go. Click a step to open its setting."],
        steps: [
          "**Set your brand**: your name, logo and colours. See Your brand (white-label).",
          "**Connect an AI engine**, so people can build by describing their app. See AI settings.",
          "**Connect Stripe and price your plans**, if you charge. See Prices and payments.",
          "**Turn on email**, so invitations, password links and alerts are sent for you. See Email.",
          "**Give published apps their own address**. This is a server setting (APPS_DOMAIN in the .env file), not on this screen; the installer can set it. With a wildcard DNS record, every published app gets its own address, kept apart from the studio.",
          "**Invite your first reseller**, if you sell through agencies. See Resellers and clients.",
        ],
      },
      {
        heading: "What each plan includes",
        body: [
          "Under **All settings**, **Plans & limits** sets what Free, Starter, Pro and Team include: **Apps**, **Published apps**, **Pages per app**, **Custom domains**, **AI actions / month** and **Scheduled workflows**. Tick **unlimited** for no limit, then press **Save plan limits**. **Reset to the standard limits** puts back the built-in values. You and your resellers are never limited.",
        ],
      },
      {
        heading: "Help the people using it",
        body: [
          "The **Users** list on the Admin home shows everyone who signed up. For each person you can:",
        ],
        bullets: [
          "Change their plan from the menu. It saves straight away.",
          "Press **Password link** to make a sign-in link that works once, for 2 hours. It's emailed to them if email is on, or copied for you to send.",
          "Press **Impersonate** to open their workspace and help them. A banner shows while you're inside, and anything you change happens in their account. Press **Stop impersonating** to come back.",
          "Press **Delete** to delete their account. You'll see what goes with it and type their email to confirm.",
        ],
      },
      {
        heading: "Keep an eye on things",
        body: [
          "**New people, last 30 days** shows how many people signed up, made an app and published one. **Recent projects** lists the latest apps, with **Jump in** to open one in its owner's workspace. **Recent flow runs** shows the latest automations and whether they worked.",
        ],
      },
      {
        heading: "Server health",
        body: [
          "Open **System** for the server's health in plain words. Each check is a card: green is fine, amber could use a look, red needs attention now. It covers the database, disk space, scheduled flows, backups, email, the AI connection, memory and more.",
          "**Nightly clean-up** removes old run logs, expired sign-ins, old published versions and the files of deleted apps. Choose **Report only** (count, delete nothing), **Remove old records** or **Off**, and press **Save**. **Check now** or **Run clean-up now** runs it straight away. Take a backup before you first turn on removing: deleted records can't be brought back.",
          "If something goes wrong, **Details for support** copies or downloads a summary with private details hidden, ready to send to whoever supports you.",
        ],
        screenshot: {
          file: "running-your-platform-2.webp",
          alt: "The System page: a summary line, health check cards, and the nightly clean-up settings.",
          caption: "System: how the server is doing, in plain words.",
          shot: { path: "/admin/system", waitFor: "#checks-heading" },
        },
      },
      {
        heading: "Good to know",
        body: [],
        bullets: [
          "If the database needs an update after you upgrade, a banner at the top of the Admin home says so, and System explains what to do.",
          "Installs made with the standard installer back themselves up every night. Copy the backups to another device now and then.",
          "Monitoring tools can check /api/health to see that the server is up.",
          "The operator's runbook in the download (docs/operations.md) covers the details.",
        ],
      },
    ],
    related: ["white-label", "resellers", "prices-and-payments", "ai-settings", "email"],
  },
  {
    slug: "white-label",
    title: "Your brand (white-label)",
    summary: "Put your own name, logo and colours on the studio, its emails and its sign-in pages.",
    audience: "operators",
    group: "platform",
    sections: [
      {
        heading: "Whose brand people see",
        body: [
          "The platform's operator sets the brand everyone sees by default. Each reseller sets their own brand, and their clients only ever see that one, never the platform's.",
          "**If you run the platform:** go to Admin, **All settings**, **Branding**.",
          "**If you're a reseller:** open your **Reseller dashboard** and choose **Branding**.",
        ],
      },
      {
        heading: "Set your brand",
        body: [],
        steps: [
          "Type your **Brand name**. It's shown at the top of every screen, in emails and on the sign-in page.",
          "Add a **Tagline (optional)**, a short line about what you offer. It's added to the browser tab's title.",
          "Upload a **Logo**. Wide logos look best; use PNG or SVG, under 150 KB. It's shown instead of the brand name.",
          "Upload a **Browser icon**: square, at least 64 by 64 pixels.",
          "Pick a **Main colour** (buttons and highlights) and an **Accent colour** (smaller touches).",
          "Add a **Support email**. It's shown to people who need help and used as the reply-to address on emails. Add **Your website** if you like.",
          "Check the **Preview** of the sign-in screen, then press **Save branding**.",
        ],
        screenshot: {
          file: "white-label-1.webp",
          alt: "The White-label branding form with name, tagline, logo, icon, colours and support email, and a preview of the sign-in screen.",
          caption: "Your brand, with a live preview of the sign-in screen.",
          shot: { path: "/admin/settings", waitFor: "#brand", clip: "#brand" },
        },
      },
      {
        heading: "Resellers: use your own address",
        body: ["Your clients can sign in and build at an address you own, like apps.youragency.com. Their published apps are shared from it too."],
        steps: [
          "In your Reseller dashboard, open **Domain**.",
          "Type a subdomain you control, like apps.youragency.com, and press **Use this domain**.",
          "Add the two records shown (a CNAME or A record, and a TXT record) where you manage your domain's DNS.",
          "Press **Check now**. When it says **Connected**, your clients can sign in there.",
        ],
      },
      {
        heading: "Good to know",
        body: [],
        bullets: [
          "Changes show the next time a page loads.",
          "Images over 150 KB are refused. Export a smaller version and try again.",
          "A reseller's address gets a secure (https) certificate by itself on servers set up for it. If it doesn't open securely, ask the platform's operator.",
          "To stop using a reseller address, clear the box and save.",
          "Operators: give published apps a neutral address (APPS_DOMAIN) so reseller clients' app links don't show the platform's name.",
        ],
      },
    ],
    related: ["resellers", "prices-and-payments", "email"],
  },
  {
    slug: "resellers",
    title: "Resellers and clients",
    summary: "Sell app building under another brand: the operator adds resellers, and each reseller invites and looks after their own clients.",
    audience: "operators",
    group: "platform",
    sections: [
      {
        heading: "How it fits together",
        body: [],
        bullets: [
          "**The operator** runs the platform and sets the plans, prices and limits.",
          "**Resellers** are agencies the operator adds. Each has its own brand, address, Stripe account and clients.",
          "**Clients** are the reseller's customers. They build apps and only ever see the reseller's brand.",
          "**App users** are the people who use the published apps.",
          "Clients pay the reseller directly. The platform takes no cut.",
        ],
      },
      {
        heading: "Operators: add a reseller",
        body: [],
        steps: [
          "In Admin, open **Resellers**.",
          "Under **Add a reseller**, type the **Brand name**, the **Reseller's email** and, if you like, **Their name**.",
          "Set **Max clients**, **Max apps** and **AI actions / month**, or leave them empty for unlimited.",
          "Press **Create reseller**. They get an invitation email if email is set up; otherwise you get a link to send them.",
        ],
        screenshot: {
          file: "resellers-1.webp",
          alt: "The Resellers page with a form to add a reseller and a table of resellers with their clients, apps and AI use.",
          caption: "Add resellers and set their limits.",
          shot: { path: "/admin/resellers", waitFor: "main h1" },
        },
      },
      {
        heading: "Operators: look after resellers",
        body: [
          "The table shows each reseller's clients, apps, AI actions this month, domain and status. Click a number like 3 / 10 to change that limit. The buttons at the end of a row let you sign in as the reseller, make an invitation or password reset link, suspend or reactivate them, and delete them.",
          "The monthly AI limit covers the reseller and all their clients together. When it runs out, the AI pauses for all of them until next month. The reseller is emailed at 80% and 100%, if email is set up.",
          "Suspending a reseller signs out the reseller and all their clients. Deleting one asks you to type its name; its clients keep their accounts and apps and become your direct customers on the Free plan.",
        ],
      },
      {
        heading: "Resellers: your dashboard",
        body: [
          "Click **Reseller dashboard** in the top bar. **Overview** has a **Get set up** checklist (logo and colours, your own domain, payments, your first client) and how many clients, apps and AI actions you're using. The menu on the left has **Clients**, **Apps**, **Branding**, **Domain** and **Billing & plans**.",
        ],
      },
      {
        heading: "Resellers: invite clients",
        body: [],
        steps: [
          "Open **Clients**.",
          "Under **Invite a client**, type their **Email**, their **Name** if you like, and choose their **Plan**.",
          "Press **Send invite**. They get an email with a link to set their password, or you get the link to send if email isn't set up.",
          "To invite lots of people, press **Invite several at once** and paste up to 50 email addresses.",
        ],
      },
      {
        heading: "Resellers: help a client",
        body: [
          "The client list shows each client's status, plan, apps, AI use and when they were last active. Filter it by status, plan and payment, or tick **Not seen in 30 days** or **Never signed in**. **Needs attention** points out clients who may need a nudge.",
          "Change a client's plan from the menu in their row. The buttons in each row let you **Open their workspace** (press **Back to your clients** to return), send a new invitation or password reset link, suspend or restore their access, and delete them.",
          "Deleting a client deletes all their apps. You'll be asked to type their email to confirm.",
        ],
      },
      {
        heading: "Resellers: client apps",
        body: [
          "**Apps** lists every app your clients have made. Press **Open** to edit one in the client's workspace. Apps you built yourself have **Give to client**, which moves the app to a client's workspace; you can still open it for them.",
        ],
      },
      {
        heading: "Good to know",
        body: [],
        bullets: [
          "A reseller only sees their own clients, never the operator's other customers or settings.",
          "Clients sign in at the reseller's address and see only the reseller's brand.",
          "When you've used all your client seats, invitations stop until the operator adds more.",
        ],
      },
    ],
    related: ["white-label", "prices-and-payments", "running-your-platform"],
  },
  {
    slug: "prices-and-payments",
    title: "Prices and payments",
    summary: "Connect Stripe, and set what each plan costs and includes, so customers pay you directly.",
    audience: "operators",
    group: "platform",
    sections: [
      {
        heading: "Where to find it",
        body: [
          "**If you run the platform:** Admin, **All settings**, then **Payments** for prices and Stripe, and **Plans & limits** for what each plan includes.",
          "**If you're a reseller:** your Reseller dashboard, **Billing & plans**. It has **1. Your prices** and **2. What each plan includes**.",
          "Payments go through Stripe, an online payment service. You need your own Stripe account.",
        ],
      },
      {
        heading: "Connect Stripe",
        body: [],
        steps: [
          "In Stripe, go to Developers, API keys, and copy the **Secret key**. To try things out first, use a test key (it starts sk_test_).",
          "Paste it into **Secret key** under **Stripe**.",
          "Press **Save prices**. {app} sets up the payment updates from Stripe for you.",
        ],
      },
      {
        heading: "Set your prices",
        body: [],
        steps: [
          "Under **Plans and prices**, each paid plan has a **Plan name**, a **Price per month** and a **Currency**.",
          "Type a price for each plan you want to offer. Leave a price empty to hide that plan. The Free plan is always there.",
          "Press **Save prices**. The prices are created in your Stripe account for you.",
        ],
        screenshot: {
          file: "prices-and-payments-1.webp",
          alt: "The Payments section with a name, monthly price and currency for each paid plan, and the Stripe key.",
          caption: "Name and price each plan, and connect Stripe.",
          shot: { path: "/admin/settings", waitFor: "#payments", actions: [{ pause: 1000 }], clip: "#payments" },
        },
      },
      {
        heading: "Decide what each plan includes",
        body: [
          "For each plan, set the number of **Apps**, **Published apps**, **Pages per app**, **Custom domains** and **AI actions / month**, and whether **Scheduled workflows** are included.",
          "On the operator's **Plans & limits**, tick **unlimited** for no limit, then press **Save plan limits**. On a reseller's **Billing & plans**, leave a box empty for unlimited and press **Save plans**.",
          "Resellers can also untick **Let new clients sign themselves up on your domain** to make accounts invitation-only.",
        ],
        screenshot: {
          file: "prices-and-payments-2.webp",
          alt: "The Plans and limits table, with a column for each plan and a row for each limit.",
          caption: "What each plan includes.",
          shot: { path: "/admin/settings", waitFor: "#plans", actions: [{ pause: 1000 }], clip: "#plans" },
        },
      },
      {
        heading: "What customers see",
        body: [
          "Customers see the plans you offer on their **Billing & plan** page, with an **Upgrade** button that takes them to Stripe to pay. Paying customers get **Manage billing** to change their card or cancel. Until Stripe is connected, your prices still show, and checkout works once it's connected.",
          "You can also change someone's plan by hand: the operator from the Users list, a reseller from the client list.",
        ],
      },
      {
        heading: "Good to know",
        body: [],
        bullets: [
          "Customers pay you directly, on your own Stripe account. The platform takes no fee.",
          "If Stripe's payment updates ever fail to set up, **Advanced: payment updates (webhook)** shows the address to add in Stripe by hand.",
          "Try everything with a Stripe test key before you switch to your live key.",
        ],
      },
    ],
    related: ["resellers", "white-label", "running-your-platform"],
  },
  {
    slug: "ai-settings",
    title: "AI settings",
    summary: "Choose the AI engine that plans, builds and changes apps, and check that it works.",
    audience: "admin",
    group: "platform",
    sections: [
      {
        heading: "Where to find it",
        body: [
          "In Admin, open **All settings** and go to **AI engine**. Until an engine is connected, building with AI is off: people start from templates and the page editor, and the AI Designer can't build.",
        ],
      },
      {
        heading: "Choose a provider",
        body: ["There are two options:"],
        bullets: [
          "**OpenAI**: OpenAI's service, or any server that works the same way, including models running on your own hardware.",
          "**Command-line AI agent**: a command-line AI tool installed on this server, signed in with its own subscription, instead of paying per request.",
        ],
        screenshot: {
          file: "ai-settings-1.webp",
          alt: "The AI provider settings with the two provider options, the connection details and a test button.",
          caption: "Pick a provider, fill in its details and test it.",
          shot: { path: "/admin/settings", waitFor: "#ai", actions: [{ pause: 1000 }], clip: "#ai" },
        },
      },
      {
        heading: "Connect a hosted or compatible service",
        body: [],
        steps: [
          "Choose **OpenAI**.",
          "Paste your key into **OpenAI / compatible API key**. If a key is already stored, leave the box empty to keep it.",
          "Leave **API base URL** empty for OpenAI's own service, or type the address of a compatible server.",
          "Type the model names under **Scaffold model** (plans and builds new apps) and **Edit model** (changes in the editor), or leave them empty for the defaults.",
          "Press **Test connection**. It saves your settings first, then shows **OK** or **Failed** with the reason.",
          "Press **Save changes**.",
        ],
      },
      {
        heading: "Run the AI on your own hardware",
        body: [
          "Any model server that speaks the same language as OpenAI's service works, such as Ollama, LM Studio, vLLM or llama.cpp's server. Put its address in **API base URL** (for a model on the same computer as {app}'s Docker containers, something like http://host.docker.internal:11434/v1), leave the key empty unless the server needs one, and type the model's exact name.",
          "Leave **Model context size** and **Maximum output tokens per call** empty, and **Model thinking** on **Automatic**: {app} works out sensible values. If tests or builds say the answer was unreadable, set **JSON support** to **Prompt only**.",
          "Speed depends on your hardware. Bigger models write better pages; try building a sample app before you invite people.",
        ],
      },
      {
        heading: "Use a command-line AI tool",
        body: [],
        steps: [
          "Install the tool on this server and sign it in, as the account that runs {app} (or its dedicated runner account).",
          "Choose **Command-line AI agent**.",
          "Set **Model** if you want a different one, and **Binary path** only if the tool isn't found by itself.",
          "Press **Test the AI agent**, then **Save changes**.",
        ],
      },
      {
        heading: "Good to know",
        body: [],
        bullets: [
          "Every plan, build and change uses AI actions from the person's monthly allowance (see **Plans & limits**), and a reseller's clients share the reseller's monthly limit.",
          "Stored keys are never shown again, only a masked hint.",
          "A key in the server's .env file (OPENAI_API_KEY) is used when none is saved here.",
          "The runbook in the download (docs/local-ai.md) has more on running models yourself.",
        ],
      },
    ],
    related: ["running-your-platform", "email"],
  },
  {
    slug: "email",
    title: "Email",
    summary: "Send invitations, password links, app alerts and your apps' own emails from your own address.",
    audience: "admin",
    group: "platform",
    sections: [
      {
        heading: "What email is used for",
        body: [
          "Once email is set up, {app} sends password links and invitations (for you, resellers and their clients), alerts to app owners when someone sends a form or books, and the emails apps send themselves with the **Send an email** step.",
          "Without it, invitation and password links are shown on screen for you to pass on, and apps skip their email steps. App owners see a note about it on their app's Overview.",
        ],
      },
      {
        heading: "Set it up with any email provider",
        body: [],
        steps: [
          "In Admin, open **All settings** and go to **Email**.",
          "Under **How should email be sent?**, choose **Any email provider (SMTP)**.",
          "Type the **Email server** your provider gives you, like smtp.example.com.",
          "Choose the **Port**. Use **587 (recommended)** unless your provider says otherwise.",
          "Type the **Username** and **Password**. Google and Microsoft need an app password, not your normal one.",
          "Type the address to **Send from**, one your provider lets you send from, and a **Sender name** if you like. Leave the name empty to use your brand's or the app's name.",
          "Press **Send a test email to me**. It uses what's on screen, so you can check before saving.",
          "Press **Save email settings**.",
        ],
        screenshot: {
          file: "email-1.webp",
          alt: "The Email settings: whether email is on, the choice of provider, the server details and the test button.",
          caption: "Fill in your provider's details and send yourself a test.",
          shot: { path: "/admin/settings", waitFor: "#email-heading", actions: [{ pause: 1000 }], clip: "#email" },
        },
      },
      {
        heading: "Or use Resend",
        body: [
          "Choose **Resend**, paste your **Resend API key**, and send from an address on a domain you've verified in Resend. Then test and save as above.",
        ],
      },
      {
        heading: "Check it's working",
        body: [
          "The box at the top says **Email is on** with the address it sends from, and shows the last 24 hours: how many were sent and failed, and the last problem, if any. The Email card on the System page shows the same.",
        ],
      },
      {
        heading: "When the test fails",
        body: [],
        bullets: [
          "**Username or password rejected**: check both. Google and Microsoft need an app password; email services often give you an SMTP key instead of your account password.",
          "**Couldn't reach the server on that port**: try 587, then 465, then 2525, or ask your host to open the port.",
          "**The port and encryption don't match**: use 465 with SSL, or 587 with automatic encryption (under **More options**).",
          "**Refused to send from that address**: your provider hasn't verified that sender or its domain. Verify it, or send from an address it knows.",
          "**Resend's test mode**: a new Resend account only emails its own address until you verify a domain.",
        ],
      },
      {
        heading: "Good to know",
        body: [],
        bullets: [
          "Every email is sent from your **Send from** address. When an app asks to send from an address on another domain, its address becomes the reply-to, so replies still reach the app owner.",
          "Settings in the server's .env file are used until you save here; saving here takes over.",
          "**Remove these settings** goes back to no email (or to the .env settings, if there are any).",
          "The support email in your branding is the reply-to on invitation and password emails.",
        ],
      },
    ],
    related: ["running-your-platform", "white-label"],
  },
];

export const GUIDES: Record<GuideSlug, Guide> = Object.fromEntries(GUIDE_LIST.map((g) => [g.slug, g])) as Record<GuideSlug, Guide>;

/** Every guide, in GUIDE_SLUGS order. */
export function allGuides(): Guide[] {
  return GUIDE_SLUGS.map((s) => GUIDES[s]).filter(Boolean);
}

export function getGuide(slug: string): Guide | null {
  return (GUIDE_SLUGS as readonly string[]).includes(slug) ? GUIDES[slug as GuideSlug] ?? null : null;
}

/** Whether a studio role may read a guide written for this audience. */
export function audienceAllows(audience: Audience, role: string | null | undefined): boolean {
  if (audience === "everyone") return true;
  if (audience === "operators") return role === "ADMIN" || role === "RESELLER";
  return role === "ADMIN";
}

/** Replaces the {app} token with the brand's name. */
export function withAppName(text: string, appName: string): string {
  return text.split("{app}").join(appName);
}

/** A copy of the guide with {app} replaced everywhere. */
export function brandGuide(guide: Guide, appName: string): Guide {
  const t = (s: string) => withAppName(s, appName);
  return {
    ...guide,
    title: t(guide.title),
    summary: t(guide.summary),
    sections: guide.sections.map((s) => ({
      ...s,
      heading: t(s.heading),
      body: s.body.map(t),
      steps: s.steps?.map(t),
      bullets: s.bullets?.map(t),
      screenshot: s.screenshot ? { ...s.screenshot, alt: t(s.screenshot.alt), caption: t(s.screenshot.caption) } : undefined,
    })),
  };
}

/** Every screenshot the guides reference, with the guide it belongs to. */
export function allScreenshots(): Array<Screenshot & { guide: GuideSlug }> {
  return allGuides().flatMap((g) => g.sections.flatMap((s) => (s.screenshot ? [{ ...s.screenshot, guide: g.slug }] : [])));
}

/** Plain text of a guide, for searching. */
export function guideText(guide: Guide): string {
  return [
    guide.title,
    guide.summary,
    ...guide.sections.flatMap((s) => [s.heading, ...s.body, ...(s.steps ?? []), ...(s.bullets ?? [])]),
  ]
    .join(" ")
    .replace(/\*\*/g, "");
}

/** Anchor id for a section heading. */
export function sectionId(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
