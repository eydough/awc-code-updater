import { CompletedAnime, CompletedMedia } from '../types';

// GraphQL query for user's completed anime
const COMPLETED_ANIME_QUERY = `
  query ($username: String) {
    MediaListCollection(userName: $username, type: ANIME, status: COMPLETED) {
      lists {
        entries {
          media {
            id
            title {
              romaji
              english
            }
          }
          startedAt {
            year
            month
            day
          }
          completedAt {
            year
            month
            day
          }
        }
      }
    }
  }
`;

// GraphQL query for user's completed manga
const COMPLETED_MANGA_QUERY = `
  query ($username: String) {
    MediaListCollection(userName: $username, type: MANGA, status: COMPLETED) {
      lists {
        entries {
          media {
            id
            title {
              romaji
              english
            }
          }
          startedAt {
            year
            month
            day
          }
          completedAt {
            year
            month
            day
          }
        }
      }
    }
  }
`;

// Format date from AniList API response
const formatDate = (date: { year: number | null; month: number | null; day: number | null }): string | null => {
  if (!date.year) return null;
  return `${date.year}-${date.month?.toString().padStart(2, '0')}-${date.day?.toString().padStart(2, '0')}`;
};

// Fetch user's completed anime from AniList API
export const fetchCompletedAnime = async (username: string): Promise<Record<string, CompletedAnime>> => {
  const url = 'https://graphql.anilist.co';
  const variables = { username };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        query: COMPLETED_ANIME_QUERY,
        variables,
      }),
    });

    const data = await response.json();

    if (data.errors) {
      console.error('Error from AniList API:', data.errors);
      throw new Error(data.errors[0]?.message || 'Unknown error from AniList API');
    }

    const completedAnime: Record<string, CompletedAnime> = {};

    for (const list of data.data.MediaListCollection.lists) {
      for (const entry of list.entries) {
        const animeId = entry.media.id.toString();
        const title = entry.media.title.english || entry.media.title.romaji;
        const startDate = formatDate(entry.startedAt);
        const finishDate = formatDate(entry.completedAt);

        completedAnime[animeId] = {
          title,
          startDate,
          finishDate,
        };
      }
    }

    return completedAnime;
  } catch (error) {
    console.error('Error fetching completed anime:', error);
    throw error;
  }
};

// Fetch user's completed media (both anime and manga) from AniList API
export const fetchCompletedMedia = async (username: string): Promise<Record<string, CompletedMedia>> => {
  const url = 'https://graphql.anilist.co';
  const variables = { username };
  const completedMedia: Record<string, CompletedMedia> = {};

  try {
    // Fetch completed anime
    const animeResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        query: COMPLETED_ANIME_QUERY,
        variables,
      }),
    });

    const animeData = await animeResponse.json();

    if (animeData.errors) {
      console.error('Error from AniList API (anime):', animeData.errors);
      throw new Error(animeData.errors[0]?.message || 'Unknown error from AniList API');
    }

    // Process anime data
    for (const list of animeData.data.MediaListCollection.lists) {
      for (const entry of list.entries) {
        const mediaId = entry.media.id.toString();
        const title = entry.media.title.english || entry.media.title.romaji;
        const startDate = formatDate(entry.startedAt);
        const finishDate = formatDate(entry.completedAt);

        // Use composite key for the media type and ID
        completedMedia[`anime-${mediaId}`] = {
          title,
          mediaType: 'anime',
          startDate,
          finishDate,
        };
      }
    }

    // Fetch completed manga
    const mangaResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        query: COMPLETED_MANGA_QUERY,
        variables,
      }),
    });

    const mangaData = await mangaResponse.json();

    if (mangaData.errors) {
      console.error('Error from AniList API (manga):', mangaData.errors);
      throw new Error(mangaData.errors[0]?.message || 'Unknown error from AniList API');
    }

    // Process manga data
    for (const list of mangaData.data.MediaListCollection.lists) {
      for (const entry of list.entries) {
        const mediaId = entry.media.id.toString();
        const title = entry.media.title.english || entry.media.title.romaji;
        const startDate = formatDate(entry.startedAt);
        const finishDate = formatDate(entry.completedAt);

        // Use composite key for the media type and ID
        completedMedia[`manga-${mediaId}`] = {
          title,
          mediaType: 'manga',
          startDate,
          finishDate,
        };
      }
    }

    return completedMedia;
  } catch (error) {
    console.error('Error fetching completed media:', error);
    throw error;
  }
};
