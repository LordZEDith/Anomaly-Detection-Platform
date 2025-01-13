import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Minimize2, Maximize2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AIChatProps {
  isVisible: boolean;
  marketData?: any;
  newsData?: any[];
  strategyName?: string;
  strategyPurpose?: string;
  baseFeatures?: { [key: string]: string };
  derivedFeatures?: string[];
}

const HIDDEN_MESSAGE = "based on the current market data, strategy indicators, and recent news";

export const AIChat: React.FC<AIChatProps> = ({ 
  isVisible, 
  marketData, 
  newsData, 
  strategyName,
  strategyPurpose,
  baseFeatures,
  derivedFeatures
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isVisible) {
      setMessages([]);
      setMessage('');
      setIsLoading(false);
      setIsOpen(false);
      return;
    }

    if (isVisible && marketData?.symbol) {
      setMessages([]);
      setMessage('');
      setIsLoading(true);
      setIsOpen(true);
      
      const initialMessage = `Analyze ${marketData.symbol} stock based on the current market data, strategy indicators, and recent news.`;
      handleAnalysis(initialMessage);
    }
  }, [isVisible, marketData?.symbol, strategyName, marketData]);

  const handleAnalysis = async (userMessage: string) => {
    if (isLoading && messages.length > 0) return;

    const isInitialAnalysis = userMessage.includes(HIDDEN_MESSAGE);
    
    if (!isInitialAnalysis) {
      setMessages([...messages, { role: 'user' as const, content: userMessage }]);
    }
    
    setIsLoading(true);
    
    try {
      const response = await fetch(
        isInitialAnalysis ? '/api/anomaly/chat' : '/api/anomaly/chat/continue', 
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(
            isInitialAnalysis ? {
              messages: [{ role: 'user' as const, content: userMessage }],
              marketData,
              newsData,
              strategyName,
              strategyPurpose,
              baseFeatures,
              derivedFeatures
            } : {
              messages: [...messages, { role: 'user' as const, content: userMessage }]
            }
          ),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      if (isInitialAnalysis) {
        setMessages([
          { role: 'user' as const, content: userMessage },
          { role: 'assistant' as const, content: data.message }
        ]);
      } else {
        setMessages([
          ...messages,
          { role: 'user' as const, content: userMessage },
          { role: 'assistant' as const, content: data.message }
        ]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages([
        ...messages,
        { role: 'user' as const, content: userMessage },
        { role: 'assistant' as const, content: "I apologize, but I encountered an error while processing your request. Please try again." }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;

    const userMessage = message.trim();
    setMessage('');
    await handleAnalysis(userMessage);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);


  const displayMessages = messages.filter(msg => 
    !(msg.role === 'user' && msg.content.includes(HIDDEN_MESSAGE))
  );

  if (!isVisible) return null;

  const chatSize = isExpanded
    ? "w-1/3 h-screen fixed top-0 right-0 border-l"
    : "w-[600px] h-[700px]";

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!isOpen ? (
        <Button
          onClick={() => setIsOpen(true)}
          className="h-12 w-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
          size="icon"
        >
          <Bot className="h-6 w-6" />
        </Button>
      ) : (
        <Card className={`${chatSize} bg-[#1a1f2c] border-gray-800 shadow-2xl flex flex-col transition-all duration-50 ${isExpanded ? 'border-l' : ''}`}>
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-blue-400" />
              <h3 className="font-semibold text-gray-200">Robo Advisor</h3>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-gray-800/50 text-gray-400 hover:text-gray-300"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-gray-800/50 text-gray-400 hover:text-gray-300"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-track-gray-900/20 scrollbar-thumb-gray-700/50">
            {displayMessages.map((msg, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  {msg.role === 'assistant' ? (
                    <Bot className="h-5 w-5 text-blue-400" />
                  ) : (
                    <div className="h-5 w-5 rounded-full bg-gray-600" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="text-sm text-gray-300 bg-gray-800/50 rounded-lg p-3 border border-gray-800 prose prose-invert max-w-none prose-headings:mt-2 prose-headings:mb-1 prose-p:my-1 prose-ul:my-1 prose-li:my-0">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex items-center justify-center py-2">
                <div className="animate-pulse text-blue-400">Thinking...</div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-gray-800">
            <form 
              className="flex items-center gap-2"
              onSubmit={sendMessage}
            >
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ask anything about the analysis..."
                className="flex-1 bg-gray-900/50 border-gray-800 text-gray-200 placeholder:text-gray-500 focus:ring-blue-500/20 focus:border-blue-500/40"
                disabled={isLoading}
              />
              <Button 
                type="submit"
                size="icon"
                className="h-10 w-10 bg-blue-600 hover:bg-blue-700 text-white"
                disabled={!message.trim() || isLoading}
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </Card>
      )}
    </div>
  );
}; 