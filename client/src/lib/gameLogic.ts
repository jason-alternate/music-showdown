// Scoring algorithm: First correct guess gets most points, speed matters
export function calculatePoints(
  isCorrect: boolean,
  guessTime: number,
  maxTime: number,
  isFirstCorrect: boolean,
): number {
  if (!isCorrect) return 0;

  // Base points for correct guess
  const basePoints = 100;

  // Bonus for being first (50% bonus)
  const firstBonus = isFirstCorrect ? 50 : 0;

  // Speed bonus (up to 50 points based on how fast they guessed)
  const timeRatio = 1 - guessTime / maxTime;
  const speedBonus = Math.floor(timeRatio * 50);

  return basePoints + firstBonus + speedBonus;
}

// Normalize string by removing diacritics and standardizing for comparison
function normalizeString(str: string): string {
  return str
    .normalize("NFD") // Decompose accented characters into base + diacritic
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .toLowerCase()
    .trim();
}

// Check if guess is correct (case-insensitive, accent-insensitive, fuzzy matching)
export function isGuessCorrect(guess: string, answer: string): boolean {
  // Normalize both strings (case-insensitive and accent-insensitive)
  const normalizedGuess = normalizeString(guess);
  const normalizedAnswer = normalizeString(answer);

  // Exact match on normalized strings
  if (normalizedGuess === normalizedAnswer) return true;

  // Remove common punctuation and extra spaces for fuzzy matching
  const cleanGuess = normalizedGuess.replace(/[^\w\s]/g, "").replace(/\s+/g, " ");
  const cleanAnswer = normalizedAnswer.replace(/[^\w\s]/g, "").replace(/\s+/g, " ");

  return cleanGuess === cleanAnswer;
}

// Generate a random room code
export function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// Get player avatar color based on player ID
export function getPlayerColor(playerId: string): string {
  const colors = [
    "from-purple-500 to-pink-500",
    "from-blue-500 to-cyan-500",
    "from-green-500 to-emerald-500",
    "from-orange-500 to-red-500",
    "from-yellow-500 to-amber-500",
    "from-indigo-500 to-purple-500",
    "from-pink-500 to-rose-500",
    "from-teal-500 to-green-500",
  ];

  // Simple hash function to get consistent color for same ID
  let hash = 0;
  for (let i = 0; i < playerId.length; i++) {
    hash = playerId.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
}

// Get player initials
export function getPlayerInitials(name: string): string {
  const words = name.trim().split(" ");
  if (words.length >= 2) {
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}
