package me.agentic.errsense.repository;

import me.agentic.errsense.model.AgentGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AgentGraphRepository extends JpaRepository<AgentGraph, Long> {

    Optional<AgentGraph> findByGraphName(String graphName);

    List<AgentGraph> findByStatus(String status);

    boolean existsByGraphName(String graphName);

    int deleteByGraphName(String graphName);
}