# Music Showdown - Multiplayer Music Guessing Game

## Overview
Music Showdown is a real-time multiplayer music guessing game where players compete to identify songs selected by their opponents. Built with P2P networking using boardgame.io, players can create rooms, set themes, search YouTube for songs, and compete for points based on speed and accuracy.

## Current State (Task 1 Complete)
- ✅ Complete schema definitions for game state, players, rounds, and YouTube integration
- ✅ Beautiful purple-themed UI with Outfit/Inter/JetBrains Mono fonts
- ✅ All core pages built: Home, Lobby, Game
- ✅ All game components: PlayerAvatar, Timer, YouTubeSearch, YouTubePlayer
- ✅ YouTube API integration for song search
- ✅ Theme system (dark mode by default)
- ✅ Game logic utilities (scoring, guess validation, room codes)
- ✅ boardgame.io game engine with phase management

## Project Architecture

### Client-Side Only (React + TypeScript)
- **Pages**: Home (landing + room creation/join), Lobby (waiting room + settings), Game (all game phases)
- **Components**: Reusable UI components for players, timers, YouTube integration
- **Game Logic**: boardgame.io game definition with phases: lobby, theme selection, song picking, guessing, results, game over
- **Styling**: Tailwind CSS with custom purple/green/coral palette
- **YouTube API**: Direct client-side calls to YouTube Data API v3
- **No Backend**: Fully P2P using boardgame.io, no server needed
- **Deployment**: Static files deployable to GitHub Pages

### Key Features
- Room creation with shareable codes (6-char alphanumeric)
- Host controls for game settings (timers, rounds)
- YouTube search integration with video thumbnails
- Customizable song titles for guessing
- Real-time guessing with point calculation (first + speed bonuses)
- Round-based gameplay with leaderboards
- Responsive design for mobile and desktop

## Next Steps (Task 2 & 3)
- Implement boardgame.io P2P networking
- Connect React components to game state
- Add real-time state synchronization
- Implement timer countdown logic
- Add loading states and error handling
- Configure for GitHub Pages deployment
- Test complete game flow

## Technology Stack
- **Framework**: React 18 + TypeScript
- **Routing**: Wouter
- **Game Engine**: boardgame.io (P2P networking)
- **Styling**: Tailwind CSS + shadcn/ui
- **State**: React Query + boardgame.io
- **API**: YouTube Data API v3 (client-side)
- **Deployment**: Static files (GitHub Pages compatible)

## Design Guidelines
- Primary color: Purple (#9b59b6) - music/creativity theme
- Secondary color: Green (#48bb78) - success/correct guesses
- Accent color: Coral (#f06595) - urgency/timers
- Fonts: Outfit (headings), Inter (body), JetBrains Mono (codes)
- Spacing: 4, 6, 8, 12, 16 unit system
- Dark mode by default with light mode support

## User Preferences
- No database persistence (P2P only)
- GitHub Pages compatible build
- YouTube integration for song selection
- Real-time multiplayer gameplay
- Customizable game settings (timers, rounds)
