import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { fetchCompletedMedia } from '@/services/anilist-service';
import { parseChallenge, updateChallenge } from '@/lib/utils/challenge-parser';
import { CheckIcon, CopyIcon, LoaderIcon, TrophyIcon } from 'lucide-react';

export default function ChallengeTracker() {
  const [username, setUsername] = useState('');
  const [challengeText, setChallengeText] = useState('');
  const [updatedText, setUpdatedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showOutput, setShowOutput] = useState(false);

  const handleAnalyze = async () => {
    // Reset states
    setError(null);
    setUpdatedText('');
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

      // Parse challenge to extract media entries (anime and manga)
      const mediaEntries = parseChallenge(challengeText);

      console.log('Found media entries:', mediaEntries);

      if (mediaEntries.length === 0) {
        setError(
          'No anime or manga entries found in the challenge text. Make sure you have entries in the correct format with AniList URLs.'
        );
        setLoading(false);
        return;
      }

      // Fetch completed media from AniList
      const completedMedia = await fetchCompletedMedia(username);

      // Update challenge text
      const newText = updateChallenge(challengeText, mediaEntries, completedMedia);

      // Update state
      setUpdatedText(newText);
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
          Update your anime and manga challenge progress automatically using your AniList completed lists.
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
                  placeholder={`Paste your challenge text here...
Example format for anime:
01. ❌ Watch a romance anime
https://anilist.co/anime/23273/
Start: YYYY-MM-DD Finish: YYYY-MM-DD

Example format for manga:
02. ❌ Read a fantasy manga
https://anilist.co/manga/87610/
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
              <CardDescription>Copy the updated challenge text</CardDescription>
            </CardHeader>
            <CardContent className='pt-4'>
              <div className='space-y-4'>
                <div className='space-y-1'>
                  <label htmlFor='updated-challenge' className='text-sm font-medium text-foreground'>
                    Updated Challenge Text
                  </label>
                  <Textarea
                    id='updated-challenge'
                    value={updatedText}
                    readOnly
                    className='min-h-[600px] bg-background/75 border-border focus:border-primary'
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
