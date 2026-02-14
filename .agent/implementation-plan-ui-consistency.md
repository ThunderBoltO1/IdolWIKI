---
description: UI/UX Consistency Implementation Plan
---

# 🎨 UI/UX Consistency Implementation Plan

## Objective
Make all pages follow the same design system for a cohesive user experience across the entire application.

## Design System Reference
See `.agent/design-system.md` for the complete design patterns and component library.

---

## ✅ Completed Pages

### 1. ProfilePage
- ✅ Full page container layout
- ✅ Consistent back button (bordered, rounded-2xl)
- ✅ Page header with icon and subtitle
- ✅ Content card with rounded-[40px] border
- ✅ Section dividers
- ✅ Pink accent buttons

### 2. AdminSubmissionDashboard
- ✅ Full page container layout
- ✅ Consistent back button
- ✅ Page header with FileCheck icon
- ✅ Tabbed interface with rounded card
- ✅ Consistent color scheme

### 3. FavoritesPage
- ✅ Full page container layout
- ✅ Consistent back button
- ✅ Page header with Heart icon and subtitle
- ✅ Section headers with uppercase tracking
- ✅ Empty state card with proper styling

### 4. AdminDashboard
- ✅ Already follows the pattern (reference implementation)

### 5. LoginPage / RegisterPage
- ✅ Centered modal pattern (appropriate for auth pages)
- ✅ Consistent styling

---

## 🔄 Pages Needing Updates

### Priority 1: Core User-Facing Pages

#### A. IdolDetailPage
**Current issues:**
- Inconsistent back button style (check needed)
- Header might not match the pattern
- Card styling needs verification

**Required changes:**
1. Update back button to bordered style
2. Ensure header uses text-4xl with icon
3. Verify card uses rounded-[40px] border
4. Check section headers use uppercase tracking
5. Ensure buttons use pink theme

#### B. GroupPage
**Current issues:**
- Similar to IdolDetailPage
- Needs consistency check

**Required changes:**
1. Match IdolDetailPage updates
2. Ensure members section follows pattern
3. Update any custom buttons to standard style

#### C. CompanyDetailPage
**Current issues:**
- Partially updated but needs review
- Ensure all sections follow pattern

**Required changes:**
1. Verify back button style
2. Check header consistency
3. Ensure About section follows text patterns
4. Update any remaining non-standard elements

#### D. PublicProfilePage
**Current issues:**
- Needs full audit
- Likely doesn't follow new patterns

**Required changes:**
1. Update to full page container layout
2. Add consistent back button
3. Update header with proper sizing
4. Ensure card styling matches
5. Update section headers

### Priority 2: Admin Pages

#### E. AdminUserManagement
**Status:** Needs verification

**Actions:**
1. Verify follows admin page pattern
2. Check back button consistency
3. Ensure table/grid styling matches theme

#### F. AdminAuditLogs
**Status:** Needs verification

**Actions:**
1. Same as AdminUserManagement
2. Verify timeline/log styling is cohesive

#### G. AdminAwardManagement
**Status:** Needs verification

**Actions:**
1. Verify admin page pattern
2. Check modal styles if any
3. Ensure form elements match design system

#### H. CompanyManagement
**Status:** Needs verification

**Actions:**
1. Check grid/card layouts
2. Verify button styles
3. Ensure modals are consistent

### Priority 3: Modal Components

#### I. IdolModal
**Current issues:**
- Modal patterns need consistency
- Button styles may vary

**Required changes:**
1. Ensure modal overlay is consistent
2. Update button styles to match system
3. Verify input fields follow pattern
4. Check rounded corners consistency

#### J. GroupModal
**Required changes:**
- Same as IdolModal

#### K. CompanyModal
**Required changes:**
- Same as IdolModal

### Priority 4: Home/Landing Pages

#### L. GroupSelection (Home Page)
**Current issues:**
- May have different layout paradigm
- Needs to feel connected while serving as landing

**Required changes:**
1. Ensure navbar follows theme
2. Verify cards use consistent styling
3. Check filter bar matches design
4. Ensure transitions are smooth

---

## 🎯 Implementation Strategy

### Phase 1: Core Pages (Week 1)
1. ✅ ProfilePage - DONE
2. ✅ FavoritesPage - DONE
3. IdolDetailPage
4. GroupPage
5. CompanyDetailPage

### Phase 2: User-Facing Pages (Week 1-2)
6. PublicProfilePage
7. GroupSelection refinements

### Phase 3: Admin Pages (Week 2)
8. AdminUserManagement
9. AdminAuditLogs
10. AdminAwardManagement
11. CompanyManagement

### Phase 4: Modals & Components (Week 2)
12. IdolModal
13. GroupModal
14. CompanyModal

### Phase 5: Polish & Testing (Week 3)
15. Cross-browser testing
16. Responsive design verification
17. Dark/Light theme consistency
18. Animation smoothness
19. User flow testing

---

## 📋 Checklist for Each Page

When updating a page to match the design system, verify:

- [ ] **Back Button**: Bordered, rounded-2xl, proper hover states
- [ ] **Page Header**: 
  - [ ] Title: text-2xl md:text-4xl font-black
  - [ ] Icon: size={32}, text-brand-pink
  - [ ] Subtitle: text-sm font-medium
- [ ] **Container**: max-w-7xl, px-4 py-8
- [ ] **Main Card**: rounded-[40px], proper border & background
- [ ] **Section Headers**: text-xs uppercase tracking-[0.25em]
- [ ] **Dividers**: h-px with proper color
- [ ] **Buttons**: 
  - [ ] Primary: bg-brand-pink, rounded-2xl
  - [ ] Secondary: bordered style
- [ ] **Inputs**: rounded-2xl, border-2, focus:border-brand-pink
- [ ] **Colors**: Matches dark/light theme patterns
- [ ] **Spacing**: Consistent gaps and padding
- [ ] **Animations**: Smooth transitions, active:scale-95

---

## 🔧 Testing Checklist

After each page update:

- [ ] Test in dark mode
- [ ] Test in light mode
- [ ] Test on mobile (320px+)
- [ ] Test on tablet (768px+)
- [ ] Test on desktop (1024px+)
- [ ] Verify all interactive elements work
- [ ] Check animation smoothness
- [ ] Verify accessibility (keyboard navigation)
- [ ] Check against design system documentation

---

## 📊 Progress Tracking

**Total Pages:** 16
**Completed:** 5 (31%)
**In Progress:** 0
**Remaining:** 11 (69%)

### Priority Distribution
- **P1 (Core):** 3 pages remaining
- **P2 (User):** 2 pages remaining  
- **P3 (Admin):** 4 pages remaining
- **P4 (Modals):** 3 pages remaining

---

## 🎯 Success Criteria

The UI/UX consistency project will be considered successful when:

1. ✅ All pages use the same back button style
2. ✅ All headers follow the same pattern (size, icon, subtitle)
3. ✅ All cards use consistent border radius (40px for main, 2xl for nested)
4. ✅ All buttons use pink theme (primary) or consistent secondary style
5. ✅ All inputs have the same styling and focus states
6. ✅ All section headers use uppercase tracking
7. ✅ Spacing is consistent across pages (px-4 py-8, gaps)
8. ✅ Animations are smooth and consistent
9. ✅ Dark and light themes are equally polished
10. ✅ No page feels "disconnected" from the rest of the site

---

## 📝 Notes

- Use ProfilePage and AdminDashboard as reference implementations
- Refer to design-system.md for specific component patterns
- Test each change in both themes before moving to next page
- Maintain existing functionality while updating styling
- Document any exceptions or special cases

---

Last Updated: 2026-02-14
