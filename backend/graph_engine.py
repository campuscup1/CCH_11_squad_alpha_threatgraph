
import networkx as nx


def build_attack_graph(events):
    graph = nx.Graph()

    for event in events:
        ip = event.ip_address
        user = event.user_id

        ip_node = f"IP:{ip}"
        user_node = f"USER:{user}"

        if not graph.has_node(ip_node):
            graph.add_node(
                ip_node,
                node_type="IP",
                label=ip,
                risk_score=0,
                event_count=0
            )

        if not graph.has_node(user_node):
            graph.add_node(
                user_node,
                node_type="USER",
                label=user,
                risk_score=0,
                event_count=0
            )

        graph.nodes[ip_node]["event_count"] += 1
        graph.nodes[user_node]["event_count"] += 1

        graph.nodes[ip_node]["risk_score"] = max(
            graph.nodes[ip_node]["risk_score"],
            event.risk_score
        )

        graph.nodes[user_node]["risk_score"] = max(
            graph.nodes[user_node]["risk_score"],
            event.risk_score
        )

        if graph.has_edge(ip_node, user_node):
            graph[ip_node][user_node]["event_count"] += 1
        else:
            graph.add_edge(
                ip_node,
                user_node,
                event_count=1
            )

    nodes = []

    for node, data in graph.nodes(data=True):
        nodes.append({
            "id": node,
            "label": data["label"],
            "type": data["node_type"],
            "risk_score": data["risk_score"],
            "event_count": data["event_count"]
        })

    edges = []

    for source, target, data in graph.edges(data=True):
        edges.append({
            "source": source,
            "target": target,
            "event_count": data["event_count"]
        })

    return {
        "total_nodes": graph.number_of_nodes(),
        "total_connections": graph.number_of_edges(),
        "nodes": nodes,
        "edges": edges
    }
