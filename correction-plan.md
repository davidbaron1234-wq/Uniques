# PROJECT: PM Corrections & UI Enforcement Sprint

## GOAL
The previous agent team failed to apply the UI changes correctly and implemented flawed business logic. You must fix the exact issues below. Do NOT hallucinate success. Verify your Tailwind classes.

## 1. BUSINESS LOGIC CORRECTIONS (Identified by PM)
* **Grails Logic:** * Bug: The picker allows selecting 20 items, but only 3 are displayed. Also, Ethan (free) has manual picks.
    * Fix: Change the logic entirely. **Free Users** CANNOT manually pick Grails; the system automatically displays their Top 3 most expensive items. **PRO Users** can open the `GrailsPickerModal` and manually pick exactly up to 3 items (change the max limit from 20 to 3). 
* **Achievements Logic:** * Bug: Hiding locked achievements from the user ruins gamification.
    * Fix: A user viewing their OWN profile ALWAYS sees all 15 achievements (locked and unlocked), regardless of their tier. When viewing a PUBLIC profile (someone else's), hide the locked achievements for EVERYONE. Remove the "PRO" gating from achievements entirely.

## 2. STRICT UI ENFORCEMENT
* **EditProfileModal:** The previous agent failed. It is still a bottom sheet. You MUST change the outer container to `fixed inset-0 z-50 flex items-center justify-center p-4` to perfectly center it. Remove any `bottom-0`, `translate-y-full`, or sheet-like transition classes.
* **Hamburger / Sidebar:** The previous agent lied. It still looks basic and doesn't use the `<Logo />` component. Find the actual sidebar/drawer code (likely inside `Header.tsx` or `Sidebar.tsx`) and hardcode the `<Logo />` into the top of it. Give the menu items proper `hover:bg-white/10` premium states.
* **PRO Badge Color:** The neon purple clashes with our brand. Change the PRO badge color in the user profile to a premium metallic gold/amber (e.g., matching the Grails/Achievements glow, like `from-yellow-600 to-yellow-400`).

## 3. DUMMY DATA FOR TESTING
* **Empty User:** Add a new dummy user to `src/lib/data.ts` (or wherever user data is mocked) named "Newbie" (`@newbie`) with completely empty arrays for inventory, grails, and achievements, so the PM can test the new empty states.