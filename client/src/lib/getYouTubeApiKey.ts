// Get YouTube API key from environment or Replit connector
export async function getYouTubeApiKey(): Promise<string> {
  // First check if we have it in environment (for production build)
  const envKey = "AIzaSyBo_-vy2fUDR_isXL4llWGOJJImxvsmYbU"; //import.meta.env.VITE_YOUTUBE_API_KEY;

  console.log("@@@ import.meta.env", import.meta.env);
  if (!envKey) {
    throw new Error("Missing youtube API key");
  }

  return envKey;
}
