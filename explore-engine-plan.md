# PROJECT: The "Explore" Algorithmic Engine & Filters Sprint

## GOAL
Transform the basic Explore page into a dynamic, personalized marketplace. It must integrate with our existing eBay API and user onboarding preferences to show a tailored "For You" feed, a "Trending" section, and premium advanced filters.

## TEAM REQUIRED (3 Agents)
1. **Backend & API Architect:** Map user onboarding preferences to database/eBay queries. Ensure API calls are efficient and don't break existing schemas.
2. **Frontend UI/UX Designer:** Build a premium Advanced Filters UI and a horizontal "Trending Now" carousel. 
3. **Full-Stack Engineer:** Wire everything together. Blend local app inventory with eBay API results to feed the UI.

## MANDATORY TARGETS (Execute carefully)

### 1. The Personalized "For You" Feed
- Read the logged-in user's explicitly chosen categories/interests (from their onboarding/profile data).
- The default Explore view must dynamically fetch and display items matching these preferences using BOTH the local database items and the existing eBay API service.

### 2. Advanced Filters UI
- Add a sleek "Filters" button on the Explore page (using our `#CAE6CE` brand color for active states).
- It should open a premium dark modal or drawer (`bg-[#1A1818]`).
- Implement functional filters: Category (Cards, Watches, etc.), Price Range, and Condition.

### 3. "Trending / Hot Deals" Section
- Above the main feed, implement a horizontal scrolling carousel (swipeable on mobile).
- Fill it with "Trending" items (for now, you can simulate this by querying the highest-priced items or most recently added premium items).
- Use premium card designs (keep our existing glowing borders and dark aesthetic).

## STRICT CONSTRAINTS
- **DO NOT** rewrite or break the existing eBay API fetch logic (`src/lib/ebay.ts` or equivalent). Only extend its usage or parameters.
- **DO NOT** alter the user database schema destructively.
- Preserve the global `#1A1818` dark theme and `scrollbar-none` rules we implemented previously.