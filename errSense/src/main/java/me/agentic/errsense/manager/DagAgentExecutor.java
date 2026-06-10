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
public class DagAgentExecutor {

    private final AgentNodeManager agentNodeManager;

    public DagAgentExecutor(AgentNodeManager agentNodeManager) {
        this.agentNodeManager = agentNodeManager;
    }

    /**
     * 执行 DAG：拓扑排序 + ADK Runner 执行
     */
    public DagExecutionResult execute(String graphName, String initialInput) {
        List<AgentNode> nodes = agentNodeManager.fetchAgentNodes(graphName);
        if (nodes.isEmpty()) {
            throw new IllegalArgumentException("Graph not found: " + graphName);
        }

        // 1. 构建 DAG 拓扑结构
        DagTopology topology = buildTopology(nodes);

        // 2. 拓扑排序
        List<List<AgentNode>> levels = topologySort(topology);

        // 3. 逐层执行
        Map<String, String> executionResults = new HashMap<>();
        for (List<AgentNode> level : levels) {
            List<AgentExecutionResult> levelResults = executeLevel(level, executionResults, initialInput);  
            for (AgentExecutionResult result : levelResults) {
                executionResults.put(result.nodeName(), result.output());
            }
        }

        return new DagExecutionResult(graphName, executionResults);
    }

    /**
     * 构建 DAG 拓扑
     */
    private DagTopology buildTopology(List<AgentNode> nodes) {
        Map<String, AgentNode> nodeMap = nodes.stream()
                .collect(Collectors.toMap(AgentNode::getNodeName, n -> n));

        Map<String, List<String>> adjacencyList = new HashMap<>();
        Map<String, Integer> inDegree = new HashMap<>();

        // 初始化
        for (AgentNode node : nodes) {
            adjacencyList.put(node.getNodeName(), new ArrayList<>());
            inDegree.put(node.getNodeName(), 0);
        }

        // 构建邻接表和入度
        for (AgentNode node : nodes) {
            List<String> nextHops = parseNextHops(node.getNextHops());
            for (String nextHop : nextHops) {
                if (nodeMap.containsKey(nextHop)) {
                    adjacencyList.get(node.getNodeName()).add(nextHop);
                    inDegree.put(nextHop, inDegree.get(nextHop) + 1);
                }
            }
        }

        return new DagTopology(nodeMap, adjacencyList, inDegree);
    }

    /**
     * 拓扑排序（分层）：返回每一层的节点列表
     */
    private List<List<AgentNode>> topologySort(DagTopology topology) {
        List<List<AgentNode>> levels = new ArrayList<>();
        Map<String, Integer> inDegree = new HashMap<>(topology.inDegree());

        while (!inDegree.isEmpty()) {
            // 找到当前入度为 0 的所有节点（同一层可以并行）
            List<String> currentLevel = inDegree.entrySet().stream()
                    .filter(e -> e.getValue() == 0)
                    .map(Map.Entry::getKey)
                    .toList();

            if (currentLevel.isEmpty()) {
                throw new IllegalStateException("Cycle detected in DAG");
            }

            // 将当前层节点加入结果
            levels.add(currentLevel.stream()
                    .map(topology.nodeMap()::get)
                    .collect(Collectors.toList()));

            // 移除当前层节点，更新入度
            for (String nodeName : currentLevel) {
                inDegree.remove(nodeName);
                for (String neighbor : topology.adjacencyList().get(nodeName)) {
                    inDegree.put(neighbor, inDegree.get(neighbor) - 1);
                }
            }
        }

        return levels;
    }

    /**
     * 执行单层节点（可并行）
     */
    private List<AgentExecutionResult> executeLevel(
            List<AgentNode> nodes,
            Map<String, String> parentResults,
            String initialInput) {

        // 单层并行执行
        return nodes.parallelStream()
                .map(node -> executeSingleAgent(node, parentResults, initialInput))
                .collect(Collectors.toList());
    }

    /**
     * 执行单个 Agent（使用 ADK Runner）
     */
    private AgentExecutionResult executeSingleAgent(
            AgentNode node,
            Map<String, String> parentResults,
            String initialInput) {

        // 1. 构建 ADK Agent
        LlmAgent agent = LlmAgent.builder()
                .name(node.getNodeName())
                .instruction(buildPrompt(node, parentResults, initialInput))
                .model(node.getModelName() != null ? node.getModelName() : "gemini-2.5-flash")
                .build();

        // 2. 使用 InMemoryRunner 执行
        InMemoryRunner runner = new InMemoryRunner(agent, "errsense-app");
        Session session = runner.sessionService().createSession("user-001", "user").blockingGet();

        // 3. 运行并获取结果
        // ADK Java 使用 RxJava3，需要订阅获取结果
        StringBuilder output = new StringBuilder();
        Content content = Content.builder().parts(Part.builder().text(initialInput).build()).build();
        runner.runAsync("user", session.id(), content)
                .blockingForEach(event -> {
                    if (event.content().isPresent()) {
                        output.append(event.content().toString());
                    }
                });

        return new AgentExecutionResult(node.getNodeName(), output.toString());
    }

    /**
     * 构建提示词：包含父节点执行结果
     */
    private String buildPrompt(AgentNode node, Map<String, String> parentResults, String initialInput) {
        StringBuilder prompt = new StringBuilder();

        prompt.append(node.getInstruction()).append("\n\n");

        // 添加上游节点执行结果作为上下文
        if (!parentResults.isEmpty()) {
            prompt.append("## Context from previous agents:\n");
            parentResults.forEach((name, result) ->
                    prompt.append("- ").append(name).append(": ").append(result).append("\n")
            );
        }

        prompt.append("## Original input:\n").append(initialInput);

        return prompt.toString();
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
    private record DagTopology(
            Map<String, AgentNode> nodeMap,
            Map<String, List<String>> adjacencyList,
            Map<String, Integer> inDegree
    ) {}

    private record AgentExecutionResult(String nodeName, String output) {}

    public record DagExecutionResult(
            String graphName,
            Map<String, String> nodeOutputs
    ) {}
}
