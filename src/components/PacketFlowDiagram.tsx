import React, { useState } from 'react';
import {
  FlowStep,
  LOOP_BACK_ARCS,
  LoopBackArc,
  PIPELINE_STAGES,
  PipelineStage,
  StageId,
} from '../data/packetFlowModel';

interface PacketFlowDiagramProps {
  currentStep: FlowStep;
  highlightStages?: StageId[];
  compact?: boolean;
}

const FORWARD_EDGES: Array<{ from: StageId; to: StageId; path: string; label?: string }> = [
  { from: 'ingress', to: 'slowpath', path: 'M 155 150 L 210 100', label: 'Miss' },
  { from: 'ingress', to: 'fastpath', path: 'M 155 180 L 210 232', label: 'Hit' },
  { from: 'slowpath', to: 'fastpath', path: 'M 275 125 L 275 205', label: 'Alloc' },
  { from: 'fastpath', to: 'appid', path: 'M 340 245 L 410 245' },
  { from: 'fastpath', to: 'contentid', path: 'M 335 275 Q 475 315 605 275', label: 'Known App' },
  { from: 'fastpath', to: 'egress', path: 'M 330 220 Q 590 120 785 155', label: 'No Payload' },
  { from: 'appid', to: 'contentid', path: 'M 540 245 L 600 245' },
  { from: 'contentid', to: 'egress', path: 'M 725 232 L 785 180' },
];

const DROP_EDGES: Array<{ from: StageId; path: string }> = [
  { from: 'ingress', path: 'M 95 205 Q 95 375 410 375' },
  { from: 'slowpath', path: 'M 330 115 Q 430 220 465 338' },
  { from: 'fastpath', path: 'M 275 285 Q 320 365 410 375' },
  { from: 'contentid', path: 'M 665 285 Q 620 365 540 375' },
];

export const PacketFlowDiagram: React.FC<PacketFlowDiagramProps> = ({
  currentStep,
  highlightStages = [],
  compact = false,
}) => {
  const [selectedStageId, setSelectedStageId] = useState<StageId | null>(null);
  const [selectedLoop, setSelectedLoop] = useState<LoopBackArc | null>(null);

  const activeStage =
    PIPELINE_STAGES.find((s) => s.id === currentStep.stage) ?? PIPELINE_STAGES[0]!;
  const inspectedStage: PipelineStage =
    PIPELINE_STAGES.find((s) => s.id === selectedStageId) ?? activeStage;

  const isDrop = currentStep.stage === 'drop';

  const handleStageKeyDown = (e: React.KeyboardEvent, stageId: StageId) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setSelectedLoop(null);
      setSelectedStageId((prev) => (prev === stageId ? null : stageId));
    }
  };

  return (
    <div className="pipeline-wrapper">
      <div className="pipeline-svg-box">
        <svg
          viewBox="0 0 940 420"
          className="pipeline-svg"
          role="img"
          aria-label={`PAN-OS Packet Flow Diagram. Current step: ${currentStep.title}`}
        >
          <defs>
            <marker
              id="arrow-default"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#64748b" />
            </marker>
            <marker
              id="arrow-active"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#38bdf8" />
            </marker>
            <marker
              id="arrow-loop"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#fb923c" />
            </marker>
            <marker
              id="arrow-drop"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#f87171" />
            </marker>
          </defs>

          {/* Per-Packet vs Session-Based Swimlane Backdrop */}
          <rect
            x="16"
            y="18"
            width="160"
            height="305"
            rx="12"
            fill="rgba(56, 189, 248, 0.04)"
            stroke="rgba(56, 189, 248, 0.2)"
            strokeDasharray="4 4"
            pointerEvents="none"
          />
          <text x="96" y="34" textAnchor="middle" fill="#7dd3fc" fontSize="10" fontWeight="600">
            PER-PACKET (NETWORK)
          </text>

          <rect
            x="192"
            y="18"
            width="555"
            height="305"
            rx="12"
            fill="rgba(52, 211, 153, 0.035)"
            stroke="rgba(52, 211, 153, 0.2)"
            strokeDasharray="4 4"
            pointerEvents="none"
          />
          <text x="470" y="34" textAnchor="middle" fill="#6ee7b7" fontSize="10" fontWeight="600">
            SESSION-BASED SECURITY MODULES (SP3)
          </text>

          <rect
            x="764"
            y="18"
            width="160"
            height="305"
            rx="12"
            fill="rgba(34, 211, 238, 0.04)"
            stroke="rgba(34, 211, 238, 0.2)"
            strokeDasharray="4 4"
            pointerEvents="none"
          />
          <text x="844" y="34" textAnchor="middle" fill="#67e8f9" fontSize="10" fontWeight="600">
            PER-PACKET (EGRESS)
          </text>

          {/* Forward Edges */}
          {FORWARD_EDGES.map((edge) => {
            const isEdgeActive =
              currentStep.activeEdgeFrom === edge.from && currentStep.stage === edge.to;
            return (
              <g key={`${edge.from}-${edge.to}`}>
                <path
                  d={edge.path}
                  fill="none"
                  stroke={isEdgeActive ? '#38bdf8' : '#475569'}
                  strokeWidth={isEdgeActive ? 3 : 1.75}
                  markerEnd={isEdgeActive ? 'url(#arrow-active)' : 'url(#arrow-default)'}
                  className={isEdgeActive ? 'flow-edge-active' : undefined}
                />
                {edge.label && (
                  <text
                    x={
                      edge.from === 'ingress' && edge.to === 'slowpath'
                        ? 172
                        : edge.from === 'ingress' && edge.to === 'fastpath'
                        ? 172
                        : edge.from === 'slowpath'
                        ? 294
                        : edge.to === 'contentid'
                        ? 475
                        : 560
                    }
                    y={
                      edge.from === 'ingress' && edge.to === 'slowpath'
                        ? 114
                        : edge.from === 'ingress' && edge.to === 'fastpath'
                        ? 220
                        : edge.from === 'slowpath'
                        ? 168
                        : edge.to === 'contentid'
                        ? 308
                        : 146
                    }
                    fill={isEdgeActive ? '#bae6fd' : '#94a3b8'}
                    fontSize="10"
                    fontWeight="600"
                    textAnchor="middle"
                  >
                    {edge.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* Drop Edges */}
          {DROP_EDGES.map((edge) => {
            const isDropActive = isDrop && currentStep.activeEdgeFrom === edge.from;
            return (
              <path
                key={`drop-${edge.from}`}
                d={edge.path}
                fill="none"
                stroke={isDropActive ? '#f87171' : 'rgba(248, 113, 113, 0.25)'}
                strokeWidth={isDropActive ? 3 : 1.25}
                strokeDasharray={isDropActive ? undefined : '4 4'}
                markerEnd="url(#arrow-drop)"
                className={isDropActive ? 'flow-edge-active' : undefined}
              />
            );
          })}

          {/* 4 Loop-Back Arcs */}
          {LOOP_BACK_ARCS.map((arc) => {
            const isLoopActive = currentStep.activeLoop === arc.id;
            return (
              <g
                key={arc.id}
                role="button"
                tabIndex={0}
                aria-label={`Loop-back arc: ${arc.label}`}
                style={{ cursor: 'pointer' }}
                onClick={() => setSelectedLoop(arc)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedLoop(arc);
                  }
                }}
              >
                <path
                  d={arc.svgPath}
                  fill="transparent"
                  stroke="transparent"
                  strokeWidth={16}
                />
                <path
                  d={arc.svgPath}
                  fill="none"
                  stroke={isLoopActive ? '#fb923c' : 'rgba(251, 146, 60, 0.45)'}
                  strokeWidth={isLoopActive ? 3 : 1.75}
                  strokeDasharray="6 4"
                  markerEnd="url(#arrow-loop)"
                  className={isLoopActive ? 'flow-loop-active' : undefined}
                />
                <text
                  x={arc.labelX}
                  y={arc.labelY}
                  textAnchor="middle"
                  fill={isLoopActive ? '#fed7aa' : '#fdba74'}
                  fontSize="10"
                  fontWeight={isLoopActive ? '700' : '500'}
                >
                  {arc.label}
                </text>
              </g>
            );
          })}

          {/* Stage Nodes */}
          {PIPELINE_STAGES.map((stage) => {
            const isCurrent = currentStep.stage === stage.id;
            const isHighlighted = highlightStages.includes(stage.id);
            const isSelected = selectedStageId === stage.id;
            const width = stage.id === 'drop' ? 140 : 126;
            const height = stage.id === 'drop' ? 56 : 76;

            return (
              <g
                key={stage.id}
                role="button"
                tabIndex={0}
                aria-label={`${stage.label} (${stage.kbSection})`}
                aria-pressed={isSelected}
                data-testid={`stage-node-${stage.id}`}
                style={{ cursor: 'pointer' }}
                className={isCurrent ? 'stage-node-active' : undefined}
                onClick={() => {
                  setSelectedLoop(null);
                  setSelectedStageId((prev) => (prev === stage.id ? null : stage.id));
                }}
                onKeyDown={(e) => handleStageKeyDown(e, stage.id)}
              >
                <rect
                  x={stage.x - width / 2}
                  y={stage.y - height / 2}
                  width={width}
                  height={height}
                  rx="10"
                  fill={
                    isCurrent
                      ? '#1e293b'
                      : isSelected
                      ? '#1e293b'
                      : '#111827'
                  }
                  stroke={stage.colorVar}
                  strokeWidth={isCurrent ? 3 : isHighlighted || isSelected ? 2 : 1.25}
                />
                <text
                  x={stage.x}
                  y={stage.y - 6}
                  textAnchor="middle"
                  fill="#f8fafc"
                  fontSize="12"
                  fontWeight="700"
                >
                  {stage.shortLabel}
                </text>
                <text
                  x={stage.x}
                  y={stage.y + 12}
                  textAnchor="middle"
                  fill="#cbd5e1"
                  fontSize="10"
                >
                  {stage.kbSection}
                </text>
              </g>
            );
          })}

          {/* Animated Packet Token */}
          <g
            className="packet-token-group"
            data-testid="packet-token"
            style={{
              transform: `translate(${activeStage.x}px, ${activeStage.y - 44}px)`,
            }}
          >
            <g className="packet-token-core" style={{ color: isDrop ? '#f87171' : '#38bdf8' }}>
              <rect
                x="-52"
                y="-15"
                width="104"
                height="26"
                rx="13"
                fill={isDrop ? '#7f1d1d' : '#0c4a6e'}
                stroke={isDrop ? '#f87171' : '#38bdf8'}
                strokeWidth="2"
              />
              <text
                x="0"
                y="2"
                textAnchor="middle"
                fill="#f8fafc"
                fontSize="10.5"
                fontWeight="700"
                className="mono"
              >
                {currentStep.packet.badge}
              </text>
            </g>
          </g>
        </svg>
      </div>

      {/* Live Packet & Stage Inspector */}
      {!compact && (
        <div className="pipeline-inspector" aria-live="polite">
          <div className="inspector-card">
            <div className="inspector-header">
              <span className="badge badge-stage">{currentStep.kbRef}</span>
              <strong data-testid="step-title">{currentStep.title}</strong>
            </div>
            <p className="inspector-desc">{currentStep.description}</p>
            {currentStep.packet.dropReason && (
              <div className="drop-alert" data-testid="drop-reason-banner">
                <strong>DISCARD REASON:</strong> {currentStep.packet.dropReason}
                {currentStep.packet.counters && (
                  <span className="mono counter-list">
                    {' '}
                    · Counters: {currentStep.packet.counters.join(', ')}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="inspector-card mono-meta">
            <div className="meta-grid">
              <div>
                <span className="meta-label">Flow:</span>{' '}
                <span className="mono">
                  {currentStep.packet.srcIp}:{currentStep.packet.srcPort} →{' '}
                  {currentStep.packet.dstIp}:{currentStep.packet.dstPort}
                </span>
              </div>
              <div>
                <span className="meta-label">If / Zone:</span>{' '}
                <span className="mono">
                  {currentStep.packet.ingressIf} ({currentStep.packet.zoneIn}) →{' '}
                  {currentStep.packet.egressIf} ({currentStep.packet.zoneOut})
                </span>
              </div>
              <div>
                <span className="meta-label">App-ID:</span>{' '}
                <span className="mono badge-inline">{currentStep.packet.appId}</span>
              </div>
              <div>
                <span className="meta-label">Session State:</span>{' '}
                <span className="mono badge-inline">{currentStep.packet.sessionState}</span>
              </div>
            </div>
            <div className="stage-detail-box">
              {selectedLoop ? (
                <>
                  <strong>Loop-Back: {selectedLoop.label}</strong> ({selectedLoop.kbSection}) —{' '}
                  {selectedLoop.description}
                </>
              ) : (
                <>
                  <strong>{inspectedStage.label}:</strong> {inspectedStage.summary}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
