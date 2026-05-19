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
  userId?: string | number;
  userName?: string;
  userEmail?: string;
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
        nextNodeId: 'root',
        action: 'query_source'
      },
      {
        id: 'root_cause',
        label: '🔍 根因分析',
        requiresInput: false,
        nextNodeId: 'root',
        action: 'root_cause_analysis'
      },
      {
        id: 'solution',
        label: '💡 解决方向',
        requiresInput: false,
        nextNodeId: 'root',
        action: 'solution_direction'
      },
      {
        id: 'modify_code',
        label: '✏️ 帮我改代码',
        requiresInput: false,
        nextNodeId: 'root',
        action: 'modify_code'
      },
      {
        id: 'expert_method',
        label: '👨‍🔬 查询专家方法',
        requiresInput: false,
        nextNodeId: 'root',
        action: 'expert_method'
      },
      {
        id: 'enterprise_doc',
        label: '📚 查询企业文档',
        requiresInput: false,
        nextNodeId: 'root',
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
  // 根节点
  'root0': {
    id: 'root0',
    text: '您好！我是 AI 助手，请问您需要什么帮助？',
    options: [
      {
        id: 'query',
        label: '📊 查询数据',
        nextNodeId: 'query_type',
        action: 'query_data'
      },
      {
        id: 'report',
        label: '📄 生成报告',
        requiresInput: true,
        inputPlaceholder: '请输入报告名称（例如：2024年度报告）',
        inputType: 'text',
        nextNodeId: 'report_confirm',
        action: 'generate_report'
      },
      {
        id: 'stats',
        label: '📈 查看统计',
        nextNodeId: 'stats_period',
        action: 'view_stats'
      },
      {
        id: 'support',
        label: '💬 技术支持',
        requiresInput: true,
        inputPlaceholder: '请描述您遇到的问题',
        inputType: 'text',
        nextNodeId: 'support_result',
        action: 'get_support'
      }
    ]
  },
  
  // 查询类型节点
  'query_type': {
    id: 'query_type',
    text: '请选择要查询的内容：',
    options: [
      {
        id: 'user',
        label: '👤 查询用户',
        requiresInput: true,
        inputPlaceholder: '请输入用户名、ID或邮箱',
        inputType: 'text',
        nextNodeId: 'query_result',
        action: 'query_user'
      },
      {
        id: 'order',
        label: '📦 查询订单',
        requiresInput: true,
        inputPlaceholder: '请输入订单号',
        inputType: 'text',
        nextNodeId: 'query_result',
        action: 'query_order'
      },
      {
        id: 'product',
        label: '🛍️ 查询产品',
        requiresInput: true,
        inputPlaceholder: '请输入产品名称或SKU',
        inputType: 'text',
        nextNodeId: 'query_result',
        action: 'query_product'
      },
      {
        id: 'back',
        label: '🔙 返回上级',
        nextNodeId: 'root',
        action: 'go_back'
      }
    ]
  },
  
  // 统计周期节点
  'stats_period': {
    id: 'stats_period',
    text: '请选择统计周期：',
    options: [
      {
        id: 'today',
        label: '今日',
        nextNodeId: 'stats_result',
        action: 'stats_today'
      },
      {
        id: 'week',
        label: '本周',
        nextNodeId: 'stats_result',
        action: 'stats_week'
      },
      {
        id: 'month',
        label: '本月',
        nextNodeId: 'stats_result',
        action: 'stats_month'
      },
      {
        id: 'custom',
        label: '自定义',
        requiresInput: true,
        inputPlaceholder: '请输入日期范围（格式：2024-01-01 至 2024-01-31）',
        inputType: 'text',
        nextNodeId: 'stats_result',
        action: 'stats_custom',
        validation: (value) => {
          // 简单的日期范围验证
          const regex = /\d{4}-\d{2}-\d{2}\s*至\s*\d{4}-\d{2}-\d{2}/;
          return regex.test(value);
        },
        validationMessage: '日期格式不正确，请使用：2024-01-01 至 2024-01-31'
      },
      {
        id: 'back',
        label: '🔙 返回上级',
        nextNodeId: 'root'
      }
    ]
  },
  
  // 查询结果节点
  'query_result': {
    id: 'query_result',
    text: '正在为您查询，请稍候...',
    options: [
      {
        id: 'new_query',
        label: '🔄 继续查询',
        nextNodeId: 'query_type'
      },
      {
        id: 'home',
        label: '🏠 返回首页',
        nextNodeId: 'root'
      },
      {
        id: 'export',
        label: '📎 导出结果',
        action: 'export_result'
      }
    ],
    onAction: async (context, input) => {
      // 这里调用实际的API查询
      const queryType = context.lastAction;
      const queryValue = context.lastInput;
      
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      if (queryType === 'query_user') {
        return `找到用户 "${queryValue}" 的相关信息：\n• 用户名：张三\n• 邮箱：zhangsan@example.com\n• 角色：管理员\n• 注册时间：2023-01-15`;
      } else if (queryType === 'query_order') {
        return `订单 ${queryValue} 详情：\n• 状态：已完成\n• 金额：¥299.00\n• 下单时间：2024-01-20\n• 物流单号：SF1234567890`;
      } else {
        return `查询结果：已找到与 "${queryValue}" 相关的信息，共 3 条记录。`;
      }
    }
  },
  
  // 统计结果节点
  'stats_result': {
    id: 'stats_result',
    text: '正在生成统计报告...',
    options: [
      {
        id: 'again',
        label: '🔄 重新统计',
        nextNodeId: 'stats_period'
      },
      {
        id: 'export',
        label: '📊 导出报告',
        action: 'export_stats'
      },
      {
        id: 'home',
        label: '🏠 返回首页',
        nextNodeId: 'root'
      }
    ],
    onAction: async (context, input) => {
      const period = context.lastAction;
      const customRange = context.lastInput;
      
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      if (period === 'stats_today') {
        return `今日统计（${new Date().toLocaleDateString()}）：\n• 访问量：1,234\n• 订单数：89\n• 成交额：¥12,345\n• 转化率：7.2%`;
      } else if (period === 'stats_week') {
        return `本周统计：\n• 总访问量：8,765\n• 总订单：623\n• 总成交额：¥87,654\n• 平均转化率：7.1%`;
      } else {
        return `自定义统计报告已生成：\n${customRange || '指定时间段'}\n数据正在处理中，请稍后查看完整报告。`;
      }
    }
  },
  
  // 报告确认节点
  'report_confirm': {
    id: 'report_confirm',
    text: '报告正在生成中...',
    options: [
      {
        id: 'download',
        label: '📥 下载报告',
        action: 'download_report'
      },
      {
        id: 'new',
        label: '🔄 新建报告',
        nextNodeId: 'root'
      },
      {
        id: 'email',
        label: '📧 发送到邮箱',
        requiresInput: true,
        inputPlaceholder: '请输入邮箱地址',
        inputType: 'email',
        action: 'email_report',
        validation: (value) => {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          return emailRegex.test(value);
        },
        validationMessage: '请输入有效的邮箱地址'
      }
    ],
    onAction: async (context, input) => {
      const reportName = context.lastInput;
      const action = context.lastAction;
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (action === 'download_report') {
        return `报告 "${reportName}" 已生成，下载链接：/reports/${Date.now()}.pdf`;
      } else if (action === 'email_report') {
        return `报告已发送到 ${input}，请查收邮件。`;
      }
      return `报告 "${reportName}" 已生成。`;
    }
  },
  
  // 支持结果节点
  'support_result': {
    id: 'support_result',
    text: '感谢您的反馈，我们会尽快处理！',
    options: [
      {
        id: 'ticket',
        label: '🎫 查看工单',
        action: 'view_ticket'
      },
      {
        id: 'continue',
        label: '💬 继续咨询',
        nextNodeId: 'root'
      },
      {
        id: 'end',
        label: '✅ 结束对话',
        isEnd: true
      }
    ],
    isEnd: false,
    endMessage: '感谢使用，祝您生活愉快！',
    onAction: async (context, input) => {
      const issue = context.lastInput;
      const ticketId = 'TK' + Date.now();
      return `技术支持工单已创建！\n工单号：${ticketId}\n问题描述：${issue}\n我们会尽快在24小时内回复您。`;
    }
  }
};

// ==================== 主要组件 ====================

interface GuidedChatBoxProps {
  apiEndpoint?: string;
  userId?: string | number;
  userName?: string;
  userEmail?: string;
  onMessagesChange?: (messages: Message[]) => void;
  onError?: (error: Error) => void;
  customActions?: Record<string, (context: DialogContext, input?: string) => Promise<string>>;
}

export default function GuidedChatBox({ 
  userId,
  userName,
  userEmail,
  onMessagesChange,
  onError,
  customActions = {}
}: GuidedChatBoxProps) {
  const theme = useTheme();
  
  // 状态管理
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: 'assistant',
      content: `你好${userName ? '，' + userName : '！'}我是 AI 助手，请问有什么可以帮您？`,
      timestamp: new Date(),
      isError: false,
      isQuestion: true,
      options: QUESTION_TREE['root'].options,
      questionNode: QUESTION_TREE['root']
    }
  ]);
  
  const [currentNode, setCurrentNode] = useState<QuestionNode>(QUESTION_TREE['root']);
  const [context, setContext] = useState<DialogContext>({
    userId,
    userName,
    userEmail,
    history: []  // 记录用户的选择历史
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [inputValue, setInputValue] = useState<string>('');
  const [currentOption, setCurrentOption] = useState<Option | null>(null);
  const [validationError, setValidationError] = useState<string>('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 滚动到底部
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // 通知父组件消息变化
  useEffect(() => {
    if (onMessagesChange) {
      onMessagesChange(messages);
    }
  }, [messages, onMessagesChange]);

  // 处理选项选择
  const handleOptionSelect = async (option: Option) => {
    setValidationError('');
    
    // 如果是返回操作
    if (option.action === 'go_back' && option.nextNodeId) {
      navigateToNode(option.nextNodeId, option);
      return;
    }
    
    // 如果需要输入
    if (option.requiresInput) {
      setCurrentOption(option);
      setTimeout(() => inputRef.current?.focus(), 100);
      return;
    }
    
    // 直接执行操作
    await executeOption(option);
  };

  // 执行选项操作
  const executeOption = async (option: Option, customInput?: string) => {
    // 添加用户选择消息
    const userMessageText = customInput 
      ? `${option.label}: ${customInput}`
      : option.label;
    
    const userMessage: Message = {
      id: Date.now(),
      role: 'user',
      content: userMessageText,
      timestamp: new Date(),
      isError: false
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    
    // 更新上下文
    const updatedContext = {
      ...context,
      lastAction: option.action,
      lastInput: customInput || option.label,
      history: [...(context.history || []), {
        nodeId: currentNode.id,
        optionId: option.id,
        input: customInput,
        timestamp: new Date()
      }]
    };
    setContext(updatedContext);
    
    try {
      let response = '';
      
      // 处理自定义动作
      if (customActions[option.action || '']) {
        response = await customActions[option.action!](updatedContext, customInput);
      } 
      // 处理节点内定义的动作
      else if (currentNode.onAction) {
        response = await currentNode.onAction(updatedContext, customInput);
      }
      // 默认处理
      else {
        response = await defaultActionHandler(option, customInput, updatedContext);
      }
      
      // 确定下一个节点
      let nextNode: QuestionNode | null = null;
      if (option.nextNodeId && QUESTION_TREE[option.nextNodeId]) {
        nextNode = QUESTION_TREE[option.nextNodeId];
      } else if (option.isEnd) {
        nextNode = null;
      }
      
      // 检查当前节点是否为结束节点
      if (currentNode.isEnd || (option.isEnd) || (nextNode && nextNode.isEnd)) {
        const endMessage = currentNode.endMessage || option.endMessage || nextNode?.endMessage || '感谢您的使用！';
        
        const assistantMessage: Message = {
          id: Date.now() + 1,
          role: 'assistant',
          content: response + '\n\n' + endMessage,
          timestamp: new Date(),
          isError: false
        };
        setMessages(prev => [...prev, assistantMessage]);
      } 
      else if (nextNode) {
        // 有下一个问题节点
        const assistantMessage: Message = {
          id: Date.now() + 1,
          role: 'assistant',
          content: response ? response + '\n\n' + nextNode.text : nextNode.text,
          timestamp: new Date(),
          isError: false,
          isQuestion: true,
          options: nextNode.options,
          questionNode: nextNode
        };
        setMessages(prev => [...prev, assistantMessage]);
        setCurrentNode(nextNode);
      }
      else {
        // 对话结束
        const assistantMessage: Message = {
          id: Date.now() + 1,
          role: 'assistant',
          content: response,
          timestamp: new Date(),
          isError: false
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
      
      // 重置输入状态
      setCurrentOption(null);
      setInputValue('');
      
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
      content: `对话已清空${userName ? '，' + userName : '！'}请问有什么可以帮您？`,
      timestamp: new Date(),
      isQuestion: true,
      options: QUESTION_TREE['root'].options,
      questionNode: QUESTION_TREE['root']
    }]);
    setCurrentNode(QUESTION_TREE['root']);
    setContext({ userId, userName, userEmail, history: [] });
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
                {userName && (
                  <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                    (与 {userName} 的对话)
                  </Typography>
                )}
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
  onOptionSelect 
}: { 
  message: Message; 
  onCopy: (content: string) => void;
  onOptionSelect: (option: Option) => void;
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