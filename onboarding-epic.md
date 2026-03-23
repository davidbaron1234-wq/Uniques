# PROJECT: The Uniques "Experience" Onboarding Epic

## GOAL
Transform the current barren /onboarding route into a stunning, multi-step, premium onboarding journey that defines the Uniques brand. It must educate the user, offer choices (including skip), and feel visually luxurious.

## MANDATORY TARGETS (Execute with Extreme Polish)

### Step 1: Welcome & Value Prop (The "Wow" Moment)
- A full-screen dark landing state (`bg-[#1A1818]`).
- **Headline:** "Welcome to Uniques. The Collector's Collective."
- **Body:** "Unlock the world of high-end collectibles. Curate your collection, discover rarities, and trade with verified collectors."
- **Visual:** A luxurious, subtle animation (Lottie or CSS) of high-end items (a watch, a card, a Lego box) swirling elegantly.
- **Action:** A bold "Let's Start" button AND a distinct "Skip Onboarding" button that immediately routes to `/search`.

### Step 2: "Tailor Your Experience" (Visual Revamp)
- Rebuild the current category grid with extreme visual polish. 
- **Headline:** "Personalize Your Feed." (Explain *why* we ask).
- **PREMIUM IMAGERY (The Critical Fix):** Replace ALL generic icons/emojis with high-quality, close-up, specific imagery of the real items for each category (e.g., a vintage PSA-graded Charizard for Pokémon, a Patek Philippe bezel for Watches, iconic Lego UCS box art, rare Nike SB Dunks).
- Use a state variable (e.g., `step: 1 -> 2`) to navigate from Step 1.

### Step 3: The Spotlight Tour (How it Works)
- Implement a "Coach Marks" / "Spotlight" effect on the main app interface.
- **Spotlight 1 (Explore):** Highlight the Explore tab (search route) -> Popover: "1. Discover: Browse curated and trending collections from eBay and local collectors."
- **Spotlight 2 (Add):** Highlight the '+' Add Item button -> Popover: "2. Curate: Digitally catalog your own treasures."
- **Spotlight 3 (Messages):** Highlight Messages tab -> Popover: "3. Trade: Propose trades directly inside chats."
- **Action:** "Dive In!" button that completes onboarding and goes to `/search`.

### Completion Logic
- "Let's Start" must eventually save preferences to Context before Dive In!
- "Skip Onboarding" must skip saving preferences and directly route to `/search`.