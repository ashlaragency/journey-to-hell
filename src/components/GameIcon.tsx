type IconName = 'play' | 'people' | 'world' | 'map' | 'atlas' | 'book' | 'crown' | 'pause' | 'spark';

const paths: Record<IconName, string> = {
  play: 'm9 4 11 8-11 8V4ZM4 4v16',
  people: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8m8-7.87a4 4 0 0 1 0 7.75',
  world: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z',
  map: 'm3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Zm6-3v15m6-12v15',
  atlas: 'M12 3v2m0 14v2M3 12h2m14 0h2M17 7l-3 7-7 3 3-7 7-3ZM21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  book: 'M12 6c-3-2-6-2-10-1v15c4-1 7-1 10 1 3-2 6-2 10-1V5c-4-1-7-1-10 1Zm0 0v15',
  crown: 'm3 6 5 4 4-7 4 7 5-4-2 12H5L3 6Zm2 15h14',
  pause: 'M8 5v14M16 5v14',
  spark: 'm12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z',
};

export default function GameIcon({ name, className }: { name: IconName; className?: string }) {
  return <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}
