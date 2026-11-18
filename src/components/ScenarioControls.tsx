import React from 'react';
import {
  FAULT_PRESETS,
  FaultTypeId,
  SCENARIOS,
  ScenarioId,
} from '../data/packetFlowModel';
import { SimulatorState } from '../engine/flowSimulator';

interface ScenarioControlsProps {
  simState: SimulatorState;
  isPlaying: boolean;
  speed: 0.5 | 1 | 2;
  onTogglePlay: () => void;
  onStepBack: () => void;
  onStepForward: () => void;
  onReset: () => void;
  onSpeedChange: (speed: 0.5 | 1 | 2) => void;
  onSelectScenario: (id: ScenarioId) => void;
  onSelectFault: (faultId: FaultTypeId) => void;
  onToggleFinRst: () => void;
  onToggleTeardrop: () => void;
  onToggleRecheckDeny: () => void;
}

export const ScenarioControls: React.FC<ScenarioControlsProps> = ({
  simState,
  isPlaying,
  speed,
  onTogglePlay,
  onStepBack,
  onStepForward,
  onReset,
  onSpeedChange,
  onSelectScenario,
  onSelectFault,
  onToggleFinRst,
  onToggleTeardrop,
  onToggleRecheckDeny,
}) => {
  const atStart = simState.stepIndex <= 0;
  const atEnd = simState.stepIndex >= simState.steps.length - 1;

  return (
    <div className="scenario-controls" data-testid="scenario-controls">
      <div className="scenario-tabs" role="tablist" aria-label="Packet Flow Scenarios">
        {SCENARIOS.map((sc) => {
          const active = simState.scenarioId === sc.id;
          return (
            <button
              key={sc.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={`scenario-tab ${active ? 'active' : ''}`}
              onClick={() => onSelectScenario(sc.id)}
              data-testid={`scenario-tab-${sc.id}`}
            >
              {sc.shortTitle}
            </button>
          );
        })}
      </div>

      <div className="playback-bar">
        <div className="playback-buttons">
          <button
            type="button"
            className="ctrl-btn primary"
            onClick={onTogglePlay}
            aria-label={isPlaying ? 'Pause animation' : 'Play animation'}
            data-testid="play-pause-btn"
          >
            {isPlaying ? '⏸ Pause' : '▶ Play'}
          </button>
          <button
            type="button"
            className="ctrl-btn"
            onClick={onStepBack}
            disabled={atStart}
            aria-label="Step back"
            data-testid="step-back-btn"
          >
            ◀ Step Back
          </button>
          <button
            type="button"
            className="ctrl-btn"
            onClick={onStepForward}
            disabled={atEnd}
            aria-label="Step forward"
            data-testid="step-forward-btn"
          >
            Step Forward ▶
          </button>
          <button
            type="button"
            className="ctrl-btn"
            onClick={onReset}
            aria-label="Reset scenario"
            data-testid="reset-btn"
          >
            ↺ Reset
          </button>
        </div>

        <div className="playback-meta">
          <span className="mono step-counter" data-testid="sim-step-counter">
            Step {simState.stepIndex + 1} / {simState.steps.length}
          </span>
          <div className="speed-group" role="group" aria-label="Playback speed">
            {([0.5, 1, 2] as const).map((s) => (
              <button
                key={s}
                type="button"
                className={`speed-btn ${speed === s ? 'active' : ''}`}
                onClick={() => onSpeedChange(s)}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Scenario-specific options */}
      {simState.scenarioId === 'dropped-fault' && (
        <div className="scenario-extra" data-testid="fault-selector">
          <label htmlFor="fault-select" className="extra-label">
            Inject Fault:
          </label>
          <select
            id="fault-select"
            value={simState.options.faultType}
            onChange={(e) => onSelectFault(e.target.value as FaultTypeId)}
            className="select-input"
          >
            {(Object.keys(FAULT_PRESETS) as FaultTypeId[]).map((key) => (
              <option key={key} value={key}>
                {FAULT_PRESETS[key].label}
              </option>
            ))}
          </select>
        </div>
      )}

      {simState.scenarioId === 'existing-fastpath' && (
        <div className="scenario-extra">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={simState.options.finRstEnabled}
              onChange={onToggleFinRst}
            />
            Simulate TCP FIN / RST (Half-Closed &amp; Time-Wait timers)
          </label>
        </div>
      )}

      {simState.scenarioId === 'ip-fragmented' && (
        <div className="scenario-extra">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={simState.options.teardropDropEnabled}
              onChange={onToggleTeardrop}
            />
            Inject Tear-Drop / Buffer Limit Drop (Section 2.3)
          </label>
        </div>
      )}

      {simState.scenarioId === 'ssl-decrypt-appid-shift' && (
        <div className="scenario-extra">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={simState.options.recheckDenyEnabled}
              onChange={onToggleRecheckDeny}
            />
            Deny Shifted App-ID (&quot;youtube&quot;) on Security Policy Re-check
          </label>
        </div>
      )}
    </div>
  );
};
