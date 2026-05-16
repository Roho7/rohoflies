'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { Search, Video, ChevronDown, Upload, Mic, Menu } from 'lucide-react';
import { useMeetings } from '@/context/MeetingsContext';
import { Meeting } from '@/types';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

function getPageName(pathname: string): string {
  if (pathname === '/') return 'Home';
  if (pathname === '/meetings') return 'Meetings';
  if (pathname === '/uploads') return 'Uploads';
  if (pathname === '/meetings/new') return 'New Meeting';
  if (pathname.startsWith('/meetings/')) return 'Meeting Detail';
  return 'Page';
}

function highlight(text: string, query: string): string {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  const start = Math.max(0, idx - 40);
  const end = Math.min(text.length, idx + query.length + 60);
  const snippet = (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
  return snippet;
}

function searchMeetings(meetings: Meeting[], query: string): Meeting[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return meetings.filter(
    (m) =>
      m.title.toLowerCase().includes(q) ||
      (m.transcript && m.transcript.toLowerCase().includes(q))
  ).slice(0, 6);
}

interface TopbarProps {
  onMenuClick?: () => void;
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { meetings } = useMeetings();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const results = searchMeetings(meetings, query);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSelect(id: string) {
    setOpen(false);
    setQuery('');
    router.push(`/meetings/${id}`);
  }

  const pageName = getPageName(pathname);

  return (
    <>
      <header className="bg-white border-b border-gray-100 px-4 md:px-6 py-3 flex items-center gap-3 md:gap-4 shrink-0">
        {/* Hamburger — mobile only */}
        <button
          className="md:hidden p-1.5 rounded-md hover:bg-gray-100 text-gray-500 shrink-0"
          onClick={onMenuClick}
        >
          <Menu size={18} />
        </button>

        {/* Breadcrumb */}
        <div className="hidden md:block w-40 shrink-0">
          <span className="text-sm font-semibold text-gray-800">{pageName}</span>
        </div>

        {/* Search bar — centered */}
        <div className="flex-1 flex justify-center">
          <div className="relative w-full max-w-sm" ref={searchRef}>
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" />
            <input
              type="text"
              placeholder="Search by title or keyword"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
              onFocus={() => { if (query) setOpen(true); }}
              className="w-full pl-8 pr-4 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-full outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400 transition-all"
            />

            {/* Results dropdown */}
            {open && results.length > 0 && (
              <div className="absolute top-full mt-2 left-0 right-0 bg-white border border-gray-100 rounded-xl shadow-lg z-50 overflow-hidden">
                {results.map((m) => {
                  const inTranscript = m.transcript && m.transcript.toLowerCase().includes(query.toLowerCase());
                  return (
                    <button
                      key={m.id}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                      onMouseDown={() => handleSelect(m.id)}
                    >
                      <p className="text-sm font-medium text-gray-900 truncate">{m.title}</p>
                      {inTranscript && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate">
                          {highlight(m.transcript!, query)}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* No results */}
            {open && query.trim() && results.length === 0 && (
              <div className="absolute top-full mt-2 left-0 right-0 bg-white border border-gray-100 rounded-xl shadow-lg z-50 px-4 py-3">
                <p className="text-sm text-gray-400">No meetings found for "{query}"</p>
              </div>
            )}
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Capture split button */}
          <div className="flex items-center">
            <Button
              size="sm"
              className="bg-purple-600 hover:bg-purple-700 text-white rounded-r-none text-sm px-3 gap-1.5 h-8"
              onClick={() => router.push('/uploads')}
            >
              <Video size={14} />
              Capture
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700 text-white rounded-l-none border-l border-purple-500 h-[30px] px-2"
                >
                  <ChevronDown size={14} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem
                  className="gap-2 cursor-pointer"
                  onClick={() => router.push('/uploads')}
                >
                  <Upload size={14} className="text-gray-500" />
                  Upload audio or video
                </DropdownMenuItem>
                {/* <DropdownMenuItem
                  className="gap-2 cursor-pointer"
                  onClick={() => setLinkDialogOpen(true)}
                >
                  <LinkIcon size={14} className="text-gray-500" />
                  Add link
                </DropdownMenuItem> */}

                <DropdownMenuItem
                  className="gap-2 cursor-pointer"
                  onClick={() => router.push('/record')}
                >
                  <Mic size={14} className="text-gray-500" />
                  Start recording
                </DropdownMenuItem>

              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mic icon button — desktop only */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" className="hidden md:flex h-8 w-8 p-0" onClick={() => router.push('/record')}>
                <Mic size={14} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Start Recording A Meeting
            </TooltipContent>
          </Tooltip>

          {/* User avatar */}
          <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs font-semibold select-none">
            R
          </div>
        </div>
      </header>

    </>
  );
}
