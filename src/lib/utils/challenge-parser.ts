import { AnimeEntry, MediaEntry, CompletedAnime, CompletedMedia } from '@/types';

// Constants
const ANIME_URL_PATTERN = /https:\/\/anilist\.co\/anime\/(\d+)(?:[^\s)"']*)?/g;
const MANGA_URL_PATTERN = /https:\/\/anilist\.co\/manga\/(\d+)(?:[^\s)"']*)?/g;
const ENTRY_PATTERN = /^([A-Z]\d+[.)]\)?|[A-Z]\d[.)]|[\d]+[.)]).*$/i;
const DATE_PATTERN = /Start: (\d{4}-\d{2}-\d{2}|YYYY-MM-DD) Finish: (\d{4}-\d{2}-\d{2}|YYYY-MM-DD)/;
const COMPLETED_ICON = '⚜️';
const NOT_COMPLETED_ICON = '❌';

/**
 * Parse challenge text to extract media entries (anime and manga)
 */
export const parseChallenge = (challengeText: string): MediaEntry[] => {
  const mediaEntries: MediaEntry[] = [];
  const lines = challengeText.split('\n');

  // Process both anime and manga URLs
  processMediaUrls(challengeText, lines, ANIME_URL_PATTERN, 'anime', mediaEntries);
  processMediaUrls(challengeText, lines, MANGA_URL_PATTERN, 'manga', mediaEntries);

  return mediaEntries;
};

/**
 * Helper function to process media URLs (anime or manga)
 */
const processMediaUrls = (
  challengeText: string,
  lines: string[],
  urlPattern: RegExp,
  mediaType: 'anime' | 'manga',
  mediaEntries: MediaEntry[]
) => {
  // Reset the lastIndex to start from the beginning
  urlPattern.lastIndex = 0;

  let match;
  while ((match = urlPattern.exec(challengeText)) !== null) {
    const url = match[0]; // The full matched URL
    const mediaId = match[1]; // Just the numeric ID
    const position = match.index;

    const lineIndex = findLineContainingUrl(lines, url);

    if (lineIndex <= 0) continue;

    const { entryNum, completed } = findEntryInfo(lines, lineIndex);
    const { startDate, finishDate } = findDateInfo(lines, lineIndex);

    if (entryNum) {
      mediaEntries.push({
        entryNum,
        mediaId,
        mediaType,
        url,
        position,
        completed,
        startDate,
        finishDate,
      });
    }
  }
};

/**
 * Find the line containing the specified URL
 */
const findLineContainingUrl = (lines: string[], url: string): number => {
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(url)) {
      return i;
    }
  }
  return -1;
};

/**
 * Find entry information (entry number and completion status)
 */
const findEntryInfo = (lines: string[], lineIndex: number): { entryNum: string | null; completed: boolean } => {
  for (let i = lineIndex - 1; i >= Math.max(0, lineIndex - 5); i--) {
    const line = lines[i].trim();
    const entryMatch = line.match(ENTRY_PATTERN);

    if (entryMatch) {
      return {
        entryNum: entryMatch[1],
        completed: line.includes(COMPLETED_ICON),
      };
    }
  }

  return { entryNum: null, completed: false };
};

/**
 * Find date information (start and finish dates)
 */
const findDateInfo = (lines: string[], lineIndex: number): { startDate: string | null; finishDate: string | null } => {
  for (let i = lineIndex + 1; i < Math.min(lines.length, lineIndex + 4); i++) {
    const dateLine = lines[i];
    const dateMatch = dateLine.match(DATE_PATTERN);

    if (dateMatch) {
      return {
        startDate: dateMatch[1] !== 'YYYY-MM-DD' ? dateMatch[1] : null,
        finishDate: dateMatch[2] !== 'YYYY-MM-DD' ? dateMatch[2] : null,
      };
    }
  }

  return { startDate: null, finishDate: null };
};

/**
 * Legacy function for backward compatibility
 */
export const parseAnimeChallenge = (challengeText: string): AnimeEntry[] => {
  const mediaEntries = parseChallenge(challengeText);
  return mediaEntries
    .filter(entry => entry.mediaType === 'anime')
    .map(entry => ({
      entryNum: entry.entryNum,
      animeId: entry.mediaId,
      url: entry.url,
      position: entry.position,
      completed: entry.completed,
      startDate: entry.startDate,
      finishDate: entry.finishDate,
    }));
};

/**
 * Update challenge text with completion status and dates
 */
export const updateChallenge = (
  challengeText: string,
  mediaEntries: MediaEntry[],
  completedMedia: Record<string, CompletedMedia>
): string => {
  const lines = challengeText.split('\n');
  let allCompleted = true;
  let latestDate: string | null = null;

  // Process all media entries
  for (const entry of mediaEntries) {
    const { mediaId, mediaType } = entry;
    const mediaKey = `${mediaType}-${mediaId}`;

    const { entryCompleted, entryStartDate, entryFinishDate } = processEntryCompletion(entry, completedMedia[mediaKey]);

    // Update latestDate if this entry has a newer finish date
    if (entryFinishDate && (!latestDate || entryFinishDate > latestDate)) {
      latestDate = entryFinishDate;
    }

    // Track if all entries are completed
    if (!entryCompleted) {
      allCompleted = false;
    }

    // Update the challenge text for this entry
    updateEntryInChallengeText(entry, lines, challengeText, entryCompleted, entryStartDate, entryFinishDate);
  }

  // Reassemble the updated text
  let updatedText = lines.join('\n');

  // Update challenge finish date if all entries are completed
  if (latestDate && allCompleted) {
    updatedText = updatedText.replace(/Challenge Finish Date: YYYY-MM-DD/, `Challenge Finish Date: ${latestDate}`);
  }

  return updatedText;
};

/**
 * Process entry completion status and dates
 */
const processEntryCompletion = (
  entry: MediaEntry,
  mediaData: CompletedMedia | undefined
): {
  entryCompleted: boolean;
  entryStartDate: string | null;
  entryFinishDate: string | null;
} => {
  let entryCompleted = entry.completed;
  let entryStartDate = entry.startDate;
  let entryFinishDate = entry.finishDate;

  // Check if this media is in the user's completed list
  if (mediaData) {
    entryCompleted = true;

    // Use dates from AniList if available
    if (mediaData.startDate) {
      entryStartDate = mediaData.startDate;
    }

    if (mediaData.finishDate) {
      entryFinishDate = mediaData.finishDate;
    }
  } else {
    // Consider entry completed if it has a finish date
    entryCompleted = !!entry.finishDate;
  }

  return { entryCompleted, entryStartDate, entryFinishDate };
};

/**
 * Update entry in challenge text
 */
const updateEntryInChallengeText = (
  entry: MediaEntry,
  lines: string[],
  challengeText: string,
  entryCompleted: boolean,
  entryStartDate: string | null,
  entryFinishDate: string | null
): void => {
  const { entryLineIdx, dateLineIdx } = findEntryAndDateLines(entry, lines, challengeText);

  if (entryLineIdx === null || dateLineIdx === null) return;

  // Update completion status in entry line
  updateCompletionStatus(lines, entryLineIdx, entryCompleted);

  // Update date line
  if (entryStartDate || entryFinishDate) {
    updateDateLine(lines, dateLineIdx, entryStartDate, entryFinishDate);
  }
};

/**
 * Find entry and date lines for a specific media entry
 */
const findEntryAndDateLines = (
  entry: MediaEntry,
  lines: string[],
  challengeText: string
): { entryLineIdx: number | null; dateLineIdx: number | null } => {
  // Find the exact line where this specific URL instance occurs
  let foundUrlCount = 0;

  // Determine which occurrence of this URL we're looking for
  const escapedUrl = entry.url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const urlsUpToPosition = challengeText.substring(0, entry.position).match(new RegExp(escapedUrl, 'g'));
  const targetUrlOccurrence = urlsUpToPosition ? urlsUpToPosition.length : 0;

  let entryLineIdx = null;
  let dateLineIdx = null;

  // Find the specific occurrence of this URL in the lines
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(entry.url)) {
      if (foundUrlCount === targetUrlOccurrence) {
        // Look backward for the entry line
        entryLineIdx = findEntryLine(lines, i);
        // Look forward for the date line
        dateLineIdx = findDateLine(lines, i);
        break;
      }
      foundUrlCount++;
    }
  }

  return { entryLineIdx, dateLineIdx };
};

/**
 * Find the entry line by looking backward from URL line
 */
const findEntryLine = (lines: string[], urlLineIndex: number): number | null => {
  for (let j = urlLineIndex - 1; j >= Math.max(0, urlLineIndex - 5); j--) {
    if (lines[j].trim().match(ENTRY_PATTERN)) {
      return j;
    }
  }
  return null;
};

/**
 * Find the date line by looking forward from URL line
 */
const findDateLine = (lines: string[], urlLineIndex: number): number | null => {
  for (let j = urlLineIndex + 1; j < Math.min(lines.length, urlLineIndex + 4); j++) {
    if (lines[j].includes('Start:') && lines[j].includes('Finish:')) {
      return j;
    }
  }
  return null;
};

/**
 * Update the completion status of an entry
 */
const updateCompletionStatus = (lines: string[], entryLineIdx: number, entryCompleted: boolean): void => {
  const entryLine = lines[entryLineIdx];
  const hasCompletedIcon = entryLine.includes(COMPLETED_ICON);
  const hasNotCompletedIcon = entryLine.includes(NOT_COMPLETED_ICON);

  if (entryCompleted && hasNotCompletedIcon) {
    lines[entryLineIdx] = entryLine.replace(NOT_COMPLETED_ICON, COMPLETED_ICON);
  } else if (!entryCompleted && hasCompletedIcon) {
    lines[entryLineIdx] = entryLine.replace(COMPLETED_ICON, NOT_COMPLETED_ICON);
  }
};

/**
 * Update the date line with start and finish dates
 */
const updateDateLine = (lines: string[], dateLineIdx: number, startDate: string | null, finishDate: string | null): void => {
  const dateLine = lines[dateLineIdx];
  const start = startDate || 'YYYY-MM-DD';
  const finish = finishDate || 'YYYY-MM-DD';

  // Split by "Finish: " to preserve any additional content after dates
  const dateParts = dateLine.split('Finish: ');
  if (dateParts.length > 1) {
    const finishPart = dateParts[1];
    const dateMatch = finishPart.match(/\d{4}-\d{2}-\d{2}/);
    const dateEndPos =
      finishPart.indexOf('YYYY-MM-DD') !== -1
        ? finishPart.indexOf('YYYY-MM-DD') + 10
        : dateMatch
        ? finishPart.indexOf(dateMatch[0]) + 10
        : 0;

    const extraContent = dateEndPos > 0 ? finishPart.substring(dateEndPos) : finishPart.substring(10);
    lines[dateLineIdx] = `Start: ${start} Finish: ${finish}${extraContent}`;
  } else {
    lines[dateLineIdx] = `Start: ${start} Finish: ${finish}`;
  }
};

/**
 * Legacy function for backward compatibility
 */
export const updateAnimeChallenge = (
  challengeText: string,
  animeEntries: AnimeEntry[],
  completedAnime: Record<string, CompletedAnime>
): string => {
  // Convert legacy types to new types
  const mediaEntries: MediaEntry[] = animeEntries.map(entry => ({
    entryNum: entry.entryNum,
    mediaId: entry.animeId,
    mediaType: 'anime' as const,
    url: entry.url,
    position: entry.position,
    completed: entry.completed,
    startDate: entry.startDate,
    finishDate: entry.finishDate,
  }));

  const completedMedia: Record<string, CompletedMedia> = {};
  for (const [animeId, anime] of Object.entries(completedAnime)) {
    completedMedia[`anime-${animeId}`] = {
      ...anime,
      mediaType: 'anime',
    };
  }

  return updateChallenge(challengeText, mediaEntries, completedMedia);
};
