import React, { useEffect, useState, useCallback } from 'react';
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface NewsItem {
  uuid: string;
  title: string;
  publisher: string;
  link: string;
  providerPublishTime: number;
  thumbnail?: {
    resolutions: {
      url: string;
      width: number;
      height: number;
      tag: string;
    }[];
  };
}

interface NewsPanelProps {
  news: NewsItem[];
}

export const NewsPanel: React.FC<NewsPanelProps> = ({ news }) => {
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const [showLeftArrow, setShowLeftArrow] = useState(true);
  const [showRightArrow, setShowRightArrow] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(news.length); // Start from middle set

  // Create a duplicated array of news for infinite scroll (5 sets for smoother transition)
  const duplicatedNews = [...news, ...news, ...news, ...news, ...news];

  const scrollToIndex = useCallback((index: number, smooth = true) => {
    if (scrollContainerRef.current) {
      const cardWidth = 316; // card width (300) + gap (16)
      const targetScroll = index * cardWidth;
      scrollContainerRef.current.scrollTo({
        left: targetScroll,
        behavior: smooth ? 'smooth' : 'auto',
      });
    }
  }, []);

  // Initialize scroll position
  useEffect(() => {
    if (scrollContainerRef.current) {
      // Start from the middle set
      scrollToIndex(currentIndex, false);
    }
  }, [news, currentIndex, scrollToIndex]);

  const handleScroll = useCallback(() => {
    if (scrollContainerRef.current && !isScrolling) {
      const container = scrollContainerRef.current;
      const cardWidth = 316;
      const currentScrollPosition = container.scrollLeft;
      const newIndex = Math.round(currentScrollPosition / cardWidth);

      // If we're near the start or end, jump to the corresponding position in the middle
      if (newIndex < news.length) {
        // Jump to the fourth set
        setCurrentIndex(newIndex + news.length * 3);
        scrollToIndex(newIndex + news.length * 3, false);
      } else if (newIndex >= news.length * 4) {
        // Jump to the second set
        setCurrentIndex(newIndex - news.length * 2);
        scrollToIndex(newIndex - news.length * 2, false);
      }
    }
  }, [isScrolling, news.length, scrollToIndex]);

  const scroll = useCallback((direction: 'left' | 'right') => {
    if (scrollContainerRef.current && !isScrolling) {
      setIsScrolling(true);
      
      // Calculate the next index
      const nextIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1;
      setCurrentIndex(nextIndex);

      // Visual feedback for click
      if (direction === 'left') {
        setShowLeftArrow(false);
        setTimeout(() => setShowLeftArrow(true), 200);
      } else {
        setShowRightArrow(false);
        setTimeout(() => setShowRightArrow(true), 200);
      }

      // Smooth scroll to the next card
      scrollToIndex(nextIndex, true);

      // Reset isScrolling after animation completes
      setTimeout(() => {
        setIsScrolling(false);
        handleScroll();
      }, 300); // Reduced from 500ms to make it feel more responsive
    }
  }, [isScrolling, handleScroll, currentIndex, scrollToIndex]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        scroll('left');
      } else if (e.key === 'ArrowRight') {
        scroll('right');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scroll]);

  // Watch for scroll end with debounce
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    let scrollTimeout: NodeJS.Timeout;
    const handleScrollEnd = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        handleScroll();
      }, 100); // Reduced from 150ms for better responsiveness
    };

    container.addEventListener('scroll', handleScrollEnd, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScrollEnd);
      clearTimeout(scrollTimeout);
    };
  }, [handleScroll]);

  useEffect(() => {
    scrollToIndex(currentIndex);
  }, [currentIndex, scrollToIndex]);

  return (
    <Card className="p-4 relative bg-[#1a1f2c] border-gray-800 group">
      {/* Left Arrow Button */}
      <div className={`absolute left-0 top-0 bottom-0 w-20 flex items-center justify-center 
        bg-gradient-to-r from-[#1a1f2c] via-[#1a1f2c]/90 to-transparent z-10
        transition-opacity duration-300 ${showLeftArrow ? 'opacity-100' : 'opacity-0'}`}>
        <Button
          variant="ghost"
          size="lg"
          className="h-32 w-16 rounded-l-lg bg-gray-800/80 hover:bg-gray-700/90 
            text-gray-200 hover:text-white transition-all duration-200
            shadow-lg shadow-black/20 hover:shadow-xl
            border-r border-gray-700/50"
          onClick={() => scroll('left')}
          aria-label="Scroll left"
        >
          <div className="flex flex-col items-center gap-1">
            <ChevronLeft className="h-6 w-6" />
          </div>
        </Button>
      </div>

      {/* News Container */}
      <div 
        ref={scrollContainerRef}
        className="flex overflow-x-hidden gap-4 px-8 scroll-smooth"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {duplicatedNews.map((item, index) => (
          <Card
            key={`${item.uuid}-${index}`}
            className="group/card flex-shrink-0 w-[300px] p-4 cursor-pointer bg-gray-900/50 border-gray-800 
              hover:bg-gray-800/50 hover:scale-[1.02] transition-all duration-200
              focus-within:ring-2 focus-within:ring-blue-500/50"
            style={{ scrollSnapAlign: 'start' }}
            onClick={() => window.open(item.link, '_blank')}
            role="article"
            tabIndex={0}
            onKeyPress={(e) => e.key === 'Enter' && window.open(item.link, '_blank')}
          >
            {item.thumbnail && (
              <div className="relative h-[160px] mb-3 overflow-hidden rounded-md">
                <img
                  src={item.thumbnail.resolutions[0].url}
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform duration-300
                    group-hover/card:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent 
                  opacity-0 group-hover/card:opacity-100 transition-opacity duration-200" />
              </div>
            )}
            <h3 className="font-semibold mb-2 line-clamp-2 text-gray-200 
              group-hover/card:text-blue-400 transition-colors duration-200">
              {item.title}
            </h3>
            <div className="flex justify-between items-center mt-2">
              <p className="text-sm text-gray-400">{item.publisher}</p>
              <p className="text-xs text-gray-500">
                {new Date(item.providerPublishTime * 1000).toLocaleDateString()}
              </p>
            </div>
          </Card>
        ))}
      </div>

      {/* Right Arrow Button */}
      <div className={`absolute right-0 top-0 bottom-0 w-20 flex items-center justify-center 
        bg-gradient-to-l from-[#1a1f2c] via-[#1a1f2c]/90 to-transparent z-10
        transition-opacity duration-300 ${showRightArrow ? 'opacity-100' : 'opacity-0'}`}>
        <Button
          variant="ghost"
          size="lg"
          className="h-32 w-16 rounded-r-lg bg-gray-800/80 hover:bg-gray-700/90 
            text-gray-200 hover:text-white transition-all duration-200
            shadow-lg shadow-black/20 hover:shadow-xl
            border-l border-gray-700/50"
          onClick={() => scroll('right')}
          aria-label="Scroll right"
        >
          <div className="flex flex-col items-center gap-1">
            <ChevronRight className="h-6 w-6" />
          </div>
        </Button>
      </div>
    </Card>
  );
}; 