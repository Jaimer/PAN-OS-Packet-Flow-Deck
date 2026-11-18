import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  NotesDrawer,
  OverviewModal,
  ShortcutsModal,
} from './components/DeckOverlays';
import { SlideRenderer } from './components/SlideRenderer';
import { FaultTypeId, ScenarioId } from './data/packetFlowModel';
import { SLIDES } from './data/slidesData';
import {
  SimulatorState,
  createInitialState,
  resetScenario,
  selectScenario,
  stepBack,
  stepForward,
  updateSimulatorOptions,
} from './engine/flowSimulator';

function parseHashSlideIndex(): number {
  const match = window.location.hash.match(/^#slide-(\d+)$/);
  if (!match) return 0;
  const num = Number(match[1]);
  if (!Number.isInteger(num) || num < 1 || num > SLIDES.length) {
    return 0;
  }
  return num - 1;
}

export const App: React.FC = () => {
  const [slideIndex, setSlideIndex] = useState<number>(() => parseHashSlideIndex());
  const [interactiveMode, setInteractiveMode] = useState<boolean>(() => {
    try {
      const saved = sessionStorage.getItem('panos-deck-interactive');
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });
  const [notesOpen, setNotesOpen] = useState(false);
  const [overviewOpen, setOverviewOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [reducedMotion, setReducedMotion] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  });

  const currentSlide = SLIDES[slideIndex] ?? SLIDES[0]!;
  const [simState, setSimState] = useState<SimulatorState>(() =>
    createInitialState(currentSlide.defaultScenarioId)
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<0.5 | 1 | 2>(1);

  const overviewTriggerRef = useRef<HTMLButtonElement>(null);
  const shortcutsTriggerRef = useRef<HTMLButtonElement>(null);
  const notesTriggerRef = useRef<HTMLButtonElement>(null);
  const lastModalRef = useRef<'overview' | 'shortcuts' | null>(null);
  const touchStartXRef = useRef<number | null>(null);

  const goToSlide = useCallback((idx: number) => {
    const clamped = Math.max(0, Math.min(SLIDES.length - 1, idx));
    const target = SLIDES[clamped]!;
    setSlideIndex(clamped);
    setIsPlaying(false);
    setSimState(createInitialState(target.defaultScenarioId));
    window.history.replaceState(null, '', `#slide-${target.number}`);
  }, []);

  // Sync hash changes (e.g. browser back/forward)
  useEffect(() => {
    const onHashChange = () => {
      const idx = parseHashSlideIndex();
      setSlideIndex(idx);
      setIsPlaying(false);
      setSimState(createInitialState(SLIDES[idx]!.defaultScenarioId));
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Persist interactive mode
  useEffect(() => {
    try {
      sessionStorage.setItem('panos-deck-interactive', String(interactiveMode));
    } catch {
      // ignore storage errors
    }
  }, [interactiveMode]);

  // Animation playback interval
  useEffect(() => {
    if (!isPlaying) return;
    const delayMs = speed === 2 ? 650 : speed === 0.5 ? 2000 : 1150;
    const timer = window.setInterval(() => {
      setSimState((prev) => {
        if (prev.stepIndex >= prev.steps.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return stepForward(prev);
      });
    }, delayMs);
    return () => window.clearInterval(timer);
  }, [isPlaying, speed]);

  const closeOverview = useCallback(() => {
    setOverviewOpen(false);
    if (lastModalRef.current === 'overview') {
      overviewTriggerRef.current?.focus();
    }
  }, []);

  const closeShortcuts = useCallback(() => {
    setShortcutsOpen(false);
    if (lastModalRef.current === 'shortcuts') {
      shortcutsTriggerRef.current?.focus();
    }
  }, []);

  const closeNotes = useCallback(() => {
    setNotesOpen(false);
    notesTriggerRef.current?.focus();
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'SELECT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === 'Escape') {
        if (overviewOpen) {
          e.preventDefault();
          closeOverview();
          return;
        }
        if (shortcutsOpen) {
          e.preventDefault();
          closeShortcuts();
          return;
        }
        if (notesOpen) {
          e.preventDefault();
          closeNotes();
          return;
        }
      }

      if (overviewOpen || shortcutsOpen) return;

      switch (e.key) {
        case 'ArrowRight':
        case 'PageDown':
        case ' ':
          e.preventDefault();
          if (slideIndex < SLIDES.length - 1) goToSlide(slideIndex + 1);
          break;
        case 'ArrowLeft':
        case 'PageUp':
          e.preventDefault();
          if (slideIndex > 0) goToSlide(slideIndex - 1);
          break;
        case 'Home':
          e.preventDefault();
          goToSlide(0);
          break;
        case 'End':
          e.preventDefault();
          goToSlide(SLIDES.length - 1);
          break;
        case 'o':
        case 'O':
        case 'g':
        case 'G':
          e.preventDefault();
          lastModalRef.current = 'overview';
          setOverviewOpen((v) => !v);
          break;
        case 'n':
        case 'N':
          e.preventDefault();
          setNotesOpen((v) => !v);
          break;
        case 'i':
        case 'I':
          e.preventDefault();
          setInteractiveMode((v) => !v);
          break;
        case 'p':
        case 'P':
          e.preventDefault();
          setIsPlaying((v) => !v);
          break;
        case '?':
          e.preventDefault();
          lastModalRef.current = 'shortcuts';
          setShortcutsOpen((v) => !v);
          break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    slideIndex,
    overviewOpen,
    shortcutsOpen,
    notesOpen,
    goToSlide,
    closeOverview,
    closeShortcuts,
  ]);

  const progressPct = ((slideIndex + 1) / SLIDES.length) * 100;
  const animDuration = reducedMotion
    ? '0ms'
    : speed === 2
    ? '250ms'
    : speed === 0.5
    ? '850ms'
    : '480ms';

  return (
    <div
      className={`deck-shell ${reducedMotion ? 'reduced-motion' : ''}`}
      style={{ '--anim-duration': animDuration } as React.CSSProperties}
      data-testid="deck-shell"
    >
      {/* Top Header */}
      <header className="deck-topbar">
        <div className="topbar-brand">
          <span className="brand-dot" aria-hidden="true" />
          <span className="brand-title">PAN-OS Packet Flow Sequence</span>
          <span className="badge badge-stage" data-testid="topbar-stage-pill">
            {currentSlide.sectionBadge}
          </span>
        </div>

        <div className="topbar-actions">
          <button
            type="button"
            className={`tool-btn ${interactiveMode ? 'active' : ''}`}
            onClick={() => setInteractiveMode((v) => !v)}
            aria-pressed={interactiveMode}
            data-testid="mode-toggle-btn"
          >
            {interactiveMode ? 'Interactive Mode' : 'Presentation Mode'} (I)
          </button>
          <button
            type="button"
            className={`tool-btn ${reducedMotion ? 'active' : ''}`}
            onClick={() => setReducedMotion((v) => !v)}
            aria-pressed={reducedMotion}
            data-testid="reduced-motion-btn"
          >
            Reduce Motion
          </button>
          <button
            ref={notesTriggerRef}
            type="button"
            className={`tool-btn ${notesOpen ? 'active' : ''}`}
            onClick={() => setNotesOpen((v) => !v)}
            aria-pressed={notesOpen}
            data-testid="notes-toggle-btn"
          >
            Notes (N)
          </button>
          <button
            ref={overviewTriggerRef}
            type="button"
            className="tool-btn"
            onClick={() => {
              lastModalRef.current = 'overview';
              setOverviewOpen(true);
            }}
            data-testid="overview-btn"
          >
            Overview (O)
          </button>
          <button
            ref={shortcutsTriggerRef}
            type="button"
            className="tool-btn"
            onClick={() => {
              lastModalRef.current = 'shortcuts';
              setShortcutsOpen(true);
            }}
            aria-label="Keyboard shortcuts"
            data-testid="shortcuts-btn"
          >
            ?
          </button>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="progress-track" aria-hidden="true">
        <div
          className="progress-fill"
          style={{ width: `${progressPct}%` }}
          data-testid="progress-fill"
        />
      </div>

      {/* Main Stage + Optional Notes Drawer */}
      <main
        className="deck-main"
        onTouchStart={(e) => {
          touchStartXRef.current = e.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(e) => {
          if (touchStartXRef.current === null) return;
          const endX = e.changedTouches[0]?.clientX ?? touchStartXRef.current;
          const diff = endX - touchStartXRef.current;
          touchStartXRef.current = null;
          if (Math.abs(diff) > 55) {
            if (diff < 0 && slideIndex < SLIDES.length - 1) goToSlide(slideIndex + 1);
            if (diff > 0 && slideIndex > 0) goToSlide(slideIndex - 1);
          }
        }}
      >
        <section className="stage-container" aria-label={`Slide ${currentSlide.number}`}>
          <SlideRenderer
            slide={currentSlide}
            interactiveMode={interactiveMode}
            simState={simState}
            isPlaying={isPlaying}
            speed={speed}
            onTogglePlay={() => setIsPlaying((v) => !v)}
            onStepBack={() => {
              setIsPlaying(false);
              setSimState((s) => stepBack(s));
            }}
            onStepForward={() => {
              setIsPlaying(false);
              setSimState((s) => stepForward(s));
            }}
            onReset={() => {
              setIsPlaying(false);
              setSimState((s) => resetScenario(s));
            }}
            onSpeedChange={setSpeed}
            onSelectScenario={(id: ScenarioId) => {
              setIsPlaying(false);
              setSimState((s) => selectScenario(id, s.options));
            }}
            onSelectFault={(faultType: FaultTypeId) => {
              setIsPlaying(false);
              setSimState((s) => updateSimulatorOptions(s, { faultType }));
            }}
            onToggleFinRst={() => {
              setIsPlaying(false);
              setSimState((s) =>
                updateSimulatorOptions(s, { finRstEnabled: !s.options.finRstEnabled })
              );
            }}
            onToggleTeardrop={() => {
              setIsPlaying(false);
              setSimState((s) =>
                updateSimulatorOptions(s, {
                  teardropDropEnabled: !s.options.teardropDropEnabled,
                })
              );
            }}
            onToggleRecheckDeny={() => {
              setIsPlaying(false);
              setSimState((s) =>
                updateSimulatorOptions(s, {
                  recheckDenyEnabled: !s.options.recheckDenyEnabled,
                })
              );
            }}
          />
        </section>

        <NotesDrawer
          isOpen={notesOpen}
          slide={currentSlide}
          onClose={closeNotes}
        />
      </main>

      {/* Bottom Navigation */}
      <footer className="deck-footer">
        <button
          type="button"
          className="nav-btn"
          disabled={slideIndex === 0}
          aria-disabled={slideIndex === 0}
          onClick={() => goToSlide(slideIndex - 1)}
          data-testid="prev-slide-btn"
        >
          ← Previous
        </button>

        <div className="slide-counter mono" data-testid="slide-counter">
          {slideIndex + 1} / {SLIDES.length}
        </div>

        <button
          type="button"
          className="nav-btn"
          disabled={slideIndex === SLIDES.length - 1}
          aria-disabled={slideIndex === SLIDES.length - 1}
          onClick={() => goToSlide(slideIndex + 1)}
          data-testid="next-slide-btn"
        >
          Next →
        </button>
      </footer>

      {/* Screen Reader Live Region */}
      <div className="sr-only" aria-live="polite">
        Slide {currentSlide.number} of {SLIDES.length}: {currentSlide.title}
      </div>

      {/* Overlays */}
      <OverviewModal
        isOpen={overviewOpen}
        slides={SLIDES}
        currentSlideIndex={slideIndex}
        onSelectSlide={goToSlide}
        onClose={closeOverview}
      />
      <ShortcutsModal isOpen={shortcutsOpen} onClose={closeShortcuts} />
    </div>
  );
};

export default App;
