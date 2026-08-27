import { useEffect, useRef, useState } from 'react';
import { ShoppingBag, Volume2, VolumeX, Play, ExternalLink } from 'lucide-react';
import './ghost.css';

const streamUrl =
  'https://filetolinkcanonbots-4b978cf5a538.herokuapp.com/watch/stream/AgADHw105616/Thunder%20File%20To%20Link_20260818102521.mp4';
const watchUrl = 'https://ybxlink.vercel.app/watch?path=98ab6024a93b3176b8c4c7ad';

export default function GhostPage() {
  const mediaRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [needsTap, setNeedsTap] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const media = mediaRef.current;
    if (!media) return undefined;
    media.volume = 1;
    media.muted = false;

    const attemptAutoplay = async () => {
      try {
        await media.play();
        setIsPlaying(true);
      } catch {
        setNeedsTap(true);
      }
    };

    attemptAutoplay();
    return () => media.pause();
  }, []);

  const startSound = async () => {
    try {
      await mediaRef.current?.play();
      setIsPlaying(true);
      setNeedsTap(false);
    } catch {
      setHasError(true);
    }
  };

  return (
    <main className="ghost-page">
      <div className="ghost-noise" aria-hidden="true" />
      <section className="ghost-panel" aria-label="Cluster Shop loading">
        <div className="store-mark"><ShoppingBag size={28} strokeWidth={1.8} /></div>
        <p className="ghost-kicker">Cluster Shop</p>
        <h1>Opening store...</h1>
        <p className="ghost-filename">Preparing your private storefront</p>
        <div className="loader-track" aria-hidden="true"><span /></div>
        <p className="loader-status">Connecting to secure catalog</p>

        <video
          ref={mediaRef}
          className="ghost-media"
          src={streamUrl}
          autoPlay
          playsInline
          preload="auto"
          onPlay={() => setIsPlaying(true)}
          onError={() => setHasError(true)}
          aria-label="Store loading audio"
        />

        <button className="ghost-play" type="button" onClick={startSound}>
          {isPlaying ? <Volume2 size={18} /> : <Play size={18} />}
          {isPlaying ? 'Sound is playing' : 'Tap to play sound'}
        </button>

        {needsTap && !isPlaying && (
          <p className="ghost-hint"><VolumeX size={15} /> Tap once to enable sound</p>
        )}
        {hasError && (
          <p className="ghost-hint">The file host is unavailable right now. Open the stream link below.</p>
        )}

        <a className="ghost-link" href={watchUrl} target="_blank" rel="noreferrer">
          Open fallback stream <ExternalLink size={15} />
        </a>
        <p className="ghost-note">Links remain active while the bot is running and the file is accessible.</p>
      </section>
    </main>
  );
}
