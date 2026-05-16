'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Search, Video, ChevronDown, Upload, Link as LinkIcon, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

function getPageName(pathname: string): string {
  if (pathname === '/') return 'Home';
  if (pathname === '/meetings') return 'Meetings';
  if (pathname === '/uploads') return 'Uploads';
  if (pathname === '/meetings/new') return 'New Meeting';
  if (pathname.startsWith('/meetings/')) return 'Meeting Detail';
  return 'Page';
}

export default function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');

  const pageName = getPageName(pathname);

  function handleAddLink() {
    // Placeholder — future feature
    setLinkDialogOpen(false);
    setLinkUrl('');
  }

  return (
    <>
      <header className="bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-4 shrink-0">
        {/* Breadcrumb */}
        <div className="w-40 shrink-0">
          <span className="text-sm font-semibold text-gray-800">{pageName}</span>
        </div>

        {/* Search bar — centered */}
        <div className="flex-1 flex justify-center">
          <div className="relative w-full max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by title or keyword"
              className="w-full pl-8 pr-12 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-full outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400 transition-all"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-mono">⌘K</span>
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
                  className="bg-purple-600 hover:bg-purple-700 text-white rounded-l-none border-l border-purple-500 h-8 px-2"
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

          {/* Mic icon button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => router.push('/record')}>
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

      {/* Add Link Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add a link</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="link-url">Paste a meeting recording URL</Label>
            <Input
              id="link-url"
              type="url"
              placeholder="https://..."
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>Cancel</Button>
            <Button
              className="bg-purple-600 hover:bg-purple-700"
              onClick={handleAddLink}
              disabled={!linkUrl.trim()}
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
