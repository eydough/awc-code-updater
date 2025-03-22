import { AnimeEntry, CompletedAnime, ChallengeStats } from '@/types';

// Parse challenge text to extract anime entries
export const parseChallenge = (challengeText: string): AnimeEntry[] => {
  const animeEntries: AnimeEntry[] = [];
  // Support multiple formats for URLs:
  // 1. [Title](https://anilist.co/anime/12345/)
  // 2. Direct URL: https://anilist.co/anime/12345/
  // 3. Plain URLs on their own line
  // 4. URLs that might not end with a slash
  const urlPattern = /https:\/\/anilist\.co\/anime\/(\d+)(?:[^\s)"']*)?/g;
  const lines = challengeText.split('\n');

  // Log all found URLs
  const allUrls = [];
  let urlMatch;
  while ((urlMatch = urlPattern.exec(challengeText)) !== null) {
    allUrls.push(urlMatch[0]);
  }
  console.log(`Found ${allUrls.length} AniList URLs:`, allUrls);

  // Reset the lastIndex to start from the beginning again
  urlPattern.lastIndex = 0;

  let match;
  while ((match = urlPattern.exec(challengeText)) !== null) {
    const url = match[0]; // The full matched URL
    const animeId = match[1]; // Just the numeric ID
    const position = match.index;

    console.log(`Processing URL: ${url} (ID: ${animeId})`);

    // Find the entry number in previous lines
    let entryNum = null;
    let entryCompleted = false;
    let lineIndex = -1;

    // Find which line contains this URL
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(url)) {
        lineIndex = i;
        console.log(`Found URL on line ${i}: ${lines[i]}`);
        break;
      }
    }

    if (lineIndex > 0) {
      // Look for the entry number in previous lines
      for (let i = lineIndex - 1; i >= Math.max(0, lineIndex - 5); i--) {
        const line = lines[i].trim();
        // Support formats like grid-based ("A1)", "B2)") and numeric ("01)", "01.", "1)" or "1.")
        const entryMatch = line.match(/^([A-Z]\d+[.)]\)?|[A-Z]\d[.)]|[\d]+[.)]).*$/i);
        if (entryMatch) {
          entryNum = entryMatch[1];
          // Check if entry is completed
          entryCompleted = line.includes('⚜️');
          break;
        }
      }

      // Look for dates in the next lines (check up to 3 lines after URL)
      let startDate = null;
      let finishDate = null;

      for (let i = lineIndex + 1; i < Math.min(lines.length, lineIndex + 4); i++) {
        const dateLine = lines[i];

        // Check for "Start: YYYY-MM-DD Finish: YYYY-MM-DD" format
        // Also support formats with additional content after dates
        const dateMatch = dateLine.match(/Start: (\d{4}-\d{2}-\d{2}|YYYY-MM-DD) Finish: (\d{4}-\d{2}-\d{2}|YYYY-MM-DD)/);

        if (dateMatch) {
          console.log(`Found date line on line ${i}: ${dateLine}`);
          startDate = dateMatch[1] !== 'YYYY-MM-DD' ? dateMatch[1] : null;
          finishDate = dateMatch[2] !== 'YYYY-MM-DD' ? dateMatch[2] : null;

          if (startDate) console.log(`Start date: ${startDate}`);
          if (finishDate) console.log(`Finish date: ${finishDate}`);
          break;
        }
      }

      if (entryNum) {
        console.log(`Adding entry ${entryNum} with ID ${animeId} to anime entries`);
        animeEntries.push({
          entryNum,
          animeId,
          url,
          position,
          completed: entryCompleted,
          startDate,
          finishDate,
        });
      } else {
        console.log(`Couldn't find entry identifier for URL: ${url}`);
      }
    } else {
      console.log(`Couldn't find the line containing URL: ${url}`);
    }
  }

  console.log(`Found ${animeEntries.length} anime entries in total`);
  return animeEntries;
};

// Update challenge text with completion status and dates
export const updateChallenge = (
  challengeText: string,
  animeEntries: AnimeEntry[],
  completedAnime: Record<string, CompletedAnime>
): { updatedText: string; stats: ChallengeStats } => {
  let updatedText = challengeText;
  const lines = updatedText.split('\n');
  let allCompleted = true;
  let latestDate: string | null = null;
  const remainingAnime: string[] = [];

  // Process all anime entries - each entry is processed independently
  // even if multiple entries reference the same anime ID
  for (const entry of animeEntries) {
    const animeId = entry.animeId;
    let entryCompleted = entry.completed;
    let entryStartDate = entry.startDate;
    let entryFinishDate = entry.finishDate;

    // Check if this anime is in the user's completed list
    if (completedAnime[animeId]) {
      const animeData = completedAnime[animeId];
      entryCompleted = true;

      // Use dates from AniList if available
      if (animeData.startDate) {
        entryStartDate = animeData.startDate;
      }

      if (animeData.finishDate) {
        entryFinishDate = animeData.finishDate;

        // Track latest finish date for overall challenge
        if (!latestDate || entryFinishDate > latestDate) {
          latestDate = entryFinishDate;
        }
      }
    } else {
      entryCompleted = !!entry.finishDate; // Consider entry completed if it has a finish date

      if (!entryCompleted) {
        allCompleted = false;

        // Try to find anime title in challenge text
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes(entry.url)) {
            const prevLine = lines[Math.max(0, i - 1)];
            if (prevLine.includes(entry.entryNum)) {
              // eslint-disable-next-line no-misleading-character-class
              const titleMatch = prevLine.match(/[❌⚜️]\s+(.*)/);
              if (titleMatch) {
                remainingAnime.push(titleMatch[1]);
              } else {
                remainingAnime.push(`Entry ${entry.entryNum}`);
              }
            }
            break;
          }
        }
      }
    }

    // Find the entry in the challenge text
    // This is where the fix happens - ensure we're looking for the specific URL occurrence
    // that corresponds to this entry, using the position information
    let entryLineIdx = null;
    let dateLineIdx = null;

    // Find the exact line where this specific URL instance occurs
    let foundUrlCount = 0;
    let targetUrlOccurrence = 0;

    // Determine which occurrence of this URL we're looking for
    // by counting occurrences up to the entry's position
    const urlsUpToPosition = challengeText
      .substring(0, entry.position)
      .match(new RegExp(entry.url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'));
    targetUrlOccurrence = urlsUpToPosition ? urlsUpToPosition.length : 0;

    // Find the specific occurrence of this URL in the lines
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(entry.url)) {
        if (foundUrlCount === targetUrlOccurrence) {
          // This is the specific URL occurrence we're looking for
          // Now look backward for the entry line
          for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
            // Support grid-based identifiers like "A1)", "B2)", etc.
            // Also support standard numeric identifiers
            const entryPattern = /^([A-Z]\d+[.)]\)?|[A-Z]\d[.)]|[\d]+[.)])/i;
            if (lines[j].trim().match(entryPattern)) {
              entryLineIdx = j;
              break;
            }
          }

          // Look for date line in next 3 lines
          for (let j = i + 1; j < Math.min(lines.length, i + 4); j++) {
            if (lines[j].includes('Start:') && lines[j].includes('Finish:')) {
              dateLineIdx = j;
              break;
            }
          }
          break;
        }
        foundUrlCount++;
      }
    }

    if (entryLineIdx !== null && dateLineIdx !== null) {
      // Update completion status in entry line
      const entryLine = lines[entryLineIdx];
      const hasCompletedIcon = entryLine.includes('⚜️');
      const hasNotCompletedIcon = entryLine.includes('❌');

      if (entryCompleted && hasNotCompletedIcon) {
        lines[entryLineIdx] = entryLine.replace('❌', '⚜️');
      } else if (!entryCompleted && hasCompletedIcon) {
        lines[entryLineIdx] = entryLine.replace('⚜️', '❌');
      }

      // Update date line
      if (entryStartDate || entryFinishDate) {
        const dateLine = lines[dateLineIdx];
        const start = entryStartDate || 'YYYY-MM-DD';
        const finish = entryFinishDate || 'YYYY-MM-DD';

        // Split by "Finish: " to preserve any additional content after dates
        const dateParts = dateLine.split('Finish: ');
        if (dateParts.length > 1) {
          // Capture everything after the date, not just the first two parts
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
      }
    }
  }

  // Reassemble the updated text
  updatedText = lines.join('\n');

  // Update challenge finish date if all entries are completed
  if (latestDate && allCompleted) {
    const challengeDatePattern = /Challenge Finish Date: YYYY-MM-DD/;
    const replacement = `Challenge Finish Date: ${latestDate}`;
    updatedText = updatedText.replace(challengeDatePattern, replacement);
  }

  // Calculate stats
  const completedCount = animeEntries.filter(
    entry => entry.completed || !!entry.finishDate || !!completedAnime[entry.animeId]
  ).length;

  const totalCount = animeEntries.length;
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const stats: ChallengeStats = {
    completedCount,
    totalCount,
    completionPercentage,
    finishDate: allCompleted ? latestDate : null,
    remainingAnime,
  };

  return { updatedText, stats };
};
