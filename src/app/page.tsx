'use client';
import { ReactNode } from 'react';
import { motion, Variants } from 'framer-motion';
import { cn } from '@/lib/utils';
import React from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronRight, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GlowingEffect } from '@/components/ui/glowing-effect';
import { Pricing } from '@/components/pricing-section';
import { TestimonialsSection } from '@/components/testimonials-section';
import { WordRotate } from '@/components/ui/word-rotate';
import AnimatedFooter from '@/components/animated-footer';

type PresetType =
  | 'fade'
  | 'slide'
  | 'scale'
  | 'blur'
  | 'blur-slide'
  | 'zoom'
  | 'flip'
  | 'bounce'
  | 'rotate'
  | 'swing';

type AnimatedGroupProps = {
  children: ReactNode;
  className?: string;
  variants?: {
    container?: Variants;
    item?: Variants;
  };
  preset?: PresetType;
};

const defaultContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const defaultItemVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const presetVariants: Record<
  PresetType,
  { container: Variants; item: Variants }
> = {
  fade: {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0 },
      visible: { opacity: 1 },
    },
  },
  slide: {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0, y: 20 },
      visible: { opacity: 1, y: 0 },
    },
  },
  scale: {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0, scale: 0.8 },
      visible: { opacity: 1, scale: 1 },
    },
  },
  blur: {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0, filter: 'blur(4px)' },
      visible: { opacity: 1, filter: 'blur(0px)' },
    },
  },
  'blur-slide': {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0, filter: 'blur(4px)', y: 20 },
      visible: { opacity: 1, filter: 'blur(0px)', y: 0 },
    },
  },
  zoom: {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0, scale: 0.5 },
      visible: {
        opacity: 1,
        scale: 1,
        transition: { type: 'spring', stiffness: 300, damping: 20 },
      },
    },
  },
  flip: {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0, rotateX: -90 },
      visible: {
        opacity: 1,
        rotateX: 0,
        transition: { type: 'spring', stiffness: 300, damping: 20 },
      },
    },
  },
  bounce: {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0, y: -50 },
      visible: {
        opacity: 1,
        y: 0,
        transition: { type: 'spring', stiffness: 400, damping: 10 },
      },
    },
  },
  rotate: {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0, rotate: -180 },
      visible: {
        opacity: 1,
        rotate: 0,
        transition: { type: 'spring', stiffness: 200, damping: 15 },
      },
    },
  },
  swing: {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0, rotate: -10 },
      visible: {
        opacity: 1,
        rotate: 0,
        transition: { type: 'spring', stiffness: 300, damping: 8 },
      },
    },
  },
};

function AnimatedGroup({
  children,
  className,
  variants,
  preset,
}: AnimatedGroupProps) {
  const selectedVariants = preset
    ? presetVariants[preset]
    : { container: defaultContainerVariants, item: defaultItemVariants };
  const containerVariants = variants?.container || selectedVariants.container;
  const itemVariants = variants?.item || selectedVariants.item;

  return (
    <motion.div
      initial='hidden'
      animate='visible'
      variants={containerVariants}
      className={cn(className)}
    >
      {React.Children.map(children, (child, index) => (
        <motion.div key={index} variants={itemVariants}>
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}

const transitionVariants = {
    item: {
        hidden: {
            opacity: 0,
            filter: 'blur(12px)',
            y: 12,
        },
        visible: {
            opacity: 1,
            filter: 'blur(0px)',
            y: 0,
            transition: {
                type: 'spring',
                bounce: 0.3,
                duration: 1.5,
            },
        },
    },
}

export default function HeroSection() {
    return (
        <>
            <HeroHeader />
            <main className="overflow-hidden bg-black text-white">
                <div
                    aria-hidden
                    className="z-[2] absolute inset-0 pointer-events-none isolate opacity-50 contain-strict hidden lg:block">
                    <div className="w-[35rem] h-[80rem] -translate-y-[350px] absolute left-0 top-0 -rotate-45 rounded-full bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,hsla(0,0%,50%,.08)_0,hsla(0,0%,30%,.02)_50%,hsla(0,0%,20%,0)_80%)]" />
                    <div className="h-[80rem] absolute left-0 top-0 w-56 -rotate-45 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,hsla(0,0%,60%,.06)_0,hsla(0,0%,40%,.02)_80%,transparent_100%)] [translate:5%_-50%]" />
                    <div className="h-[80rem] -translate-y-[350px] absolute left-0 top-0 w-56 -rotate-45 bg-[radial-gradient(50%_50%_at_50%_50%,hsla(0,0%,40%,.04)_0,hsla(0,0%,20%,.02)_80%,transparent_100%)]" />
                </div>
                <section>
                    <div className="relative pt-24 md:pt-36">
                        <AnimatedGroup
                            variants={{
                                container: {
                                    visible: {
                                        transition: {
                                            delayChildren: 1,
                                        },
                                    },
                                },
                                item: {
                                    hidden: {
                                        opacity: 0,
                                        y: 20,
                                    },
                                    visible: {
                                        opacity: 1,
                                        y: 0,
                                        transition: {
                                            type: 'spring',
                                            bounce: 0.3,
                                            duration: 2,
                                        },
                                    },
                                },
                            }}
                            className="absolute inset-0 -z-20">
                            <div className="absolute inset-x-0 top-56 -z-20 hidden lg:top-32 lg:block">
                                <div className="w-full h-full bg-gradient-to-b from-transparent via-gray-900/10 to-gray-800/20" />
                            </div>
                        </AnimatedGroup>
                        <div aria-hidden className="absolute inset-0 -z-10 size-full [background:radial-gradient(125%_125%_at_50%_100%,transparent_0%,#000000_75%)]" />
                        <div className="mx-auto max-w-7xl px-6">
                            <div className="text-center sm:mx-auto lg:mr-auto lg:mt-0">
                                <AnimatedGroup variants={transitionVariants}>
                                    <Link
                                        href="#link"
                                        className="hover:bg-gray-900 bg-gray-800 group mx-auto flex w-fit items-center gap-4 rounded-full border border-gray-700 p-1 pl-4 shadow-md shadow-black/50 transition-all duration-300">
                                        <span className="text-gray-300 text-sm">✨ Never lose a brilliant idea again</span>
                                        <span className="block h-4 w-0.5 border-l bg-gray-600"></span>

                                        <div className="bg-gray-900 group-hover:bg-gray-800 size-6 overflow-hidden rounded-full duration-500">
                                            <div className="flex w-12 -translate-x-1/2 duration-500 ease-in-out group-hover:translate-x-0">
                                                <span className="flex size-6">
                                                    <ArrowRight className="m-auto size-3" />
                                                </span>
                                                <span className="flex size-6">
                                                    <ArrowRight className="m-auto size-3" />
                                                </span>
                                            </div>
                                        </div>
                                    </Link>
                        
                                    <h1 className="mt-8 max-w-4xl mx-auto text-balance text-6xl md:text-7xl lg:mt-16 xl:text-[5.25rem] font-light tracking-wide">
                                        <div className="text-white font-extralight">Your Memory-Preserving</div>
                                        <WordRotate
                                            words={["AI Brain", "Digital Mind", "Smart Assistant", "Memory Vault", "Knowledge Hub"]}
                                            duration={3000}
                                            className="text-white block font-thin tracking-wider"
                                            framerProps={{
                                                initial: { opacity: 0, y: -20 },
                                                animate: { opacity: 1, y: 0 },
                                                exit: { opacity: 0, y: 20 },
                                                transition: { duration: 0.3, ease: "easeOut" },
                                            }}
                                        />
                                    </h1>
                                    <p className="mx-auto mt-8 max-w-2xl text-balance text-lg text-gray-400">
                                        Capture notes, voice memos, and screenshots. Let AI organize, summarize, and surface your ideas exactly when you need them. Like Notion + Roam + AI for creators.
                                    </p>
                                </AnimatedGroup>

                                <AnimatedGroup
                                    variants={{
                                        container: {
                                            visible: {
                                                transition: {
                                                    staggerChildren: 0.05,
                                                    delayChildren: 0.75,
                                                },
                                            },
                                        },
                                        ...transitionVariants,
                                    }}
                                    className="mt-12 flex flex-col items-center justify-center gap-2 md:flex-row">
                                    <div
                                        key={1}
                                        className="bg-white/10 rounded-[14px] border border-white/20 p-0.5">
                                        <Button
                                            asChild
                                            size="lg"
                                            className="rounded-xl px-5 text-base bg-white hover:bg-gray-200 text-black">
                                            <Link href="/auth/signup">
                                                <span className="text-nowrap">🧠 Start Building Your Brain</span>
                                            </Link>
                                        </Button>
                                    </div>
                                    <Button
                                        key={2}
                                        asChild
                                        size="lg"
                                        variant="ghost"
                                        className="h-10.5 rounded-xl px-5 text-gray-300 hover:text-white hover:bg-gray-800">
                                        <Link href="#demo">
                                            <span className="text-nowrap">Watch Demo</span>
                                        </Link>
                                    </Button>
                                </AnimatedGroup>
                            </div>
                        </div>

                        <AnimatedGroup
                            variants={{
                                container: {
                                    visible: {
                                        transition: {
                                            staggerChildren: 0.05,
                                            delayChildren: 0.75,
                                        },
                                    },
                                },
                                ...transitionVariants,
                            }}>
                            <div className="relative -mr-56 mt-8 overflow-hidden px-2 sm:mr-0 sm:mt-12 md:mt-20">
                                <div
                                    aria-hidden
                                    className="bg-gradient-to-b from-transparent from-35% to-black absolute inset-0 z-10"
                                />
                                <div className="relative mx-auto max-w-6xl overflow-hidden rounded-2xl border border-gray-800 p-4 shadow-lg shadow-black/50 ring-1 ring-gray-700/50 bg-gray-900">
                                    <div className="aspect-[16/10] relative rounded-2xl bg-gray-900 overflow-hidden">
                                        {/* Brainer App Screenshot */}
                                        <div className="w-full h-full bg-gradient-to-br from-gray-800 via-gray-900 to-black flex items-center justify-center relative">
                                            {/* Mock Brainer Interface */}
                                            <div className="w-full h-full relative overflow-hidden">
                                                {/* Header Bar */}
                                                <div className="absolute top-0 left-0 right-0 h-16 bg-gray-800 flex items-center px-6 border-b border-gray-700">
                                                    <div className="flex items-center space-x-3">
                                                        <span className="text-2xl">🧠</span>
                                                        <span className="text-xl font-bold text-white">Brainer</span>
                                                    </div>
                                                    <div className="ml-auto flex items-center space-x-4">
                                                        <div className="bg-white text-black px-3 py-1 rounded-lg text-sm">+ New Note</div>
                                                    </div>
                                                </div>
                                                
                                                {/* Main Content */}
                                                <div className="flex h-full pt-16">
                                                    {/* Sidebar */}
                                                    <div className="w-64 bg-gray-800 border-r border-gray-700 p-4">
                                                        <div className="space-y-3">
                                                            <div className="text-gray-400 text-xs uppercase tracking-wider">Quick Actions</div>
                                                            <div className="space-y-2">
                                                                <div className="flex items-center space-x-3 p-2 rounded-lg bg-gray-700">
                                                                    <span className="text-sm">🎙️</span>
                                                                    <span className="text-sm text-white">Voice Note</span>
                                                                </div>
                                                                <div className="flex items-center space-x-3 p-2 rounded-lg">
                                                                    <span className="text-sm">📝</span>
                                                                    <span className="text-sm text-gray-300">Text Note</span>
                                                                </div>
                                                                <div className="flex items-center space-x-3 p-2 rounded-lg">
                                                                    <span className="text-sm">📸</span>
                                                                    <span className="text-sm text-gray-300">Screenshot</span>
                                                                </div>
                                                            </div>
                                                            <div className="text-gray-400 text-xs uppercase tracking-wider mt-6">Recent Notes</div>
                                                            <div className="space-y-2">
                                                                <div className="p-2 rounded-lg border border-gray-700">
                                                                    <div className="text-sm text-white">Voice Note - 6/25/2025</div>
                                                                    <div className="text-xs text-green-400">✓ Transcribed (73%)</div>
                                                                </div>
                                                                <div className="p-2 rounded-lg">
                                                                    <div className="text-sm text-gray-300">Meeting Ideas</div>
                                                                    <div className="text-xs text-blue-400">🤖 AI Summary</div>
                                                                </div>
                                                                <div className="p-2 rounded-lg">
                                                                    <div className="text-sm text-gray-300">Screenshot - 6/25/2025</div>
                                                                    <div className="text-xs text-gray-500">540 words extracted</div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Main Content Area */}
                                                    <div className="flex-1 p-6">
                                                        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                                                            <div className="flex items-center space-x-3 mb-4">
                                                                <span className="text-lg">🎙️</span>
                                                                <div>
                                                                    <h3 className="text-white font-semibold">Voice Note - 6/25/2025</h3>
                                                                    <p className="text-gray-400 text-sm">Created 25/06/2025 • Updated 25/06/2025</p>
                                                                </div>
                                                                <div className="ml-auto flex space-x-2">
                                                                    <div className="bg-white text-black px-2 py-1 rounded text-xs">✨ Regenerate Summary</div>
                                                                    <div className="bg-gray-600 text-white px-2 py-1 rounded text-xs">✏️ Edit</div>
                                                                </div>
                                                            </div>
                                                            
                                                            <div className="mb-6">
                                                                <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-4 mb-4">
                                                                    <div className="flex items-center space-x-2 mb-2">
                                                                        <span className="text-gray-300 text-sm">🤖</span>
                                                                        <span className="text-gray-300 text-sm font-semibold">AI Summary</span>
                                                                        <span className="text-gray-400 text-xs">25/06/2025</span>
                                                                    </div>
                                                                    <div className="text-gray-300 text-sm leading-relaxed">
                                                                        A voice recording has been transcribed with 73% confidence using AWS Transcribe. The speaker is testing the Brainer app.
                                                                    </div>
                                                                    <div className="mt-3">
                                                                        <div className="text-gray-300 text-sm font-semibold mb-1"># Key Points</div>
                                                                        <ul className="text-gray-300 text-sm space-y-1">
                                                                            <li>• Voice recording transcribed with 73% confidence using AWS Transcribe</li>
                                                                            <li>• Speaker is testing the Brainer app</li>
                                                                            <li>• Transcription can be reviewed and edited if needed</li>
                                                                            <li>• Next steps include adding tags for organization and using the content for projects</li>
                                                                        </ul>
                                                                    </div>
                                                                    <div className="mt-2 text-gray-400 text-xs">392 tokens used</div>
                                                                </div>
                                                            </div>

                                                            <div className="mb-4">
                                                                <h4 className="text-white font-semibold mb-2 flex items-center">
                                                                    <span className="mr-2">🎙️</span>
                                                                    Voice Recording
                                                                </h4>
                                                                <div className="text-gray-300 font-semibold">• Transcribed</div>
                                                            </div>

                                                            <div className="bg-gray-900 rounded-lg p-4">
                                                                <div className="mb-3">
                                                                    <div className="text-gray-400 text-sm">File: 6/25/2025</div>
                                                                    <div className="text-gray-400 text-sm">Transcription Job: transcribe-AMKgloF0ceNXgLutAiCJWFvGMiw1-455860b9-8725-4608-a191-c6ceaa1854a</div>
                                                                    <div className="text-gray-400 text-sm">Status: <span className="text-green-400">✅ Completed (73% confidence)</span></div>
                                                                </div>
                                                                
                                                                <div className="mb-2">
                                                                    <h5 className="text-white font-semibold"># 📝 Transcription</h5>
                                                                </div>
                                                                
                                                                <div className="text-gray-300 text-sm leading-relaxed">
                                                                    Hey, this is Dishank testing the Brainer app. I'm speaking, I don't know why I'm speaking, but I'm testing it.
                                                                </div>
                                                                
                                                                <div className="mt-4 text-gray-500 text-xs border-t border-gray-700 pt-2">
                                                                    ---
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </AnimatedGroup>
                    </div>
                </section>
                
                {/* Features Section */}
                <section className="py-24 md:py-32">
                    <div className="mx-auto max-w-7xl px-6">
                        <div className="text-center mb-16">
                            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                                Powerful Features for Your <span className="text-white">Digital Brain</span>
                            </h2>
                            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                                Everything you need to capture, organize, and surface your ideas with the power of AI
                            </p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {/* Voice Notes Feature */}
                            <div className="relative h-full">
                                <div className="relative h-full rounded-[1.25rem] border-[0.75px] border-gray-800 p-2 md:rounded-[1.5rem] md:p-3">
                                    <GlowingEffect 
                                        disabled={false}
                                        proximity={64}
                                        spread={40}
                                        blur={0}
                                        movementDuration={0.3}
                                        borderWidth={3}
                                        glow={true}
                                        inactiveZone={0.01}
                                    />
                                    <div className="relative flex h-full flex-col justify-between gap-6 overflow-hidden rounded-xl border-[0.75px] bg-black p-6 shadow-sm">
                                        <div className="relative flex flex-1 flex-col justify-between gap-3">
                                            <div className="w-fit rounded-lg border-[0.75px] border-gray-800 bg-gray-800 p-2">
                                                <span className="text-2xl">🎙️</span>
                                            </div>
                                            <div className="space-y-3">
                                                <h3 className="text-xl font-semibold text-white">Voice Notes</h3>
                                                <p className="text-sm text-gray-400 leading-relaxed">
                                                    Record voice memos anywhere. Our AI transcribes with high accuracy and generates intelligent summaries with key points and action items.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Smart Screenshots Feature */}
                            <div className="relative h-full">
                                <div className="relative h-full rounded-[1.25rem] border-[0.75px] border-gray-800 p-2 md:rounded-[1.5rem] md:p-3">
                                    <GlowingEffect 
                                        disabled={false}
                                        proximity={64}
                                        spread={40}
                                        blur={0}
                                        movementDuration={0.3}
                                        borderWidth={3}
                                        glow={true}
                                        inactiveZone={0.01}
                                    />
                                    <div className="relative flex h-full flex-col justify-between gap-6 overflow-hidden rounded-xl border-[0.75px] bg-black p-6 shadow-sm">
                                        <div className="relative flex flex-1 flex-col justify-between gap-3">
                                            <div className="w-fit rounded-lg border-[0.75px] border-gray-800 bg-gray-800 p-2">
                                                <span className="text-2xl">📸</span>
                                            </div>
                                            <div className="space-y-3">
                                                <h3 className="text-xl font-semibold text-white">Smart Screenshots</h3>
                                                <p className="text-sm text-gray-400 leading-relaxed">
                                                    Capture screenshots with automatic text extraction. AI analyzes and categorizes content, making everything searchable and actionable.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* AI Insights Feature */}
                            <div className="relative h-full">
                                <div className="relative h-full rounded-[1.25rem] border-[0.75px] border-gray-800 p-2 md:rounded-[1.5rem] md:p-3">
                                    <GlowingEffect 
                                        disabled={false}
                                        proximity={64}
                                        spread={40}
                                        blur={0}
                                        movementDuration={0.3}
                                        borderWidth={3}
                                        glow={true}
                                        inactiveZone={0.01}
                                    />
                                    <div className="relative flex h-full flex-col justify-between gap-6 overflow-hidden rounded-xl border-[0.75px] bg-black p-6 shadow-sm">
                                        <div className="relative flex flex-1 flex-col justify-between gap-3">
                                            <div className="w-fit rounded-lg border-[0.75px] border-gray-800 bg-gray-800 p-2">
                                                <span className="text-2xl">🤖</span>
                                            </div>
                                            <div className="space-y-3">
                                                <h3 className="text-xl font-semibold text-white">AI Insights</h3>
                                                <p className="text-sm text-gray-400 leading-relaxed">
                                                    Get intelligent summaries, extract key points, and discover connections between your notes automatically with advanced AI.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Smart Search Feature */}
                            <div className="relative h-full">
                                <div className="relative h-full rounded-[1.25rem] border-[0.75px] border-gray-800 p-2 md:rounded-[1.5rem] md:p-3">
                                    <GlowingEffect 
                                        disabled={false}
                                        proximity={64}
                                        spread={40}
                                        blur={0}
                                        movementDuration={0.3}
                                        borderWidth={3}
                                        glow={true}
                                        inactiveZone={0.01}
                                    />
                                    <div className="relative flex h-full flex-col justify-between gap-6 overflow-hidden rounded-xl border-[0.75px] bg-black p-6 shadow-sm">
                                        <div className="relative flex flex-1 flex-col justify-between gap-3">
                                            <div className="w-fit rounded-lg border-[0.75px] border-gray-800 bg-gray-800 p-2">
                                                <span className="text-2xl">⚡</span>
                                            </div>
                                            <div className="space-y-3">
                                                <h3 className="text-xl font-semibold text-white">Smart Search</h3>
                                                <p className="text-sm text-gray-400 leading-relaxed">
                                                    Find anything instantly with semantic search. Search by meaning, not just keywords. Your AI brain remembers everything.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Knowledge Graph Feature */}
                            <div className="relative h-full">
                                <div className="relative h-full rounded-[1.25rem] border-[0.75px] border-gray-800 p-2 md:rounded-[1.5rem] md:p-3">
                                    <GlowingEffect 
                                        disabled={false}
                                        proximity={64}
                                        spread={40}
                                        blur={0}
                                        movementDuration={0.3}
                                        borderWidth={3}
                                        glow={true}
                                        inactiveZone={0.01}
                                    />
                                    <div className="relative flex h-full flex-col justify-between gap-6 overflow-hidden rounded-xl border-[0.75px] bg-black p-6 shadow-sm">
                                        <div className="relative flex flex-1 flex-col justify-between gap-3">
                                            <div className="w-fit rounded-lg border-[0.75px] border-gray-800 bg-gray-800 p-2">
                                                <span className="text-2xl">🧠</span>
                                            </div>
                                            <div className="space-y-3">
                                                <h3 className="text-xl font-semibold text-white">Knowledge Graph</h3>
                                                <p className="text-sm text-gray-400 leading-relaxed">
                                                    Automatically discover and visualize connections between your ideas. Build a living map of your knowledge and thoughts.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Real-time Sync Feature */}
                            <div className="relative h-full">
                                <div className="relative h-full rounded-[1.25rem] border-[0.75px] border-gray-800 p-2 md:rounded-[1.5rem] md:p-3">
                                    <GlowingEffect 
                                        disabled={false}
                                        proximity={64}
                                        spread={40}
                                        blur={0}
                                        movementDuration={0.3}
                                        borderWidth={3}
                                        glow={true}
                                        inactiveZone={0.01}
                                    />
                                    <div className="relative flex h-full flex-col justify-between gap-6 overflow-hidden rounded-xl border-[0.75px] bg-black p-6 shadow-sm">
                                        <div className="relative flex flex-1 flex-col justify-between gap-3">
                                            <div className="w-fit rounded-lg border-[0.75px] border-gray-800 bg-gray-800 p-2">
                                                <span className="text-2xl">🔄</span>
                                            </div>
                                            <div className="space-y-3">
                                                <h3 className="text-xl font-semibold text-white">Real-time Sync</h3>
                                                <p className="text-sm text-gray-400 leading-relaxed">
                                                    Access your brain from anywhere. Real-time synchronization across all devices ensures your ideas are always available.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Pricing Section */}
                <section className="bg-black">
                    <Pricing 
                        plans={[]}
                        title="Choose Your Plan"
                        description="Start free and upgrade as you grow. All plans include our core features with different usage limits."
                    />
                </section>

                {/* Testimonials Section */}
                <TestimonialsSection 
                    title="Loved by creators, researchers & professionals"
                    description="See what our users are saying about their experience with Brainer"
                    testimonials={[
                        {
                            author: {
                                name: "Sarah Chen",
                                handle: "@sarahchen",
                                avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=400&fit=crop&crop=face"
                            },
                            text: "Brainer has completely transformed how I capture and organize my research. The AI summaries are incredibly accurate and save me hours every week."
                        },
                        {
                            author: {
                                name: "Marcus Rodriguez",
                                handle: "@marcusdev",
                                avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face"
                            },
                            text: "As a content creator, I'm constantly capturing ideas. Brainer's voice notes and AI insights help me turn random thoughts into structured content."
                        },
                        {
                            author: {
                                name: "Dr. Emily Watson",
                                handle: "@drwatson",
                                avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face"
                            },
                            text: "The screenshot analysis feature is a game-changer for my academic research. It extracts text and context from images with incredible precision."
                        },
                        {
                            author: {
                                name: "James Park",
                                handle: "@jamespark",
                                avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face"
                            },
                            text: "I've tried many note-taking apps, but Brainer's AI-powered search actually understands what I'm looking for. It's like having a personal research assistant."
                        },
                        {
                            author: {
                                name: "Lisa Thompson",
                                handle: "@lisathompson",
                                avatar: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400&h=400&fit=crop&crop=face"
                            },
                            text: "The knowledge graph feature helps me see connections between my ideas that I never would have noticed. It's like having a second brain that thinks alongside me."
                        },
                        {
                            author: {
                                name: "Alex Kumar",
                                handle: "@alexkumar",
                                avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=face"
                            },
                            text: "Brainer's real-time sync across all my devices means I can capture ideas anywhere and access them everywhere. It's seamless and reliable."
                        }
                    ]}
                />

                <section className="pb-16 pt-16 md:pb-32">
                    <div className="group relative m-auto max-w-5xl px-6">
                        <div className="absolute inset-0 z-10 flex scale-95 items-center justify-center opacity-0 duration-500 group-hover:scale-100 group-hover:opacity-100">
                            <Link
                                href="/auth/signup"
                                className="block text-sm duration-150 hover:opacity-75 text-gray-400">
                                <span>Ready to build your AI brain?</span>
                                <ChevronRight className="ml-1 inline-block size-3" />
                            </Link>
                        </div>
                        <div className="group-hover:blur-xs mx-auto grid max-w-2xl grid-cols-1 gap-8 transition-all duration-500 group-hover:opacity-50">
                            <div className="text-center">
                                <h3 className="text-2xl font-bold text-white mb-4">
                                    Join thousands of creators, researchers & thinkers
                                </h3>
                                <p className="text-gray-400 mb-8">
                                    Transform how you capture, organize, and recall your ideas with AI
                                </p>
                                <Button 
                                    asChild 
                                    size="lg" 
                                    className="bg-white hover:bg-gray-200 text-black"
                                >
                                    <Link href="/auth/signup">
                                        🧠 Start Building Your Brain
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
            <AnimatedFooter 
                leftLinks={[
                    { href: "/features", label: "Features" },
                    { href: "/pricing", label: "Pricing" },
                    { href: "/about", label: "About" },
                    { href: "/help", label: "Help" }
                ]}
                rightLinks={[
                    { href: "/privacy", label: "Privacy" },
                    { href: "/terms", label: "Terms" },
                    { href: "/contact", label: "Contact" },
                    { href: "/support", label: "Support" }
                ]}
                copyrightText="© 2025 Brainer. All rights reserved."
                barCount={25}
            />
        </>
    )
}

const menuItems = [
    { name: 'Features', href: '/features' },
    { name: 'Pricing', href: '/pricing' },
    { name: 'About', href: '/about' },
    { name: 'Help', href: '/help' },
]

const HeroHeader = () => {
    const [menuState, setMenuState] = React.useState(false)
    const [isScrolled, setIsScrolled] = React.useState(false)

    React.useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50)
        }
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])
    
    return (
        <header>
            <nav
                data-state={menuState && 'active'}
                className="fixed z-20 w-full px-2 group">
                <div className={cn('mx-auto mt-2 max-w-6xl px-6 transition-all duration-300 lg:px-12', isScrolled && 'bg-black/50 max-w-4xl rounded-2xl border border-gray-800 backdrop-blur-lg lg:px-5')}>
                    <div className="relative flex flex-wrap items-center justify-between gap-6 py-3 lg:gap-0 lg:py-4">
                        <div className="flex w-full justify-between lg:w-auto">
                            <Link
                                href="/"
                                aria-label="home"
                                className="flex items-center space-x-2">
                                <BrainerLogo />
                            </Link>

                            <button
                                onClick={() => setMenuState(!menuState)}
                                aria-label={menuState == true ? 'Close Menu' : 'Open Menu'}
                                className="relative z-20 -m-2.5 -mr-4 block cursor-pointer p-2.5 lg:hidden">
                                <Menu className="in-data-[state=active]:rotate-180 group-data-[state=active]:scale-0 group-data-[state=active]:opacity-0 m-auto size-6 duration-200 text-white" />
                                <X className="group-data-[state=active]:rotate-0 group-data-[state=active]:scale-100 group-data-[state=active]:opacity-100 absolute inset-0 m-auto size-6 -rotate-180 scale-0 opacity-0 duration-200 text-white" />
                            </button>
                        </div>

                        <div className="absolute inset-0 m-auto hidden size-fit lg:block">
                            <ul className="flex gap-8 text-sm">
                                {menuItems.map((item, index) => (
                                    <li key={index}>
                                        <Link
                                            href={item.href}
                                            className="text-gray-400 hover:text-white block duration-150">
                                            <span>{item.name}</span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="bg-gray-900 group-data-[state=active]:block lg:group-data-[state=active]:flex mb-6 hidden w-full flex-wrap items-center justify-end space-y-8 rounded-3xl border border-gray-800 p-6 shadow-2xl shadow-black/50 md:flex-nowrap lg:m-0 lg:flex lg:w-fit lg:gap-6 lg:space-y-0 lg:border-transparent lg:bg-transparent lg:p-0 lg:shadow-none">
                            <div className="lg:hidden">
                                <ul className="space-y-6 text-base">
                                    {menuItems.map((item, index) => (
                                        <li key={index}>
                                            <Link
                                                href={item.href}
                                                className="text-gray-400 hover:text-white block duration-150">
                                                <span>{item.name}</span>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="flex w-full flex-col space-y-3 sm:flex-row sm:gap-3 sm:space-y-0 md:w-fit">
                                <Button
                                    asChild
                                    variant="outline"
                                    size="sm"
                                    className={cn(isScrolled && 'lg:hidden', 'border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white')}>
                                    <Link href="/auth/signin">
                                        <span>Sign In</span>
                                    </Link>
                                </Button>
                                <Button
                                    asChild
                                    size="sm"
                                    className={cn(isScrolled && 'lg:hidden', 'bg-white hover:bg-gray-200 text-black')}>
                                    <Link href="/auth/signup">
                                        <span>Get Started Free</span>
                                    </Link>
                                </Button>
                                <Button
                                    asChild
                                    size="sm"
                                    className={cn(isScrolled ? 'lg:inline-flex' : 'hidden', 'bg-white hover:bg-gray-200 text-black')}>
                                    <Link href="/auth/signup">
                                        <span>Get Started</span>
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </nav>
        </header>
    )
}

const BrainerLogo = ({ className }: { className?: string }) => {
    return (
        <div className={cn('flex items-center space-x-2', className)}>
            <span className="text-3xl">🧠</span>
            <span className="text-xl font-bold text-white">Brainer</span>
        </div>
    )
}