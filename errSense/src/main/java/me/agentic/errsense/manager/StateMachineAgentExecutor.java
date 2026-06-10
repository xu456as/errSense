package me.agentic.errsense.manager;

import com.google.adk.agents.LlmAgent;
import com.google.adk.runner.InMemoryRunner;
import com.google.adk.sessions.Session;
import com.google.genai.types.Content;
import com.google.genai.types.Part;
import me.agentic.errsense.model.AgentNode;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.stream.Collectors;

@Component
public class StateMachineAgentExecutor {

    private final AgentNodeManager agentNodeManager;

    public StateMachineAgentExecutor(AgentNodeManager agentNodeManager) {
        this.agentNodeManager = agentNodeManager;
    }

    /**
     * 状态机模式执行：从起始节点开始，根据每个节点的执行结果动态路由到下一个节点
     */
    public StateMachineResult execute(String graphName, String startNodeName, String initialInput) {
        List<AgentNode> nodes = agentNodeManager.fetchAgentNodes(graphName);
        if (nodes.isEmpty()) {
            throw new IllegalArgumentException("Graph not found: " + graphName);
        }

        Map<String, AgentNode> nodeMap = nodes.stream()
                .collect(Collectors.toMap(AgentNode::getNodeName, n -> n));

        if (!nodeMap.containsKey(startNodeName)) {
            throw new IllegalArgumentException("Start node not found: " + startNodeName);
        }

        List<ExecutionStep> executionHistory = new ArrayList<>();
        Set<String> visitedNodes = new HashSet<>();
        
        AgentNode currentNode = nodeMap.get(startNodeName);
        String currentInput = initialInput;
        int stepCount = 0;
        final int maxSteps = 50; // 防止无限循环

        while (currentNode != null && stepCount < maxSteps) {
            // 检查循环
            if (visitedNodes.contains(currentNode.getNodeName())) {
                executionHistory.add(new ExecutionStep(
                        stepCount,
                        currentNode.getNodeName(),
                        currentInput,
                        null,
                        "Cycle detected at node: " + currentNode.getNodeName(),
                        true
                ));
                break;
            }
            visitedNodes.add(currentNode.getNodeName());

            // 执行当前节点
            AgentExecutionResult result = executeSingleAgent(currentNode, currentInput);
            stepCount++;

            // 记录执行步骤
            executionHistory.add(new ExecutionStep(
                    stepCount,
                    currentNode.getNodeName(),
                    currentInput,
                    result.output(),
                    null,
                    false
            ));

            // 根据执行结果决定下一个节点
            String nextNodeName = determineNextNode(currentNode, result.output(), nodeMap);
            
            if (nextNodeName == null) {
                // 没有下一个节点，执行结束
                break;
            }

            currentNode = nodeMap.get(nextNodeName);
            currentInput = result.output(); // 将当前节点输出作为下一个节点的输入
        }

        return new StateMachineResult(graphName, executionHistory, stepCount >= maxSteps);
    }

    /**
     * 根据当前节点配置和执行结果决定下一个节点
     * 支持基于输出内容的条件路由
     */
    private String determineNextNode(AgentNode currentNode, String output, Map<String, AgentNode> nodeMap) {
        String nextHops = currentNode.getNextHops();
        if (nextHops == null || nextHops.isEmpty()) {
            return null;
        }

        List<String> hops = parseNextHops(nextHops);
        if (hops.isEmpty()) {
            return null;
        }

        // 如果只有一个下一跳，直接返回
        if (hops.size() == 1) {
            String nextNode = hops.get(0);
            return nodeMap.containsKey(nextNode) ? nextNode : null;
        }

        // 多个下一跳时，尝试基于输出内容进行条件路由
        // 这里可以扩展为更复杂的路由逻辑，例如基于关键字匹配
        return selectNextNodeByOutput(hops, output, nodeMap);
    }

    /**
     * 根据输出内容选择下一个节点（简单的关键字匹配示例）
     */
    private String selectNextNodeByOutput(List<String> candidates, String output, Map<String, AgentNode> nodeMap) {
        // 默认返回第一个可用节点
        for (String candidate : candidates) {
            if (nodeMap.containsKey(candidate)) {
                // 可以在这里添加更复杂的路由逻辑
                // 例如：根据output中的关键字选择不同的节点
                // if (output.contains("error")) return "error_handler_node";
                return candidate;
            }
        }
        return null;
    }

    /**
     * 执行单个 Agent
     */
    private AgentExecutionResult executeSingleAgent(AgentNode node, String input) {
        LlmAgent agent = LlmAgent.builder()
                .name(node.getNodeName())
                .instruction(node.getInstruction())
                .model(node.getModelName() != null ? node.getModelName() : "gemini-2.5-flash")
                .build();

        InMemoryRunner runner = new InMemoryRunner(agent, "errsense-state-machine");
        Session session = runner.sessionService().createSession("user-001", "user").blockingGet();

        StringBuilder output = new StringBuilder();
        Content content = Content.builder().parts(Part.builder().text(input).build()).build();
        
        runner.runAsync("user", session.id(), content)
                .blockingForEach(event -> {
                    if (event.content().isPresent()) {
                        output.append(event.content().toString());
                    }
                });

        return new AgentExecutionResult(node.getNodeName(), output.toString());
    }

    private List<String> parseNextHops(String nextHopsJson) {
        if (nextHopsJson == null || nextHopsJson.isEmpty()) {
            return Collections.emptyList();
        }
        try {
            String cleaned = nextHopsJson.replaceAll("[\\[\\]\"\\s]", "");
            if (cleaned.isEmpty()) return Collections.emptyList();
            return Arrays.asList(cleaned.split(","));
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    // 内部记录类
    private record AgentExecutionResult(String nodeName, String output) {}

    /**
     * 单个执行步骤记录
     */
    public record ExecutionStep(
            int stepNumber,
            String nodeName,
            String input,
            String output,
            String error,
            boolean isError
    ) {}

    /**
     * 状态机执行结果
     */
    public record StateMachineResult(
            String graphName,
            List<ExecutionStep> executionHistory,
            boolean reachedMaxSteps
    ) {
        public String getFinalOutput() {
            if (executionHistory.isEmpty()) {
                return null;
            }
            ExecutionStep lastStep = executionHistory.get(executionHistory.size() - 1);
            return lastStep.isError() ? null : lastStep.output();
        }

        public List<String> getVisitedNodes() {
            return executionHistory.stream()
                    .map(ExecutionStep::nodeName)
                    .distinct()
                    .collect(Collectors.toList());
        }
    }
}
