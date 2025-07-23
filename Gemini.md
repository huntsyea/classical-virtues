# Gemini Agent Documentation

This document provides a comprehensive overview of the Classical Virtues project for the Gemini agent. It covers the project's architecture, technology stack, codebase structure, and development guidelines.

## 1. Project Overview

**Purpose:** The Classical Virtues project is a modern web application designed to teach timeless virtues through classical stories. It provides an interactive and engaging platform for users to explore moral tales and learn about character, ethics, and wisdom.

**Primary Content Source:** The application's content, including stories, images, and audio, is managed through the **Basehub headless CMS**. This allows for dynamic content updates without requiring code changes or deployments.

**Key Features:**

*   **Dynamic Content:** All story content is fetched from Basehub, enabling real-time updates.
*   **Audio Narration:** Each story includes an audio player for an immersive listening experience.
*   **Responsive Design:** The application is optimized for a seamless experience across all devices.
*   **SEO Optimized:** The project includes dynamic sitemap generation, structured data (JSON-LD), and comprehensive metadata for improved search engine visibility.
*   **Content Revalidation:** The application uses webhooks to automatically revalidate and update content when changes are made in Basehub.

## 2. Technology Stack

*   **Framework:** [Next.js](https://nextjs.org/) (v14) with the App Router
*   **Language:** [TypeScript](https://www.typescriptlang.org/)
*   **Styling:** [Tailwind CSS](https://tailwindcss.com/) with [shadcn/ui](https://ui.shadcn.com/) for UI components
*   **Content Management:** [Basehub](https://basehub.com/) (Headless CMS)
*   **Deployment:** [Vercel](https://vercel.com/)

## 3. Codebase Architecture

The project follows a well-structured and modular architecture, separating concerns into distinct layers.

### 3.1. Data Layer (`src/lib`)

The data layer is responsible for all interactions with the Basehub CMS.

*   **`src/lib/basehub.ts`:** This is the primary interface with the Basehub API. It uses the `basehub` SDK to send GraphQL queries for fetching stories.
    *   `getAllStories()`: Fetches all stories from Basehub.
    *   `getStoryBySlug(slug)`: Fetches a single story by its unique slug.

*   **`src/lib/stories.ts`:** This file serves as an abstraction layer that sits on top of `basehub.ts`. It defines a unified `StoryData` interface that is used throughout the application. This decouples the application from the specific data structure of the Basehub API.
    *   It transforms the data received from Basehub into the consistent `StoryData` format.
    *   This is the **recommended interface** for all components to use when fetching story data.

### 3.2. Presentation Layer (`src/app` and `src/components`)

The presentation layer is responsible for rendering the UI and handling user interactions.

*   **`src/app/**` (Next.js App Router):**
    *   `src/app/page.tsx`: The application's homepage. It fetches all stories using the `getAllStories` function from `src/lib/stories.ts` and displays them in a grid of `SummaryCard` components.
    *   `src/app/stories/[slug]/page.tsx`: The dynamic route for individual story pages. It uses the `getStoryBySlug` function to fetch the corresponding story data and renders the content.
    *   `src/app/layout.tsx`: The root layout of the application. It sets up the main HTML structure, fonts, metadata, and a global `ErrorBoundary`.

*   **`src/components/**` (Reusable Components):**
    *   `AudioPlayer.tsx`: A client-side component that provides a fully functional audio player for story narration. It includes play/pause controls, a seekable progress bar, and integrates with the browser's `mediaSession` API.
    *   `summaryCard.tsx`: A presentational component that displays a story's title, summary, and image in a card format.
    *   `Navbar.tsx`: The main navigation bar for the application.
    *   `Breadcrumbs.tsx`: A component that generates breadcrumb navigation for story pages, improving user navigation and SEO.

### 3.3. Data Flow

The data flows from the Basehub CMS to the UI components in a clear and predictable manner:

1.  **Basehub CMS:** The single source of truth for all story content.
2.  **`src/lib/basehub.ts`:** Fetches raw data from Basehub via GraphQL queries.
3.  **`src/lib/stories.ts`:** Transforms the raw data into a unified `StoryData` interface.
4.  **Next.js Pages (`src/app/**`):** Fetch the formatted data using the functions in `src/lib/stories.ts`.
5.  **React Components (`src/components/**`):** Receive the data as props and render the UI.

## 4. Development Guidelines

### 4.1. Running the Project Locally

1.  **Install Dependencies:**
    ```bash
    pnpm install
    ```

2.  **Set Up Environment Variables:**
    *   Create a `.env.local` file by copying `.env.example`.
    *   Add your `BASEHUB_TOKEN` to the `.env.local` file.

3.  **Start the Development Server:**
    ```bash
    pnpm dev
    ```

### 4.2. Code Conventions

*   **Data Fetching:** Always use the functions in `src/lib/stories.ts` to fetch story data in your components. This ensures consistency and decouples your components from the Basehub API.
*   **Component Structure:** Create new UI elements as reusable components in the `src/components` directory.
*   **Styling:** Use Tailwind CSS for styling and leverage the existing `shadcn/ui` components whenever possible.
*   **TypeScript:** Adhere to the TypeScript types defined in the project, especially the `StoryData` interface.

### 4.3. Content Management

All story content should be managed through the Basehub dashboard. The application is designed to automatically reflect any changes made in the CMS.
