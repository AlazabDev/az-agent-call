// src/components/CodexChat/index.tsx

import React, { useState, useEffect, useRef } from 'react';
import type { AgentMessage, AgentResponse } from '../../../shared/types/agent';
import './styles.css';

interface CodexChatProps {
  apiBase?: string;
  agentName?: string;
  placeholder?: string;
}

export const CodexChat: React.FC<CodexChatProps> = ({
  apiBase = '/api/chat',
  agentName = 'Codex Agent',
  placeholder = 'اكتب رسالتك هنا...'
}) => {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // التحقق من الاتصال
  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      const response = await fetch(`${apiBase}/api/status`);
      const data = await response.json();
      setIsConnected(data.success);
    } catch {
      setIsConnected(false);
    }
  };

  // التمرير إلى أسفل عند إضافة رسائل جديدة
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // بدء محادثة جديدة
  const startNewConversation = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${apiBase}/api/conversation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initialMessage: 'مرحباً' })
      });

      const data = await response.json();
      if (data.success) {
        setConversationId(data.conversationId);
        setMessages([
          {
            id: 'system-1',
            role: 'system',
            content: '👋 مرحباً! أنا وكيل Codex جاهز لمساعدتك.',
            timestamp: new Date()
          }
        ]);
      }
    } catch (error) {
      console.error('Failed to start conversation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // إرسال رسالة
  const sendMessage = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    // إضافة رسالة المستخدم
    const userMessage: AgentMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmedInput,
      timestamp: new Date(),
      conversationId
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch(`${apiBase}/api/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmedInput,
          conversationId
        })
      });

      const data: AgentResponse = await response.json();

      if (data) {
        // تحديث معرف المحادثة
        if (data.conversationId && !conversationId) {
          setConversationId(data.conversationId);
        }

        // إضافة رد الوكيل
        const assistantMessage: AgentMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.outputText || data.output,
          timestamp: new Date(data.timestamp),
          conversationId: data.conversationId,
          toolCalls: data.toolCalls
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      // إضافة رسالة خطأ
      const errorMessage: AgentMessage = {
        id: `error-${Date.now()}`,
        role: 'system',
        content: '⚠️ عذراً، حدث خطأ في الاتصال بالوكيل. يرجى المحاولة مرة أخرى.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  // معالجة الضغط على Enter
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="codex-chat">
      {/* رأس الدردشة */}
      <div className="codex-chat-header">
        <div className="header-left">
          <span className="agent-icon">🤖</span>
          <span className="agent-name">{agentName}</span>
          <span className={`status-dot ${isConnected ? 'online' : 'offline'}`} />
        </div>
        <div className="header-right">
          <button 
            className="btn-new-conversation"
            onClick={startNewConversation}
            disabled={isLoading}
          >
            ➕ جديد
          </button>
        </div>
      </div>

      {/* منطقة الرسائل */}
      <div className="codex-chat-messages">
        {messages.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">💬</div>
            <h3>مرحباً بك في Codex</h3>
            <p>اسأل الوكيل عن أي شيء متعلق بمركز الاتصال</p>
            <button 
              className="btn-start"
              onClick={startNewConversation}
              disabled={isLoading}
            >
              🚀 بدء المحادثة
            </button>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`message ${msg.role}`}>
              <div className="message-content">{msg.content}</div>
              {msg.toolCalls && msg.toolCalls.length > 0 && (
                <div className="tool-calls">
                  {msg.toolCalls.map((tool, i) => (
                    <div key={i} className="tool-call">
                      <span className="tool-icon">🔧</span>
                      <span className="tool-name">{tool.name}</span>
                      <span className={`tool-status ${tool.status}`}>
                        {tool.status === 'success' ? '✅' : 
                         tool.status === 'error' ? '❌' : '⏳'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <div className="message-time">
                {new Date(msg.timestamp).toLocaleTimeString('ar-EG')}
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="message assistant loading">
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* مدخل الرسائل */}
      <div className="codex-chat-input">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          disabled={isLoading || !isConnected}
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || isLoading || !isConnected}
          className="btn-send"
        >
          📤
        </button>
      </div>

      {/* حالة الاتصال */}
      <div className="codex-chat-footer">
        <span className="connection-status">
          {isConnected ? '🟢 متصل' : '🔴 غير متصل'}
        </span>
        <span className="message-count">
          {messages.length} رسائل
        </span>
      </div>
    </div>
  );
};

export default CodexChat;