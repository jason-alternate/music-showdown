# Music Showdown 🎵

A real-time multiplayer music guessing game where players compete to identify songs. Built with boardgame.io P2P networking, YouTube integration, and React.

## Features

- 🎮 **P2P Multiplayer** - No backend server needed, fully peer-to-peer using boardgame.io
- 🎵 **YouTube Integration** - Search millions of songs directly in the game
- 🏆 **Competitive Scoring** - Points awarded for speed and accuracy
- 🎨 **Beautiful UI** - Purple-themed design with dark/light mode support
- 📱 **Responsive** - Works on desktop and mobile devices
- 🚀 **Static Deployment** - Deploy to GitHub Pages, Netlify, or any static host

## How to Play

1. **Create a Room** - Host creates a room and shares the code with friends
2. **Pick Songs** - Host sets a theme, players search YouTube for matching songs
3. **Guess Away** - Listen to each song and try to guess the title quickly
4. **Win Points** - First and fastest correct guesses earn the most points

## Development Setup

### Prerequisites

- Node.js 20+
- YouTube Data API v3 key ([Get one here](https://console.cloud.google.com/apis/credentials))

### Installation

```bash
# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Add your YouTube API key to .env
# VITE_YOUTUBE_API_KEY=your_api_key_here

# Start development server
npm run dev
```

### YouTube API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable **YouTube Data API v3**
4. Create credentials (API Key)
5. Restrict the API key:
   - Application restrictions: HTTP referrers
   - Add your domain (e.g., `https://yourdomain.com/*`)
   - API restrictions: YouTube Data API v3
6. Add the key to `.env` as `VITE_YOUTUBE_API_KEY`

## Deployment to GitHub Pages

1. Update `vite.config.ts` with your repository base:
   ```ts
   export default defineConfig({
     base: '/your-repo-name/',
     // ... rest of config
   });
   ```

2. Build the project:
   ```bash
   npm run build
   ```

3. Deploy the `dist/public` folder to GitHub Pages

4. Set environment variables in GitHub Secrets:
   - `VITE_YOUTUBE_API_KEY` - Your YouTube API key

## Tech Stack

- **Framework**: React 18 + TypeScript
- **Game Engine**: boardgame.io (P2P networking)
- **Styling**: Tailwind CSS + shadcn/ui
- **API**: YouTube Data API v3
- **Build Tool**: Vite

## Project Structure

```
client/
  src/
    components/     # Reusable UI components
    pages/          # Main application pages
    game/           # boardgame.io game logic
    lib/            # Utilities and helpers
shared/
  schema.ts         # Shared types and schemas
```

## License

MIT

## Credits

Built with ❤️ using boardgame.io, React, and YouTube Data API v3
