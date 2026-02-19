import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { ReadingRef, Translation, BibleBook } from '../../engine/types';
import { loadBook } from '../../services/bible-loader';
import { ScriptureReading } from './ScriptureReading';
import { BookChapterPicker } from './BookChapterPicker';
import { useSwipe } from '../../hooks/useSwipe';
import { findCanonBook } from '../../data/book-list';

interface Props {
  originRef: ReadingRef;
  translation: Translation;
  onClose: () => void;
}

export function BibleReaderModal({ originRef, translation, onClose }: Props) {
  const [currentBookName, setCurrentBookName] = useState(originRef.book);
  const [currentChapter, setCurrentChapter] = useState(originRef.startChapter);
  const [book, setBook] = useState<BibleBook | null>(null);
  const [loading, setLoading] = useState(true);

  const [showMenu, setShowMenu] = useState(false);
  const [showBookPicker, setShowBookPicker] = useState(false);

  const contentRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);

  // Load book when bookName changes
  useEffect(() => {
    setLoading(true);
    loadBook(translation, currentBookName).then(b => {
      setBook(b);
      setLoading(false);
    });
  }, [translation, currentBookName]);

  // Body scroll lock
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Scroll to top on chapter change
  useEffect(() => {
    contentRef.current?.scrollTo(0, 0);
  }, [currentChapter, currentBookName]);

  // Get total chapters for current book
  const totalChapters = useMemo(() => {
    const canon = findCanonBook(currentBookName);
    return canon?.chapters ?? book?.chapters.length ?? 1;
  }, [currentBookName, book]);

  // Get current chapter data
  const chapterData = useMemo(() => {
    if (!book) return null;
    return book.chapters.find(c => c.chapter === currentChapter) ?? null;
  }, [book, currentChapter]);

  // Compute highlight range for the current chapter
  const highlightRange = useMemo(() => {
    if (currentBookName !== originRef.book) return undefined;
    if (currentChapter < originRef.startChapter || currentChapter > originRef.endChapter) return undefined;

    let start = 1;
    let end = Infinity;

    if (currentChapter === originRef.startChapter && originRef.startVerse != null) {
      start = originRef.startVerse;
    }
    if (currentChapter === originRef.endChapter && originRef.endVerse != null) {
      end = originRef.endVerse;
    } else if (currentChapter === originRef.endChapter && chapterData) {
      // End of chapter — highlight to last verse
      const lastVerse = chapterData.verses[chapterData.verses.length - 1];
      if (lastVerse) end = lastVerse.verse;
    }

    // If we don't have explicit bounds and it's a whole-chapter ref, highlight everything
    if (originRef.startVerse == null && originRef.endVerse == null) {
      return undefined; // whole chapter(s) — no specific highlight needed
    }

    return { start, end };
  }, [currentBookName, currentChapter, originRef, chapterData]);

  const goToPrevChapter = useCallback(() => {
    if (currentChapter > 1) setCurrentChapter(c => c - 1);
  }, [currentChapter]);

  const goToNextChapter = useCallback(() => {
    if (currentChapter < totalChapters) setCurrentChapter(c => c + 1);
  }, [currentChapter, totalChapters]);

  // Swipe support
  useSwipe(contentRef, {
    onSwipeLeft: goToNextChapter,
    onSwipeRight: goToPrevChapter,
  });

  // Keyboard support
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (showBookPicker) return;
      if (e.key === 'Escape') {
        if (showMenu) setShowMenu(false);
        else onClose();
      } else if (e.key === 'ArrowLeft') {
        goToPrevChapter();
      } else if (e.key === 'ArrowRight') {
        goToNextChapter();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showMenu, showBookPicker, onClose, goToPrevChapter, goToNextChapter]);

  const handleJumpToReference = useCallback(() => {
    setCurrentBookName(originRef.book);
    setCurrentChapter(originRef.startChapter);
    setShowMenu(false);
    // Scroll to highlighted verses after render
    requestAnimationFrame(() => {
      highlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }, [originRef]);

  const handleBookChapterSelect = useCallback((bookName: string, chapter: number) => {
    setCurrentBookName(bookName);
    setCurrentChapter(chapter);
    setShowBookPicker(false);
    setShowMenu(false);
  }, []);

  // Chapter heading: "Psalm 23" for Psalms, "Genesis 1" for others
  const heading = currentBookName === 'Psalms'
    ? `Psalm ${currentChapter}`
    : `${currentBookName} ${currentChapter}`;

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: 'var(--color-bg)' }}>
      {/* Header */}
      <div className="shrink-0 max-w-2xl w-full mx-auto flex items-center justify-between px-4 pt-4 pb-2">
        <h1
          className="text-lg font-semibold"
          style={{ fontFamily: 'var(--font-ui)' }}
        >
          {heading}
        </h1>

        {/* Three-dot menu button */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(m => !m)}
            className="p-2 rounded-full transition-colors hover:bg-[var(--color-hover)]"
            style={{ color: 'var(--color-text-muted)' }}
            aria-label="Menu"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="12" cy="19" r="2" />
            </svg>
          </button>

          {/* Dropdown menu */}
          {showMenu && (
            <>
              {/* Backdrop to close menu */}
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div
                className="absolute right-0 top-full mt-1 z-20 rounded-lg shadow-lg border py-1 min-w-[180px]"
                style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
              >
                <MenuButton
                  label="Go to book/chapter"
                  onClick={() => { setShowBookPicker(true); setShowMenu(false); }}
                />
                <MenuButton
                  label="Jump to reference"
                  onClick={handleJumpToReference}
                />
                <div className="border-t my-1" style={{ borderColor: 'var(--color-border)' }} />
                <MenuButton label="Close" onClick={onClose} />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Content area */}
      <div ref={contentRef} className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-2xl mx-auto px-4 pb-24">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <svg
                className="w-6 h-6 animate-spin"
                style={{ color: 'var(--color-accent)' }}
                fill="none" viewBox="0 0 24 24"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : chapterData ? (
            <div ref={highlightRange ? highlightRef : undefined}>
              <ScriptureReading
                verses={chapterData.verses}
                superscription={chapterData.superscription}
                highlightRange={highlightRange}
              />
            </div>
          ) : (
            <p className="py-12 text-center" style={{ color: 'var(--color-text-muted)' }}>
              Chapter not found
            </p>
          )}
        </div>
      </div>

      {/* Navigation chevrons */}
      <div className="fixed bottom-6 left-0 right-0 pointer-events-none">
        <div className="max-w-2xl mx-auto px-4 flex justify-between">
          <button
            onClick={goToPrevChapter}
            disabled={currentChapter <= 1}
            className="pointer-events-auto p-3 rounded-full shadow-md transition-opacity disabled:opacity-20"
            style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
            aria-label="Previous chapter"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button
            onClick={goToNextChapter}
            disabled={currentChapter >= totalChapters}
            className="pointer-events-auto p-3 rounded-full shadow-md transition-opacity disabled:opacity-20"
            style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
            aria-label="Next chapter"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Book/Chapter picker overlay */}
      {showBookPicker && (
        <BookChapterPicker
          currentBookName={currentBookName}
          currentChapter={currentChapter}
          onSelect={handleBookChapterSelect}
          onClose={() => setShowBookPicker(false)}
        />
      )}
    </div>
  );
}

function MenuButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-[var(--color-hover)]"
      style={{ fontFamily: 'var(--font-ui)' }}
    >
      {label}
    </button>
  );
}
