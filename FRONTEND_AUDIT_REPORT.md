# Frontend Audit Report: Explore/Search Page

**Audit Date:** 2026-03-18
**Scope:** `src/app/search/page.tsx`, related components, design tokens, and modal patterns
**Status:** Read-only analysis — implementation patterns documented for future Trending & Filters features

---

## 1. CURRENT STATE OF SEARCH/PAGE.TSX

### Page Structure (665 lines)
The page follows a "Suspense wrapper" pattern for SSR safety:
```
export default SearchPage → <Suspense> → SearchPageContent
```

### State Variables
| Variable | Type | Purpose |
|----------|------|---------|
| `activeTab` | "Items" \| "Collectors" | Controls tab display |
| `query` | string | Search text input |
| `selectedCategory` | SearchFilter | Category filter for Items tab |
| `results` | MasterItem[] | Paginated search results |
| `page`, `totalPages` | number | Pagination state |
| `loading`, `loadingMore` | boolean | Fetch state indicators |
| `viewItem` | MasterItem \| null | Card detail modal trigger |
| `addItem` | MasterItem \| null | Add-to-inventory modal trigger |
| `config` | ItemConfig | Form state for adding items |
| `followedIds` | Set<string> | Local follow state (not persisted) |

### Fetch Logic
- **Debounced search**: 250ms delay after user stops typing (line 304-310)
- **API endpoint**: `/api/catalog/search?q=...&category=...&page=...&pageSize=60`
- **Hard-coded params**: `categoryIds=1,220,64482,11116,281` (line 276) — specific catalog sections
- **Error handling**: Silent failure (no error toast shown)
- **Append vs. Replace**: `fetchResults(..., append: boolean)` distinguishes load-more from new search

### Render Structure

#### Items Tab
```
<div class="px-5 pb-4">
  {loading && <spinner>}
  {!loading && results.length === 0 && <empty-state>}
  {results.length > 0 && (
    <div class="grid grid-cols-3 gap-3">
      {results.map(item => <card onClick={() => setViewItem(item)}>)}
    </div>
    <button onClick={handleLoadMore}>Load More</button>
  )}
</div>
```

**Key CSS classes:**
- Grid: `grid grid-cols-3 gap-3` (3 columns, 12px gaps)
- Card: `rounded-2xl overflow-hidden bg-background-light shadow-soft card-hover group animate-scale-in`
- Image container: `aspect-square bg-white/[0.05] p-3` (white background for Lego/Funko)
- Image hover: `group-hover:scale-105 transition-transform duration-300`
- Stagger animation: `animationDelay: Math.min(i, 20) * 0.03`

#### Collectors Tab
```
<div class="px-5 pb-6">
  {filteredCollectors.length === 0 && <empty-state>}
  {<div class="space-y-2.5">
    {filteredCollectors.map((c, i) =>
      <CollectorCard
        collector={c}
        followed={followedIds.has(c.id)}
        onFollow={() => toggleFollow(c.id)}
        index={i}
      />
    )}
  </div>}
</div>
```

**CollectorCard Structure (lines 128-206):**
- Avatar with online dot indicator (2.5px green dot, bottom-right)
- Name + trust score star + count
- Handle (@username)
- Trades count + collection value
- 2 category tags (max)
- Follow button (outside Link to avoid nested interactives)
- Stagger animation: `animationDelay: index * 0.05s`
- Hover effect: `hover:bg-white/[0.05]`

### Category Filter Pills (Lines 460-483)
```
<div class="flex flex-nowrap gap-2 overflow-x-auto pb-1 scrollbar-none">
  {SEARCH_FILTERS.map(cat =>
    <button
      className={selectedCategory === cat
        ? "bg-surface/25 text-surface-light shadow-glow-surface"
        : "bg-background-light text-cream/35 hover:text-cream/60"}
    />
  )}
</div>
```

**Drag-to-scroll implementation (lines 244-259):**
- mouseDown stores `{ active, startX, scrollLeft }`
- mouseMove calculates delta: `scrollLeft = initial - (currentX - startX)`
- Cursor states: `grab` → `grabbing` → `grab`
- No snap/momentum — pure position tracking
- `scrollbar-none` utility hides native scrollbar

### Modals

#### CardDetailModal (Imported)
- Opens when `viewItem` is set
- Props: `item`, `onClose`, `onAdd`, `autoOpenTrade`
- Allows "Add to Inventory" which triggers `setAddItem(item)`

#### Add-to-Inventory Modal (Lines 603-643)
```
<div class="fixed inset-0 z-[100] flex items-center justify-center p-4">
  <div class="absolute inset-0 bg-black/85 backdrop-blur-sm animate-fade-in"
       onClick={() => setAddItem(null)} />
  <div class="relative w-full max-w-md bg-charcoal-dark rounded-3xl max-h-[90vh]
              flex flex-col animate-slide-up border border-white/10 shadow-2xl">
    {/* Header with item preview */}
    {/* Form content via ItemConfigForm */}
    {/* Footer with Cancel + Save buttons */}
  </div>
</div>
```

**Design notes:**
- Full-screen overlay: `fixed inset-0 z-[100]`
- Backdrop: `bg-black/85 backdrop-blur-sm`
- Modal: `bg-charcoal-dark` (#181515), `rounded-3xl` (1.5rem), `max-w-md` (28rem)
- Animations: `animate-fade-in` (overlay), `animate-slide-up` (modal)
- Border: `border-white/10` (subtle edge)
- Shadow: `shadow-2xl` (deep drop shadow)
- Mobile padding: `p-4`, responsive footer padding `pb-8 sm:pb-5`

#### Toast Notification (Lines 645-652)
```
<div class="fixed top-6 left-1/2 -translate-x-1/2 z-[200] animate-slide-up">
  {/* Success (green) or Error (red) variant */}
</div>
```

---

## 2. EXISTING FILTER UI

**Status:** NONE — Zero filter UI implemented beyond category pills.

The page could support:
- ✓ Category filter (already implemented via pills)
- ✗ Price range slider (no UI)
- ✗ Condition dropdown (no UI)
- ✗ Rarity / Grade filter (no UI)
- ✗ Advanced modal (no UI)

**Implication for Task #5 (Advanced Filters):** Clean slate to build against. No conflicting patterns to refactor.

---

## 3. COMPONENT INVENTORY & REUSABILITY

### Existing Search-Related Components

| File | Purpose | Reusable for Trending? |
|------|---------|----------------------|
| `CardDetailModal.tsx` | Item detail view, pricing, marketplace | ✓ Can be reused for trending items |
| `AddItemModal.tsx` | Manual item add with camera/barcode scan | ✗ Specific to inventory |
| `ItemConfigForm.tsx` | Condition, grading, asking price form | ✗ Specific to inventory |
| `TradeCard.tsx` | Trade history display (3-column layout) | ✗ Different domain |
| `Header.tsx` | Search bar, notifications | ✓ Used by search page |
| `BottomNav.tsx` | Navigation footer | ✓ Used by search page |

### For Trending Carousel

**Recommended approach:** Reuse existing card component pattern + grid layout:
- **Item card component:** Already exists as grid items in search results (line 505-534)
- **Animation pattern:** `animate-scale-in` with staggered delays
- **Container:** `flex gap-3 overflow-x-auto scrollbar-none` (similar to category pills)
- **Height:** Fixed to `aspect-square` like search grid

---

## 4. COLOR TOKENS & DESIGN SYSTEM

### Primary Palette (tailwind.config.ts:10-32)
```
primary:        #CAE6CE (mint green — active filters, CTAs)
primary-dark:   #9DC4A2 (darker mint)
background:     #221F1F (main dark bg)
background-light: #2C2929 (card bg, lighter dark)
surface:        #AA95C5 (lilac — secondary accent)
surface-dark:   #8A74A8 (darker lilac)
surface-light:  #C4B4DA (lighter lilac)
charcoal-dark:  #181515 (darkest bg — modals)
charcoal-light: #3A3535 (light charcoal)
cream:          #FCF9D5 (text, foreground)
text-muted:     rgba(252, 249, 213, 0.5)
```

### For Dark Modal Filters
- **Background:** `bg-charcoal-dark` (#181515) — currently used in add-to-inventory modal
- **Accent (active state):** `bg-primary/15` or `bg-primary/20` with `text-primary` (#CAE6CE)
- **Border (subtle):** `border-white/[0.08]` to `border-white/[0.12]`
- **Text:** `text-cream` or `text-cream/80` (primary), `text-cream/40` to `text-cream/60` (secondary)
- **Hover states:** `hover:bg-white/[0.07]` or `hover:bg-white/[0.14]`

### Available Box Shadows (tailwind.config.ts:42-48)
```
soft:         0 4px 20px rgba(0,0,0,0.15)
soft-lg:      0 8px 32px rgba(0,0,0,0.2)
soft-xl:      0 12px 48px rgba(0,0,0,0.25)
glow:         0 0 20px rgba(202,230,206,0.15) — primary glow
glow-surface: 0 0 20px rgba(170,149,197,0.15) — surface (lilac) glow
```

### Scrollbar Styling (globals.css:26-39)
```css
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: #181515; }
::-webkit-scrollbar-thumb { background: #AA95C5; border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: #8A74A8; }
```
**Utility:** `.scrollbar-none` hides scrollbar while allowing scroll (line 68-77)

### Animation Keyframes (tailwind.config.ts:56-78)
```
slideUp:     24px↓ + 0 opacity → 0px↓ + 1 opacity [0.4s cubic-bezier(0.16,1,0.3,1)]
fadeIn:      0 opacity → 1 opacity [0.3s ease-out]
scaleIn:     0.92 scale + 0 opacity → 1 scale + 1 opacity [0.25s cubic-bezier]
bounceSoft:  0.95 → 1.03 → 1 scale [0.5s ease-out]
pulseGlow:   0→6px shadow (prime color) → 0 [2.5s ease-in-out infinite]
```

---

## 5. CSS CLASSES & TOKENS FOR SPECIFIC USE CASES

### Active Filter State
**Current pill implementation (line 474-475):**
```jsx
selectedCategory === cat
  ? "bg-surface/25 text-surface-light shadow-glow-surface"
  : "bg-background-light text-cream/35 hover:text-cream/60"
```

**For brand-colored active state (#CAE6CE):**
```jsx
// Option A: Match existing pill pattern
? "bg-primary/15 text-primary shadow-glow"
: "bg-background-light text-cream/35 hover:text-cream/60"

// Option B: Higher contrast (if needed)
? "bg-primary/25 text-primary shadow-glow"
: "bg-white/[0.05] text-cream/40 hover:text-cream/70"
```

### Dark Modal (for Filters)
```jsx
// Backdrop
className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm animate-fade-in"
// Modal container
className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl bg-charcoal-dark
           border-t border-white/[0.08] overflow-hidden max-h-[90vh] flex flex-col
           animate-slide-up"
// Alternative: centered modal (like add-to-inventory)
className="fixed inset-0 z-50 flex items-center justify-center p-4"
// Inner modal
className="w-full max-w-md max-h-[90vh] rounded-3xl bg-charcoal-dark
           border border-white/10 shadow-2xl overflow-hidden flex flex-col
           animate-slide-up"
```

### Horizontal Scroll Carousel
```jsx
// Container
className="flex flex-nowrap gap-3 overflow-x-auto pb-1 scrollbar-none cursor-grab select-none"
// Items (fixed width, prevent shrink)
className="flex-shrink-0 rounded-2xl aspect-square bg-background-light shadow-soft"
// Animation
style={{ animationDelay: `${index * 0.05}s`, animationFillMode: "both" }}
className="animate-scale-in"
```

### Active State (Filter Checkbox / Radio)
```jsx
// When selected
className="flex items-center gap-2 px-4 py-2.5 rounded-2xl
           bg-primary/20 border border-primary/30 text-primary font-semibold
           cursor-pointer active:scale-95 transition-all"

// When unselected
className="flex items-center gap-2 px-4 py-2.5 rounded-2xl
           bg-white/[0.05] border border-white/[0.08] text-cream/50
           hover:bg-white/[0.08] hover:text-cream/70 font-semibold
           cursor-pointer active:scale-95 transition-all"
```

---

## 6. ARCHITECTURAL PATTERNS & ANTI-PATTERNS

### ✅ Patterns to Preserve

1. **Modal Stack (Z-index hierarchy):**
   - Backdrop: `z-[100]` (CardDetailModal, add-to-inventory)
   - Toast: `z-[200]` (appears above all modals)
   - **Best practice:** New filters modal should use `z-[100]` or `z-[50]` (drawer) to sit below/above accordingly

2. **Suspense Boundary:**
   - Page wrapped in `<Suspense>` (line 661-663)
   - Allows Header + BottomNav to render immediately
   - `useSearchParams()` inside boundary to access URL state

3. **Debounced Search:**
   - 250ms delay on query changes (line 304)
   - Prevents excessive API calls
   - **Pattern to reuse:** Filter changes could share same debounce timer or use separate 0ms timer (instant filter application)

4. **Drag-to-Scroll:**
   - MouseDown/Move/Up handlers on pill container (lines 244-259)
   - Pure JavaScript scroll position manipulation
   - Good for momentum-less, snappy UX

5. **Staggered Animation:**
   - `animationDelay: index * 0.05s` for cards (line 511)
   - `animationDelay: index * 0.07s` for trade cards (TradeCard.tsx:190)
   - Creates cascading entrance effect

### ❌ Anti-Patterns to Avoid

1. **Silent API failures:**
   - Line 291-292: Catch block is empty (no error toast)
   - **Fix:** Show toast or error state when search fails

2. **State sync via URL + local state:**
   - `query` from `searchParams.get("q")` but also `useState("query")`
   - Requires manual sync effect (line 315-320)
   - **Note:** This is correct but requires discipline to keep in sync

3. **Nested interactive elements:**
   - CollectorCard avoids this by placing Follow button outside Link (line 188-203)
   - **Pattern:** Always structure Link/Button hierarchy to avoid nesting

4. **Hard-coded category IDs:**
   - Line 276: `categoryIds=1,220,64482,11116,281` is magic
   - **Should:** Move to `constants.ts` or API query param

---

## 7. SPECIFIC CSS TOKENS FOR IMPLEMENTATION

### For Trending Carousel Header
```jsx
<h2 className="text-lg font-bold text-cream px-5 mb-3">Trending Now</h2>
```

### For Filter Chip (Active)
```jsx
className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-2xl
           bg-primary/20 border border-primary/20 text-primary text-xs font-semibold
           cursor-pointer hover:bg-primary/30 active:scale-95 transition-all"
```

### For Filter Modal Header
```jsx
className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]
           bg-charcoal-dark"
```

### For Filter Modal Divider (between sections)
```jsx
className="h-px bg-white/[0.05] my-4"
```

### For Range Slider Thumb (active)
```jsx
className="w-4 h-4 rounded-full bg-primary shadow-glow cursor-pointer
           hover:scale-125 transition-transform"
```

---

## 8. SUMMARY: READINESS ASSESSMENT

| Aspect | Status | Notes |
|--------|--------|-------|
| **Search Results Grid** | ✅ Ready | 3-column grid with animation + pagination |
| **Category Filters (Pills)** | ✅ Ready | Horizontal scroll, drag-enabled, active state |
| **Card Detail Modal** | ✅ Ready | Can be reused for trending items |
| **Modal Patterns** | ✅ Ready | Fixed overlay + centered modal established |
| **Color Tokens** | ✅ Ready | All primary/surface/charcoal defined |
| **Animation Keyframes** | ✅ Ready | slideUp, fadeIn, scaleIn available |
| **Advanced Filter Modal** | ⏳ Ready to build | No conflicting UI; can use same modal pattern |
| **Trending Carousel** | ⏳ Ready to build | Can reuse grid cards + horizontal scroll pattern |
| **Collector Directory** | ✅ Functional | 6 seed users, follow state; can seed with more data |
| **Toast System** | ✅ Ready | Fixed position, type variants (success/error) |

### Next Steps for Tasks #4 & #5:
1. **Task #4 (Trending):** Create horizontal carousel component reusing card grid pattern + `flex overflow-x-auto scrollbar-none`
2. **Task #5 (Filters):** Build filter modal using `bg-charcoal-dark` + price slider + condition dropdowns, apply active states with `bg-primary/20` + `shadow-glow`
3. **Both:** Use `animate-slide-up` + `animate-fade-in` for entrance animations; leverage `.scrollbar-none` for carousels

---

**Report prepared by:** Frontend Audit Agent (Read-only)
**Files analyzed:** 4 major files (search/page.tsx, TradeCard.tsx, globals.css, tailwind.config.ts) + component structure
**Estimated effort for Trending:** 2-4 hours (carousel component + data seeding)
**Estimated effort for Filters:** 4-6 hours (modal UI + state management + filtering logic)
