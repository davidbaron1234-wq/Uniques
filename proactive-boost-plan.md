# PROJECT: The "Uniques" Growth, Monetization & UI Elevation Sprint

## GOAL
Unleash a cross-functional Agent Team to act as our core Product Squad. Your mission is twofold:
1. **Business & Growth:** Audit our features and proactively implement smart monetization hooks (Paywalls/Upsells for a "PRO" tier) without ruining the user experience.
2. **UX/UI Elevation:** Fix known UI inconsistencies and upgrade generic components so the app feels like a $1B premium collector's platform.

## STRICT BRAND GUIDELINES
- **Theme:** Maintain the dark premium theme (`bg-[#1A1818]` / `#2C2929`). 
- **Colors:** Use subtle gold/amber for Grails/Achievements, success-green for Radar, and perhaps a distinct "PRO" color (e.g., a sleek purple/iridescent gradient) for premium upsells.
- **Safety:** Do NOT alter the main `<Header />` layout or the existing `<Logo />` component. Enhance the foundation, do not rebuild it from scratch.

## TEAM REQUIRED (3 Agents)
1. **Product Manager & Growth Hacker:** Focus on feature synergy and monetization. Identify areas where we can limit free usage and inject elegant "Upgrade to Pro" prompts.
2. **Senior UX/UI Designer:** Focus on visual flair, replacing generic menus/buttons, and designing the new Premium/Pro lock states.
3. **Frontend Engineer:** Implement the logic and UI flawlessly in React/Tailwind.

## MANDATORY TARGETS (Execute these first)
1. **Monetization Injection (The "PRO" Tier):**
   - Review features like the Radar, Top 3 Grails, or Trade Equity bar. 
   - Choose at least one highly valuable feature to partially gate behind a "Pro" subscription (e.g., Free users get 3 Radar slots, Pro gets unlimited).
   - Implement an elegant, non-intrusive "Upgrade to Pro" locked state/modal when a user hits the limit.
2. **The "Edit Profile" Modal (`EditProfileModal.tsx`):** Redesign it from a generic bottom-sheet to a perfectly centered, premium modal matching our `TradeOfferModal` style.
3. **The Hamburger Menu / Sidebar (`Sidebar.tsx`):** Replace the outdated logo with our official `<Logo />` component. Upgrade the design to feel "Uniques" (premium typography, better hover states, sleek "Sign Out").

## PROACTIVE TARGETS (Your Creative License)
Autonomously find 2-3 other areas to improve:
- Feature Synergy: Can the Achievements system tie into the Pro tier? 
- UI Polish: Hunt down and fix ugly standard scrollbars, generic buttons, or boring empty states (e.g., empty inventory or messages).