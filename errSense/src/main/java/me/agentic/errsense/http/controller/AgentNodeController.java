package me.agentic.errsense.http.controller;

import me.agentic.errsense.contract.entity.AgentNodeDTO;
import me.agentic.errsense.manager.DagAgentExecutor;
import me.agentic.errsense.manager.StateMachineAgentExecutor;
import me.agentic.errsense.model.AgentNode;
import me.agentic.errsense.repository.AgentNodeRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/nodes")
public class AgentNodeController {

    private final AgentNodeRepository repository;
    private DagAgentExecutor dagAgentExecutor;
    private StateMachineAgentExecutor stateMachineAgentExecutor;

    public AgentNodeController(AgentNodeRepository repository, 
                              DagAgentExecutor dagAgentExecutor,
                              StateMachineAgentExecutor stateMachineAgentExecutor) {
        this.repository = repository;
        this.dagAgentExecutor = dagAgentExecutor;
        this.stateMachineAgentExecutor = stateMachineAgentExecutor;
    }

    @GetMapping("/graph/{graphName}/execute")
    public ResponseEntity<Map<String, String>> executeGraph(
            @PathVariable String graphName,
            @RequestParam String input) {
        try {
            DagAgentExecutor.DagExecutionResult result = dagAgentExecutor.execute(graphName, input);
            return ResponseEntity.ok(result.nodeOutputs());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/graph/{graphName}/execute-state-machine")
    public ResponseEntity<StateMachineAgentExecutor.StateMachineResult> executeStateMachine(
            @PathVariable String graphName,
            @RequestParam String startNode,
            @RequestParam String input) {
        try {
            StateMachineAgentExecutor.StateMachineResult result = 
                    stateMachineAgentExecutor.execute(graphName, startNode, input);
            return ResponseEntity.ok(result);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping
    public ResponseEntity<List<AgentNodeDTO>> getAllNodes() {
        List<AgentNodeDTO> dtos = repository.findAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/{id}")
    public ResponseEntity<AgentNodeDTO> getNodeById(@PathVariable Long id) {
        return repository.findById(id)
                .map(this::convertToDTO)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/graph/{graphName}")
    public ResponseEntity<List<AgentNodeDTO>> getNodesByGraphName(@PathVariable String graphName) {
        List<AgentNodeDTO> dtos = repository.findByGraphName(graphName).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/graph/{graphName}/status/{status}")
    public ResponseEntity<List<AgentNodeDTO>> getNodesByGraphNameAndStatus(
            @PathVariable String graphName,
            @PathVariable String status) {
        List<AgentNodeDTO> dtos = repository.findByGraphNameAndStatus(graphName, status).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/graph/{graphName}/mermaid")
    public ResponseEntity<String> getMermaidFlowChart(@PathVariable String graphName) {
        List<AgentNode> allNodes = repository.findByGraphNameOrderByTimestampDesc(graphName);

        if (allNodes.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Map<String, AgentNode> latestNodes = allNodes.stream()
                .collect(Collectors.toMap(
                        AgentNode::getNodeName,
                        node -> node,
                        (existing, replacement) -> existing
                ));

        StringBuilder mermaid = new StringBuilder();
        mermaid.append("flowchart TD\n");

        for (AgentNode node : latestNodes.values()) {
            String nodeId = node.getNodeName().replaceAll("[^a-zA-Z0-9_]", "_");
            String nodeLabel = node.getNodeName();
            mermaid.append("    ").append(nodeId).append("[\"").append(nodeLabel).append("\"]\n");

            if (node.getNextHops() != null && !node.getNextHops().isEmpty()) {
                try {
                    String[] nextHops = node.getNextHops().replaceAll("[\\[\\]\"]", "").split(",");
                    for (String nextHop : nextHops) {
                        String trimmedHop = nextHop.trim();
                        if (!trimmedHop.isEmpty()) {
                            String nextHopId = trimmedHop.replaceAll("[^a-zA-Z0-9_]", "_");
                            mermaid.append("    ").append(nodeId).append(" --> ").append(nextHopId).append("\n");
                        }
                    }
                } catch (Exception e) {
                }
            }
        }

        return ResponseEntity.ok(mermaid.toString());
    }

    @PostMapping
    public ResponseEntity<AgentNodeDTO> createNode(@RequestBody AgentNodeDTO dto) {
        AgentNode node = convertToEntity(dto);
        AgentNode savedNode = repository.save(node);
        return ResponseEntity.status(HttpStatus.CREATED).body(convertToDTO(savedNode));
    }

    @PostMapping(value = "/with-file", consumes = "multipart/form-data")
    public ResponseEntity<AgentNodeDTO> createNodeWithFile(
            @RequestParam String graphName,
            @RequestParam String nodeName,
            @RequestParam Long timestamp,
            @RequestParam(required = false) MultipartFile instructionFile,
            @RequestParam(required = false) String modelName,
            @RequestParam(required = false) String agentInitParams,
            @RequestParam(required = false) String tools,
            @RequestParam(required = false) String nextHops,
            @RequestParam(required = false, defaultValue = "0") Long nodeFlag,
            @RequestParam(required = false, defaultValue = "ACTIVE") String status,
            @RequestParam(required = false) String description) {

        AgentNode node = new AgentNode();
        node.setGraphName(graphName);
        node.setNodeName(nodeName);
        node.setTimestamp(timestamp);

        if (instructionFile != null && !instructionFile.isEmpty()) {
            try {
                String instruction = new String(instructionFile.getBytes(), StandardCharsets.UTF_8);
                node.setInstruction(instruction);
            } catch (IOException e) {
                return ResponseEntity.badRequest().build();
            }
        }

        node.setModelName(modelName);
        node.setAgentInitParams(agentInitParams);
        node.setTools(tools);
        node.setNextHops(nextHops);
        node.setNodeFlag(nodeFlag);
        node.setStatus(status);
        node.setDescription(description);

        AgentNode savedNode = repository.save(node);
        return ResponseEntity.status(HttpStatus.CREATED).body(convertToDTO(savedNode));
    }

    @PutMapping("/{id}")
    public ResponseEntity<AgentNodeDTO> updateNode(
            @PathVariable Long id,
            @RequestBody AgentNodeDTO dto) {
        return repository.findById(id)
                .map(existingNode -> {
                    existingNode.setGraphName(dto.getGraphName());
                    existingNode.setNodeName(dto.getNodeName());
                    existingNode.setTimestamp(dto.getTimestamp());
                    existingNode.setInstruction(dto.getInstruction());
                    existingNode.setModelName(dto.getModelName());
                    existingNode.setAgentInitParams(dto.getAgentInitParams());
                    existingNode.setTools(dto.getTools());
                    existingNode.setNextHops(dto.getNextHops());
                    existingNode.setNodeFlag(dto.getNodeFlag());
                    existingNode.setStatus(dto.getStatus());
                    existingNode.setDescription(dto.getDescription());
                    AgentNode updatedNode = repository.save(existingNode);
                    return ResponseEntity.ok(convertToDTO(updatedNode));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping(value = "/{id}/with-file", consumes = "multipart/form-data")
    public ResponseEntity<AgentNodeDTO> updateNodeWithFile(
            @PathVariable Long id,
            @RequestParam(required = false) String graphName,
            @RequestParam(required = false) String nodeName,
            @RequestParam(required = false) Long timestamp,
            @RequestParam(required = false) MultipartFile instructionFile,
            @RequestParam(required = false) String modelName,
            @RequestParam(required = false) String agentInitParams,
            @RequestParam(required = false) String tools,
            @RequestParam(required = false) String nextHops,
            @RequestParam(required = false) Long nodeFlag,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String description) {

        return repository.findById(id)
                .<ResponseEntity<AgentNodeDTO>>map(existingNode -> {
                    if (graphName != null) {
                        existingNode.setGraphName(graphName);
                    }
                    if (nodeName != null) {
                        existingNode.setNodeName(nodeName);
                    }
                    if (timestamp != null) {
                        existingNode.setTimestamp(timestamp);
                    }
                    if (instructionFile != null && !instructionFile.isEmpty()) {
                        try {
                            String instruction = new String(instructionFile.getBytes(), StandardCharsets.UTF_8);
                            existingNode.setInstruction(instruction);
                        } catch (IOException e) {
                            return ResponseEntity.badRequest().build();
                        }
                    }
                    if (modelName != null) {
                        existingNode.setModelName(modelName);
                    }
                    if (agentInitParams != null) {
                        existingNode.setAgentInitParams(agentInitParams);
                    }
                    if (tools != null) {
                        existingNode.setTools(tools);
                    }
                    if (nextHops != null) {
                        existingNode.setNextHops(nextHops);
                    }
                    if (nodeFlag != null) {
                        existingNode.setNodeFlag(nodeFlag);
                    }
                    if (status != null) {
                        existingNode.setStatus(status);
                    }
                    if (description != null) {
                        existingNode.setDescription(description);
                    }

                    AgentNode updatedNode = repository.save(existingNode);
                    return ResponseEntity.ok(convertToDTO(updatedNode));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteNode(@PathVariable Long id) {
        if (repository.existsById(id)) {
            repository.deleteById(id);
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }

    @DeleteMapping("/graph/{graphName}/node/{nodeName}")
    public ResponseEntity<Void> deleteNodeByGraphAndName(
            @PathVariable String graphName,
            @PathVariable String nodeName) {
        if (repository.existsByGraphNameAndNodeName(graphName, nodeName)) {
            repository.deleteByGraphNameAndNodeName(graphName, nodeName);
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }

    private AgentNodeDTO convertToDTO(AgentNode entity) {
        AgentNodeDTO dto = new AgentNodeDTO();
        dto.setId(entity.getId());
        dto.setGraphName(entity.getGraphName());
        dto.setNodeName(entity.getNodeName());
        dto.setTimestamp(entity.getTimestamp());
        dto.setInstruction(entity.getInstruction());
        dto.setModelName(entity.getModelName());
        dto.setAgentInitParams(entity.getAgentInitParams());
        dto.setTools(entity.getTools());
        dto.setNextHops(entity.getNextHops());
        dto.setNodeFlag(entity.getNodeFlag());
        dto.setStatus(entity.getStatus());
        dto.setDescription(entity.getDescription());
        dto.setCreatedAt(entity.getCreatedAt());
        dto.setUpdatedAt(entity.getUpdatedAt());
        return dto;
    }

    private AgentNode convertToEntity(AgentNodeDTO dto) {
        AgentNode entity = new AgentNode();
        entity.setGraphName(dto.getGraphName());
        entity.setNodeName(dto.getNodeName());
        entity.setTimestamp(dto.getTimestamp());
        entity.setInstruction(dto.getInstruction());
        entity.setModelName(dto.getModelName());
        entity.setAgentInitParams(dto.getAgentInitParams());
        entity.setTools(dto.getTools());
        entity.setNextHops(dto.getNextHops());
        entity.setNodeFlag(dto.getNodeFlag());
        entity.setStatus(dto.getStatus());
        entity.setDescription(dto.getDescription());
        return entity;
    }
}
