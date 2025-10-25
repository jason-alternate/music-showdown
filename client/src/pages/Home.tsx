import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Music, Users, Trophy, Search } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { generateRoomCode } from "@/lib/gameLogic";

export default function Home() {
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState("");
  const [playerName, setPlayerName] = useState("");

  const validatePlayerName = (name: string) => {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      alert("Name must be at least 2 characters long");
      return null;
    }
    if (trimmed.length > 24) {
      alert("Name must be 24 characters or fewer");
      return null;
    }
    if (!/^[\w\s'-]+$/.test(trimmed)) {
      alert("Name can only contain letters, numbers, spaces, apostrophes, and hyphens");
      return null;
    }
    return trimmed;
  };

  const handleCreateRoom = () => {
    const validated = validatePlayerName(playerName);
    if (!validated) return;
    const newRoomCode = generateRoomCode();
    localStorage.setItem("playerName", validated);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("musicshowdown.pendingRole", "host");
      sessionStorage.setItem("musicshowdown.lastRole", "host");
    }
    navigate({ to: "/game/$roomCode", params: { roomCode: newRoomCode } });
  };

  const handleJoinRoom = () => {
    const validated = validatePlayerName(playerName);
    if (!validated) return;
    if (!roomCode.trim()) {
      alert("Please enter a room code");
      return;
    }
    if (roomCode.length !== 6) {
      alert("Room code must be 6 characters");
      return;
    }
    localStorage.setItem("playerName", validated);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("musicshowdown.pendingRole", "peer");
      sessionStorage.setItem("musicshowdown.lastRole", "peer");
    }
    navigate({ to: "/game/$roomCode", params: { roomCode: roomCode.toUpperCase() } });
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-primary via-purple-600 to-blue-600 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNnoiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLW9wYWNpdHk9Ii4xIi8+PC9nPjwvc3ZnPg==')] opacity-20"></div>

      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16 pt-8">
          <h1 className="text-6xl md:text-7xl font-heading font-bold text-white mb-4 tracking-tight">
            Music Showdown
          </h1>
          <p className="text-xl md:text-2xl text-white/90 mb-8 font-body">
            Guess the song, win the game
          </p>

          {/* Main Action Card */}
          <Card className="max-w-md mx-auto bg-white/95 dark:bg-card/95 backdrop-blur-sm border-2">
            <CardHeader>
              <CardTitle className="text-2xl font-heading">Join the Music</CardTitle>
              <CardDescription>Enter your name to get started</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Input
                  placeholder="Your name"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateRoom()}
                  className="text-lg py-6"
                  data-testid="input-player-name"
                />
              </div>

              <Button
                onClick={handleCreateRoom}
                size="lg"
                className="w-full text-lg font-semibold"
                disabled={!playerName.trim()}
                data-testid="button-create-room"
              >
                Create Room
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Room code"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && handleJoinRoom()}
                  className="font-mono uppercase text-lg"
                  maxLength={6}
                  data-testid="input-room-code"
                />
                <Button
                  onClick={handleJoinRoom}
                  variant="secondary"
                  disabled={!playerName.trim() || !roomCode.trim()}
                  data-testid="button-join-room"
                >
                  Join
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* How to Play */}
        <div className="max-w-5xl mx-auto mb-16">
          <h2 className="text-3xl font-heading font-bold text-white text-center mb-8">
            How to Play
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Users,
                title: "1. Create Room",
                description: "Host creates a room and shares the code with friends",
              },
              {
                icon: Music,
                title: "2. Pick Songs",
                description: "Host sets a theme, players search YouTube for matching songs",
              },
              {
                icon: Search,
                title: "3. Guess Away",
                description: "Listen to each song and try to guess the title quickly",
              },
              {
                icon: Trophy,
                title: "4. Win Points",
                description: "First and fastest correct guesses earn the most points",
              },
            ].map((step, i) => (
              <Card
                key={i}
                className="bg-white/90 dark:bg-card/90 backdrop-blur-sm border-2 hover-elevate"
              >
                <CardHeader className="text-center">
                  <div className="mx-auto w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                    <step.icon className="w-8 h-8 text-primary" />
                  </div>
                  <CardTitle className="text-lg font-heading">{step.title}</CardTitle>
                  <CardDescription className="text-sm">{step.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>

        {/* Features */}
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                title: "Theme-Based Rounds",
                description: "Host picks creative themes for endless variety",
              },
              {
                title: "YouTube Integration",
                description: "Search millions of songs directly in the game",
              },
              {
                title: "Competitive Scoring",
                description: "Speed and accuracy determine the winner",
              },
            ].map((feature, i) => (
              <Card key={i} className="bg-white/80 dark:bg-card/80 backdrop-blur-sm text-center">
                <CardHeader>
                  <CardTitle className="text-lg font-heading">{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </div>
      <a href="https://www.flaticon.com/free-icons/music-note" title="music note icons">Music note icons created by Freepik - Flaticon</a>
    </div>
  );
}
