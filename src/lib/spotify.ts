import { SpotifyApi, ClientCredentialsStrategy } from '@spotify/web-api-ts-sdk';

let spotifyApi: SpotifyApi | null = null;

export async function getSpotifyApi(): Promise<SpotifyApi> {
  if (!spotifyApi) {
    // Move credential checking inside the function
    const client_id = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
    const client_secret = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_SECRET;

    // Check credentials only when creating the client
    if (!client_id || !client_secret) {
      throw new Error('Missing Spotify credentials in environment variables');
    }

    const authStrategy = new ClientCredentialsStrategy(client_id, client_secret);
    spotifyApi = new SpotifyApi(authStrategy);
  }
  
  return spotifyApi;
}

// Optional: Add a method to force new instance
export async function refreshSpotifyApi(): Promise<SpotifyApi> {
  spotifyApi = null;
  return getSpotifyApi();
}