import { useEffect } from 'react';
import ChallengeTracker from './lib/components/challenge-tracker';

function App() {
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  return (
    <div className='min-h-screen bg-background text-foreground'>
      <ChallengeTracker />

      <footer className='py-6 text-center text-xs text-muted-foreground'>
        <p>AWC Code Updater &copy; {new Date().getFullYear()}</p>
        <p className='mt-1'>Not affiliated with AniList. AniList data is fetched through public GraphQL API.</p>
      </footer>
    </div>
  );
}

export default App;
