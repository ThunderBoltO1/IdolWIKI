# K-Pop Wiki Design System

## 🎨 Core Design Principles

### Visual Consistency
Every page should feel like part of the same application. Users should never feel like they've left the site.

---

## 📐 Layout Patterns

### Pattern 1: Full Page Container (for main content pages)
```jsx
<div className="container mx-auto px-4 py-8 min-h-screen max-w-7xl">
    <BackgroundShapes />
    
    {/* Header Section */}
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div className="flex items-center gap-4">
            <button onClick={onBack} className={cn(
                "p-3 rounded-2xl transition-all active:scale-95 shadow-sm border",
                theme === 'dark'
                    ? "bg-slate-800 border-white/5 hover:bg-slate-700 text-white"
                    : "bg-white border-slate-100 hover:bg-slate-50 text-slate-900"
            )}>
                <ArrowLeft size={20} />
            </button>
            <div>
                <h1 className={cn(
                    "text-2xl md:text-4xl font-black tracking-tight flex items-center gap-3",
                    theme === 'dark' ? "text-white" : "text-slate-900"
                )}>
                    <Icon className="text-brand-pink" size={32} />
                    Page Title
                </h1>
                <p className={cn(
                    "text-sm font-medium mt-1",
                    theme === 'dark' ? "text-slate-400" : "text-slate-500"
                )}>
                    Page subtitle or description
                </p>
            </div>
        </div>
    </div>

    {/* Main Content Card */}
    <div className={cn(
        "rounded-[40px] border p-8 md:p-10",
        theme === 'dark' ? 'bg-slate-900/40 border-white/10' : 'bg-white border-slate-200'
    )}>
        {/* Content here */}
    </div>
</div>
```

**Used in:**
- AdminDashboard
- ProfilePage
- AdminSubmissionDashboard
- CompanyDetailPage (partially)

### Pattern 2: Centered Modal/Card (for auth & simple forms)
```jsx
<div className="flex items-center justify-center min-h-screen p-4">
    <BackgroundShapes />
    <motion.div className={cn(
        "w-full max-w-md p-8 rounded-[40px] border",
        theme === 'dark' ? 'bg-slate-900/40 border-white/10' : 'bg-white border-slate-200'
    )}>
        {/* Form content */}
    </motion.div>
</div>
```

**Used in:**
- LoginPage
- RegisterPage
- ForgotPasswordPage

---

## 🎯 Component Patterns

### Back Button (Standard)
```jsx
<button
    onClick={onBack}
    className={cn(
        "p-3 rounded-2xl transition-all active:scale-95 shadow-sm border",
        theme === 'dark'
            ? "bg-slate-800 border-white/5 hover:bg-slate-700 text-white"
            : "bg-white border-slate-100 hover:bg-slate-50 text-slate-900"
    )}
>
    <ArrowLeft size={20} />
</button>
```

### Page Header
```jsx
<h1 className={cn(
    "text-2xl md:text-4xl font-black tracking-tight flex items-center gap-3",
    theme === 'dark' ? "text-white" : "text-slate-900"
)}>
    <Icon className="text-brand-pink" size={32} />
    Page Title
</h1>
<p className={cn(
    "text-sm font-medium mt-1",
    theme === 'dark' ? "text-slate-400" : "text-slate-500"
)}>
    Subtitle
</p>
```

### Section Header
```jsx
<h3 className={cn(
    'text-xs font-black uppercase tracking-[0.25em] mb-6',
    theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
)}>
    Section Title
</h3>
```

### Content Card
```jsx
<div className={cn(
    "rounded-[40px] border p-8 md:p-10",
    theme === 'dark' ? 'bg-slate-900/40 border-white/10' : 'bg-white border-slate-200'
)}>
    {/* Content */}
</div>
```

### Nested Card/Box
```jsx
<div className={cn(
    'p-5 rounded-2xl border',
    theme === 'dark' ? 'border-white/10 bg-slate-950/30' : 'border-slate-200 bg-slate-50'
)}>
    {/* Content */}
</div>
```

### Primary Button
```jsx
<button className={cn(
    "px-6 py-3 rounded-2xl font-black uppercase text-xs tracking-[0.15em] text-white shadow-lg transition-all active:scale-95",
    "bg-brand-pink hover:bg-brand-pink/90"
)}>
    Button Text
</button>
```

### Secondary Button
```jsx
<button className={cn(
    "px-4 py-2 rounded-xl border transition-all text-xs font-black uppercase tracking-widest",
    theme === 'dark' 
        ? "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white border-white/10" 
        : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900 border-slate-200"
)}>
    Button Text
</button>
```

### Input Field
```jsx
<input className={cn(
    "w-full rounded-2xl py-3 px-4 focus:outline-none border-2 transition-all text-sm font-medium",
    theme === 'dark'
        ? "bg-slate-950/30 border-white/10 focus:border-brand-pink text-white"
        : "bg-slate-50 border-slate-200 focus:border-brand-pink text-slate-900"
)} />
```

### Divider
```jsx
<div className={cn('h-px my-8', theme === 'dark' ? 'bg-white/5' : 'bg-slate-200')} />
```

---

## 🎨 Color System

### Brand Colors
- **Pink**: `brand-pink` - Primary actions, icons, highlights
- **Purple**: `brand-purple` - Accents, gradients
- **Blue**: `brand-blue` - Accents, gradients

### Dark Theme
- Background: `bg-slate-900/40` (main cards)
- Background Alt: `bg-slate-950/30` (nested elements)
- Border: `border-white/10` or `border-white/5`
- Text Primary: `text-white`
- Text Secondary: `text-slate-400`
- Text Tertiary: `text-slate-500`

### Light Theme
- Background: `bg-white` (main cards)
- Background Alt: `bg-slate-50` (nested elements)
- Border: `border-slate-200` or `border-slate-100`
- Text Primary: `text-slate-900`
- Text Secondary: `text-slate-500`
- Text Tertiary: `text-slate-400`

---

## 📏 Spacing & Sizing

### Border Radius
- Large cards: `rounded-[40px]`
- Medium cards: `rounded-3xl` or `rounded-2xl`
- Small elements: `rounded-xl`
- Buttons: `rounded-2xl` or `rounded-xl`

### Padding
- Page container: `px-4 py-8`
- Large cards: `p-8 md:p-10`
- Medium cards: `p-6`
- Small cards: `p-4` or `p-5`

### Gaps
- Header section: `gap-4`
- Content sections: `gap-6` or `gap-8`
- Form fields: `gap-4` or `gap-6`

---

## 🔤 Typography

### Page Titles
```jsx
className="text-2xl md:text-4xl font-black tracking-tight"
```

### Section Titles
```jsx
className="text-xs font-black uppercase tracking-[0.25em]"
```

### Body Text
```jsx
className="text-sm font-medium" // or text-base
```

### Labels
```jsx
className="text-xs uppercase font-black tracking-[0.2em]"
```

---

## ✨ Animations

### Page Transitions
```jsx
<motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
>
```

### Button Press
```jsx
className="active:scale-95 transition-all"
```

### Hover Scale
```jsx
className="hover:scale-105 transition-transform duration-500"
```

---

## 📋 Pages Compliance Status

### ✅ Compliant
- AdminDashboard
- ProfilePage (จัดแล้ว)
- AdminSubmissionDashboard
- LoginPage
- RegisterPage

### ⚠️ Partial Compliance
- CompanyDetailPage
- IdolDetailPage
- GroupPage

### ❌ Need Updates
- FavoritesPage
- GroupSelection
- PublicProfilePage

---

## 🎯 Next Steps

1. Audit remaining pages
2. Update non-compliant pages to match patterns
3. Create reusable components for common patterns
4. Document any exceptions or special cases
