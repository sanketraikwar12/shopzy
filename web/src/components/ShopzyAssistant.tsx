import clsx from 'clsx';
import {
  Bot,
  CheckCircle2,
  ExternalLink,
  Maximize2,
  Mic,
  Minimize2,
  Phone,
  RotateCcw,
  Scale,
  Send,
  Sparkles,
  Store,
  Tag,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatINR } from '@/lib/format';
import { useAssistantChat, useResetConversation } from '@/lib/queries';
import { useLocation, useToasts } from '@/store';
import type { AssistantResponse, MatchedProduct } from '@/types';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  products?: MatchedProduct[];
  comparison?: AssistantResponse['comparison'];
  suggestedPrompts?: string[];
  clarificationOptions?: string[];
  disclaimer?: string;
}

const DEFAULT_SUGGESTIONS = [
  '₹500 ke andar charger dikhao',
  '₹1000 ke andar headphones chahiye',
  'Mere paas available grocery shops dikhao',
  'Sabse affordable option kya hai?',
];

export function ShopzyAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

  const { coords, label: locationLabel } = useLocation();
  const pushToast = useToasts((s) => s.push);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  const chatMutation = useAssistantChat();
  const resetMutation = useResetConversation();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: "Namaste! I'm Shopzy AI Citizen Assistant. I can help you find products from nearby local shops in Bhopal based on your budget, requirements, and live availability.\n\nType or speak in English, Hindi, or Hinglish!",
      timestamp: new Date(),
      suggestedPrompts: DEFAULT_SUGGESTIONS,
      disclaimer: 'All product information, prices, and stock are sourced directly from verified local shop listings.',
    },
  ]);

  // Check Web Speech API support
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'hi-IN'; // Works for Hindi, Hinglish and Indian English

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
        pushToast('Could not recognize voice. Please try again or type.', 'info');
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, [pushToast]);

  // Listen for global shopzy:open-assistant event
  useEffect(() => {
    const handleOpen = (e: Event) => {
      const customEvent = e as CustomEvent<{ prompt?: string }>;
      setIsOpen(true);
      setIsMinimized(false);
      if (customEvent.detail?.prompt) {
        setInput(customEvent.detail.prompt);
      }
    };
    window.addEventListener('shopzy:open-assistant', handleOpen);
    return () => window.removeEventListener('shopzy:open-assistant', handleOpen);
  }, []);

  // Auto scroll to bottom
  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isMinimized, chatMutation.isPending]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, isMinimized]);

  const toggleVoice = () => {
    if (!speechSupported) {
      pushToast('Voice recognition is not supported in this browser.', 'info');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch {
        setIsListening(false);
      }
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || chatMutation.isPending) return;

    setInput('');
    const userMsgId = crypto.randomUUID();
    const newMessages: Message[] = [
      ...messages,
      {
        id: userMsgId,
        role: 'user',
        text: query,
        timestamp: new Date(),
      },
    ];
    setMessages(newMessages);

    try {
      const response = await chatMutation.mutateAsync({
        message: query,
        conversationId,
        location: {
          lat: coords?.lat,
          lng: coords?.lng,
          city: 'Bhopal',
          area: locationLabel,
        },
      });

      setConversationId(response.conversationId);

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: response.message,
          timestamp: new Date(),
          products: response.products,
          comparison: response.comparison,
          suggestedPrompts: response.suggestedPrompts,
          clarificationOptions: response.clarificationOptions,
          disclaimer: response.disclaimer,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: 'AI Assistant is temporarily unable to connect to the store catalog. You can still browse and search Shopzy normally.',
          timestamp: new Date(),
          suggestedPrompts: ['Try again', 'Search normally'],
        },
      ]);
    }
  };

  const handleReset = async () => {
    if (conversationId) {
      try {
        await resetMutation.mutateAsync(conversationId);
      } catch {
        // Ignore reset failures
      }
    }
    setConversationId(undefined);
    setMessages([
      {
        id: 'welcome-new',
        role: 'assistant',
        text: "Conversation reset. What product or service would you like to search for in Bhopal?",
        timestamp: new Date(),
        suggestedPrompts: DEFAULT_SUGGESTIONS,
        disclaimer: 'All product information, prices, and stock are sourced directly from verified local shop listings.',
      },
    ]);
  };

  return (
    <>
      {/* --- Floating Launcher Button --- */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => {
            setIsOpen(true);
            setIsMinimized(false);
          }}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 rounded-full border border-sky-600/30 bg-[#061933] px-4 py-3 text-white shadow-2xl shadow-sky-950/40 transition-all hover:bg-[#0c2447] hover:scale-105 active:scale-95 group focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2"
          aria-label="Open Shopzy AI Citizen Assistant"
        >
          <div className="relative grid size-8 place-items-center rounded-full bg-sky-500 text-white shadow-inner">
            <Bot size={18} className="transition-transform group-hover:rotate-6" />
            <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-400 ring-2 ring-[#061933]" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-xs font-bold tracking-tight text-white flex items-center gap-1.5">
              Shopzy Assistant
              <span className="rounded bg-sky-500/20 px-1 py-0.5 text-[9px] font-semibold text-sky-300">
                AI
              </span>
            </span>
            <span className="text-[10px] text-slate-300 font-normal">
              Find products & compare prices
            </span>
          </div>
        </button>
      )}

      {/* --- Assistant Interface Drawer / Modal --- */}
      {isOpen && (
        <div
          className={clsx(
            'fixed z-50 transition-all duration-300 shadow-2xl flex flex-col',
            isMinimized
              ? 'bottom-6 right-6 h-14 w-80 rounded-2xl border border-slate-700 bg-[#061933] overflow-hidden'
              : 'inset-y-0 right-0 w-full sm:w-[450px] sm:max-w-[95vw] sm:inset-y-3 sm:right-3 sm:rounded-3xl sm:border border-slate-700/80 bg-slate-50 dark:bg-[#071326] backdrop-blur-lg',
          )}
          role="dialog"
          aria-label="Shopzy AI Assistant"
        >
          {/* Header */}
          <header className="flex shrink-0 items-center justify-between border-b border-slate-200 dark:border-slate-800/80 bg-white/80 dark:bg-[#061933]/90 px-4 py-3.5 backdrop-blur-md">
            <div className="flex items-center gap-2.5">
              <div className="relative grid size-9 place-items-center rounded-2xl bg-sky-600 text-white shadow-md">
                <Bot size={20} />
                <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-400 ring-2 ring-[#061933]" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-slate-900 dark:text-white leading-none">
                    Shopzy AI Assistant
                  </span>
                  <span className="rounded bg-sky-500/15 px-1.5 py-0.2 text-[9px] font-semibold text-sky-600 dark:text-sky-400">
                    Citizen
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Local shopping & verified prices · Bhopal
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleReset}
                title="Start new conversation"
                className="grid size-8 place-items-center rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                aria-label="Reset conversation"
              >
                <RotateCcw size={15} />
              </button>

              <button
                type="button"
                onClick={() => setIsMinimized((m) => !m)}
                title={isMinimized ? 'Expand' : 'Minimize'}
                className="hidden sm:grid size-8 place-items-center rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                aria-label={isMinimized ? 'Expand window' : 'Minimize window'}
              >
                {isMinimized ? <Maximize2 size={15} /> : <Minimize2 size={15} />}
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Close assistant"
                className="grid size-8 place-items-center rounded-lg text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                aria-label="Close assistant"
              >
                <X size={17} />
              </button>
            </div>
          </header>

          {/* Body / Message stream (Hidden if minimized) */}
          {!isMinimized && (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={clsx(
                      'flex flex-col',
                      msg.role === 'user' ? 'items-end' : 'items-start',
                    )}
                  >
                    {/* Message Bubble */}
                    <div
                      className={clsx(
                        'max-w-[88%] rounded-2xl p-3.5 shadow-sm leading-relaxed whitespace-pre-line',
                        msg.role === 'user'
                          ? 'bg-sky-600 text-white rounded-br-xs font-medium'
                          : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-800 rounded-bl-xs',
                      )}
                    >
                      {msg.text}

                      {/* Price Comparison Card */}
                      {msg.comparison && (
                        <div className="mt-3 rounded-xl border border-sky-200 dark:border-sky-900/50 bg-sky-50/70 dark:bg-sky-950/30 p-3 text-[11px] text-slate-800 dark:text-slate-200">
                          <div className="flex items-center gap-1.5 font-bold text-sky-900 dark:text-sky-300">
                            <Scale size={13} className="text-sky-600 dark:text-sky-400" />
                            <span>Price Comparison Breakdown</span>
                          </div>
                          <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                            <div className="rounded-lg bg-white/80 dark:bg-slate-900/80 p-1.5 border border-sky-100 dark:border-slate-800">
                              <span className="block text-[10px] text-slate-500">Lowest</span>
                              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                {formatINR(msg.comparison.lowestPrice)}
                              </span>
                            </div>
                            <div className="rounded-lg bg-white/80 dark:bg-slate-900/80 p-1.5 border border-sky-100 dark:border-slate-800">
                              <span className="block text-[10px] text-slate-500">Average</span>
                              <span className="font-medium text-slate-700 dark:text-slate-300">
                                {formatINR(msg.comparison.averagePrice)}
                              </span>
                            </div>
                            <div className="rounded-lg bg-white/80 dark:bg-slate-900/80 p-1.5 border border-sky-100 dark:border-slate-800">
                              <span className="block text-[10px] text-slate-500">Max Savings</span>
                              <span className="font-bold text-sky-600 dark:text-sky-400">
                                {formatINR(msg.comparison.savings)}
                              </span>
                            </div>
                          </div>
                          <p className="mt-2 text-[10px] text-slate-600 dark:text-slate-400 italic">
                            {msg.comparison.note}
                          </p>
                        </div>
                      )}

                      {/* Product Results List */}
                      {msg.products && msg.products.length > 0 && (
                        <div className="mt-3.5 space-y-2.5">
                          {msg.products.map((p) => (
                            <div
                              key={p.id}
                              className={clsx(
                                'rounded-xl border p-3 bg-white dark:bg-slate-950 transition hover:border-sky-400 dark:hover:border-sky-500',
                                p.isCheapest
                                  ? 'border-emerald-400/80 dark:border-emerald-600/80 ring-1 ring-emerald-400/30'
                                  : 'border-slate-200 dark:border-slate-800',
                              )}
                            >
                              {/* Labels row */}
                              <div className="flex flex-wrap items-center gap-1 mb-1.5">
                                {p.isCheapest && (
                                  <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 text-[9px] font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                                    <Tag size={9} />
                                    Lowest Listed Price
                                  </span>
                                )}
                                {p.labels.filter((l) => l !== 'Lowest Price').map((label) => (
                                  <span
                                    key={label}
                                    className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[9px] font-medium text-slate-600 dark:text-slate-300"
                                  >
                                    {label}
                                  </span>
                                ))}
                              </div>

                              {/* Title and price */}
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="font-semibold text-slate-900 dark:text-white text-xs leading-snug">
                                  {p.name}
                                </h4>
                                <div className="text-right shrink-0">
                                  <span className="font-bold text-sm text-slate-900 dark:text-white">
                                    {formatINR(p.price)}
                                  </span>
                                  {p.comparePrice && p.comparePrice > p.price && (
                                    <span className="block text-[10px] text-slate-400 line-through">
                                      {formatINR(p.comparePrice)}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {p.description && (
                                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-tight">
                                  {p.description}
                                </p>
                              )}

                              {/* Price anomaly banner */}
                              {p.priceAnomalyWarning && (
                                <div className="mt-2 rounded bg-amber-50 dark:bg-amber-950/40 p-1.5 text-[10px] text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50">
                                  {p.priceAnomalyWarning}
                                </div>
                              )}

                              {/* Shop information */}
                              <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-2 text-[11px] text-slate-600 dark:text-slate-300">
                                <div className="flex items-center gap-1 truncate">
                                  <Store size={12} className="text-sky-600 shrink-0" />
                                  <span className="font-medium truncate">{p.shop.name}</span>
                                  {p.shop.isVerified && (
                                    <CheckCircle2 size={11} className="text-sky-500 shrink-0" />
                                  )}
                                </div>

                                <div className="flex items-center gap-2 text-[10px] text-slate-500 shrink-0">
                                  <span>📍 {p.shop.landmark}</span>
                                  {p.shop.distanceKm !== undefined && (
                                    <span className="font-semibold text-sky-600 dark:text-sky-400">
                                      {p.shop.distanceKm} km
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="mt-2.5 flex items-center gap-1.5 pt-1">
                                <Link
                                  to={`/shops/${p.shop.slug}`}
                                  onClick={() => setIsOpen(false)}
                                  className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-sky-50 dark:bg-sky-950/50 px-2.5 py-1.5 text-[10px] font-semibold text-sky-700 dark:text-sky-300 border border-sky-200/80 dark:border-sky-800/60 hover:bg-sky-100 transition"
                                >
                                  <span>View Shop</span>
                                  <ExternalLink size={10} />
                                </Link>

                                <Link
                                  to={`/compare?item=${encodeURIComponent(p.name)}`}
                                  onClick={() => setIsOpen(false)}
                                  className="inline-flex items-center justify-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 text-[10px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                                  title="Compare prices across shops"
                                >
                                  <Scale size={10} />
                                  <span>Compare</span>
                                </Link>

                                {p.shop.phone && (
                                  <a
                                    href={`tel:${p.shop.phone}`}
                                    className="grid size-7 place-items-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition"
                                    title="Call shop"
                                  >
                                    <Phone size={11} />
                                  </a>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Disclaimer */}
                      {msg.disclaimer && (
                        <p className="mt-2 text-[9px] text-slate-400 dark:text-slate-500 italic">
                          ℹ️ {msg.disclaimer}
                        </p>
                      )}
                    </div>

                    {/* Suggested prompts buttons */}
                    {msg.suggestedPrompts && msg.suggestedPrompts.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5 max-w-[90%]">
                        {msg.suggestedPrompts.map((prompt) => (
                          <button
                            key={prompt}
                            type="button"
                            onClick={() => handleSendMessage(prompt)}
                            disabled={chatMutation.isPending}
                            className="rounded-full border border-sky-300/80 dark:border-sky-800 bg-sky-50/80 dark:bg-sky-950/40 px-2.5 py-1 text-[10px] font-medium text-sky-800 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/60 transition disabled:opacity-50 text-left cursor-pointer"
                          >
                            💬 {prompt}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {/* Loading state indicator */}
                {chatMutation.isPending && (
                  <div className="flex items-start gap-2">
                    <div className="rounded-2xl rounded-bl-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-sm">
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                        <Sparkles size={13} className="animate-spin text-sky-500" />
                        <span>Searching verified Bhopal store database…</span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input Footer */}
              <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#061933] p-3">
                {isListening && (
                  <div className="mb-2 flex items-center justify-between rounded-xl bg-rose-50 dark:bg-rose-950/40 px-3 py-1.5 text-xs text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50">
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-rose-500 animate-ping" />
                      <span>Listening… Speak your query in Hindi or English</span>
                    </div>
                    <button
                      type="button"
                      onClick={toggleVoice}
                      className="text-xs font-semibold text-rose-800 dark:text-rose-200 underline"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center gap-1.5"
                >
                  <div className="relative flex-1">
                    <input
                      ref={inputRef}
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="e.g. ₹500 ke andar charger dikhao..."
                      disabled={chatMutation.isPending}
                      className="w-full rounded-full border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 disabled:opacity-60"
                    />
                  </div>

                  {speechSupported && (
                    <button
                      type="button"
                      onClick={toggleVoice}
                      title={isListening ? 'Stop listening' : 'Speak query in Hindi or English'}
                      className={clsx(
                        'grid size-9 shrink-0 place-items-center rounded-full transition cursor-pointer',
                        isListening
                          ? 'bg-rose-600 text-white animate-pulse'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-slate-200',
                      )}
                      aria-label="Voice input"
                    >
                      <Mic size={15} />
                    </button>
                  )}

                  <button
                    type="submit"
                    disabled={!input.trim() || chatMutation.isPending}
                    className="grid size-9 shrink-0 place-items-center rounded-full bg-sky-600 text-white shadow-sm hover:bg-sky-500 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    aria-label="Send message"
                  >
                    <Send size={14} className="ml-0.5" />
                  </button>
                </form>

                <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 px-1">
                  <span>Press Enter to send</span>
                  <span>🔒 Privacy-first · No third-party data tracking</span>
                </div>
              </footer>
            </>
          )}
        </div>
      )}
    </>
  );
}
