

# Bottom Navigation Redesign

## Overview
Transform the bottom navigation into a premium, glass-morphic nav bar with a floating upload FAB and smart active-only labels for a modern, TikTok-inspired experience.

## Design Direction
- **Glass Morphism**: Heavy blur with semi-transparent background
- **Floating FAB**: Prominent centered upload button that stands out
- **Active-Only Labels**: Clean icon-only nav with labels appearing only on the selected tab
- **Brand Integration**: Purple gradient accent on FAB and active states

## Visual Comparison

**Current Design:**
```text
┌────────────────────────────────────────────┐
│  🏠    🔍   ┌────────┐   💬    👤          │
│ Home  Search│   ➕   │  Inbox Profile      │
│             └────────┘                      │
└────────────────────────────────────────────┘
  Height: 56px, all labels visible, flat style
```

**New Design:**
```text
┌────────────────────────────────────────────┐
│                   ╭───╮                    │
│                   │ ➕ │ ← Floating FAB     │
│  🏠    🔍        ╰───╯        💬    👤    │
│ Home                                       │
│  ↑ Active label only                       │
├────────────────────────────────────────────┤
│ ▓▓▓▓▓▓▓ Glass blur background ▓▓▓▓▓▓▓     │
└────────────────────────────────────────────┘
```

## Key Changes

### 1. Glass Morphism Background
- Background: `bg-background/60` (more transparent)
- Blur: `backdrop-blur-xl` (heavier blur for premium feel)
- Border: `border-t border-white/10` (subtle glass edge)
- Shadow: `shadow-lg shadow-black/20` (depth from FAB)

### 2. Floating Upload FAB
- Position: Centered, elevated above the nav bar
- Size: `w-12 h-12` rounded-full
- Style: Purple-to-pink gradient background
- Effect: Shadow and subtle glow
- Animation: Scale up slightly on hover/press

### 3. Active-Only Labels
- Icons: `w-6 h-6` for better touch targets
- Inactive: Icon only, muted color
- Active: Icon + label below, primary/foreground color
- Transition: Smooth fade for label appearance

### 4. Nav Item Spacing
- Remove text gap when inactive (just icon centered)
- Add gap-0.5 when active (icon + small label)
- Slight scale animation on active state

### 5. Notification Badge
- Keep the existing badge on Inbox
- Adjust positioning for icon-only layout

## Technical Implementation

### Component Structure
```tsx
<nav className="fixed bottom-0 ... bg-background/60 backdrop-blur-xl border-t border-white/10">
  {/* FAB - positioned absolutely above nav */}
  <div className="absolute -top-6 left-1/2 -translate-x-1/2">
    <Link to="/upload" className="w-12 h-12 bg-gradient-primary rounded-full shadow-lg">
      <Plus className="w-6 h-6" />
    </Link>
  </div>

  {/* Nav items with gap for FAB */}
  <div className="flex items-center justify-around h-12">
    {/* Home, Search, [gap], Inbox, Profile */}
  </div>
</nav>
```

### Active State Logic
```tsx
// Show label only when active
<Link className={cn("flex flex-col items-center", isActive ? "gap-0.5" : "")}>
  <item.icon className={cn("w-6 h-6", isActive ? "text-foreground" : "text-muted-foreground")} />
  {isActive && <span className="text-[10px] font-medium">{item.label}</span>}
</Link>
```

### FAB Styling
```tsx
<div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/30 hover:scale-105 transition-transform">
  <Plus className="w-6 h-6 text-white" />
</div>
```

## File Changes

| File | Changes |
|------|---------|
| `src/components/layout/BottomNav.tsx` | Complete redesign with glass morphism, floating FAB, and active-only labels |
| `src/index.css` | Update `--bottom-nav-height` if needed |

## Accessibility Considerations
- Touch targets remain 44x44 minimum
- Active state clearly indicated
- FAB is prominently visible
- Screen reader labels preserved via aria-label

## Summary
- **Premium glass-morphic aesthetic** with heavy blur
- **Floating FAB** makes upload action prominent
- **Cleaner layout** with icon-only inactive states
- **Smart labels** appear only when needed
- **Brand consistency** with purple gradient on FAB

