# Event Handlers in Next.js 16 App Router - Fix Guide

## Problem: "Event handlers cannot be passed to Client Component props"

When deploying a Next.js 16 project to Vercel, you may encounter this error:

```
Error: Event handlers cannot be passed to Client Component props.
{href: '#', onClick: function onClick, children: ...}
                          ^^^^^^^^^^^^^^^^
```

### Root Cause

This error occurs when:
1. A **Server Component** tries to pass an event handler (`onClick`, `onChange`, etc.) as a prop
2. To a **Client Component** that will serialize the function at build time
3. Next.js cannot serialize JavaScript functions during the build process

### Why This Happens

Next.js 16 uses the App Router with automatic Server Components by default. When a Server Component passes a function prop to a Client Component, Next.js tries to serialize it during the build phase, which is not allowed.

```tsx
// ❌ FAILS: Server Component passing onClick to Client Component
export default function About() {
  return (
    <ActionButton 
      onClick={() => window.location.href = "/"} // Function being serialized!
    >
      Click Me
    </ActionButton>
  )
}
```

---

## Solution: Move Interactive Logic Into Client Components

The fix is to separate interactive logic from Server Components by creating dedicated Client Components for interactive sections.

### Pattern 1: Simple Event Handlers (ActionButton, NavLink)

**Mark components that receive/handle events as `"use client"`:**

```tsx
// ✅ WORKS: Client Component that handles its own onClick
"use client"

interface ActionButtonProps {
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
  children: React.ReactNode
}

export default function ActionButton({ onClick, children }: ActionButtonProps) {
  return (
    <button onClick={onClick}>
      {children}
    </button>
  )
}
```

### Pattern 2: Wrapper Components (CTASection)

**For complex interactive sections, wrap them in a separate Client Component:**

```tsx
// ✅ WORKS: Client Component wraps interactive elements
"use client"

import ActionButton from "@/components/ActionButton"

export default function CTASection() {
  return (
    <section>
      <ActionButton 
        onClick={() => window.location.href = "/"}
      >
        Start Chatting
      </ActionButton>
    </section>
  )
}
```

**Then use it in Server Component:**

```tsx
// Server Component (no "use client" needed)
import CTASection from "@/components/CTASection"

export default function About() {
  return (
    <main>
      <h1>About</h1>
      <CTASection /> {/* Safe: CTASection handles its own interactivity */}
    </main>
  )
}
```

### Pattern 3: NavLink Component

**For links with optional onClick handlers:**

```tsx
// ✅ WORKS: Client Component for interactive navigation
"use client"

import Link from "next/link"

interface NavLinkProps {
  href: string
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void
  children: React.ReactNode
}

export default function NavLink({ href, onClick, children }: NavLinkProps) {
  return (
    <Link href={href} onClick={onClick}>
      {children}
    </Link>
  )
}
```

---

## Implementation: Files Created

### 1. Components with `"use client"`

#### `components/NavLink.tsx`
- Handles navigation with optional `onClick`
- Marked as Client Component
- Supports both internal links and external URLs

#### `components/ActionButton.tsx`
- Reusable button component with variants
- Handles `onClick` events safely
- Marked as Client Component
- Variants: `primary` (red), `secondary` (black), `outline`

#### `components/CTASection.tsx`
- **NEW PATTERN**: Wrapper for interactive sections
- Wraps `ActionButton` components with their click handlers
- Marked as Client Component
- Moved from Server Component to isolate interactivity

### 2. Server Component Page

#### `app/about/page.tsx`
- Main About page (NOT marked `"use client"`)
- Imports Client Components for interactive elements
- Server-side features: metadata, static content, layout
- Imports `CTASection` for the call-to-action area

---

## Full Implementation Example

### File Structure
```
mydigitaltwin/
├── components/
│   ├── NavLink.tsx          ← "use client"
│   ├── ActionButton.tsx     ← "use client"
│   └── CTASection.tsx       ← "use client" (wrapper)
└── app/
    └── about/
        └── page.tsx          ← Server Component (no "use client")
```

### The Pattern Flow

```
┌─────────────────────────────────────────────────┐
│  About Page (Server Component)                  │
│  - No "use client"                              │
│  - Renders static content, metadata             │
│  - Imports Client Components                    │
└────────────┬────────────────────────────────────┘
             │
             ├─→ imports NavLink (Client)
             │
             └─→ imports CTASection (Client)
                    │
                    └─→ uses ActionButton (Client)
                         - onClick is safe here
                         - Function stays in Client Component
                         - Never serialized by Server
```

---

## Best Practices

### ✅ DO

1. **Mark components as `"use client"` if they:**
   - Use event handlers (`onClick`, `onChange`, etc.)
   - Use React hooks (`useState`, `useEffect`, etc.)
   - Use browser APIs (`window`, `localStorage`, etc.)

2. **Keep Server Components for:**
   - Metadata and static content
   - Database queries and backend logic
   - Sensitive information (API keys, tokens)

3. **Use wrapper components for interactive sections:**
   - Group related interactive elements
   - Isolate `onClick` handlers from Server Components
   - Keep the boundary clear between Server/Client

### ❌ DON'T

1. **Don't pass functions as props** from Server to Client Components that need serialization

2. **Don't mark the entire page** as `"use client"` just to use one button
   - Split into Server + Client Components instead

3. **Don't use inline onClick** in Server Components when rendering Client Components:
   ```tsx
   // ❌ WRONG
   export default function Page() {
     return <Button onClick={() => doSomething()} /> // Error!
   }
   ```

4. **Do create wrapper components** instead:
   ```tsx
   // ✅ RIGHT
   export default function Page() {
     return <InteractiveButton /> // Client component handles click
   }
   ```

---

## Troubleshooting

### Error Still Occurs?

Check these:

1. **Verify `"use client"` is at the top of the file:**
   ```tsx
   "use client"  // Must be first line!
   
   import React from "react"
   ```

2. **Ensure event handler component is Client Component:**
   ```tsx
   // ✅ Correct
   "use client"
   export function ActionButton({ onClick, children }) {
     return <button onClick={onClick}>{children}</button>
   }
   ```

3. **Don't pass functions through props to prerendered components:**
   - If a component is prerendered at build time, it can't receive functions
   - Wrap it in a Client Component instead

4. **Check import paths:**
   ```tsx
   // ✅ Correct (uses @ alias)
   import ActionButton from "@/components/ActionButton"
   ```

### Build Success Verification

After applying the fix:

```bash
pnpm build
```

You should see:

```
✓ Compiled successfully in X.Xs
✓ Finished TypeScript in X.Xs
✓ Collecting page data
✓ Generating static pages (11/11)
○ /about  ← Static route (no error)
ƒ /api/chat
```

---

## Theme Customization

The example uses a **dark-red + black** theme with Tailwind:

- **Primary Color**: Red (`text-red-600`, `bg-red-600`)
- **Background**: Black (`bg-black`, `dark:bg-zinc-900`)
- **Accents**: Zinc (`text-zinc-300`, `border-zinc-800`)

To customize:

1. **Change color in components:**
   ```tsx
   className="text-red-600 dark:text-red-500"
   // Change to:
   className="text-blue-600 dark:text-blue-500"
   ```

2. **Update variants in ActionButton:**
   ```tsx
   primary: "bg-red-600 hover:bg-red-700",
   // Change to:
   primary: "bg-blue-600 hover:bg-blue-700",
   ```

3. **Extend Tailwind config** in `tailwind.config.ts`:
   ```ts
   theme: {
     extend: {
       colors: {
         brand: "your-color"
       }
     }
   }
   ```

---

## Production Deployment

The fixed structure is **Vercel-ready**:

1. ✅ No serialization errors
2. ✅ TypeScript types enforced
3. ✅ Static and dynamic routes properly marked
4. ✅ Event handlers isolated in Client Components
5. ✅ Server Components for data fetching
6. ✅ Ready for Edge Runtime

### Deploy:
```bash
pnpm build
pnpm start
# Or directly: git push (auto-deploys on Vercel)
```

---

## Summary

| Issue | Solution |
|-------|----------|
| "Event handlers cannot be passed to Client Component props" | Mark components using events as `"use client"` |
| Functions being serialized | Wrap interactive logic in Client Components |
| Can't add onClick to Server Component button | Create a Client Component wrapper (like `CTASection`) |
| Entire page marked as `"use client"` | Split into smaller Client Components instead |
| Build fails with prerendering error | Move onClick handlers into Client Components |

By following these patterns, your Next.js 16 App Router project will be production-ready and Vercel-compatible! 🚀
