import React, { useEffect, useRef } from 'react';
import { SlideDefinition } from '../data/slidesData';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function trapFocusOnTab(e: React.KeyboardEvent<HTMLElement>, container: HTMLElement | null) {
  if (e.key !== 'Tab' || !container) return;
  const focusable = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
  if (focusable.length === 0) {
    e.preventDefault();
    container.focus();
    return;
  }
  const first = focusable[0]!;
  const last = focusable[focusable.length - 1]!;
  const active = document.activeElement as HTMLElement | null;

  if (e.shiftKey) {
    if (!active || active === container || active === first || !container.contains(active)) {
      e.preventDefault();
      last.focus();
    }
  } else {
    if (!active || active === container || active === last || !container.contains(active)) {
      e.preventDefault();
      first.focus();
    }
  }
}

interface OverviewModalProps {
  isOpen: boolean;
  slides: SlideDefinition[];
  currentSlideIndex: number;
  onSelectSlide: (index: number) => void;
  onClose: () => void;
}

export const OverviewModal: React.FC<OverviewModalProps> = ({
  isOpen,
  slides,
  currentSlideIndex,
  onSelectSlide,
  onClose,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      dialogRef.current?.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const groups = Array.from(new Set(slides.map((s) => s.sectionGroup)));

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="modal-panel overview-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Slide Overview"
        tabIndex={-1}
        data-testid="overview-modal"
        onKeyDown={(e) => trapFocusOnTab(e, dialogRef.current)}
      >
        <div className="modal-header">
          <h2>Deck Overview — PAN-OS Packet Flow (12 Slides)</h2>
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            aria-label="Close overview"
            data-testid="close-overview-btn"
          >
            ✕
          </button>
        </div>

        <div className="overview-groups">
          {groups.map((group) => (
            <div key={group} className="overview-group">
              <h3 className="overview-group-title">{group}</h3>
              <div className="overview-grid">
                {slides
                  .filter((s) => s.sectionGroup === group)
                  .map((slide) => {
                    const idx = slide.number - 1;
                    const isCurrent = idx === currentSlideIndex;
                    return (
                      <button
                        key={slide.id}
                        type="button"
                        className={`overview-card ${isCurrent ? 'current' : ''}`}
                        onClick={() => {
                          onSelectSlide(idx);
                          onClose();
                        }}
                        data-testid={`overview-slide-${slide.number}`}
                      >
                        <div className="overview-card-top">
                          <span className="mono">#{slide.number}</span>
                          <span className="badge badge-stage">{slide.kbRefs}</span>
                        </div>
                        <strong>{slide.title}</strong>
                      </button>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      dialogRef.current?.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const shortcuts = [
    ['→ / Space / PageDown', 'Next slide'],
    ['← / PageUp', 'Previous slide'],
    ['Home / End', 'First / Last slide'],
    ['O / G', 'Toggle Slide Overview'],
    ['N', 'Toggle Speaker / Educational Notes'],
    ['I', 'Toggle Presentation / Interactive Mode'],
    ['P', 'Play / Pause pipeline animation'],
    ['?', 'Toggle Keyboard Shortcuts'],
    ['Esc', 'Close active modal or drawer'],
  ];

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="modal-panel shortcuts-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard Shortcuts"
        tabIndex={-1}
        data-testid="shortcuts-modal"
        onKeyDown={(e) => trapFocusOnTab(e, dialogRef.current)}
      >
        <div className="modal-header">
          <h2>Keyboard Shortcuts</h2>
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            aria-label="Close keyboard shortcuts"
          >
            ✕
          </button>
        </div>
        <table className="shortcuts-table">
          <tbody>
            {shortcuts.map(([key, desc]) => (
              <tr key={key}>
                <td>
                  <kbd className="mono">{key}</kbd>
                </td>
                <td>{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

interface NotesDrawerProps {
  isOpen: boolean;
  slide: SlideDefinition;
  onClose: () => void;
}

export const NotesDrawer: React.FC<NotesDrawerProps> = ({ isOpen, slide, onClose }) => {
  if (!isOpen) return null;

  return (
    <aside
      className="notes-drawer"
      aria-label="Educational and Speaker Notes"
      data-testid="notes-drawer"
    >
      <div className="notes-header">
        <div>
          <span className="badge badge-stage">{slide.kbRefs}</span>
          <h3>Educational &amp; Speaker Notes</h3>
        </div>
        <button
          type="button"
          className="icon-btn"
          onClick={onClose}
          aria-label="Close notes"
        >
          ✕
        </button>
      </div>
      <p className="notes-body">{slide.speakerNotes}</p>
      {slide.callout && (
        <div className={`callout-box tone-${slide.callout.tone}`}>
          <strong>{slide.callout.title}</strong>
          <p>{slide.callout.body}</p>
        </div>
      )}
    </aside>
  );
};
