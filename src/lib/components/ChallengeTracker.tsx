import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { fetchCompletedAnime } from '@/services/anilistService';
import { parseChallenge, updateChallenge } from '@/lib/utils/challengeParser';
import { ChallengeStats } from '@/types';
import { CheckIcon, CopyIcon, LoaderIcon, TrophyIcon, ListTodoIcon } from 'lucide-react';

export default function ChallengeTracker() {
  const [username, setUsername] = useState('');
  const [challengeText, setChallengeText] = useState('');
  const [updatedText, setUpdatedText] = useState('');
  const [stats, setStats] = useState<ChallengeStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showOutput, setShowOutput] = useState(false);

  const handleAnalyze = async () => {
    // Reset states
    setError(null);
    setUpdatedText('');
    setStats(null);
    setCopied(false);

    // Validate inputs
    if (!username.trim()) {
      setError('Please enter your AniList username');
      return;
    }

    if (!challengeText.trim()) {
      setError('Please paste your challenge text');
      return;
    }

    try {
      setLoading(true);

      // Parse challenge to extract anime entries
      const animeEntries = parseChallenge(challengeText);

      console.log('Found anime entries:', animeEntries);

      if (animeEntries.length === 0) {
        setError(
          'No anime entries found in the challenge text. Make sure you have entries in the correct format with AniList URLs.'
        );
        setLoading(false);
        return;
      }

      // Fetch completed anime from AniList
      const completedAnime = await fetchCompletedAnime(username);

      // Update challenge text and get stats
      const { updatedText: newText, stats: challengeStats } = updateChallenge(challengeText, animeEntries, completedAnime);

      // Update state
      setUpdatedText(newText);
      setStats(challengeStats);
      setShowOutput(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(updatedText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className='container mx-auto py-4 px-4'>
      <header className='text-center mb-4 border-b border-border pb-4'>
        <h1 className='text-3xl font-bold text-primary flex items-center justify-center gap-2 mb-2'>
          <TrophyIcon className='h-8 w-8' />
          AWC Code Updater
        </h1>
        <p className='text-muted-foreground max-w-2xl mx-auto'>
          Update your anime challenge progress automatically using your AniList completed anime list.
        </p>
      </header>

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
        <Card className='bg-card border-border shadow-lg'>
          <CardHeader className='border-b border-border/40 py-3'>
            <CardTitle>Input Challenge</CardTitle>
            <CardDescription>Enter your AniList username and paste your challenge text</CardDescription>
          </CardHeader>
          <CardContent className='pt-4'>
            <div className='space-y-4'>
              <div className='space-y-1'>
                <label htmlFor='username' className='text-sm font-medium text-foreground'>
                  AniList Username
                </label>
                <Input
                  id='username'
                  placeholder='Enter your AniList username'
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className='bg-background border-border focus:border-primary focus:ring-primary'
                />
              </div>

              <div className='space-y-1'>
                <label htmlFor='challenge-text' className='text-sm font-medium text-foreground'>
                  Challenge Text
                </label>
                <Textarea
                  id='challenge-text'
                  placeholder={`Paste your anime challenge text here...
Example format:
01. ❌ Watch a romance anime
https://anilist.co/anime/23273/
Start: YYYY-MM-DD Finish: YYYY-MM-DD`}
                  value={challengeText}
                  onChange={e => setChallengeText(e.target.value)}
                  className='min-h-[500px] bg-background border-border focus:border-primary focus:ring-primary'
                />
              </div>

              {error && (
                <Alert variant='destructive'>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                onClick={handleAnalyze}
                disabled={loading}
                className='w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-all'
              >
                {loading ? (
                  <>
                    <LoaderIcon className='mr-2 h-4 w-4 animate-spin' />
                    Analyzing...
                  </>
                ) : (
                  'Analyze & Update Challenge'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {showOutput && (
          <Card className='bg-card border-border shadow-lg'>
            <CardHeader className='border-b border-border/40 py-3'>
              <CardTitle>Updated Challenge</CardTitle>
              {stats && (
                <CardDescription>
                  {stats.completionPercentage === 100
                    ? 'Congratulations on completing your challenge!'
                    : `${stats.completedCount} of ${stats.totalCount} anime completed`}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className='pt-4'>
              <div className='space-y-4'>
                {stats && (
                  <div className='p-3 bg-background/50 rounded-md space-y-3 border border-border/40 shadow-sm'>
                    <h3 className='text-lg font-medium text-primary flex items-center gap-2'>
                      <TrophyIcon className='h-5 w-5' />
                      Challenge Progress
                    </h3>
                    <Progress value={stats.completionPercentage} className='h-2 bg-muted' />
                    <p className='text-sm'>
                      <span className='font-medium'>{stats.completedCount}</span>/<span>{stats.totalCount}</span> anime completed
                      (<span className='font-medium'>{stats.completionPercentage}%</span>)
                    </p>

                    {stats.finishDate && (
                      <p className='text-sm flex items-center'>
                        <CheckIcon className='h-4 w-4 text-success mr-2' />
                        Challenge completed on: <span className='font-medium ml-1'>{stats.finishDate}</span>
                      </p>
                    )}

                    {stats.remainingAnime.length > 0 && (
                      <div className='space-y-2'>
                        <p className='text-sm flex items-center'>
                          <ListTodoIcon className='h-4 w-4 text-warning mr-2' />
                          Remaining anime to complete:
                        </p>
                        <ul className='text-sm pl-6 space-y-1'>
                          {stats.remainingAnime.slice(0, 5).map((anime, index) => (
                            <li key={index} className='text-muted-foreground'>
                              • {anime}
                            </li>
                          ))}
                          {stats.remainingAnime.length > 5 && (
                            <li className='text-muted-foreground'>• ... and {stats.remainingAnime.length - 5} more</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                <div className='space-y-1'>
                  <label htmlFor='updated-challenge' className='text-sm font-medium text-foreground'>
                    Updated Challenge Text
                  </label>
                  <Textarea
                    id='updated-challenge'
                    value={updatedText}
                    readOnly
                    className='min-h-[500px] bg-background/75 border-border focus:border-primary'
                  />
                </div>

                <Button
                  variant='outline'
                  onClick={copyToClipboard}
                  className='w-full flex items-center justify-center gap-2 hover:bg-primary/20 transition-colors border-border text-foreground hover:text-primary'
                >
                  {copied ? (
                    <>
                      <CheckIcon className='h-4 w-4' />
                      Copied!
                    </>
                  ) : (
                    <>
                      <CopyIcon className='h-4 w-4' />
                      Copy to Clipboard
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
