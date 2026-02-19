import { useState, useRef, useEffect, useCallback } from 'react';
import { CANON_BOOKS, type RuntimeBook } from '../../data/book-list';

interface Props {
  currentBookName: string;
  currentChapter: number;
  onSelect: (bookName: string, chapter: number) => void;
  onClose: () => void;
}

const OT_BOOKS = CANON_BOOKS.filter(b => b.testament === 'OT');
const NT_BOOKS = CANON_BOOKS.filter(b => b.testament === 'NT');

export function BookChapterPicker({ currentBookName, currentChapter, onSelect, onClose }: Props) {
  const [selectedBook, setSelectedBook] = useState<RuntimeBook | null>(null);
  const activeBookRef = useRef<HTMLButtonElement>(null);

  // Scroll to current book on mount
  useEffect(() => {
    requestAnimationFrame(() => {
      activeBookRef.current?.scrollIntoView({ block: 'center' });
    });
  }, []);

  // Escape to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedBook) setSelectedBook(null);
        else onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedBook, onClose]);

  const handleBookTap = useCallback((book: RuntimeBook) => {
    setSelectedBook(book);
  }, []);

  const handleChapterTap = useCallback((chapter: number) => {
    if (!selectedBook) return;
    onSelect(selectedBook.name, chapter);
  }, [selectedBook, onSelect]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: 'var(--color-bg)' }}>
      {/* Header */}
      <div className="shrink-0 max-w-2xl w-full mx-auto flex items-center gap-3 px-4 pt-4 pb-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
        {selectedBook ? (
          <>
            <button
              onClick={() => setSelectedBook(null)}
              className="p-1 rounded transition-colors hover:bg-[var(--color-hover)]"
              style={{ color: 'var(--color-text-muted)' }}
              aria-label="Back to book list"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <h2 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-ui)' }}>
              {selectedBook.name}
            </h2>
          </>
        ) : (
          <>
            <h2 className="text-lg font-semibold flex-1" style={{ fontFamily: 'var(--font-ui)' }}>
              Select a book
            </h2>
            <button
              onClick={onClose}
              className="p-1 rounded transition-colors hover:bg-[var(--color-hover)]"
              style={{ color: 'var(--color-text-muted)' }}
              aria-label="Close"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-2xl mx-auto px-4 pb-8">
          {selectedBook ? (
            // Chapter grid
            <div className="py-4">
              <div className="grid grid-cols-6 gap-2">
                {Array.from({ length: selectedBook.chapters }, (_, i) => {
                  const ch = i + 1;
                  const isCurrent = selectedBook.name === currentBookName && ch === currentChapter;
                  return (
                    <button
                      key={ch}
                      onClick={() => handleChapterTap(ch)}
                      className={`aspect-square rounded-lg text-sm font-medium flex items-center justify-center transition-colors ${
                        isCurrent
                          ? 'text-[var(--color-accent-contrast)]'
                          : 'hover:bg-[var(--color-hover)]'
                      }`}
                      style={isCurrent ? { backgroundColor: 'var(--color-accent)', fontFamily: 'var(--font-ui)' } : { fontFamily: 'var(--font-ui)' }}
                    >
                      {ch}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            // Book list
            <div>
              <BookGroup label="Old Testament" books={OT_BOOKS} currentBookName={currentBookName} activeBookRef={activeBookRef} onTap={handleBookTap} />
              <BookGroup label="New Testament" books={NT_BOOKS} currentBookName={currentBookName} activeBookRef={activeBookRef} onTap={handleBookTap} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BookGroup({
  label,
  books,
  currentBookName,
  activeBookRef,
  onTap,
}: {
  label: string;
  books: RuntimeBook[];
  currentBookName: string;
  activeBookRef: React.RefObject<HTMLButtonElement | null>;
  onTap: (book: RuntimeBook) => void;
}) {
  return (
    <div className="py-3">
      <h3
        className="text-xs font-semibold uppercase tracking-wider mb-2 px-1"
        style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-ui)' }}
      >
        {label}
      </h3>
      <div className="space-y-0.5">
        {books.map(book => {
          const isCurrent = book.name === currentBookName;
          return (
            <button
              key={book.id}
              ref={isCurrent ? activeBookRef : undefined}
              onClick={() => onTap(book)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center justify-between ${
                isCurrent ? 'font-semibold' : ''
              }`}
              style={isCurrent
                ? { backgroundColor: 'var(--color-accent)', color: 'var(--color-accent-contrast)', fontFamily: 'var(--font-ui)' }
                : { fontFamily: 'var(--font-ui)' }
              }
            >
              <span>{book.name}</span>
              <span
                className="text-xs"
                style={{ opacity: 0.6 }}
              >
                {book.chapters} ch
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
