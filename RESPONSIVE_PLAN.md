# Mobile Responsive Design Implementation Plan

## Completed ✅
1. **Toast Notifications**
   - ✅ Mobile: top-center positioning  
   - ✅ Desktop: top-right positioning
   - ✅ Responsive text sizes
   - ✅ Text wrapping
   - ✅ Touch-friendly close button

## Phase 1: Modal Base Improvements 🎯

### A. CompanyModal.jsx (Priority: HIGH)
**Changes:**
1. Full-screen on mobile (< 768px)
2. Stack all form fields vertically on mobile
3. Larger touch targets for buttons (min 44px height)
4. Sticky header with title + close button
5. Scrollable content area
6. Sticky footer with Cancel/Save buttons

**Breakpoints:**
- Mobile: `< 768px` → Full screen, single column
- Tablet: `768px - 1024px` → 90% width, 2 columns for some fields  
- Desktop: `≥ 1024px` → Current design (max-w-2xl centered)

**Key CSS Classes to Add:**
```css
/* Mobile */
className="fixed inset-0 md:relative md:max-w-2xl md:rounded-3xl"

/* Form Grid */
className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6"

/* Buttons */
className="py-4 md:py-3" // Larger on mobile

/* Header */
className="sticky top-0 z-10 bg-white dark:bg-slate-900"

/* Footer */
className="sticky bottom-0 z-10 bg-white dark:bg-slate-900 border-t"
```

### B. IdolModal.jsx (Priority: MEDIUM)
**Same strategy as CompanyModal**
- Already has tabs, keep tab bar sticky on mobile
- Adjust image editor for mobile (simpler controls)
- Reduce Awards section complexity on mobile

### C. GroupModal.jsx (Priority: MEDIUM)
**Same strategy**
- Member search dropdown full-width on mobile
- Draggable member list with larger touch targets

## Phase 2: Navigation Improvements 🎯

### A. Header/Navbar
**Mobile (< 640px):**
- Hamburger menu button
- Slide-in drawer menu
- Logo only in header
- Actions in drawer

**Current Issues:**
- Logo + Theme Toggle + Log In button too cramped on 375px

### B. Filter Bar
**Mobile:**
- Wrap filter buttons to multiple rows if needed
- Full-width dropdowns
- Stacked layout instead of horizontal

## Phase 3: Card & List Views 🎯

### A. Idol Cards
- ✅ Already responsive (full-width on mobile)
- ✅ Good touch targets

### B. Detail Pages
- Optimize image gallery for mobile (swipeable)
- Larger text for readability
- Collapsible sections

## Implementation Order:
1. ✅ Toast (Done)
2. CompanyModal responsive design
3. IdolModal responsive design  
4. GroupModal responsive design
5. Header navigation (hamburger menu)
6. Filter bar improvements

## Testing Checklist:
- [ ] iPhone SE (375x667)
- [ ] iPhone 12/13 (390x844)
- [ ] iPad (768x1024)
- [ ] Desktop (1280x800, 1920x1080)

## Performance Targets:
- Touch targets: min 44x44px
- Font size mobile: min 14px for body text
- No horizontal scroll
- Smooth animations (60fps)
