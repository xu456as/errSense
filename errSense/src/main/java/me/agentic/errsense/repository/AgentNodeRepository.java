package me.agentic.errsense.repository;

import me.agentic.errsense.model.AgentNode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AgentNodeRepository extends JpaRepository<AgentNode, Long> {

    List<AgentNode> findByGraphName(String graphName);

    List<AgentNode> findByStatus(String status);

    Optional<AgentNode> findByGraphNameAndNodeName(String graphName, String nodeName);

    List<AgentNode> findByGraphNameAndStatus(String graphName, String status);

    boolean existsByGraphNameAndNodeName(String graphName, String nodeName);

    int deleteByGraphNameAndNodeName(String graphName, String nodeName);

    List<AgentNode> findByGraphNameOrderByTimestampDesc(String graphName);
}
