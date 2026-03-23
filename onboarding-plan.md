# PROJECT: The "Onboarding" Experience & Registration Refactor Sprint

## GOAL
Extract category selection from the current registration flow and build a dedicated, premium `/onboarding` route. This route will serve as the first impression for new users, allowing them to visually select their favorite collector categories to perfectly tailor their "For You" feed via `UserPreferencesContext`.

## TEAM REQUIRED (2 Agents)
1. **Frontend UI/UX Expert:** Build a stunning, immersive `/onboarding` page with a visual category selection grid.
2. **Full-Stack Architect:** Refactor the registration flow, ensure strict category data consistency, and handle routing/state completion.

## MANDATORY TARGETS (Execute carefully)

### 1. Audit & Data Consistency (CRITICAL)
- **DO NOT** hardcode random categories. Audit the codebase (likely `constants.ts` or similar catalog data files) to find the EXACT master list of categories used in the app (e.g., Pokémon TCG, Sports Cards, Watches, Lego, etc.). 
- The Onboarding UI must map exactly to these canonical categories.

### 2. Registration Refactor
- Check `src/app/register/page.tsx` (or equivalent registration components).
- Remove any existing category/preference selection steps from the signup flow to reduce friction.
- Ensure that upon successful registration, the user is automatically routed to `/onboarding`.

### 3. The `/onboarding` UI
- Create `src/app/onboarding/page.tsx`.
- Design: Premium dark theme (`bg-[#1A1818]`). 
- Headline: "Welcome to Uniques. What do you collect?"
- Content: A highly visual grid of toggleable category cards. Use active states (Uniques signature green/teal borders/backgrounds) when selected.
- Logic: Require at least 1 category to be selected.
- CTA: A prominent "Dive In" or "Let's Trade" button fixed at the bottom.

### 4. State Integration & Handoff
- Connect the CTA button to `usePreferences` from `src/lib/UserPreferencesContext.tsx`.
- On click: Save the selected categories, then `router.push('/explore')`.
- The user should instantly see their personalized "For You" feed.