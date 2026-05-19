// ChatBox.tsx - 完整修复版
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  TextField,
  IconButton,
  Avatar,
  Typography,
  CircularProgress,
  Stack,
  useTheme,
  alpha
} from '@mui/material';
import {
  Send,
  SmartToy,
  Person,
  ContentCopy,
  ThumbUp,
  ThumbDown,
  DeleteSweep
} from '@mui/icons-material';

// 消息类型定义
type Message = {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isError?: boolean;
};

// 消息气泡子组件
const MessageBubble = ({ 
  message, 
  onCopy,
  onLike,
  onDislike
}: { 
  message: Message;
  onCopy: (content: string) => void;
  onLike?: (messageId: number) => void;
  onDislike?: (messageId: number) => void;
}) => {
  const theme = useTheme();
  const isUser = message.role === 'user';
  
  const handleCopy = () => {
    onCopy(message.content);
  };

  const handleLike = () => {
    onLike?.(message.id);
  };

  const handleDislike = () => {
    onDislike?.(message.id);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        mb: 3,
        animation: 'fadeIn 0.3s ease-in'
      }}
    >
      <Box
        sx={{
          display: 'flex',
          gap: 2,
          maxWidth: '80%',
          flexDirection: isUser ? 'row-reverse' : 'row'
        }}
      >
        <Avatar
          sx={{
            bgcolor: isUser ? theme.palette.primary.main : theme.palette.secondary.main,
            width: 36,
            height: 36
          }}
        >
          {isUser ? <Person /> : <SmartToy />}
        </Avatar>

        <Box sx={{ flex: 1 }}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              bgcolor: isUser 
                ? alpha(theme.palette.primary.main, 0.1)
                : '#ffffff',
              borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
              border: `1px solid ${theme.palette.divider}`,
            }}
          >
            <Typography 
              variant="body1" 
              sx={{ 
                whiteSpace: 'pre-wrap', 
                wordBreak: 'break-word' 
              }}
            >
              {message.content}
            </Typography>
            
            {!isUser && !message.isError && (
              <Stack
                direction="row"
                spacing={1}
                sx={{
                  mt: 1.5,
                  pt: 1,
                  borderTop: `1px solid ${theme.palette.divider}`,
                  opacity: 0.6,
                  '&:hover': { opacity: 1 }
                }}
              >
                <IconButton size="small" onClick={handleCopy}>
                  <ContentCopy fontSize="small" />
                </IconButton>
                <IconButton size="small" onClick={handleLike}>
                  <ThumbUp fontSize="small" />
                </IconButton>
                <IconButton size="small" onClick={handleDislike}>
                  <ThumbDown fontSize="small" />
                </IconButton>
              </Stack>
            )}
          </Paper>
          
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              display: 'block',
              mt: 0.5,
              textAlign: isUser ? 'right' : 'left'
            }}
          >
            {message.timestamp.toLocaleTimeString()}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

// 主组件 - 添加了必要的 props
export default function ChatBox({ 
  apiEndpoint = '/api/chat',
  initialMessages = [],
  onSendMessage,
  onError,
  userId,           // 新增：用户ID
  userName,         // 新增：用户名
  onMessagesChange  // 新增：消息变化回调
}: { 
  apiEndpoint?: string;
  initialMessages?: Message[];
  onSendMessage?: (message: string, userId?: string | number) => Promise<string>;
  onError?: (error: Error) => void;
  userId?: string | number;     // 新增
  userName?: string;            // 新增
  onMessagesChange?: (messages: Message[]) => void;  // 新增
}) {
  const theme = useTheme();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: 'assistant',
      content: `你好${userName ? '，' + userName : ''}！我是 AI 助手，有什么我可以帮助你的吗？`,
      timestamp: new Date(),
      isError: false
    },
    ...initialMessages
  ]);
  
  const [inputValue, setInputValue] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 当消息变化时通知父组件
  useEffect(() => {
    if (onMessagesChange) {
      onMessagesChange(messages);
    }
  }, [messages, onMessagesChange]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const callDefaultAPI = async (message: string, history: Message[]): Promise<string> => {
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        userId,  // 发送用户ID到后端
        userName,
        history: history.slice(-10)
      }),
    });

    if (!response.ok) {
      throw new Error(`API 请求失败: ${response.status}`);
    }

    const data = await response.json();
    return data.content || data.reply || data.message || `这是对 "${message}" 的响应。`;
  };

  const handleSend = async (): Promise<void> => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now(),
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
      isError: false
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInputValue = inputValue;
    setInputValue('');
    setIsLoading(true);

    try {
      let assistantContent: string;

      if (onSendMessage) {
        assistantContent = await onSendMessage(currentInputValue, userId);
      } else {
        assistantContent = await callDefaultAPI(currentInputValue, messages);
      }

      const assistantMessage: Message = {
        id: Date.now() + 1,
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date(),
        isError: false
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('发送消息失败:', error);
      
      const errorMessage: Message = {
        id: Date.now(),
        role: 'assistant',
        content: '抱歉，发生了错误，请稍后重试。',
        timestamp: new Date(),
        isError: true
      };
      
      setMessages(prev => [...prev, errorMessage]);
      onError?.(error as Error);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = (content: string): void => {
    navigator.clipboard.writeText(content);
    // 可以添加 toast 提示
  };

  const handleClearChat = (): void => {
    const initialAssistantMessage: Message = {
      id: Date.now(),
      role: 'assistant',
      content: `对话已清空${userName ? '，' + userName : ''}。有什么我可以帮助你的吗？`,
      timestamp: new Date(),
      isError: false
    };
    setMessages([initialAssistantMessage]);
  };

  const handleLike = (messageId: number): void => {
    console.log(`用户 ${userId} 点赞消息: ${messageId}`);
    // 可以调用 API 记录反馈
  };

  const handleDislike = (messageId: number): void => {
    console.log(`用户 ${userId} 点踩消息: ${messageId}`);
    // 可以调用 API 记录反馈
  };

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: '#f7f8fa'
      }}
    >
      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderRadius: 0,
          borderBottom: `1px solid ${theme.palette.divider}`,
          bgcolor: 'background.paper'
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={2}>
            <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
              <SmartToy />
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight="bold">
                AI 助手
                {userName && (
                  <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                    (与 {userName} 的对话)
                  </Typography>
                )}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                在线 · 随时为您服务
              </Typography>
            </Box>
          </Stack>
          
          <IconButton onClick={handleClearChat} color="secondary" size="small">
            <DeleteSweep />
          </IconButton>
        </Stack>
      </Paper>

      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          px: 2,
          py: 3,
          '&::-webkit-scrollbar': {
            width: '8px'
          },
          '&::-webkit-scrollbar-track': {
            bgcolor: '#f1f1f1',
            borderRadius: '4px'
          },
          '&::-webkit-scrollbar-thumb': {
            bgcolor: '#c1c1c1',
            borderRadius: '4px',
            '&:hover': {
              bgcolor: '#a8a8a8'
            }
          }
        }}
      >
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            onCopy={handleCopy}
            onLike={handleLike}
            onDislike={handleDislike}
          />
        ))}
        
        {isLoading && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'flex-start',
              mb: 2
            }}
          >
            <Paper
              elevation={0}
              sx={{
                p: 2,
                bgcolor: '#f0f0f0',
                borderRadius: '18px',
                maxWidth: '70%',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}
            >
              <CircularProgress size={20} />
              <Typography variant="body2" color="text.secondary">
                AI 正在思考...
              </Typography>
            </Paper>
          </Box>
        )}
        
        <div ref={messagesEndRef} />
      </Box>

      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderTop: `1px solid ${theme.palette.divider}`,
          bgcolor: 'background.paper'
        }}
      >
        <Stack direction="row" spacing={2} alignItems="flex-end">
          <TextField
            fullWidth
            multiline
            maxRows={5}
            placeholder="输入消息... (Shift+Enter 换行，Enter 发送)"
            value={inputValue}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
              setInputValue(e.target.value)
            }
            onKeyPress={handleKeyPress}
            inputRef={inputRef}
            disabled={isLoading}
            variant="outlined"
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '24px',
                bgcolor: '#f7f8fa'
              }
            }}
          />
          <IconButton
            color="primary"
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading}
            sx={{
              bgcolor: inputValue.trim() && !isLoading 
                ? theme.palette.primary.main 
                : theme.palette.grey[300],
              color: inputValue.trim() && !isLoading 
                ? 'white' 
                : theme.palette.grey[500],
              '&:hover': {
                bgcolor: inputValue.trim() && !isLoading 
                  ? theme.palette.primary.dark 
                  : theme.palette.grey[300]
              },
              width: 48,
              height: 48,
              borderRadius: '50%'
            }}
          >
            <Send />
          </IconButton>
        </Stack>
        <Typography 
          variant="caption" 
          color="text.secondary" 
          sx={{ mt: 1, display: 'block', textAlign: 'center' }}
        >
          AI 生成的内容仅供参考，请谨慎判断
        </Typography>
      </Paper>

      <style>
        {`
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>
    </Box>
  );
}