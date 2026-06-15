CREATE TABLE agent_node (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    graph_name VARCHAR(255) NOT NULL COMMENT '图名称，用于标识一组节点所属的图',
    node_name VARCHAR(255) NOT NULL COMMENT '节点名称，图内唯一',
    `timestamp` BIGINT NOT NULL COMMENT '节点创建或更新的时间戳',
    instruction TEXT COMMENT '节点的指令/提示词内容',
    model_name VARCHAR(255) COMMENT '使用的模型名称',
    agent_init_params TEXT COMMENT 'Agent初始化参数，JSON格式存储',
    tools TEXT COMMENT 'Agent工具列表，JSON数组格式',
    next_hops TEXT COMMENT '下游节点名称列表，JSON数组格式',
    node_flag BIGINT DEFAULT 0 COMMENT '节点标识：0-普通节点，1-初始状态节点，2-决策节点，3-结束节点',
    `status` VARCHAR(50) DEFAULT 'ACTIVE' COMMENT '节点状态：ACTIVE/INACTIVE/DELETED',
    `description` VARCHAR(1000) COMMENT '节点描述信息',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '记录创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '记录更新时间',
    UNIQUE KEY uk_graphnode (graph_name, node_name),
    INDEX idx_status (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Agent节点表';

CREATE TABLE agent_graph (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    graph_name VARCHAR(255) NOT NULL COMMENT '图名称，唯一标识一个图',
    `status` VARCHAR(50) DEFAULT 'ACTIVE' COMMENT '图状态：ACTIVE/INACTIVE/DELETED',
    `description` VARCHAR(1000) COMMENT '图描述信息',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '记录创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '记录更新时间',
    UNIQUE KEY uk_graph_name (graph_name),
    INDEX idx_graph_status (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Agent图表';

CREATE TABLE chat_case_graph (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    chat_case VARCHAR(255) NOT NULL COMMENT 'Chat case标识',
    graph_name VARCHAR(255) NOT NULL COMMENT '图名称，关联agent_graph表',
    `description` VARCHAR(1000) COMMENT '记录描述信息',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '记录创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '记录更新时间',
    UNIQUE KEY uk_chat_case (chat_case),
    INDEX idx_graph_name (graph_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Chat Case与Agent Graph关联表';
