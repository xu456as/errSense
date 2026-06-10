package me.agentic.errsense.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "agent_node", indexes = {
        @Index(name = "idx_graph_name", columnList = "graph_name"),
        @Index(name = "idx_status", columnList = "status")
})
public class AgentNode {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "graph_name", nullable = false, length = 255)
    private String graphName;

    @Column(name = "node_name", nullable = false, length = 255)
    private String nodeName;

    @Column(name = "timestamp", nullable = false)
    private Long timestamp;

    @Column(name = "instruction", columnDefinition = "TEXT")
    private String instruction;

    @Column(name = "model_name", length = 255)
    private String modelName;

    @Column(name = "agent_init_params", columnDefinition = "TEXT")
    private String agentInitParams;

    @Column(name = "tools", columnDefinition = "TEXT")
    private String tools;

    @Column(name = "next_hops", columnDefinition = "TEXT")
    private String nextHops;

    @Column(name = "node_flag")
    private Long nodeFlag = 0L;

    @Column(name = "status", length = 50)
    private String status = "ACTIVE";

    @Column(name = "description", length = 1000)
    private String description;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public AgentNode() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getGraphName() {
        return graphName;
    }

    public void setGraphName(String graphName) {
        this.graphName = graphName;
    }

    public String getNodeName() {
        return nodeName;
    }

    public void setNodeName(String nodeName) {
        this.nodeName = nodeName;
    }

    public Long getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(Long timestamp) {
        this.timestamp = timestamp;
    }

    public String getInstruction() {
        return instruction;
    }

    public void setInstruction(String instruction) {
        this.instruction = instruction;
    }

    public String getModelName() {
        return modelName;
    }

    public void setModelName(String modelName) {
        this.modelName = modelName;
    }

    public String getAgentInitParams() {
        return agentInitParams;
    }

    public void setAgentInitParams(String agentInitParams) {
        this.agentInitParams = agentInitParams;
    }

    public String getTools() {
        return tools;
    }

    public void setTools(String tools) {
        this.tools = tools;
    }

    public String getNextHops() {
        return nextHops;
    }

    public void setNextHops(String nextHops) {
        this.nextHops = nextHops;
    }

    public Long getNodeFlag() {
        return nodeFlag;
    }

    public void setNodeFlag(Long nodeFlag) {
        this.nodeFlag = nodeFlag;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
