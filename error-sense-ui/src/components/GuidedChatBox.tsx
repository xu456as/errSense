// GuidedChatBox.tsx - 基于动态问题树的引导式聊天框
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
  alpha,
  Button,
  Chip,
  Divider
} from '@mui/material';
import {
  Send,
  SmartToy,
  Person,
  ContentCopy,
  ThumbUp,
  ThumbDown,
  DeleteSweep,
  ArrowBack,
  Home
} from '@mui/icons-material';
import { useErrReportStore } from '../stores/ErrReportStore';
import { MessageItem, MessageType } from '../api/contract';

// ==================== 类型定义 ====================

// 选项配置
interface Option {
  id: string;
  label: string;
  requiresInput?: boolean;
  inputPlaceholder?: string;
  inputType?: 'text' | 'number' | 'email' | 'date';
  action?: string;  // 触发的动作
  nextNodeId?: string;  // 下一个问题节点ID
  validation?: (value: string) => boolean;  // 输入验证函数
  validationMessage?: string;  // 验证失败提示
  isEnd?: boolean;  // 是否是结束选项
  endMessage?: string;  // 结束时的消息
}

// 问题节点配置
interface QuestionNode {
  id: string;
  text: string;
  options: Option[];
  isEnd?: boolean;  // 是否是结束节点
  endMessage?: string;  // 结束时的消息
  onAction?: (context: any, input?: string) => Promise<string>;  // 自定义动作处理
}

// 对话上下文
interface DialogContext {
  stackTrace?: string;
  commitId?: string;
  [key: string]: any;  // 存储用户选择的数据
}

// 消息类型
interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isError?: boolean;
  isQuestion?: boolean;
  options?: Option[];
  questionNode?: QuestionNode;
}

// ==================== 问题树配置 ====================

// 示例：定义你的问题树
const QUESTION_TREE: Record<string, QuestionNode> = {
  'root': {
    id: 'root',
    text: '您好！我是 AI 助手，请问您需要什么帮助？',
    options: [
      {
        id: 'view_source',
        label: '📊 查看源码',
        requiresInput: false,
        nextNodeId: 'view_source',
        action: 'query_source'
      },
      {
        id: 'root_cause',
        label: '🔍 根因分析',
        requiresInput: false,
        nextNodeId: 'root_cause',
        action: 'root_cause_analysis'
      },
      {
        id: 'solution',
        label: '💡 解决方向',
        requiresInput: false,
        nextNodeId: 'solution',
        action: 'solution_direction'
      },
      {
        id: 'modify_code',
        label: '✏️ 帮我改代码',
        requiresInput: false,
        nextNodeId: 'modify_code',
        action: 'modify_code'
      },
      {
        id: 'expert_method',
        label: '👨‍🔬 查询专家方法',
        requiresInput: false,
        nextNodeId: 'expert_method',
        action: 'expert_method'
      },
      {
        id: 'enterprise_doc',
        label: '📚 查询企业文档',
        requiresInput: false,
        nextNodeId: 'enterprise_doc',
        action: 'enterprise_doc'
      },
      {
        id: 'like',
        label: '👍 like',
        nextNodeId: 'root',
        action: 'like'
      },
      {
        id: 'provide_method',
        label: '📝 提供我的方法',
        requiresInput: true,
        inputPlaceholder: '请输入您的解决方案',
        inputType: 'text',
        nextNodeId: 'root',
        action: 'provide_method'
      }
    ]
  },

  // 查看源码节点
  'view_source': {
    id: 'view_source',
    text: '📊 正在为您查询源码位置...',
    options: [
      {
        id: 'go_back',
        label: '🔙 返回',
        nextNodeId: 'root',
        action: 'go_back'
      }
    ]
  },

  // 根因分析节点
  'root_cause': {
    id: 'root_cause',
    text: '🔍 正在分析错误根因...',
    options: [
      {
        id: 'go_back',
        label: '🔙 返回',
        nextNodeId: 'root',
        action: 'go_back'
      }
    ]
  },

  // 解决方向节点
  'solution': {
    id: 'solution',
    text: '💡 正在为您提供解决方向...',
    options: [
      {
        id: 'go_back',
        label: '🔙 返回',
        nextNodeId: 'root',
        action: 'go_back'
      }
    ]
  },

  // 帮我改代码节点
  'modify_code': {
    id: 'modify_code',
    text: '✏️ 正在为您生成代码修改方案...',
    options: [
      {
        id: 'go_back',
        label: '🔙 返回',
        nextNodeId: 'root',
        action: 'go_back'
      }
    ]
  },

  // 查询专家方法节点
  'expert_method': {
    id: 'expert_method',
    text: '👨‍🔬 正在为您查询专家方法...',
    options: [
      {
        id: 'go_back',
        label: '🔙 返回',
        nextNodeId: 'root',
        action: 'go_back'
      }
    ]
  },

  // 查询企业文档节点
  'enterprise_doc': {
    id: 'enterprise_doc',
    text: '📚 正在为您查询企业文档...',
    options: [
      {
        id: 'go_back',
        label: '🔙 返回',
        nextNodeId: 'root',
        action: 'go_back'
      }
    ]
  }
};

// ==================== 主要组件 ====================

interface GuidedChatBoxProps {
  errItemId: string;
  apiEndpoint?: string;
  onMessagesChange?: (messages: Message[]) => void;
  onError?: (error: Error) => void;
}

export default function GuidedChatBox({
  errItemId,
  onMessagesChange,
  onError
}: GuidedChatBoxProps) {
  const theme = useTheme();

  const chat = useErrReportStore(state => state.chat);
  const errItemChatMap = useErrReportStore(state => state.errItemChatMap);
  const chatHistory = errItemChatMap[errItemId]?.history || [];

  const convertToMessage = (item: MessageItem, isQuestion = true, options?: Option[], questionNode?: QuestionNode): Message => ({
    id: item.id,
    role: item.role as 'user' | 'assistant',
    content: item.content,
    timestamp: new Date(item.timestamp),
    isError: false,
    isQuestion,
    options: QUESTION_TREE['root'].options,
    questionNode: QUESTION_TREE['root']
  });

  const [messages, setMessages] = useState<Message[]>(() => {
    if (chatHistory.length > 0) {
      return chatHistory.map(item => convertToMessage(item, true));
    }
    return [{
      id: 1,
      role: 'assistant',
      content: '您好！我是 AI 助手，请问有什么可以帮您？',
      timestamp: new Date(),
      isError: false,
      isQuestion: true,
      options: QUESTION_TREE['root'].options,
      questionNode: QUESTION_TREE['root']
    }];
  });

  useEffect(() => {
    if (chatHistory.length > 0) {
      const lastHistoryItem = chatHistory[chatHistory.length - 1];
      const lastMessage = messages[messages.length - 1];

      if (lastMessage && lastMessage.id === lastHistoryItem.id && lastMessage.role === lastHistoryItem.role) {
        return;
      }

      const newMessages = chatHistory.map(item => convertToMessage(item));
      setMessages(newMessages);
    }
  }, [chatHistory]);

  useEffect(() => {
    if (errItemId) {
      const existingHistory = errItemChatMap[errItemId]?.history || [];
      if (existingHistory.length > 0) {
        const newMessages = existingHistory.map(item => convertToMessage(item));
        setMessages(newMessages);
      } else {
        setMessages([{
          id: 1,
          role: 'assistant',
          content: '您好！我是 AI 助手，请问有什么可以帮您？',
          timestamp: new Date(),
          isError: false,
          isQuestion: true,
          options: QUESTION_TREE['root'].options,
          questionNode: QUESTION_TREE['root']
        }]);
      }
    }
  }, [errItemId]);
  
  const [currentNode, setCurrentNode] = useState<QuestionNode>(QUESTION_TREE['root']);
  const [context, setContext] = useState<DialogContext>({
    history: []  // 记录用户的选择历史
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [inputValue, setInputValue] = useState<string>('');
  const [currentOption, setCurrentOption] = useState<Option | null>(null);
  const [validationError, setValidationError] = useState<string>('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const onMessagesChangeRef = useRef(onMessagesChange);
  onMessagesChangeRef.current = onMessagesChange;

  // 滚动到底部
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // 通知父组件消息变化
  useEffect(() => {
    if (onMessagesChangeRef.current) {
      onMessagesChangeRef.current(messages);
    }
  }, [messages]);

  // 处理选项选择
  const handleOptionSelect = async (option: Option) => {
    setValidationError('');
    
    // 如果是返回操作
    if (option.action === 'GoBack' && option.nextNodeId) {
      navigateToNode(option.nextNodeId, option);
      return;
    }
    if (currentOption != option && option.action != 'GoBack') {
      await executeOption(option);
      console.log("todo: hit one api call");
    } 
    setCurrentOption(option);
    // // 如果需要输入
    // if (option.requiresInput) {
    //   setCurrentOption(option);
    //   setTimeout(() => inputRef.current?.focus(), 100);
    //   return;
    // }
    
    // // 直接执行操作
    // await executeOption(option);
  };

  // 执行选项操作
  const executeOption = async (option: Option, customInput?: string) => {
    const userMessageText = customInput
      ? `${option.label}: ${customInput}`
      : option.label;

    const messageItem: MessageItem = {
      id: Date.now(),
      role: 'user',
      type: MessageType.Input,
      content: userMessageText,
      timestamp: new Date().toISOString()
    };

    setIsLoading(true);

    try {
      await chat(errItemId, messageItem);
    } catch (error) {
      console.error('执行操作失败:', error);
      const errorMessage: Message = {
        id: Date.now(),
        role: 'assistant',
        content: '抱歉，操作执行失败，请稍后重试。',
        timestamp: new Date(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
      onError?.(error as Error);
    } finally {
      setIsLoading(false);
      // setCurrentOption(null);
      setInputValue('');
    }
  };

  // 默认动作处理器
  const defaultActionHandler = async (option: Option, input: string | undefined, context: DialogContext): Promise<string> => {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 800));
    return `已收到您的选择：${option.label}${input ? ' (' + input + ')' : ''}`;
  };

  // 导航到指定节点
  const navigateToNode = (nodeId: string, option: Option) => {
    const targetNode = QUESTION_TREE[nodeId];
    if (targetNode) {
      const assistantMessage: Message = {
        id: Date.now(),
        role: 'assistant',
        content: targetNode.text,
        timestamp: new Date(),
        isError: false,
        isQuestion: true,
        options: targetNode.options,
        questionNode: targetNode
      };
      setMessages(prev => [...prev, assistantMessage]);
      setCurrentNode(targetNode);
      setCurrentOption(null);
      setInputValue('');
    }
  };

  // 提交自定义输入
  const handleSubmitInput = async () => {
    if (!currentOption || !inputValue.trim() || isLoading) return;
    
    // 验证输入
    if (currentOption.validation && !currentOption.validation(inputValue)) {
      setValidationError(currentOption.validationMessage || '输入无效，请重试');
      return;
    }
    
    await executeOption(currentOption, inputValue.trim());
  };

  // 返回首页
  const handleGoHome = () => {
    navigateToNode('root', {} as Option);
  };

  // 清空对话
  const handleClearChat = () => {
    setMessages([{
      id: Date.now(),
      role: 'assistant',
      content: '对话已清空，请问有什么可以帮您？',
      timestamp: new Date(),
      isQuestion: true,
      options: QUESTION_TREE['root'].options,
      questionNode: QUESTION_TREE['root']
    }]);
    setCurrentNode(QUESTION_TREE['root']);
    setContext({ history: [] });
    setCurrentOption(null);
    setInputValue('');
    setValidationError('');
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && currentOption && inputValue.trim()) {
      e.preventDefault();
      handleSubmitInput();
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#f7f8fa' }}>
      {/* 头部 */}
      <Paper elevation={0} sx={{ p: 2, borderRadius: 0, borderBottom: `1px solid ${theme.palette.divider}` }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={2}>
            <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
              <SmartToy />
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight="bold">
                智能助手
              </Typography>
              <Typography variant="caption" color="text.secondary">
                引导式问答 · 请选择对应选项
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1}>
            <IconButton onClick={handleGoHome} size="small" title="返回首页">
              <Home />
            </IconButton>
            <IconButton onClick={handleClearChat} size="small" title="清空对话">
              <DeleteSweep />
            </IconButton>
          </Stack>
        </Stack>
      </Paper>

      {/* 消息列表 */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: 2, py: 3 }}>
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            onCopy={handleCopy}
            onOptionSelect={handleOptionSelect}
            currentOption={currentOption}
          />
        ))}
        
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 2 }}>
            <Paper elevation={0} sx={{ p: 2, bgcolor: '#f0f0f0', borderRadius: '18px', display: 'flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={20} />
              <Typography variant="body2" color="text.secondary">正在处理...</Typography>
            </Paper>
          </Box>
        )}
        
        <div ref={messagesEndRef} />
      </Box>

      {/* 输入区域 */}
      <Paper elevation={0} sx={{ p: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
        {currentOption ? (
          <Stack spacing={1}>
            <Stack direction="row" spacing={2}>
              <TextField
                fullWidth
                autoFocus
                type={currentOption.inputType || 'text'}
                placeholder={currentOption.inputPlaceholder || '请输入...'}
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  setValidationError('');
                }}
                onKeyDown={handleKeyPress}
                disabled={isLoading}  
                error={!!validationError}
                helperText={validationError}
                variant="outlined"
                size="small"
              />
              <IconButton
                color="primary"
                onClick={handleSubmitInput}
                disabled={!inputValue.trim() || isLoading}
                sx={{ 
                  bgcolor: theme.palette.primary.main, 
                  color: 'white', 
                  '&:hover': { bgcolor: theme.palette.primary.dark },
                  '&.Mui-disabled': { bgcolor: theme.palette.grey[300] }
                }}
              >
                <Send />
              </IconButton>
            </Stack>
            <Button 
              size="small" 
              onClick={() => setCurrentOption(null)}
              disabled={isLoading}
              sx={{ alignSelf: 'flex-start' }}
            >
              取消
            </Button>
          </Stack>
        ) : (
          <Box sx={{ textAlign: 'center', py: 1 }}>
            <Typography variant="body2" color="text.secondary">
              请从上方选项中选择您需要的服务
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
}

// ==================== 消息气泡组件 ====================

const MessageBubble = ({ 
  message, 
  onCopy, 
  onOptionSelect,
  currentOption
}: { 
  message: Message; 
  onCopy: (content: string) => void;
  onOptionSelect: (option: Option) => void;
  currentOption: Option | null;
}) => {
  const theme = useTheme();
  const isUser = message.role === 'user';
  const isQuestion = message.isQuestion;
  
  return (
    <Box sx={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', mb: 3, animation: 'fadeIn 0.3s ease-in' }}>
      <Box sx={{ display: 'flex', gap: 2, maxWidth: '80%', flexDirection: isUser ? 'row-reverse' : 'row' }}>
        <Avatar sx={{ bgcolor: isUser ? theme.palette.primary.main : theme.palette.secondary.main, width: 36, height: 36 }}>
          {isUser ? <Person /> : <SmartToy />}
        </Avatar>
        
        <Box sx={{ flex: 1 }}>
          {/* CurrentOption Header */}
          {!isUser && currentOption && currentOption.id !== 'root' && (
            <Typography variant="caption" color="primary" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>
              📌 {currentOption.label}
            </Typography>
          )}
          
          <Paper elevation={0} sx={{ p: 2, bgcolor: isUser ? alpha(theme.palette.primary.main, 0.1) : '#ffffff', borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px', border: `1px solid ${theme.palette.divider}` }}>
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {message.content}
            </Typography>
            
            {/* 选项按钮 */}
            {!isUser && isQuestion && message.options && message.options.length > 0 && (
              <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap', gap: 1 }}>
                {message.options.map((option) => (
                  <Button
                    key={option.id}
                    variant="outlined"
                    size="small"
                    onClick={() => onOptionSelect(option)}
                    sx={{ textTransform: 'none' }}
                  >
                    {option.label}
                  </Button>
                ))}
              </Stack>
            )}
            
            {/* 操作按钮 */}
            {!isUser && !message.isError && !isQuestion && (
              <Stack direction="row" spacing={1} sx={{ mt: 1.5, pt: 1, borderTop: `1px solid ${theme.palette.divider}`, opacity: 0.6, '&:hover': { opacity: 1 } }}>
                <IconButton size="small" onClick={() => onCopy(message.content)}><ContentCopy fontSize="small" /></IconButton>
                <IconButton size="small"><ThumbUp fontSize="small" /></IconButton>
                <IconButton size="small"><ThumbDown fontSize="small" /></IconButton>
              </Stack>
            )}
          </Paper>
          
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, textAlign: isUser ? 'right' : 'left' }}>
            {message.timestamp.toLocaleTimeString()}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};