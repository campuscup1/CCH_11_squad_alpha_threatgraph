import { useEffect, useMemo, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import { api } from '../api';
import { useApiData } from '../hooks/useApiData';
import { useRefresh } from '../context/RefreshContext';
import { Icon } from '../components/Icons';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  LoadingState,
  PageIntro,
  RiskBadge,
  StatCard,
} from '../components/ui';
import {
  formatDateTime,
  formatNumber,
  riskToneFromScore,
  shortText,
} from '../utils/format';

const RISK_COLORS = {
  critical: '#dc2626',
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#3b82f6',
  neutral: '#64748b',
};

function GraphCanvas({ nodes, edges, selectedId, onSelect }) {
  const containerRef = useRef(null);
  const cyRef = useRef(null);
  const [zoom, setZoom] = useState(100);

  useEffect(() => {
    if (!containerRef.current) return undefined;

    const nodeTones = new Map(
      nodes.map((node) => [node.id, riskToneFromScore(node.risk_score)]),
    );

    const elements = [
      ...nodes.map((node) => ({
        data: {
          id: node.id,
          label: node.label,
          type: node.type,
          risk: Number(node.risk_score) || 0,
          count: Number(node.event_count) || 0,
          tone: riskToneFromScore(node.risk_score),
        },
      })),
      ...edges.map((edge) => ({
        data: {
          id: `${edge.source}->${edge.target}`,
          source: edge.source,
          target: edge.target,
          count: Number(edge.event_count) || 1,
          risky:
            Math.max(
              nodeTones.get(edge.source) === 'critical' ||
                nodeTones.get(edge.source) === 'high'
                ? 1
                : 0,
              nodeTones.get(edge.target) === 'critical' ||
                nodeTones.get(edge.target) === 'high'
                ? 1
                : 0,
            ) || 0,
        },
      })),
    ];

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      minZoom: 0.2,
      maxZoom: 3.5,
      wheelSensitivity: 0.2,
      style: [
        {
          selector: 'node',
          style: {
            width: 28,
            height: 28,
            'background-color': '#3b82f6',
            label: 'data(label)',
            color: '#c2d2e8',
            'font-size': 10,
            'font-weight': 600,
            'text-valign': 'bottom',
            'text-halign': 'center',
            'text-margin-y': 6,
            'text-wrap': 'wrap',
            'text-max-width': '110px',
            'text-outline-width': 3,
            'text-outline-color': '#07101d',
            'border-width': 1.5,
            'border-color': 'rgba(255, 255, 255, 0.35)',
          },
        },
        {
          selector: 'node[type = "IP"]',
          style: {
            shape: 'round-rectangle',
          },
        },
        {
          selector: 'node[type = "USER"]',
          style: {
            shape: 'ellipse',
          },
        },
        {
          selector: 'node[tone = "critical"]',
          style: { 'background-color': RISK_COLORS.critical },
        },
        {
          selector: 'node[tone = "high"]',
          style: { 'background-color': RISK_COLORS.high },
        },
        {
          selector: 'node[tone = "medium"]',
          style: { 'background-color': RISK_COLORS.medium },
        },
        {
          selector: 'node[tone = "low"]',
          style: { 'background-color': RISK_COLORS.low },
        },
        {
          selector: 'node[tone = "neutral"]',
          style: { 'background-color': RISK_COLORS.neutral },
        },
        {
          selector: 'node:selected',
          style: {
            'border-width': 3,
            'border-color': '#60a5fa',
            'overlay-color': '#3b82f6',
            'overlay-opacity': 0.18,
          },
        },
        {
          selector: 'edge',
          style: {
            width: 1.3,
            'line-color': '#3a587d',
            'curve-style': 'bezier',
            opacity: 0.75,
          },
        },
        {
          selector: 'edge[risky = 1]',
          style: {
            'line-color': '#ef4444',
            opacity: 0.85,
          },
        },
      ],
      layout: {
        name: 'cose',
        animate: false,
        fit: true,
        padding: 45,
        nodeRepulsion: 9000,
        idealEdgeLength: 110,
        nodeOverlap: 15,
        randomize: true,
      },
    });

    cyRef.current = cy;

    const updateZoom = () => setZoom(Math.round(cy.zoom() * 100));

    cy.on('zoom', updateZoom);
    cy.on('tap', 'node', (event) => {
      onSelect(event.target.id());
    });
    cy.on('tap', (event) => {
      if (event.target === cy) onSelect(null);
    });

    cy.ready(() => {
      cy.fit(undefined, 45);
      updateZoom();
    });

    const observer = new ResizeObserver(() => {
      cy.resize();
    });
    observer.observe(containerRef.current);
    updateZoom();

    return () => {
      observer.disconnect();
      cy.destroy();
      cyRef.current = null;
    };
  }, [nodes, edges, onSelect]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.nodes().unselect();
    if (!selectedId) return;
    const node = cy.getElementById(selectedId);
    if (node.nonempty()) node.select();
  }, [selectedId]);

  function zoomBy(factor) {
    const cy = cyRef.current;
    if (!cy) return;
    const nextLevel = Math.min(
      cy.maxZoom(),
      Math.max(cy.minZoom(), cy.zoom() * factor),
    );
    cy.zoom({
      level: nextLevel,
      renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 },
    });
  }

  function resetView() {
    const cy = cyRef.current;
    if (!cy) return;
    cy.fit(undefined, 45);
  }

  return (
    <div className="graph-canvas">
      <div className="cy-canvas" ref={containerRef} />

      <div className="graph-controls">
        <button
          aria-label="Zoom in"
          className="icon-button"
          onClick={() => zoomBy(1.2)}
          title="Zoom in"
          type="button"
        >
          <Icon name="plus" size={17} />
        </button>
        <button
          aria-label="Zoom out"
          className="icon-button"
          onClick={() => zoomBy(0.84)}
          title="Zoom out"
          type="button"
        >
          <Icon name="minus" size={17} />
        </button>
        <button
          aria-label="Reset graph view"
          className="icon-button"
          onClick={resetView}
          title="Reset view"
          type="button"
        >
          <Icon name="maximize" size={17} />
        </button>
      </div>

      <span className="graph-zoom">{zoom}%</span>
    </div>
  );
}

function SelectedNodePanel({ node, relatedNodes, relatedEvents, onSelectNode }) {
  if (!node) {
    return (
      <Card className="graph-panel">
        <CardHeader
          icon="crosshair"
          subtitle="Click any user or IP node in the graph."
          title="Selected Node"
        />
        <EmptyState
          description="Select a node to inspect its backend risk score, event count, related entities, and associated events."
          icon="graph"
          title="No node selected"
        />
      </Card>
    );
  }

  const isIp = node.type === 'IP';

  return (
    <Card className="graph-panel">
      <CardHeader
        actions={<Badge tone="info">{isIp ? 'IP address' : 'User account'}</Badge>}
        icon={isIp ? 'network' : 'user'}
        subtitle="Details are derived from backend graph data."
        title="Selected Node"
      />

      <div className="node-summary">
        <span className={`node-summary__icon node-summary__icon--${isIp ? 'ip' : 'user'}`}>
          <Icon name={isIp ? 'network' : 'user'} size={23} />
        </span>
        <div>
          <h3 className="mono">{node.label}</h3>
          <p>{isIp ? 'Source IP address' : 'User account'}</p>
        </div>
      </div>

      <div className="mini-metrics">
        <div>
          <span>Risk score</span>
          <strong className={`text-${riskToneFromScore(node.risk_score)}`}>
            {node.risk_score}
          </strong>
        </div>
        <div>
          <span>Events linked</span>
          <strong>{formatNumber(node.event_count)}</strong>
        </div>
        <div>
          <span>Connected nodes</span>
          <strong>{formatNumber(relatedNodes.length)}</strong>
        </div>
      </div>

      <div className="panel-section">
        <h3>Related entities</h3>
        {relatedNodes.length ? (
          <div className="chip-list">
            {relatedNodes.map((related) => (
              <button
                className="entity-chip"
                key={related.id}
                onClick={() => onSelectNode(related.id)}
                type="button"
              >
                <Icon name={related.type === 'IP' ? 'network' : 'user'} size={14} />
                <span className="mono">{related.label}</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="section-note">No connections exist for this node.</p>
        )}
      </div>

      <div className="panel-section">
        <h3>Associated events</h3>
        {relatedEvents.length ? (
          <ul className="mini-event-list">
            {relatedEvents.map((event) => (
              <li key={event.id}>
                <div className="mini-event-list__top">
                  <span className="mono">#{event.id}</span>
                  <RiskBadge level={event.risk_level} />
                </div>
                <p>{shortText(event.explanation, 130)}</p>
                <span>{formatDateTime(event.created_at)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="section-note">
            No individual event records matched this node in /api/events.
          </p>
        )}
      </div>
    </Card>
  );
}

async function loadGraph() {
  const [graph, events] = await Promise.allSettled([api.graph(), api.events()]);

  if (graph.status === 'rejected') {
    throw graph.reason;
  }

  return {
    graph: graph.value,
    events: events.status === 'fulfilled' ? events.value : [],
  };
}

export default function AttackGraph() {
  const { triggerRefresh } = useRefresh();
  const { data, loading, error } = useApiData(loadGraph, []);

  const [showUsers, setShowUsers] = useState(true);
  const [showIps, setShowIps] = useState(true);
  const [highRiskOnly, setHighRiskOnly] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const graph = data?.graph;
  const allNodes = useMemo(() => graph?.nodes || [], [graph]);

  const nodes = useMemo(
    () =>
      allNodes.filter((node) => {
        if (node.type === 'USER' && !showUsers) return false;
        if (node.type === 'IP' && !showIps) return false;
        if (highRiskOnly && node.risk_score < 60) return false;
        return true;
      }),
    [allNodes, showUsers, showIps, highRiskOnly],
  );

  const visibleIds = useMemo(() => new Set(nodes.map((node) => node.id)), [nodes]);

  const edges = useMemo(
    () =>
      (graph?.edges || []).filter(
        (edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target),
      ),
    [graph, visibleIds],
  );

  const allNodeMap = useMemo(() => {
    const map = new Map();
    allNodes.forEach((node) => map.set(node.id, node));
    return map;
  }, [allNodes]);

  useEffect(() => {
    if (selectedId && !visibleIds.has(selectedId)) {
      setSelectedId(null);
    }
  }, [selectedId, visibleIds]);

  const selectedNode = selectedId ? allNodeMap.get(selectedId) : null;

  const relatedNodes = useMemo(() => {
    if (!selectedNode) return [];
    const ids = new Set();
    (graph?.edges || []).forEach((edge) => {
      if (edge.source === selectedNode.id) ids.add(edge.target);
      if (edge.target === selectedNode.id) ids.add(edge.source);
    });
    return [...ids].map((id) => allNodeMap.get(id)).filter(Boolean);
  }, [selectedNode, graph, allNodeMap]);

  const relatedEvents = useMemo(() => {
    if (!selectedNode || !data?.events) return [];
    return data.events
      .filter((event) =>
        selectedNode.type === 'IP'
          ? event.ip_address === selectedNode.label
          : event.user_id === selectedNode.label,
      )
      .slice(0, 8);
  }, [selectedNode, data]);

  if (loading && !data) {
    return <LoadingState label="Building attack relationship graph…" />;
  }

  if (error) {
    return (
      <ErrorState
        message={error}
        onRetry={triggerRefresh}
        title="Attack graph unavailable"
      />
    );
  }

  const highRiskNodeCount = allNodes.filter((node) => node.risk_score >= 60).length;

  return (
    <div className="page-stack">
      <PageIntro
        description="Explore relationships between source IP addresses and targeted accounts."
        eyebrow="Entity relationship analysis"
        title="Attack Relationship Graph"
        actions={
          <Badge tone="info">
            {formatNumber(graph.total_nodes)} nodes ·{' '}
            {formatNumber(graph.total_connections)} connections
          </Badge>
        }
      />

      <div className="stat-grid stat-grid--3">
        <StatCard
          hint="Accounts plus IP addresses"
          icon="graph"
          label="Total Nodes"
          tone="info"
          value={formatNumber(graph.total_nodes)}
        />
        <StatCard
          hint="Observed login relationships"
          icon="network"
          label="Connections"
          tone="low"
          value={formatNumber(graph.total_connections)}
        />
        <StatCard
          hint="Nodes with highest backend score ≥ 60"
          icon="alerts"
          label="High-Risk Nodes"
          tone="high"
          value={formatNumber(highRiskNodeCount)}
        />
      </div>

      <div className="graph-layout">
        <Card className="graph-card">
          <CardHeader
            actions={
              <div className="graph-legend graph-legend--header">
                <span>
                  <i className="legend-shape legend-shape--user" /> User
                </span>
                <span>
                  <i className="legend-shape legend-shape--ip" /> IP
                </span>
              </div>
            }
            icon="graph"
            subtitle="Drag to pan, scroll to zoom, and select a node for details."
            title="Relationship Graph"
          />

          <div className="graph-toolbar">
            <label className="check-control">
              <input
                checked={showUsers}
                onChange={(event) => setShowUsers(event.target.checked)}
                type="checkbox"
              />
              User accounts
            </label>
            <label className="check-control">
              <input
                checked={showIps}
                onChange={(event) => setShowIps(event.target.checked)}
                type="checkbox"
              />
              IP addresses
            </label>
            <label className="check-control">
              <input
                checked={highRiskOnly}
                onChange={(event) => setHighRiskOnly(event.target.checked)}
                type="checkbox"
              />
              High-risk nodes only
            </label>
            <Button
              onClick={() => {
                setShowUsers(true);
                setShowIps(true);
                setHighRiskOnly(false);
              }}
              size="sm"
              variant="ghost"
            >
              Reset filters
            </Button>
          </div>

          {nodes.length ? (
            <GraphCanvas
              edges={edges}
              nodes={nodes}
              onSelect={setSelectedId}
              selectedId={selectedId}
            />
          ) : (
            <div className="graph-empty">
              <EmptyState
                description={
                  allNodes.length
                    ? 'No nodes match the current filters. Reset the filters to restore the graph.'
                    : 'The backend returned no graph nodes. Analyze events to populate the relationship graph.'
                }
                icon="graph"
                title={allNodes.length ? 'No matching nodes' : 'No graph data yet'}
              />
            </div>
          )}

          <div className="graph-footer">
            <div className="graph-legend">
              <span className="graph-legend__label">Risk score</span>
              <span>
                <i className="legend-dot legend-dot--critical" /> Critical
              </span>
              <span>
                <i className="legend-dot legend-dot--high" /> High
              </span>
              <span>
                <i className="legend-dot legend-dot--medium" /> Medium
              </span>
              <span>
                <i className="legend-dot legend-dot--low" /> Low / normal
              </span>
            </div>
            <p>
              Edges represent observed login relationships. Red edges connect to at
              least one high-risk node.
            </p>
          </div>
        </Card>

        <SelectedNodePanel
          node={selectedNode}
          onSelectNode={setSelectedId}
          relatedEvents={relatedEvents}
          relatedNodes={relatedNodes}
        />
      </div>
    </div>
  );
}
