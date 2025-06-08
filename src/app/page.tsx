"use client";

import React, {
    useEffect,
    useRef,
    useState,
    useCallback,
    forwardRef,
    useImperativeHandle,
    useMemo,
    type ReactNode,
    type MouseEvent as ReactMouseEvent,
    type SVGProps,
} from 'react';
import {
    motion,
    AnimatePresence,
    useScroll,
    useMotionValueEvent,
    type Transition,
    type VariantLabels,
    type Target,
    type AnimationControls,
    type TargetAndTransition,
    type Variants,
} from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { Mic, Camera, Search, Brain, Lightbulb, Zap, Check, X, FacebookIcon, InstagramIcon, YoutubeIcon, LinkedinIcon } from 'lucide-react';
import BrainerDataFlow from '@/components/BrainerDataFlow';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { TestimonialCard } from '@/components/ui/testimonial-card';
import { PinContainer } from '@/components/ui/pin-container';
import { ButtonCta } from '@/components/ui/button-cta';
import { Button } from '@/components/ui/button';

// Custom CSS for animated glow border
const glowBorderStyles = `
  @keyframes spin-slow {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  @keyframes reverse-spin {
    from { transform: rotate(360deg); }
    to { transform: rotate(0deg); }
  }
  
  .animate-spin-slow {
    animation: spin-slow 25s linear infinite;
  }
  
  .animate-reverse-spin {
    animation: reverse-spin 20s linear infinite;
  }
`;

function cn(...classes: (string | undefined | null | boolean)[]): string {
  return classes.filter(Boolean).join(" ");
}

interface RotatingTextRef {
  next: () => void;
  previous: () => void;
  jumpTo: (index: number) => void;
  reset: () => void;
}

interface RotatingTextProps
  extends Omit<
    React.ComponentPropsWithoutRef<typeof motion.span>,
    "children" | "transition" | "initial" | "animate" | "exit"
  > {
  texts: string[];
  transition?: Transition;
  initial?: boolean | Target | VariantLabels;
  animate?: boolean | VariantLabels | AnimationControls | TargetAndTransition;
  exit?: Target | VariantLabels;
  animatePresenceMode?: "sync" | "wait";
  animatePresenceInitial?: boolean;
  rotationInterval?: number;
  staggerDuration?: number;
  staggerFrom?: "first" | "last" | "center" | "random" | number;
  loop?: boolean;
  auto?: boolean;
  splitBy?: "characters" | "words" | "lines" | string;
  onNext?: (index: number) => void;
  mainClassName?: string;
  splitLevelClassName?: string;
  elementLevelClassName?: string;
}

const RotatingText = forwardRef<RotatingTextRef, RotatingTextProps>(
  (
    {
      texts,
      transition = { type: "spring", damping: 25, stiffness: 300 },
      initial = { y: "100%", opacity: 0 },
      animate = { y: 0, opacity: 1 },
      exit = { y: "-120%", opacity: 0 },
      animatePresenceMode = "wait",
      animatePresenceInitial = false,
      rotationInterval = 2200,
      staggerDuration = 0.01,
      staggerFrom = "last",
      loop = true,
      auto = true,
      splitBy = "characters",
      onNext,
      mainClassName,
      splitLevelClassName,
      elementLevelClassName,
      ...rest
    },
    ref
  ) => {
    const [currentTextIndex, setCurrentTextIndex] = useState<number>(0);

    const splitIntoCharacters = (text: string): string[] => {
      if (typeof Intl !== "undefined" && Intl.Segmenter) {
        try {
           const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
           return Array.from(segmenter.segment(text), (segment) => segment.segment);
        } catch (error) {
           console.error("Intl.Segmenter failed, falling back to simple split:", error);
           return text.split('');
        }
      }
      return text.split('');
    };

    const elements = useMemo(() => {
        const currentText: string = texts[currentTextIndex] ?? '';
        if (splitBy === "characters") {
            const words = currentText.split(/(\s+)/);
            let charCount = 0;
            return words.filter(part => part.length > 0).map((part) => {
                const isSpace = /^\s+$/.test(part);
                const chars = isSpace ? [part] : splitIntoCharacters(part);
                const startIndex = charCount;
                charCount += chars.length;
                return { characters: chars, isSpace: isSpace, startIndex: startIndex };
            });
        }
        if (splitBy === "words") {
            return currentText.split(/(\s+)/).filter(word => word.length > 0).map((word, i) => ({
                characters: [word], isSpace: /^\s+$/.test(word), startIndex: i
            }));
        }
        if (splitBy === "lines") {
            return currentText.split('\n').map((line, i) => ({
                characters: [line], isSpace: false, startIndex: i
            }));
        }
        return currentText.split(splitBy).map((part, i) => ({
            characters: [part], isSpace: false, startIndex: i
        }));
    }, [texts, currentTextIndex, splitBy]);

    const totalElements = useMemo(() => elements.reduce((sum, el) => sum + el.characters.length, 0), [elements]);

    const getStaggerDelay = useCallback(
      (index: number, total: number): number => {
        if (total <= 1 || !staggerDuration) return 0;
        const stagger = staggerDuration;
        switch (staggerFrom) {
          case "first": return index * stagger;
          case "last": return (total - 1 - index) * stagger;
          case "center":
            const center = (total - 1) / 2;
            return Math.abs(center - index) * stagger;
          case "random": return Math.random() * (total - 1) * stagger;
          default:
            if (typeof staggerFrom === 'number') {
              const fromIndex = Math.max(0, Math.min(staggerFrom, total - 1));
              return Math.abs(fromIndex - index) * stagger;
            }
            return index * stagger;
        }
      },
      [staggerFrom, staggerDuration]
    );

    const handleIndexChange = useCallback(
      (newIndex: number) => {
        setCurrentTextIndex(newIndex);
        onNext?.(newIndex);
      },
      [onNext]
    );

    const next = useCallback(() => {
      const nextIndex = currentTextIndex === texts.length - 1 ? (loop ? 0 : currentTextIndex) : currentTextIndex + 1;
      if (nextIndex !== currentTextIndex) handleIndexChange(nextIndex);
    }, [currentTextIndex, texts.length, loop, handleIndexChange]);

    const previous = useCallback(() => {
      const prevIndex = currentTextIndex === 0 ? (loop ? texts.length - 1 : currentTextIndex) : currentTextIndex - 1;
      if (prevIndex !== currentTextIndex) handleIndexChange(prevIndex);
    }, [currentTextIndex, texts.length, loop, handleIndexChange]);

    const jumpTo = useCallback(
      (index: number) => {
        const validIndex = Math.max(0, Math.min(index, texts.length - 1));
        if (validIndex !== currentTextIndex) handleIndexChange(validIndex);
      },
      [texts.length, currentTextIndex, handleIndexChange]
    );

     const reset = useCallback(() => {
        if (currentTextIndex !== 0) handleIndexChange(0);
     }, [currentTextIndex, handleIndexChange]);

    useImperativeHandle(ref, () => ({ next, previous, jumpTo, reset }), [next, previous, jumpTo, reset]);

    useEffect(() => {
      if (!auto || texts.length <= 1) return;
      const intervalId = setInterval(next, rotationInterval);
      return () => clearInterval(intervalId);
    }, [next, rotationInterval, auto, texts.length]);

    return (
      <motion.span
        className={cn("inline-flex flex-wrap whitespace-pre-wrap relative align-bottom pb-[10px]", mainClassName)}
        {...rest}
        layout
      >
        <span className="sr-only">{texts[currentTextIndex]}</span>
        <AnimatePresence mode={animatePresenceMode} initial={animatePresenceInitial}>
          <motion.div
            key={currentTextIndex}
            className={cn(
               "inline-flex flex-wrap relative",
               splitBy === "lines" ? "flex-col items-start w-full" : "flex-row items-baseline"
            )}
            layout
            aria-hidden="true"
            initial="initial"
            animate="animate"
            exit="exit"
          >
             {elements.map((elementObj, elementIndex) => (
                <span
                    key={elementIndex}
                    className={cn("inline-flex", splitBy === 'lines' ? 'w-full' : '', splitLevelClassName)}
                    style={{ whiteSpace: 'pre' }}
                >
                    {elementObj.characters.map((char, charIndex) => {
                        const globalIndex = elementObj.startIndex + charIndex;
  return (
                            <motion.span
                                key={`${char}-${charIndex}`}
                                initial={initial}
                                animate={animate}
                                exit={exit}
                                transition={{
                                    ...transition,
                                    delay: getStaggerDelay(globalIndex, totalElements),
                                }}
                                className={cn("inline-block leading-none tracking-tight", elementLevelClassName)}
                            >
                                {char === ' ' ? '\u00A0' : char}
                            </motion.span>
                        );
                     })}
                </span>
             ))}
          </motion.div>
        </AnimatePresence>
      </motion.span>
    );
  }
);
RotatingText.displayName = "RotatingText";

interface FeatureCardProps {
    children: ReactNode
    className?: string
}

const FeatureCard = ({ children, className }: FeatureCardProps) => (
    <Card className={cn('group relative bg-gray-900/50 border-gray-700/50 shadow-xl', className)}>
        <CardDecorator />
        {children}
    </Card>
)

const CardDecorator = () => (
    <>
        <span className="absolute -left-px -top-px block size-2 border-l-2 border-t-2 border-indigo-500"></span>
        <span className="absolute -right-px -top-px block size-2 border-r-2 border-t-2 border-indigo-500"></span>
        <span className="absolute -bottom-px -left-px block size-2 border-b-2 border-l-2 border-indigo-500"></span>
        <span className="absolute -bottom-px -right-px block size-2 border-b-2 border-r-2 border-indigo-500"></span>
    </>
)

interface CardHeadingProps {
    icon: React.ComponentType<{ className?: string }>
    title: string
    description: string
}

const CardHeading = ({ icon: Icon, title, description }: CardHeadingProps) => (
    <div className="p-6">
        <span className="text-gray-400 flex items-center gap-2">
            <Icon className="size-4" />
            {title}
        </span>
        <p className="mt-8 text-2xl font-semibold text-white">{description}</p>
    </div>
)

interface ConnectionNodeProps {
    label: string
    type: 'primary' | 'secondary' | 'accent'
}

const ConnectionNode = ({ label, type }: ConnectionNodeProps) => (
    <div className="text-center">
        <div className="bg-gradient-to-b from-gray-700 to-gray-800 size-fit rounded-2xl p-px">
            <div className="bg-gradient-to-b from-gray-800 to-gray-900 relative flex aspect-square w-fit items-center justify-center rounded-[15px] p-4">
                <div className={cn('size-8 rounded-full border-2 flex items-center justify-center',
                    type === 'primary' && 'border-indigo-500 bg-indigo-500/20',
                    type === 'secondary' && 'border-purple-500 bg-purple-500/20',
                    type === 'accent' && 'border-emerald-500 bg-emerald-500/20'
                )}>
                    {type === 'primary' && <Brain className="w-4 h-4 text-indigo-400" />}
                    {type === 'secondary' && <Zap className="w-4 h-4 text-purple-400" />}
                    {type === 'accent' && <Lightbulb className="w-4 h-4 text-emerald-400" />}
                </div>
            </div>
        </div>
        <span className="text-gray-400 mt-2 block text-center text-sm">{label}</span>
    </div>
)

const ShinyText: React.FC<{ text: string; className?: string }> = ({ text, className = "" }) => (
    <span className={cn("relative overflow-hidden inline-block", className)}>
        {text}
        <span style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
            animation: 'shine 2s infinite linear',
            opacity: 0.5,
            pointerEvents: 'none'
        }}></span>
        <style>{`
            @keyframes shine {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(100%); }
            }
        `}</style>
    </span>
);

const ChevronDownIcon: React.FC<SVGProps<SVGSVGElement>> = (props) => (
   <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3 ml-1 inline-block transition-transform duration-200 group-hover:rotate-180" {...props}>
     <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
   </svg>
);

const MenuIcon: React.FC<SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
);

const CloseIcon: React.FC<SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
);

interface NavLinkProps {
    href?: string;
    children: ReactNode;
    hasDropdown?: boolean;
    className?: string;
    onClick?: (event: ReactMouseEvent<HTMLElement>) => void;
    asChild?: boolean;
}

const NavLink: React.FC<NavLinkProps> = ({ href = "#", children, hasDropdown = false, className = "", onClick, asChild = false }) => {
    const Component = asChild ? motion.span : motion.a;
    const props = asChild ? {} : { href };
    
    return (
        <Component
            {...props}
            onClick={onClick}
            className={cn("relative group text-sm font-medium text-gray-300 hover:text-white transition-colors duration-200 flex items-center py-1 cursor-pointer", className)}
            whileHover="hover"
        >
            {children}
            {hasDropdown && <ChevronDownIcon />}
            {!hasDropdown && (
                <motion.div
                    className="absolute bottom-[-2px] left-0 right-0 h-[1px] bg-indigo-500"
                    variants={{ initial: { scaleX: 0, originX: 0.5 }, hover: { scaleX: 1, originX: 0.5 } }}
                    initial="initial"
                    transition={{ duration: 0.3, ease: "easeOut" }}
                />
            )}
        </Component>
    );
};

interface Dot {
    x: number;
    y: number;
    baseColor: string;
    targetOpacity: number;
    currentOpacity: number;
    opacitySpeed: number;
    baseRadius: number;
    currentRadius: number;
}

const brainerTestimonials = [
    {
        author: {
            name: "Sarah Chen",
            handle: "@sarahdesigns",
            avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=150&h=150&fit=crop&crop=face"
        },
        text: "Brainer has completely transformed how I capture and organize my design ideas. The voice notes feature is a game-changer for when inspiration strikes!"
    },
    {
        author: {
            name: "Marcus Rodriguez",
            handle: "@marcusbuilds",
            avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face"
        },
        text: "As a developer, I love how Brainer connects my scattered thoughts into actionable insights. The AI-powered search finds exactly what I need, when I need it."
    },
    {
        author: {
            name: "Emily Watson",
            handle: "@emilywriter",
            avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face"
        },
        text: "Finally, a tool that keeps up with my creative process! The screenshot OCR feature saves me hours of manual note-taking from research materials."
    },
    {
        author: {
            name: "David Park",
            handle: "@davidstartup",
            avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face"
        },
        text: "Brainer is like having a second brain for my startup. It remembers everything so I can focus on building. The idea connections feature is pure magic!"
    },
    {
        author: {
            name: "Lisa Thompson",
            handle: "@lisateaches",
            avatar: "https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=150&h=150&fit=crop&crop=face"
        },
        text: "Perfect for educators like me! I can quickly capture lecture ideas, student feedback, and research notes. The smart search brings everything together seamlessly."
    },
    {
        author: {
            name: "Alex Kumar",
            handle: "@alexcreates",
            avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face"
        },
        text: "Brainer understands how creative minds work. It&apos;s not just storage - it&apos;s an intelligent companion that helps me discover patterns in my own thinking."
    }
];

const InteractiveHero: React.FC = () => {
   const canvasRef = useRef<HTMLCanvasElement>(null);
   const animationFrameId = useRef<number | null>(null);
   const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
   const [isScrolled, setIsScrolled] = useState<boolean>(false);

   const { scrollY } = useScroll();
   useMotionValueEvent(scrollY, "change", (latest) => {
       setIsScrolled(latest > 10);
   });

   const dotsRef = useRef<Dot[]>([]);
   const gridRef = useRef<Record<string, number[]>>({});
   const canvasSizeRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 });
   const mousePositionRef = useRef<{ x: number | null; y: number | null }>({ x: null, y: null });

   const DOT_SPACING = 25;
   const BASE_OPACITY_MIN = 0.40;
   const BASE_OPACITY_MAX = 0.50;
   const INTERACTION_RADIUS = 150;
   const INTERACTION_RADIUS_SQ = INTERACTION_RADIUS * INTERACTION_RADIUS;
   const OPACITY_BOOST = 0.6;
   const RADIUS_BOOST = 2.5;
   const GRID_CELL_SIZE = Math.max(50, Math.floor(INTERACTION_RADIUS / 1.5));

   const handleMouseMove = useCallback((event: globalThis.MouseEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) {
            mousePositionRef.current = { x: null, y: null };
            return;
        }
        const rect = canvas.getBoundingClientRect();
        const canvasX = event.clientX - rect.left;
        const canvasY = event.clientY - rect.top;
        mousePositionRef.current = { x: canvasX, y: canvasY };
   }, []);

   const createDots = useCallback(() => {
       const { width, height } = canvasSizeRef.current;
       if (width === 0 || height === 0) return;

       const newDots: Dot[] = [];
       const newGrid: Record<string, number[]> = {};
       const cols = Math.ceil(width / DOT_SPACING);
       const rows = Math.ceil(height / DOT_SPACING);

       for (let i = 0; i < cols; i++) {
           for (let j = 0; j < rows; j++) {
               const x = i * DOT_SPACING + DOT_SPACING / 2;
               const y = j * DOT_SPACING + DOT_SPACING / 2;
               const cellX = Math.floor(x / GRID_CELL_SIZE);
               const cellY = Math.floor(y / GRID_CELL_SIZE);
               const cellKey = `${cellX}_${cellY}`;

               if (!newGrid[cellKey]) {
                   newGrid[cellKey] = [];
               }

               const dotIndex = newDots.length;
               newGrid[cellKey].push(dotIndex);

               const baseOpacity = Math.random() * (BASE_OPACITY_MAX - BASE_OPACITY_MIN) + BASE_OPACITY_MIN;
               newDots.push({
                   x,
                   y,
                   baseColor: `rgba(99, 102, 241, ${BASE_OPACITY_MAX})`,
                   targetOpacity: baseOpacity,
                   currentOpacity: baseOpacity,
                   opacitySpeed: (Math.random() * 0.005) + 0.002,
                   baseRadius: 1,
                   currentRadius: 1,
               });
           }
       }
       dotsRef.current = newDots;
       gridRef.current = newGrid;
   }, [DOT_SPACING, GRID_CELL_SIZE, BASE_OPACITY_MIN, BASE_OPACITY_MAX]);

   const handleResize = useCallback(() => {
       const canvas = canvasRef.current;
       if (!canvas) return;
       const container = canvas.parentElement;
       const width = container ? container.clientWidth : window.innerWidth;
       const height = container ? container.clientHeight : window.innerHeight;

       if (canvas.width !== width || canvas.height !== height ||
           canvasSizeRef.current.width !== width || canvasSizeRef.current.height !== height)
       {
           canvas.width = width;
           canvas.height = height;
           canvasSizeRef.current = { width, height };
           createDots();
       }
   }, [createDots]);

   const animateDots = useCallback(() => {
       const canvas = canvasRef.current;
       const ctx = canvas?.getContext('2d');
       const dots = dotsRef.current;
       const grid = gridRef.current;
       const { width, height } = canvasSizeRef.current;
       const { x: mouseX, y: mouseY } = mousePositionRef.current;

       if (!ctx || !dots || !grid || width === 0 || height === 0) {
           animationFrameId.current = requestAnimationFrame(animateDots);
           return;
       }

       ctx.clearRect(0, 0, width, height);

       const activeDotIndices = new Set<number>();
       if (mouseX !== null && mouseY !== null) {
           const mouseCellX = Math.floor(mouseX / GRID_CELL_SIZE);
           const mouseCellY = Math.floor(mouseY / GRID_CELL_SIZE);
           const searchRadius = Math.ceil(INTERACTION_RADIUS / GRID_CELL_SIZE);
           for (let i = -searchRadius; i <= searchRadius; i++) {
               for (let j = -searchRadius; j <= searchRadius; j++) {
                   const checkCellX = mouseCellX + i;
                   const checkCellY = mouseCellY + j;
                   const cellKey = `${checkCellX}_${checkCellY}`;
                   if (grid[cellKey]) {
                       grid[cellKey].forEach(dotIndex => activeDotIndices.add(dotIndex));
                   }
               }
           }
       }

       dots.forEach((dot, index) => {
           dot.currentOpacity += dot.opacitySpeed;
           if (dot.currentOpacity >= dot.targetOpacity || dot.currentOpacity <= BASE_OPACITY_MIN) {
               dot.opacitySpeed = -dot.opacitySpeed;
               dot.currentOpacity = Math.max(BASE_OPACITY_MIN, Math.min(dot.currentOpacity, BASE_OPACITY_MAX));
               dot.targetOpacity = Math.random() * (BASE_OPACITY_MAX - BASE_OPACITY_MIN) + BASE_OPACITY_MIN;
           }

           let interactionFactor = 0;
           dot.currentRadius = dot.baseRadius;

           if (mouseX !== null && mouseY !== null && activeDotIndices.has(index)) {
               const dx = dot.x - mouseX;
               const dy = dot.y - mouseY;
               const distSq = dx * dx + dy * dy;

               if (distSq < INTERACTION_RADIUS_SQ) {
                   const distance = Math.sqrt(distSq);
                   interactionFactor = Math.max(0, 1 - distance / INTERACTION_RADIUS);
                   interactionFactor = interactionFactor * interactionFactor;
               }
           }

           const finalOpacity = Math.min(1, dot.currentOpacity + interactionFactor * OPACITY_BOOST);
           dot.currentRadius = dot.baseRadius + interactionFactor * RADIUS_BOOST;

           const colorMatch = dot.baseColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
           const r = colorMatch ? colorMatch[1] : '99';
           const g = colorMatch ? colorMatch[2] : '102';
           const b = colorMatch ? colorMatch[3] : '241';

           ctx.beginPath();
           ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${finalOpacity.toFixed(3)})`;
           ctx.arc(dot.x, dot.y, dot.currentRadius, 0, Math.PI * 2);
           ctx.fill();
       });

       animationFrameId.current = requestAnimationFrame(animateDots);
   }, [GRID_CELL_SIZE, INTERACTION_RADIUS, INTERACTION_RADIUS_SQ, OPACITY_BOOST, RADIUS_BOOST, BASE_OPACITY_MIN, BASE_OPACITY_MAX]);

   useEffect(() => {
       handleResize();
        const handleMouseLeave = () => {
            mousePositionRef.current = { x: null, y: null };
        };

       window.addEventListener('mousemove', handleMouseMove, { passive: true });
       window.addEventListener('resize', handleResize);
       document.documentElement.addEventListener('mouseleave', handleMouseLeave);

       animationFrameId.current = requestAnimationFrame(animateDots);

       return () => {
           window.removeEventListener('resize', handleResize);
           window.removeEventListener('mousemove', handleMouseMove);
           document.documentElement.removeEventListener('mouseleave', handleMouseLeave);
           if (animationFrameId.current) {
               cancelAnimationFrame(animationFrameId.current);
           }
       };
   }, [handleResize, handleMouseMove, animateDots]);

   useEffect(() => {
       if (isMobileMenuOpen) {
           document.body.style.overflow = 'hidden';
       } else {
           document.body.style.overflow = 'unset';
       }
       return () => { document.body.style.overflow = 'unset'; };
   }, [isMobileMenuOpen]);

   const headerVariants: Variants = {
       top: {
           backgroundColor: "rgba(17, 17, 17, 0.8)",
           borderBottomColor: "rgba(55, 65, 81, 0.5)",
           position: 'fixed',
           boxShadow: 'none',
       },
       scrolled: {
           backgroundColor: "rgba(17, 17, 17, 0.95)",
           borderBottomColor: "rgba(75, 85, 99, 0.7)",
           boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
           position: 'fixed'
       }
   };

   const mobileMenuVariants: Variants = {
       hidden: { opacity: 0, y: -20 },
       visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" } },
       exit: { opacity: 0, y: -20, transition: { duration: 0.15, ease: "easeIn" } }
   };

    const contentDelay = 0.3;
    const itemDelayIncrement = 0.1;

    const bannerVariants: Variants = {
        hidden: { opacity: 0, y: -10 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.4, delay: contentDelay } }
    };
   const headlineVariants: Variants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.5, delay: contentDelay + itemDelayIncrement } }
    };
    const subHeadlineVariants: Variants = {
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5, delay: contentDelay + itemDelayIncrement * 2 } }
    };
    const formVariants: Variants = {
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5, delay: contentDelay + itemDelayIncrement * 3 } }
    };
    const worksWithVariants: Variants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.5, delay: contentDelay + itemDelayIncrement * 4 } }
    };
    const imageVariants: Variants = {
        hidden: { opacity: 0, scale: 0.95, y: 20 },
        visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.6, delay: contentDelay + itemDelayIncrement * 5, ease: [0.16, 1, 0.3, 1] } }
    };

  return (
    <div className="pt-[100px] relative bg-[#111111] text-gray-300 min-h-screen flex flex-col overflow-x-hidden">
        {/* Custom styles for animated glow border */}
        <style jsx>{glowBorderStyles}</style>
        
        <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none opacity-80" />
        <div className="absolute inset-0 z-1 pointer-events-none" style={{
            background: 'linear-gradient(to bottom, transparent 0%, #111111 90%), radial-gradient(ellipse at center, transparent 40%, #111111 95%)'
        }}></div>

        <motion.header
            variants={headerVariants}
            initial="top"
            animate={isScrolled ? "scrolled" : "top"}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="px-6 w-full md:px-10 lg:px-16 sticky top-0 z-30 backdrop-blur-md border-b"
        >
            <nav className="flex justify-between items-center max-w-screen-xl mx-auto h-[70px]">
                <div className="flex items-center flex-shrink-0">
                    <span className="text-4xl mr-2">🧠</span>
                    <span className="text-xl font-bold text-white ml-2">Brainer</span>
                </div>

                <div className="hidden md:flex items-center justify-center flex-grow space-x-6 lg:space-x-8 px-4">
                    <NavLink href="/features">Features</NavLink>
                    <NavLink href="/pricing">Pricing</NavLink>
                    <NavLink href="/about">About</NavLink>
                    <NavLink href="/help">Help</NavLink>
                </div>

                <div className="flex items-center flex-shrink-0 space-x-4 lg:space-x-6">
                    <Link href="/auth/signin">
                        <NavLink className="hidden md:inline-block" asChild>Sign in</NavLink>
                    </Link>

                    <Link href="/auth/signup">
                        <ButtonCta 
                            label="Get Started Free"
                            className="hidden md:inline-block w-auto h-10 text-sm"
                        />
          </Link>

                    <motion.button
                        className="md:hidden text-gray-300 hover:text-white z-50"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        aria-label="Toggle menu"
                        whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                    >
                        {isMobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
                    </motion.button>
                </div>
            </nav>

            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        key="mobile-menu"
                        variants={mobileMenuVariants} initial="hidden" animate="visible" exit="exit"
                        className="md:hidden absolute top-full left-0 right-0 bg-[#111111]/95 backdrop-blur-sm shadow-lg py-4 border-t border-gray-800/50"
                    >
                        <div className="flex flex-col items-center space-y-4 px-6">
                            <NavLink href="/features" onClick={() => setIsMobileMenuOpen(false)}>Features</NavLink>
                            <NavLink href="/pricing" onClick={() => setIsMobileMenuOpen(false)}>Pricing</NavLink>
                            <NavLink href="/about" onClick={() => setIsMobileMenuOpen(false)}>About</NavLink>
                            <NavLink href="/help" onClick={() => setIsMobileMenuOpen(false)}>Help</NavLink>
                            <hr className="w-full border-t border-gray-700/50 my-2"/>
                            <Link href="/auth/signin" onClick={() => setIsMobileMenuOpen(false)}>
                                <NavLink asChild>Sign in</NavLink>
          </Link>
        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.header>

        <main className="flex-grow flex flex-col items-center justify-center text-center px-4 pt-8 pb-16 relative z-10">

            <motion.div
                variants={bannerVariants}
                initial="hidden"
                animate="visible"
                className="mb-6"
            >
                <ShinyText text="✨ Never lose a brilliant idea again" className="bg-[#1a1a1a] border border-gray-700 text-indigo-400 px-4 py-1 rounded-full text-xs sm:text-sm font-medium cursor-pointer hover:border-indigo-500/50 transition-colors" />
            </motion.div>

            <motion.h1
                variants={headlineVariants}
                initial="hidden"
                animate="visible"
                className="text-4xl sm:text-5xl lg:text-[64px] font-semibold text-white leading-tight max-w-4xl mb-4"
            >
                Your Memory-Preserving<br />{' '}
                <span className="inline-block h-[1.2em] sm:h-[1.2em] lg:h-[1.2em] overflow-hidden align-bottom">
                    <RotatingText
                        texts={['Workspace', 'Brain', 'Assistant', 'Companion', 'Memory']}
                        mainClassName="text-indigo-500 mx-1"
                        staggerFrom={"last"}
                        initial={{ y: "-100%", opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: "110%", opacity: 0 }}
                        staggerDuration={0.01}
                        transition={{ type: "spring", damping: 18, stiffness: 250 }}
                        rotationInterval={2200}
                        splitBy="characters"
                        auto={true}
                        loop={true}
                    />
                </span>
            </motion.h1>

            <motion.p
                variants={subHeadlineVariants}
                initial="hidden"
                animate="visible"
                className="text-base sm:text-lg lg:text-xl text-gray-400 max-w-2xl mx-auto mb-8"
            >
                Capture notes, voice memos, and screenshots. Let AI organize, summarize, and surface your ideas exactly when you need them. Like Notion + Roam + AI for creators.
            </motion.p>

            <motion.div
                variants={formVariants}
                initial="hidden"
                animate="visible"
                className="flex flex-col sm:flex-row items-center justify-center gap-2 w-full max-w-md mx-auto mb-3"
            >
                <Link href="/auth/signup" className="w-full sm:w-auto">
                    <ButtonCta 
                        label="Start Building Your Brain 🧠"
                        className="w-full sm:w-auto h-12 text-lg"
                    />
                </Link>
            </motion.div>

            <motion.div
                variants={worksWithVariants}
                initial="hidden"
                animate="visible"
                className="flex flex-col items-center justify-center space-y-2 mb-10"
            >
                <span className="text-xs uppercase text-gray-500 tracking-wider font-medium">Perfect for</span>
                <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-gray-400">
                    <span className="flex items-center whitespace-nowrap">📝 Notes</span>
                    <span className="flex items-center whitespace-nowrap">🎙️ Voice Memos</span>
                    <span className="flex items-center whitespace-nowrap">📸 Screenshots</span>
                    <span className="flex items-center whitespace-nowrap">🔗 Links</span>
                    <span className="flex items-center whitespace-nowrap">🧠 AI Insights</span>
                </div>
            </motion.div>

            <motion.div
                variants={imageVariants}
                initial="hidden"
                animate="visible"
                className="w-full max-w-7xl mx-auto px-4 sm:px-0"
            >
                {/* Laptop Mockup Frame with Animated Glow Border */}
                <div className="relative overflow-hidden rounded-[45px] p-3">
                    {/* Animated Glow Border Container */}
                    <div className="relative group">
                        {/* Outer Glow Effects */}
                        <div className="absolute inset-0 rounded-[45px] bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 blur-lg animate-pulse opacity-60"></div>
                        <div className="absolute inset-[2px] rounded-[43px] bg-gradient-to-r from-pink-400 via-indigo-400 to-purple-400 blur-md animate-pulse opacity-40"></div>
                        
                        {/* Rotating Gradient Border Background */}
                        <div className="absolute inset-[4px] rounded-[41px] bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 animate-spin-slow opacity-90 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <div className="absolute inset-[5px] rounded-[40px] bg-gradient-to-r from-pink-500 via-indigo-500 to-purple-500 animate-reverse-spin opacity-70"></div>
                        
                        {/* Strong Inner Glow */}
                        <div className="absolute inset-[4px] rounded-[41px] shadow-[inset_0_0_20px_rgba(139,69,255,0.3),0_0_30px_rgba(139,69,255,0.2)] animate-pulse"></div>
                        
                        {/* Inner container with background to create border effect */}
                        <div className="relative bg-[#111111] rounded-[36px] p-2">
                            {/* Laptop Base */}
                            <div className="relative bg-gradient-to-br from-gray-800 via-gray-700 to-gray-900 rounded-3xl p-4 shadow-2xl">
                                {/* Enhanced inner glow */}
                                <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-indigo-500/10 via-purple-500/20 to-pink-500/10 animate-pulse"></div>
                                
                                {/* Screen Bezel */}
                                <div className="bg-black rounded-2xl p-3 shadow-inner relative z-10">
                                    {/* Screen Content */}
                                    <div className="relative bg-gray-900 rounded-xl overflow-hidden aspect-[16/10] shadow-lg">
                                        {/* macOS Window Bar */}
                                        <div className="absolute top-0 left-0 right-0 h-8 bg-gray-800 flex items-center px-4 z-10">
                                            <div className="flex space-x-2">
                                                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                            </div>
                                            <div className="flex-1 flex justify-center">
                                                <div className="bg-gray-700 rounded-md px-3 py-1 text-xs text-gray-300 font-medium">
                                                    🧠 Brainer - Your Memory Workspace
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* Hero Image Content */}
                                        <div className="absolute inset-0 pt-8">
                                            <Image 
                                                src="/image 2.png" 
                                                alt="Brainer Application Dashboard" 
                                                fill
                                                className="object-cover"
                                                priority
                                            />
                                            
                                            {/* Subtle overlay to enhance the frame effect */}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none"></div>
                                        </div>
                                        
                                        {/* Screen reflection effect */}
                                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none"></div>
                                    </div>
                                </div>
                                
                                {/* Laptop keyboard area */}
                                <div className="mt-2 h-8 bg-gradient-to-b from-gray-700 to-gray-800 rounded-b-2xl shadow-inner relative z-10">
                                    <div className="flex justify-center pt-2">
                                        <div className="w-16 h-1 bg-gray-600 rounded-full"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Enhanced Shadow and reflection */}
                    <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 w-4/5 h-6 bg-purple-500/10 blur-2xl rounded-full z-0"></div>
                </div>
            </motion.div>
        </main>

        {/* Brainer Data Flow Section */}
        <section className="relative py-20 flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-b from-[#111111] via-gray-900/50 to-[#111111]"></div>
            <div className="relative z-10 flex flex-col items-center text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    viewport={{ once: true }}
                    className="mb-8"
                >
                    <h2 className="text-3xl font-bold text-white mb-4">How Your Ideas Flow</h2>
                    <p className="text-gray-400 max-w-2xl mx-auto">
                        From capture to insight – watch how Brainer transforms your raw thoughts into organized, searchable knowledge
                    </p>
                </motion.div>
                
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    viewport={{ once: true }}
                >
                    <BrainerDataFlow />
                </motion.div>
            </div>
        </section>

        {/* Features Section */}
        <section className="relative py-20">
            <div className="absolute inset-0 bg-gradient-to-b from-[#111111] via-gray-900/30 to-[#111111]"></div>
            <div className="relative z-10 mx-auto max-w-2xl px-6 lg:max-w-6xl">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    viewport={{ once: true }}
                    className="text-center mb-16"
                >
                    <h2 className="text-3xl font-bold text-white mb-4">Powerful Features for Creative Minds</h2>
                    <p className="text-gray-400 max-w-2xl mx-auto">
                        Everything you need to capture, organize, and recall your ideas with AI-powered intelligence
                    </p>
                </motion.div>
                
                <div className="mx-auto grid gap-8 lg:grid-cols-2">
                    <FeatureCard>
                        <CardHeader className="pb-3">
                            <CardHeading
                                icon={Mic}
                                title="Voice Notes & Transcription"
                                description="Advanced voice capture system. Record ideas instantly and get AI-powered transcriptions."
                            />
                        </CardHeader>

                        <div className="relative mb-6 border-t border-gray-700/50">
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-gray-900/20 to-gray-900/40"></div>
                            <div className="aspect-[16/10] p-6 flex items-center justify-center">
                                <div className="bg-gray-800/50 rounded-lg border border-indigo-500/30 p-8 w-full max-w-md">
                                    <div className="flex items-center justify-center mb-4">
                                        <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center">
                                            <Mic className="w-8 h-8 text-white" />
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-white font-medium mb-2">Recording...</p>
                                        <div className="flex justify-center space-x-1">
                                            <div className="w-2 h-8 bg-indigo-500 rounded-full animate-pulse"></div>
                                            <div className="w-2 h-12 bg-indigo-500 rounded-full animate-pulse" style={{animationDelay: '0.1s'}}></div>
                                            <div className="w-2 h-6 bg-indigo-500 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                                            <div className="w-2 h-10 bg-indigo-500 rounded-full animate-pulse" style={{animationDelay: '0.3s'}}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </FeatureCard>

                    <FeatureCard>
                        <CardHeader className="pb-3">
                            <CardHeading
                                icon={Search}
                                title="Smart Search & Memory"
                                description="AI-powered search system. Find any idea, note, or memory instantly across all your content."
                            />
                        </CardHeader>

                        <CardContent>
                            <div className="relative mb-6">
                                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-gray-900/20"></div>
                                <div className="aspect-[16/10] border border-gray-700/50 rounded-lg bg-gray-900/30 p-4">
                                    <div className="bg-gray-800/80 rounded-lg p-4 border border-indigo-500/20">
                                        <div className="flex items-center space-x-3 mb-4">
                                            <Search className="w-5 h-5 text-indigo-400" />
                                            <span className="text-gray-300 text-sm">&ldquo;AI meeting notes&rdquo;</span>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="bg-indigo-600/20 border border-indigo-500/30 rounded p-2">
                                                <p className="text-white text-xs font-medium">Meeting with Sarah about AI features</p>
                                                <p className="text-gray-400 text-xs">Voice note • 2 days ago</p>
                                            </div>
                                            <div className="bg-gray-700/50 border border-gray-600/30 rounded p-2">
                                                <p className="text-gray-300 text-xs">AI implementation roadmap</p>
                                                <p className="text-gray-500 text-xs">Note • 1 week ago</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </FeatureCard>

                    <FeatureCard>
                        <CardHeader className="pb-3">
                            <CardHeading
                                icon={Camera}
                                title="Visual Capture & OCR"
                                description="Screenshot intelligence. Capture any screen and extract text automatically with AI."
                            />
                        </CardHeader>

                        <CardContent>
                            <div className="relative mb-6">
                                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-gray-900/20"></div>
                                <div className="aspect-[16/10] border border-gray-700/50 rounded-lg bg-gray-900/30 p-4 flex items-center justify-center">
                                    <div className="bg-gray-800/80 rounded-lg p-4 border border-indigo-500/20 w-full max-w-sm">
                                        <div className="flex items-center justify-center mb-3">
                                            <Camera className="w-8 h-8 text-indigo-400" />
                                        </div>
                                        <div className="bg-gray-700/50 rounded border border-gray-600/30 p-3 mb-3">
                                            <div className="text-xs text-gray-300 space-y-1">
                                                <div className="h-2 bg-gray-600 rounded w-full"></div>
                                                <div className="h-2 bg-gray-600 rounded w-3/4"></div>
                                                <div className="h-2 bg-gray-600 rounded w-1/2"></div>
                                            </div>
                                        </div>
                                        <p className="text-xs text-indigo-400 text-center">✨ Text extracted automatically</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </FeatureCard>

                    <FeatureCard className="p-6 lg:col-span-1">
                        <CardHeader className="pb-3">
                            <CardHeading
                                icon={Brain}
                                title="AI-Powered Insights"
                                description="Smart connections. Let AI find patterns and connections between your ideas automatically."
                            />
                        </CardHeader>

                        <CardContent>
                            <div className="flex justify-center gap-4 overflow-hidden">
                                <ConnectionNode label="Ideas" type="primary" />
                                <ConnectionNode label="Connections" type="secondary" />
                                <ConnectionNode label="Insights" type="accent" />
                            </div>
                        </CardContent>
                    </FeatureCard>
          </div>
            </div>
        </section>

        {/* Testimonials Section */}
        <section className="relative py-20">
            <div className="absolute inset-0 bg-gradient-to-b from-[#111111] via-gray-900/20 to-[#111111]"></div>
            <div className="relative z-10 mx-auto flex max-w-6xl flex-col items-center gap-4 text-center sm:gap-16">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    viewport={{ once: true }}
                    className="flex flex-col items-center gap-4 px-4 sm:gap-8"
                >
                    <h2 className="max-w-[720px] text-3xl font-semibold leading-tight text-white sm:text-5xl sm:leading-tight">
                        Loved by creators and thinkers worldwide
                    </h2>
                    <p className="text-md max-w-[600px] font-medium text-gray-400 sm:text-xl">
                        See how Brainer is transforming the way people capture, organize, and recall their ideas
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    viewport={{ once: true }}
                    className="relative flex w-full flex-col items-center justify-center overflow-hidden"
                >
                    <div className="group flex overflow-hidden p-2 [--gap:1rem] [gap:var(--gap)] flex-row [--duration:40s]">
                        <div className="flex shrink-0 justify-around [gap:var(--gap)] animate-marquee flex-row group-hover:[animation-play-state:paused]">
                            {brainerTestimonials.map((testimonial, i) => (
                                <TestimonialCard 
                                    key={i}
                                    {...testimonial}
                                />
                            ))}
                        </div>
          </div>

                    <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-1/3 bg-gradient-to-r from-[#111111] sm:block" />
                    <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/3 bg-gradient-to-l from-[#111111] sm:block" />
                </motion.div>
            </div>
        </section>

        {/* 3D Showcase Section */}
        <section className="relative py-20">
            <div className="absolute inset-0 bg-gradient-to-b from-[#111111] via-gray-900/30 to-[#111111]"></div>
            <div className="relative z-10 mx-auto max-w-6xl px-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    viewport={{ once: true }}
                    className="text-center mb-16"
                >
                    <h2 className="text-3xl font-bold text-white mb-4 sm:text-5xl">
                        Experience Brainer&apos;s Power
                    </h2>
                    <p className="text-gray-400 max-w-2xl mx-auto sm:text-xl">
                        Interactive 3D showcase of our most powerful features for creative minds
                    </p>
                </motion.div>
                
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    viewport={{ once: true }}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 place-items-center"
                >
                    <PinContainer
                        title="Smart Voice Notes"
                        href="#"
                        className="w-[300px] h-[200px] flex flex-col justify-between"
                    >
                        <div className="w-full">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center">
                                    <Mic className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-white font-semibold text-lg">Voice Intelligence</h3>
                                    <p className="text-gray-400 text-sm">AI-powered transcription</p>
                                </div>
                            </div>
                            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
                                <div className="flex items-center space-x-2 mb-2">
                                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                    <span className="text-gray-300 text-sm">Recording...</span>
                                </div>
                                <p className="text-gray-400 text-xs">
                                    &ldquo;Meeting idea: implement voice search feature for better user experience...&rdquo;
                                </p>
                            </div>
                        </div>
                    </PinContainer>

                    <PinContainer
                        title="Visual Memory"
                        href="#"
                        className="w-[300px] h-[200px] flex flex-col justify-between"
                    >
                        <div className="w-full">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center">
                                    <Camera className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-white font-semibold text-lg">Screenshot OCR</h3>
                                    <p className="text-gray-400 text-sm">Extract text instantly</p>
                                </div>
                            </div>
                            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
                                <div className="bg-gray-700/50 rounded border border-gray-600/30 p-2 mb-2">
                                    <div className="space-y-1">
                                        <div className="h-1.5 bg-gray-600 rounded w-full"></div>
                                        <div className="h-1.5 bg-gray-600 rounded w-3/4"></div>
                                        <div className="h-1.5 bg-gray-600 rounded w-1/2"></div>
                                    </div>
                                </div>
                                <p className="text-purple-400 text-xs">✨ Text extracted and searchable</p>
                            </div>
                        </div>
                    </PinContainer>

                    <PinContainer
                        title="AI Insights"
                        href="#"
                        className="w-[300px] h-[200px] flex flex-col justify-between"
                    >
                        <div className="w-full">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 bg-emerald-600 rounded-full flex items-center justify-center">
                                    <Brain className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-white font-semibold text-lg">Smart Connections</h3>
                                    <p className="text-gray-400 text-sm">AI finds patterns</p>
                                </div>
                            </div>
                            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="w-4 h-4 bg-emerald-500 rounded-full"></div>
                                    <div className="flex-1 h-px bg-gray-600 mx-2"></div>
                                    <div className="w-4 h-4 bg-indigo-500 rounded-full"></div>
                                    <div className="flex-1 h-px bg-gray-600 mx-2"></div>
                                    <div className="w-4 h-4 bg-purple-500 rounded-full"></div>
                                </div>
                                <p className="text-emerald-400 text-xs">
                                    Connected 3 related ideas about AI features
            </p>
          </div>
        </div>
                    </PinContainer>
                </motion.div>
            </div>
        </section>

        {/* Pricing Section */}
        <section className="relative py-20">
            <div className="absolute inset-0 bg-gradient-to-b from-[#111111] via-gray-900/30 to-[#111111]"></div>
            <div className="relative z-10 mx-auto max-w-6xl px-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    viewport={{ once: true }}
                    className="text-center mb-16"
                >
                    <h2 className="text-3xl font-bold text-white mb-4 sm:text-5xl">
                        Choose the Plan that&apos;s Right for You
                    </h2>
                    <p className="text-gray-400 max-w-2xl mx-auto sm:text-xl">
                        Flexible pricing options to fit your needs
                    </p>
                </motion.div>
                
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    viewport={{ once: true }}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 place-items-center"
                >
                    <PricingCard
                        tier="Free"
                        price="$0"
                        period="Forever"
                        bestFor="For individuals getting started"
                        CTA="Get Started Free"
                        benefits={[
                            { text: "500 voice notes/month", checked: true },
                            { text: "100 screenshots/month", checked: true },
                            { text: "Basic AI search", checked: true },
                            { text: "Text extraction (OCR)", checked: true },
                            { text: "Web app access", checked: true },
                            { text: "Basic link capture", checked: true },
                            { text: "Advanced AI insights", checked: false },
                            { text: "Team collaboration", checked: false },
                            { text: "Priority support", checked: false },
                        ]}
                    />

                    <PricingCard
                        tier="Pro"
                        price="$12"
                        period="/month"
                        bestFor="For power users and creators"
                        CTA="Start Pro Trial"
                        benefits={[
                            { text: "Unlimited voice notes", checked: true },
                            { text: "Unlimited screenshots", checked: true },
                            { text: "Advanced AI search", checked: true },
                            { text: "Smart text extraction", checked: true },
                            { text: "Desktop + mobile apps", checked: true },
                            { text: "Smart link previews", checked: true },
                            { text: "Advanced AI insights", checked: true },
                            { text: "Team collaboration (5 members)", checked: true },
                            { text: "Priority support", checked: true },
                        ]}
                        popular={true}
                    />

                    <PricingCard
                        tier="Team"
                        price="$39"
                        period="/month"
                        bestFor="For teams and organizations"
                        CTA="Contact Sales"
                        benefits={[
                            { text: "Everything in Pro", checked: true },
                            { text: "Unlimited team members", checked: true },
                            { text: "Advanced collaboration tools", checked: true },
                            { text: "Custom AI training", checked: true },
                            { text: "SSO & admin controls", checked: true },
                            { text: "API access", checked: true },
                            { text: "Custom integrations", checked: true },
                            { text: "Dedicated account manager", checked: true },
                            { text: "SLA guarantee", checked: true },
                        ]}
                    />
                </motion.div>
            </div>
        </section>

        {/* Footer Section */}
        <Footer />

      </div>
  );
};

interface BenefitProps {
  text: string
  checked: boolean
}

const Benefit = ({ text, checked }: BenefitProps) => {
  return (
    <div className="flex items-center gap-3">
      {checked ? (
        <span className="grid size-4 place-content-center rounded-full bg-indigo-500 text-sm text-white">
          <Check className="size-3" />
        </span>
      ) : (
        <span className="grid size-4 place-content-center rounded-full bg-gray-700 text-sm text-gray-400">
          <X className="size-3" />
        </span>
      )}
      <span className="text-sm text-gray-300">{text}</span>
    </div>
  )
} 

interface PricingCardProps {
  tier: string
  price: string
  period?: string
  bestFor: string
  CTA: string
  benefits: Array<{ text: string; checked: boolean }>
  popular?: boolean
  className?: string
}

const PricingCard = ({
  tier,
  price,
  period = "",
  bestFor,
  CTA,
  benefits,
  popular = false,
  className,
}: PricingCardProps) => {
  const [loading, setLoading] = useState(false);

  const handleStripeCheckout = async () => {
    if (tier === 'Free') {
      // Redirect to signup for free plan
      window.location.href = '/auth/signup';
      return;
    }

    setLoading(true);
    
    try {
      // Use environment variables for Stripe price IDs
      const priceId = tier === 'Pro' 
        ? process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID
        : process.env.NEXT_PUBLIC_STRIPE_TEAM_PRICE_ID;

      if (!priceId) {
        console.error('Stripe price ID not configured');
        alert('Payment configuration error. Please contact support.');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          successUrl: `${window.location.origin}/auth/success?session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${window.location.origin}/?canceled=true`,
        }),
      });

      const { url, error } = await response.json();

      if (error) {
        console.error('Stripe checkout error:', error);
        alert('Failed to create checkout session. Please try again.');
        return;
      }

      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      alert('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      viewport={{ once: true }}
      className="relative h-full"
    >
      {popular && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-20">
          <span className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-full text-sm font-medium">
            Most Popular
          </span>
        </div>
      )}
      
      <Card
        className={cn(
          "relative h-full w-full overflow-hidden border border-gray-700/50 bg-gray-900/50 backdrop-blur-sm",
          popular && "border-indigo-500/50 shadow-lg shadow-indigo-500/10",
          "p-6",
          className,
        )}
      >
        <CardDecorator />
        
        <div className="flex flex-col items-center border-b border-gray-700/50 pb-6">
          <span className="mb-6 inline-block text-white text-lg font-semibold">
            {tier}
          </span>
          <div className="flex items-baseline mb-3">
            <span className="inline-block text-4xl font-bold text-white">
              {price}
            </span>
            {period && (
              <span className="text-gray-400 ml-2">
                {period}
              </span>
            )}
          </div>
          <span className="text-center text-gray-400 text-sm">
            {bestFor}
          </span>
        </div>
        
        <div className="space-y-4 py-6">
          {benefits.map((benefit, index) => (
            <Benefit key={index} {...benefit} />
          ))}
        </div>
        
        <div className="mt-6">
          {popular ? (
            <ButtonCta
              label={loading ? 'Loading...' : CTA}
              className="w-full h-12"
              onClick={handleStripeCheckout}
              disabled={loading}
            />
          ) : (
            <Button
              variant="outline"
              className="w-full h-12 border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleStripeCheckout}
              disabled={loading}
            >
              {loading ? 'Loading...' : CTA}
            </Button>
          )}
        </div>
      </Card>
    </motion.div>
  )
}

interface FooterLink {
	title: string;
	href: string;
	icon?: React.ComponentType<{ className?: string }>;
}

interface FooterSection {
	label: string;
	links: FooterLink[];
}

const footerLinks: FooterSection[] = [
	{
		label: 'Product',
		links: [
			{ title: 'Features', href: '/features' },
			{ title: 'Pricing', href: '/pricing' },
			{ title: 'Testimonials', href: '/testimonials' },
			{ title: 'Integration', href: '/' },
		],
	},
	{
		label: 'Company',
		links: [
			{ title: 'FAQs', href: '/faqs' },
			{ title: 'About Us', href: '/about' },
			{ title: 'Privacy Policy', href: '/privacy' },
			{ title: 'Terms of Services', href: '/terms' },
		],
	},
	{
		label: 'Resources',
		links: [
			{ title: 'Blog', href: '/blog' },
			{ title: 'Changelog', href: '/changelog' },
			{ title: 'Brand', href: '/brand' },
			{ title: 'Help', href: '/help' },
		],
	},
	{
		label: 'Social Links',
		links: [
			{ title: 'Facebook', href: '#', icon: FacebookIcon },
			{ title: 'Instagram', href: '#', icon: InstagramIcon },
			{ title: 'Youtube', href: '#', icon: YoutubeIcon },
			{ title: 'LinkedIn', href: '#', icon: LinkedinIcon },
		],
	},
];

type ViewAnimationProps = {
	delay?: number;
	className?: React.ComponentProps<typeof motion.div>['className'];
	children: ReactNode;
};

function AnimatedContainer({ className, delay = 0.1, children }: ViewAnimationProps) {
	return (
		<motion.div
			initial={{ filter: 'blur(4px)', translateY: -8, opacity: 0 }}
			whileInView={{ filter: 'blur(0px)', translateY: 0, opacity: 1 }}
			viewport={{ once: true }}
			transition={{ delay, duration: 0.8 }}
			className={className}
		>
			{children}
		</motion.div>
	);
}

function Footer() {
	return (
		<footer className="md:rounded-t-6xl relative w-full max-w-6xl mx-auto flex flex-col items-center justify-center rounded-t-4xl border-t bg-[radial-gradient(35%_128px_at_50%_0%,theme(backgroundColor.white/8%),transparent)] px-6 py-12 lg:py-16">
			<div className="bg-foreground/20 absolute top-0 right-1/2 left-1/2 h-px w-1/3 -translate-x-1/2 -translate-y-1/2 rounded-full blur" />

			<div className="grid w-full gap-8 xl:grid-cols-3 xl:gap-8">
				<AnimatedContainer className="space-y-4">
					<div className="flex items-center">
						<span className="text-3xl mr-2">🧠</span>
						<span className="text-xl font-bold text-white">Brainer</span>
					</div>
					<p className="text-gray-400 mt-8 text-sm md:mt-0">
						© {new Date().getFullYear()} Brainer. All rights reserved.
					</p>
				</AnimatedContainer>

				<div className="mt-10 grid grid-cols-2 gap-8 md:grid-cols-4 xl:col-span-2 xl:mt-0">
					{footerLinks.map((section, index) => (
						<AnimatedContainer key={section.label} delay={0.1 + index * 0.1}>
							<div className="mb-10 md:mb-0">
								<h3 className="text-xs text-white">{section.label}</h3>
								<ul className="text-gray-400 mt-4 space-y-2 text-sm">
									{section.links.map((link) => (
										<li key={link.title}>
											<a
												href={link.href}
												className="hover:text-white inline-flex items-center transition-all duration-300"
											>
												{link.icon && <link.icon className="me-1 size-4" />}
												{link.title}
											</a>
										</li>
									))}
								</ul>
							</div>
						</AnimatedContainer>
					))}
				</div>
			</div>
		</footer>
	);
}

export default InteractiveHero; 