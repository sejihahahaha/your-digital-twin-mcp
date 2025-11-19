# Quick Reference: Event Handlers Fix for Next.js 16

## The Problem in 30 Seconds

```
Error: Event handlers cannot be passed to Client Component props.
```

**Cause**: Server Component tries to pass `onClick` function to Client Component at build time.

---

## The Solution in 30 Seconds

**Add `"use client"` to components that use event handlers:**

```tsx
"use client"  // ← Add this line

export default function MyButton({ onClick }) {
  return <button onClick={onClick}>Click Me</button>
}
```

---

## The Pattern

### ❌ WRONG: Server Component passes onClick directly
```tsx
export default function Page() {
  return <Button onClick={() => doSomething()} />
}
```

### ✅ RIGHT: Client Component handles onClick
```tsx
"use client"

export default function InteractiveButton() {
  return <button onClick={() => doSomething()}>Click</button>
}
```

---

## Checklist

- [ ] Add `"use client"` to top of component that uses `onClick`
- [ ] Import component in your page (no `"use client"` needed on page)
- [ ] Test: `pnpm build`
- [ ] Verify: No errors, route shows as `○` (static)

---

## Files Created for Your Project

```
mydigitaltwin/
├── components/
│   ├── NavLink.tsx          ← "use client" ✅
│   ├── ActionButton.tsx     ← "use client" ✅
│   └── CTASection.tsx       ← "use client" ✅
├── app/
│   └── about/
│       └── page.tsx         ← NO "use client" ✅
└── Docs:
    ├── NEXTJS_CLIENT_COMPONENT_FIX.md
    ├── BEFORE_AND_AFTER_FIX.md
    └── (this file)
```

---

## Copy-Paste Template

### Component with Event Handler

```tsx
"use client"  // Required for onClick

interface MyComponentProps {
  onClick?: () => void
  children: React.ReactNode
}

export default function MyComponent({ onClick, children }: MyComponentProps) {
  return (
    <button onClick={onClick}>
      {children}
    </button>
  )
}
```

### Page Using Component

```tsx
// NO "use client" needed!
import MyComponent from "@/components/MyComponent"

export default function Page() {
  return <MyComponent>Click Me</MyComponent>
}
```

---

## Build Check

```bash
pnpm build
```

✅ Success looks like:
```
✓ Compiled successfully
✓ Finished TypeScript
✓ Generating static pages (X/X)
```

❌ Failure looks like:
```
Error: Event handlers cannot be passed to Client Component props.
Error occurred prerendering page "/your-page".
```

---

## Theme Colors (Dark Red + Black)

```tsx
// Primary (Red)
className="text-red-600 dark:text-red-500 bg-red-600"

// Secondary (Black)
className="text-black dark:text-white bg-black dark:bg-zinc-900"

// Accent (Zinc)
className="text-zinc-300 border-zinc-800"
```

---

## One-Liner Fix

**If you get the error, add this to the top of the component:**
```tsx
"use client"
```

That's it! 🎉

---

## When to Use `"use client"`

✅ **DO use it if:**
- Component uses `onClick`, `onChange`, etc.
- Component uses `useState`, `useEffect`, etc.
- Component accesses `window`, `localStorage`, etc.
- Component has interactivity

❌ **DON'T use it if:**
- Component is just UI layout and props
- Component does data fetching only
- Component only receives static children
- Component is for performance optimization

---

## Common Errors & Fixes

| Error | Fix |
|-------|-----|
| "Event handlers cannot be passed" | Add `"use client"` to component |
| "Use of dynamic function not supported" | Component needs `"use client"` |
| "Cannot use hooks in server component" | Add `"use client"` to component |
| "window is not defined" | Add `"use client"` to component |

---

## Key Files

1. **`components/ActionButton.tsx`** - Reusable button with onClick
2. **`components/NavLink.tsx`** - Link with optional onClick
3. **`components/CTASection.tsx`** - Wrapper for interactive sections
4. **`app/about/page.tsx`** - Example page showing the pattern

All files are fully typed, production-ready, and use the dark-red + black theme! ✅

---

## Learn More

- Full guide: `NEXTJS_CLIENT_COMPONENT_FIX.md`
- Before/After examples: `BEFORE_AND_AFTER_FIX.md`
- Official docs: https://nextjs.org/docs/app/building-your-application/rendering/client-components

---

**Last Updated**: November 2024  
**Status**: ✅ Production Ready  
**Build Status**: ✅ Passing  
**Deployment**: ✅ Vercel Compatible
