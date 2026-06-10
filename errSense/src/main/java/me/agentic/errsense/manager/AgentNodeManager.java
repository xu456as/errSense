package me.agentic.errsense.manager;

import me.agentic.errsense.model.AgentNode;
import me.agentic.errsense.repository.AgentNodeRepository;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Component
public class AgentNodeManager {
    private final AgentNodeRepository repository;


    public AgentNodeManager(AgentNodeRepository repository) {
        this.repository = repository;
    }
    
    public List<AgentNode> fetchAgentNodes(String graphName) {
        List<AgentNode> allNodes = repository.findByGraphNameOrderByTimestampDesc(graphName);
        
        Map<String, AgentNode> latestNodes = allNodes.stream()
                .collect(Collectors.toMap(
                        AgentNode::getNodeName,
                        node -> node,
                        (existing, replacement) -> existing
                ));
        
        return latestNodes.values().stream().collect(Collectors.toList());
    }
}
