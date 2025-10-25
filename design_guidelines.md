# Design Guidelines: Music Guessing Game

## Design Approach

**Reference-Based Approach** inspired by successful multiplayer party games:
- **Kahoot**: Vibrant colors, clear competitive elements, engaging animations
- **Jackbox Games**: Playful aesthetics, accessible UI, social atmosphere
- **Skribbl.io**: Simple clarity, room-based multiplayer patterns
- **Spotify**: Music context, album art prominence, modern media player patterns

**Core Principle**: Create an energetic, social gaming experience that balances competitive excitement with approachable clarity.

---

## Core Design Elements

### A. Color Palette

**Dark Mode (Primary):**
- **Background**: 222 15% 12% (deep charcoal with subtle warmth)
- **Surface**: 220 15% 18% (elevated cards/panels)
- **Primary Brand**: 280 65% 60% (vibrant purple - energetic and music-themed)
- **Secondary/Success**: 145 60% 50% (bright green for correct guesses)
- **Accent/Warning**: 340 75% 55% (coral-pink for urgency, timers)
- **Text Primary**: 0 0% 98%
- **Text Secondary**: 220 10% 65%

**Light Mode:**
- **Background**: 210 20% 98%
- **Surface**: 0 0% 100%
- **Primary**: 280 70% 55% (slightly deeper purple)
- **Secondary/Success**: 145 55% 45%
- **Accent**: 340 70% 50%
- **Text Primary**: 222 15% 15%
- **Text Secondary**: 220 15% 45%

### B. Typography

**Font Families:**
- **Headings**: 'Outfit', sans-serif (modern, friendly, geometric - perfect for games)
- **Body/UI**: 'Inter', sans-serif (highly readable, professional)
- **Code/Room Codes**: 'JetBrains Mono', monospace (for room codes, clear distinction)

**Type Scale:**
- Hero/Game Title: text-6xl font-bold (60px)
- Room Code Display: text-4xl font-mono font-bold
- Section Headers: text-3xl font-bold
- Song Titles: text-2xl font-semibold
- Player Names: text-lg font-medium
- Body/Timer: text-base
- Captions/Hints: text-sm

### C. Layout System

**Spacing Primitives**: Use Tailwind units of **4, 6, 8, 12, 16** for consistency
- Component padding: p-6 or p-8
- Section spacing: gap-8, space-y-12
- Tight groupings: gap-4
- Generous whitespace: py-16 for major sections

**Grid Structure:**
- Lobby/Game Board: Single column focus (max-w-4xl mx-auto)
- Player Grid: grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4
- Leaderboard: Single column list with clear hierarchy

### D. Component Library

**Landing/Home Page:**
- **Hero Section**: Full-viewport entry with gradient background (purple to deep blue), centered game title with tagline, primary CTA "Create Room" button (large, vibrant), secondary "Join Room" input
- **How to Play**: 4-step visual guide with numbered icons (grid-cols-1 md:grid-cols-2 lg:grid-cols-4)
- **Features Grid**: 3 feature cards highlighting theme-based rounds, YouTube integration, competitive scoring

**Lobby Interface:**
- **Room Code Card**: Prominent centered display with copy button, monospace styling, large and clearly readable
- **Player List**: Card-based grid showing avatars (colored circles with initials), player names, host indicator badge
- **Settings Panel** (Host only): Form with sliders for pick timer (30s-3min), playback timer (15s-60s), rounds count
- **Theme Input**: Large text input for host to set current theme, displays to all players

**Game Play Screens:**

*Song Selection Phase:*
- **YouTube Search Interface**: Prominent search bar, thumbnail grid results (3 columns), selected song preview card with editable title field
- **Timer Display**: Circular progress indicator in top-right, countdown in center
- **Theme Banner**: Sticky header showing current theme in bold typography

*Guessing Phase:*
- **YouTube Player Embed**: Centered, aspect-ratio-video, controls minimal
- **Guess Input**: Large text input with submit button, below player
- **Live Feedback**: Toast notifications for correct guesses (green) vs. incorrect (subtle shake)
- **Player Status Grid**: Small cards showing who's guessed (checkmark), still guessing (typing indicator), with live point updates

**Leaderboard:**
- **Score Cards**: Ordered list with podium colors (gold/silver/bronze for top 3), player name, total points, round-by-round breakdown
- **Animations**: Smooth transitions when scores update, confetti effect for winner

**UI Elements:**
- **Buttons**: Rounded-lg, bold font-weight, primary (bg-purple with white text), secondary (outline variant with backdrop-blur on images)
- **Cards**: Rounded-xl, shadow-lg in light mode, border-subtle in dark mode, hover:scale-102 transition
- **Inputs**: Rounded-lg, focus:ring-2 ring-primary, generous padding (py-3 px-4)
- **Badges**: Rounded-full, text-xs font-semibold, for host indicator, status labels
- **Progress Bars**: Smooth animated, rounded-full, gradient fills

### E. Interactions & Micro-animations

**Minimal Animation Philosophy** - Use sparingly for clarity:
- **Essential**: Timer countdowns (smooth progress), score updates (number counting), correct/incorrect feedback (color pulse)
- **Avoid**: Excessive page transitions, decorative animations, distracting hover effects
- **Subtle**: Button hover (slight brightness change), card hover (minimal lift), input focus (ring appearance)

---

## Images

**Hero Section Image:**
- **Style**: Vibrant illustration or photo montage of diverse friends enjoying music together, headphones, musical notes floating
- **Treatment**: Subtle gradient overlay (purple-blue) at 30% opacity for text readability
- **Placement**: Background cover image for hero section, blurred slightly for depth

**Feature Cards:**
- **Icons**: Use Heroicons (outline style) for "How to Play" steps - no custom SVGs
- **Thumbnails**: YouTube video thumbnails during song selection (loaded from API)
- **Player Avatars**: Colorful gradient circles with user initials (generated, not images)

**No large hero image needed** - use gradient background with icon/illustration accents for energy without heavy assets.

---

## Special Considerations

**Real-time Updates**: Design for live state changes - smooth transitions when players join/leave, scores update, songs change
**Responsive Focus**: Mobile-first for social gaming - ensure room codes are copy-friendly, inputs are thumb-friendly (min-h-12)
**Accessibility**: High contrast text, clear focus states, timer alternatives (visual + numeric countdown)
**Performance**: Lazy load YouTube embeds, optimize for GitHub Pages static hosting

This design creates an energetic, competitive atmosphere while maintaining clarity for fast-paced gameplay. The purple-dominant palette evokes music/creativity, green reinforces success, and the spacious layout prevents cognitive overload during timed rounds.