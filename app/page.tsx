'use client';

import { PointerEvent, useEffect, useRef, useState } from 'react';

const smallMemories = [
  'img_1455', 'img_1721', 'img_1866', 'img_2052', 'img_2371', 'img_2675',
  'img_2894', 'img_3260', 'img_3386', 'img_3489', 'img_3585', 'img_3666',
];

const herPortraits = ['img_cafe', 'img_4729', 'img_9290'];
const finalMemories = ['img_4438', 'img_5586', 'img_6018', 'img_4392', 'img_6616', 'img_8921', 'img_9879'];

const promises = [
  'I’ll listen before the moment gets the better of me.',
  'I’ll make room for what you feel, even when I see it differently.',
  'I’ll remember: it is us against the problem.',
  'I won’t let life’s noise make you feel second.',
  'And when things feel hard, I’ll talk to you instead of going quiet.',
];

const BASE_VOLUME = 0.34;
const HOLD_VOLUME = 0.44;
const CHOSEN_VOLUME = 0.44;
const AUDIO_SRC = '/forest-mist-whispers.mp3';

// The track runs 2:31 and fades to silence at the end, but a slow read of this
// takes far longer. These loop points sit on a true zero-crossing on both
// channels (sub-0.0002 amplitude gap) a few seconds into the track and just
// before its outro fade, so the native AudioBufferSourceNode loop below is
// sample-accurate — no seek, no click, no manual crossfade required.
const LOOP_START = 15.459;
const LOOP_END = 134.025;

export default function Home() {
  const [begun, setBegun] = useState(false);
  const [muted, setMuted] = useState(false);
  const [hold, setHold] = useState(0);
  const [chosen, setChosen] = useState(false);
  const [settled, setSettled] = useState(false);
  const [fallback, setFallback] = useState(false);
  const choiceRef = useRef<HTMLElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const holdFrame = useRef<number | null>(null);
  const holdStart = useRef(0);
  const timers = useRef<number[]>([]);

  const handleStripScroll = () => {
    const el = stripRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 15);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 15);

    const firstChild = el.firstElementChild as HTMLElement | null;
    const itemWidth = firstChild ? firstChild.offsetWidth + 14 : 280;
    const index = Math.min(Math.max(0, Math.round(scrollLeft / itemWidth)), smallMemories.length - 1);
    setActivePhotoIndex(index);
  };

  const scrollStrip = (direction: 'left' | 'right') => {
    const el = stripRef.current;
    if (!el) return;
    const firstChild = el.firstElementChild as HTMLElement | null;
    const itemWidth = firstChild ? firstChild.offsetWidth + 14 : 280;
    el.scrollBy({
      left: direction === 'left' ? -itemWidth * 1.2 : itemWidth * 1.2,
      behavior: 'smooth',
    });
  };

  const audioRef = useRef<HTMLAudioElement>(null);
  const fadeFrame = useRef<number | null>(null);
  // The volume the music is *meant* to be at. requestAnimationFrame is paused
  // whenever the page is hidden (tab switch, screen off, low power), so a fade
  // driven only by rAF can stop partway and leave the track playing silently.
  // Every fade records its target here and guarantees it with a timer, and the
  // resume handler below re-applies it, so the music can never get stuck at 0.
  const fadeTarget = useRef(0);
  const fadeSnap = useRef<number | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => entries.forEach(entry => entry.isIntersecting && entry.target.classList.add('is-visible')),
      { threshold: 0.14 },
    );
    document.querySelectorAll('.reveal').forEach(element => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  useEffect(() => () => timers.current.forEach(window.clearTimeout), []);

  const fadeAudioTo = (targetVol: number, durationMs = 800) => {
    const audio = audioRef.current;
    if (!audio) return;
    if (fadeFrame.current) cancelAnimationFrame(fadeFrame.current);
    if (fadeSnap.current) window.clearTimeout(fadeSnap.current);

    const startVol = audio.volume;
    const startTime = performance.now();
    const clampedTarget = Math.max(0, Math.min(1, targetVol));

    const ramp = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      audio.volume = startVol + (clampedTarget - startVol) * progress;
      if (progress < 1) {
        fadeFrame.current = requestAnimationFrame(ramp);
      }
    };
    fadeFrame.current = requestAnimationFrame(ramp);

    fadeTarget.current = clampedTarget;
    fadeSnap.current = window.setTimeout(() => {
      if (audio.volume !== clampedTarget) audio.volume = clampedTarget;
    }, durationMs + 80);
    timers.current.push(fadeSnap.current);
  };

  // Auto-resume audio on mobile Safari if interrupted by tab switch or lock screen
  useEffect(() => {
    if (!begun) return;
    const resumeAudio = () => {
      const audio = audioRef.current;
      if (!audio || muted) return;
      // A fade interrupted while the page was hidden may have left the volume
      // short of its target; put it back before (or without) resuming.
      if (audio.volume !== fadeTarget.current) audio.volume = fadeTarget.current;
      if (audio.paused) audio.play().catch(() => undefined);
    };

    document.addEventListener('visibilitychange', resumeAudio);
    window.addEventListener('pageshow', resumeAudio);
    window.addEventListener('focus', resumeAudio);
    document.addEventListener('touchstart', resumeAudio, { passive: true });

    return () => {
      document.removeEventListener('visibilitychange', resumeAudio);
      window.removeEventListener('pageshow', resumeAudio);
      window.removeEventListener('focus', resumeAudio);
      document.removeEventListener('touchstart', resumeAudio);
    };
  }, [begun, muted]);

  // Only offer the shortcut once she has had a moment with the hold itself.
  useEffect(() => {
    if (!begun) return;
    const section = choiceRef.current;
    if (!section) return;
    const observer = new IntersectionObserver(
      entries => {
        if (!entries.some(entry => entry.isIntersecting)) return;
        observer.disconnect();
        const timer = window.setTimeout(() => setFallback(true), 4500);
        timers.current.push(timer);
      },
      { threshold: 0.4 },
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, [begun]);

  const replay = () => {
    // 1. Clear any pending timers and animation frames
    timers.current.forEach(window.clearTimeout);
    timers.current = [];
    if (holdFrame.current) {
      cancelAnimationFrame(holdFrame.current);
      holdFrame.current = null;
    }
    if (fadeFrame.current) {
      cancelAnimationFrame(fadeFrame.current);
      fadeFrame.current = null;
    }

    // 2. Fade down and stop audio
    const audio = audioRef.current;
    if (audio) {
      fadeAudioTo(0, 150);
      window.setTimeout(() => {
        audio.pause();
        audio.currentTime = 0;
      }, 160);
    }
    setMuted(false);

    // 3. Reset all state to initial values
    setChosen(false);
    setSettled(false);
    setHold(0);
    setFallback(false);
    setBegun(false);
    setActivePhotoIndex(0);

    // 4. Reset strip scroll if it was scrolled
    if (stripRef.current) {
      stripRef.current.scrollTo({ left: 0, behavior: 'instant' as ScrollBehavior });
    }
    setCanScrollLeft(false);
    setCanScrollRight(true);

    // 5. Remove reveal / animation classes so scenes reveal afresh on next scroll
    document.querySelectorAll('.is-visible').forEach(el => el.classList.remove('is-visible'));

    // 6. Scroll to the absolute top of the document immediately & reliably
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    // Verify scroll on next frame in case of layout reflow
    requestAnimationFrame(() => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    });
  };

  const begin = () => {
    setBegun(true);
    const audio = audioRef.current;
    if (audio) {
      audio.volume = 0;
      audio.currentTime = 0;
      audio.play()
        .then(() => {
          fadeAudioTo(BASE_VOLUME, 1200);
        })
        .catch(() => {
          // In case play was delayed, retry
        });
    }
  };

  const toggleAudio = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const next = !muted;
    setMuted(next);
    audio.muted = next;
    if (!next && audio.paused) {
      audio.play().catch(() => undefined);
    }
  };

  const finishHold = () => {
    if (chosen) return;
    setChosen(true);
    setHold(1);
    fadeAudioTo(CHOSEN_VOLUME, 300);
    if ('vibrate' in navigator) navigator.vibrate(28);
    // Let the photograph hold its brightest for a beat, then quiet it enough
    // for the words to arrive: hold, bloom, quiet, words.
    const timer = window.setTimeout(() => setSettled(true), 900);
    timers.current.push(timer);
  };

  const startHold = (event: PointerEvent<HTMLButtonElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    holdStart.current = performance.now();
    fadeAudioTo(HOLD_VOLUME, 1900);
    const tick = (now: number) => {
      const progress = Math.min((now - holdStart.current) / 1900, 1);
      setHold(progress);
      if (progress === 1) finishHold();
      else holdFrame.current = requestAnimationFrame(tick);
    };
    holdFrame.current = requestAnimationFrame(tick);
  };

  const cancelHold = () => {
    if (holdFrame.current) cancelAnimationFrame(holdFrame.current);
    if (chosen) return;
    if (hold > 0) setFallback(true);
    setHold(0);
    fadeAudioTo(BASE_VOLUME, 300);
  };

  return (
    <main className={begun ? 'experience begun' : 'experience'}>
      <audio
        ref={audioRef}
        src={AUDIO_SRC}
        preload="auto"
        playsInline
        loop
        onTimeUpdate={(e) => {
          const audio = e.currentTarget;
          if (audio.currentTime >= LOOP_END) {
            audio.currentTime = LOOP_START;
          }
        }}
      />
      {begun && (
        <button
          className={`sound-toggle ${muted ? 'is-muted' : 'is-playing'}`}
          onClick={toggleAudio}
          aria-label={muted ? 'Unmute music' : 'Mute music'}
        >
          {muted ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </svg>
          )}
        </button>
      )}

      <section className="opening" aria-label="Opening">
        <div className="opening-glow" />
        <button className="begin-button" onClick={begin} aria-label="Begin">
          <span>For you</span>
          <small>Tap to begin</small>
        </button>
        <div className="opening-words" aria-hidden={!begun}>
          <p>Some days feel heavier than they should.</p>
          <h1>But one difficult day could never change what you mean to me.</h1>
          <span className="continue">Scroll, slowly</span>
        </div>
      </section>

      <section className="yesterday chapter">
        <div className="chapter-copy reveal">
          <span className="eyebrow">Yesterday</span>
          <h2>Yesterday wasn’t us at our best.</h2>
          <p>It happened, and it mattered. But it doesn’t get to rewrite everything around it.</p>
        </div>
      </section>

      <section className="hero-memory hero-us">
        <img src="/memories/img_2203.webp" alt="Us holding each other and smiling" />
        <div className="image-shade" />
        <p className="reveal">There is so much more to us than one hard moment.</p>
      </section>

      <section className="us-pair chapter">
        <div className="framed-memory tall reveal"><img src="/memories/img_2281.webp" alt="Us together beside the water" /></div>
        <div className="pair-copy reveal">
          <span className="eyebrow">Us</span>
          <h2>Somewhere inside all the ordinary days, you became the person my life looks for.</h2>
        </div>
        <div className="framed-memory offset reveal"><img src="/memories/img_1927.webp" alt="Us looking at each other and smiling" /></div>
      </section>

      <section className="little-things chapter">
        <div className="chapter-copy reveal">
          <span className="eyebrow">The little things</span>
          <h2>Not only the big days.</h2>
          <p>The photographs we almost forget we took. The ordinary versions of us. Somehow, those are some of my favourites.</p>
        </div>

        <div className={`memory-strip-container ${canScrollLeft ? 'has-left-overflow' : ''} ${canScrollRight ? 'has-right-overflow' : ''}`}>
          {canScrollLeft && (
            <button
              className="strip-floating-btn prev-btn"
              onClick={() => scrollStrip('left')}
              aria-label="Scroll left to view previous photos"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          )}

          <div
            ref={stripRef}
            onScroll={handleStripScroll}
            className="memory-strip"
            aria-label="Small memories; swipe sideways"
          >
            {smallMemories.map((photo, index) => (
              <figure key={photo} className={`snapshot ${index % 3 === 1 ? 'lifted' : ''}`}>
                <img src={`/memories/${photo}.webp`} alt="A shared memory" loading="lazy" />
              </figure>
            ))}
          </div>

          {canScrollRight && (
            <button
              className="strip-floating-btn next-btn"
              onClick={() => scrollStrip('right')}
              aria-label="Scroll right to view more photos"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          )}
        </div>

        <div className="swipe-bar reveal">
          <button
            className={`swipe-nav-btn ${!canScrollLeft ? 'disabled' : ''}`}
            onClick={() => scrollStrip('left')}
            disabled={!canScrollLeft}
            aria-label="Previous photo"
          >
            <span className="nav-arrow">←</span>
            <span>Prev</span>
          </button>

          <div className="swipe-pill">
            <span className="swipe-hand-icon">👈</span>
            <span className="swipe-text">{activePhotoIndex + 1} / {smallMemories.length}</span>
            <span className="swipe-hand-icon">👉</span>
          </div>

          <button
            className={`swipe-nav-btn ${!canScrollRight ? 'disabled' : ''}`}
            onClick={() => scrollStrip('right')}
            disabled={!canScrollRight}
            aria-label="Next photo"
          >
            <span>Next</span>
            <span className="nav-arrow">→</span>
          </button>
        </div>
      </section>

      <section className="her chapter">
        <div className="her-heading reveal">
          <span className="eyebrow">You</span>
          <h2>I don’t only love the life we share.</h2>
          <p>I love that it is <em>you</em> I get to share it with.</p>
        </div>
        <div className="portrait-stack">
          {herPortraits.map((photo, index) => (
            <figure className="her-portrait reveal" key={photo}>
              <img src={`/memories/${photo}.webp`} alt="Her, smiling" loading="lazy" />
              {index === 1 && <figcaption>I keep coming back to your smile. It is there in so many of the moments I love most.</figcaption>}
            </figure>
          ))}
        </div>
      </section>

      <section className="priority hero-memory">
        <img src="/memories/img_1057.webp" alt="Us laughing together" loading="lazy" />
        <div className="priority-shade" />
        <div className="priority-copy reveal">
          <p>Life gets busy.<br />Work takes over.<br />Sometimes we get caught inside our own feelings.</p>
          <h2>But I never want you to wonder where you stand with me.</h2>
          <strong>You are my first priority.</strong>
        </div>
      </section>

      <section className="imperfect chapter">
        <img className="imperfect-image" src="/memories/img_1783.webp" alt="Us smiling together" loading="lazy" />
        <div className="imperfect-shade" />
        <div className="chapter-copy reveal">
          <span className="eyebrow">Real, not perfect</span>
          <h2>We won’t always get it right.</h2>
          <p>We’ll misunderstand each other. Sometimes we’ll be tired, hurt, impatient, or simply wrong.</p>
          <div className="gold-line" />
          <h3>But this was never about being perfect.</h3>
          <p>It is about remembering that we are worth coming back to.</p>
        </div>
      </section>

      <section
        ref={choiceRef}
        className={`choice${chosen ? ' chosen' : ''}${settled ? ' settled' : ''}`}
        style={{ '--hold': hold } as React.CSSProperties}
      >
        <img src="/memories/img_4137.webp" alt="Us close together" loading="lazy" />
        <div className="choice-veil" />
        <div className="choice-scrim" />
        <div className="choice-copy">
          <p>There’s one thing I need you to know.</p>
          <button
            className="hold-button"
            onPointerDown={startHold}
            onPointerUp={cancelHold}
            onPointerCancel={cancelHold}
            onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') finishHold(); }}
            onDoubleClick={finishHold}
            aria-label="Press and hold, or press Enter, to reveal the message"
          >
            <span className="hold-ring"><i /></span>
            <small>{chosen ? 'I mean it' : 'Press and hold'}</small>
          </button>
          <div className="choice-message" aria-live="polite">
            <h2>Even when we’re not at our best, you never stop being important to me.</h2>
            <strong>Not for a second.</strong>
          </div>
          {!chosen && fallback && (
            <button className="tap-fallback" onClick={finishHold}>or tap here to reveal</button>
          )}
        </div>
      </section>

      <section className="promises chapter">
        <div className="promises-heading reveal">
          <span className="eyebrow">What I can promise</span>
          <h2>Not perfection.<br />Something more honest.</h2>
        </div>
        <ol>
          {promises.map((promise, index) => (
            <li className="reveal" key={promise}>
              <span className="promise-num">0{index + 1}</span>
              <p>{promise}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="days">
        <div className="days-copy reveal">
          <span className="days-date">10 April 2022</span>
          <h2>1,596 days of us.</h2>
          <p>Some beautiful. Some ordinary. Some hard.</p>
          <p className="days-ahead">And we still have so many more to make, Nikki.</p>
        </div>
      </section>

      <section className="crescendo" aria-label="More memories of us">
        <div className="mosaic">
          {finalMemories.map((photo, index) => (
            <figure key={photo} className={`tile tile-${index + 1} reveal`}>
              <img src={`/memories/${photo}.webp`} alt="One of our memories" loading="lazy" />
            </figure>
          ))}
        </div>
      </section>

      <section className="finale">
        <img src="/memories/img_4241.webp" alt="Us looking at each other beneath a stone arch" loading="lazy" />
        <div className="finale-shade" />
        <div className="finale-copy reveal">
          <p>Yesterday happened.<br />Tomorrow will come.</p>
          <h2>I don’t need us to be perfect. I just want us to keep finding our way back to each other.</h2>
          <div className="final-truths">
            <span>You matter to me.</span>
            <span>More than I say out loud.</span>
          </div>
          <p className="still-you">And after everything, it is still you.</p>
          <strong>I choose us.</strong>
        </div>
        <button className="replay reveal" onClick={replay} aria-label="Replay from the beginning">Replay</button>
      </section>
    </main>
  );
}
