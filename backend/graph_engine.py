from collections import defaultdict


def build_attack_graph(events):
    nodes = []
    edges = []

    ip_data = defaultdict(list)
    user_data = defaultdict(list)
    relationship_data = defaultdict(list)

    # Group events by IP, user and their relationship
    for event in events:
        ip = event.ip_address
        user = event.user_id

        ip_data[ip].append(event)
        user_data[user].append(event)
        relationship_data[(ip, user)].append(event)

    # Create IP nodes
    for ip, related_events in ip_data.items():
        nodes.append({
            "id": f"ip_{ip}",
            "label": ip,
            "type": "IP",
            "risk_score": max(
                (event.risk_score or 0 for event in related_events),
                default=0
            ),
            "event_count": len(related_events)
        })

    # Create USER nodes
    for user, related_events in user_data.items():
        nodes.append({
            "id": f"user_{user}",
            "label": user,
            "type": "USER",
            "risk_score": max(
                (event.risk_score or 0 for event in related_events),
                default=0
            ),
            "event_count": len(related_events)
        })

    # Create relationships between IPs and users
    for (ip, user), related_events in relationship_data.items():
        edges.append({
            "source": f"ip_{ip}",
            "target": f"user_{user}",
            "event_count": len(related_events)
        })

    return {
        "nodes": nodes,
        "edges": edges,
        "total_nodes": len(nodes),
        "total_connections": len(edges)
    }