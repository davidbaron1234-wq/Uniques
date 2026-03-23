# PROJECT: True In-App Walkthrough & Premium Visuals Sprint

## GOAL
1. Fix the embarrassing placeholder images in the category grid (`/onboarding`).
2. Delete the fake "slideshow" spotlight tour.
3. Build a TRUE In-App Walkthrough using a global `TourProvider` that overlays a dark mask and highlights actual DOM elements in the app (Explore feed, Nav bar, Profile), guiding the user dynamically.

## TEAM REQUIRED (3 Agents)
- @ux-designer: Fix category images & Tour UI styling.
- @frontend-architect: Build the `TourContext` and DOM-highlighting engine.
- @product-engineer: Integrate the tour steps, brand copy, and routing.

## MANDATORY TARGETS

### 1. The Category Grid Fix (Visuals)
- **File:** `src/app/onboarding/page.tsx`
- Replace ALL generic image URLs (Funko Pop pizza sauce, Other TCG scantron, black Comics screen) with high-fidelity, premium placeholder URLs (e.g., highly curated Unsplash source URLs for watches, sneakers, graded cards, legos). If a perfect image isn't available, use a stunning, luxurious CSS gradient with a subtle abstract pattern. 

### 2. The True Walkthrough Engine (Architecture)
- Delete the old `SpotlightTour.tsx` slideshow.
- Create `src/lib/TourContext.tsx` (or similar). This must provide a global state (`isTourActive`, `currentStep`, `nextStep`, `skipTour`).
- Create a `TourOverlay` component that renders at the root (`layout.tsx`). It uses a dark overlay (`bg-black/80`) and uses `getBoundingClientRect` to cut out a spotlight hole (or high z-index highlight) over specific elements tagged with `data-tour="step-id"`.

### 3. The Tour Flow & Brand Language (Execution)
- **Trigger:** When the user completes `/onboarding` (selects categories and clicks continue), set `isTourActive` to true and `router.push('/search')`.
- **Step 1: The Explore Feed**
  - Highlight the main grid/filters in `/search`.
  - Copy: "Welcome to the Collective. Here you'll discover rare items curated to your taste."
- **Step 2: The Trade System**
  - Highlight the `Messages` tab in the BottomNav.
  - Copy: "Propose trades directly. Negotiate, counter-offer, and build your collection."
- **Step 3: The Profile**
  - Navigate the user to `/profile` (or highlight the tab).
  - Copy: "Curate your digital vault. Edit your details and showcase your grails."
- **Global Actions:** Every step MUST have a prominent "Skip Tour" button and a "Next" button.

### STRICT CONSTRAINTS
- **NO EBAY MENTIONS.** Use terms like "The Collective", "Fellow Collectors", "Curated Items".
- Ensure the overlay handles window resizing gracefully.