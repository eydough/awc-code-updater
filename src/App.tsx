import { useEffect } from 'react';
import ChallengeTracker from './lib/components/ChallengeTracker';

function App() {
  // Ensure dark mode is applied
  useEffect(() => {
    // Set dark mode to default by adding the class to html element
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
