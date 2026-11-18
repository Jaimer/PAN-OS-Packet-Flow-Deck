import React from 'react';
import {
  FaultTypeId,
  ScenarioId,
} from '../data/packetFlowModel';
import { SlideDefinition, WidgetId } from '../data/slidesData';
import { SimulatorState, getCurrentStep } from '../engine/flowSimulator';
import {
  IngressDropsWidget,
  InterfaceMatrixWidget,
  SessionLifecycleWidget,
  SixTupleExplorer,
  SlowpathExplorerWidget,
  Sp3ArchitectureWidget,
  SynCookiesRedWidget,
} from './EducationalWidgets';
import { PacketFlowDiagram } from './PacketFlowDiagram';
import { ScenarioControls } from './ScenarioControls';

interface SlideRendererProps {
  slide: SlideDefinition;
  interactiveMode: boolean;
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

export const SlideRenderer: React.FC<SlideRendererProps> = ({
  slide,
  interactiveMode,
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
  const currentStep = getCurrentStep(simState);

  const renderWidget = (widgetId: WidgetId) => {
    switch (widgetId) {
      case 'pipeline':
        return (
          <div className="pipeline-section">
            {interactiveMode && (
              <ScenarioControls
                simState={simState}
                isPlaying={isPlaying}
                speed={speed}
                onTogglePlay={onTogglePlay}
                onStepBack={onStepBack}
                onStepForward={onStepForward}
                onReset={onReset}
                onSpeedChange={onSpeedChange}
                onSelectScenario={onSelectScenario}
                onSelectFault={onSelectFault}
                onToggleFinRst={onToggleFinRst}
                onToggleTeardrop={onToggleTeardrop}
                onToggleRecheckDeny={onToggleRecheckDeny}
              />
            )}
            <PacketFlowDiagram
              currentStep={currentStep}
              highlightStages={slide.highlightStages}
              compact={!interactiveMode}
            />
          </div>
        );
      case 'sp3':
        return <Sp3ArchitectureWidget />;
      case 'six-tuple':
        return <SixTupleExplorer />;
      case 'interface-matrix':
        return <InterfaceMatrixWidget />;
      case 'syn-cookies-red':
        return <SynCookiesRedWidget />;
      case 'session-lifecycle':
        return <SessionLifecycleWidget />;
      case 'slowpath-explorer':
        return <SlowpathExplorerWidget />;
      case 'ingress-drops':
        return <IngressDropsWidget />;
    }
  };

  return (
    <article
      key={slide.id}
      className="slide-content slide-enter"
      data-testid={`slide-${slide.number}`}
    >
      <header className="slide-header">
        <div className="slide-badges">
          <span className="badge badge-stage" data-testid="slide-section-badge">
            {slide.sectionBadge}
          </span>
          <span className="badge badge-kb mono">{slide.kbRefs}</span>
        </div>
        <h1 className="slide-title" data-testid="slide-title">
          {slide.title}
        </h1>
        <p className="slide-subtitle">{slide.subtitle}</p>
      </header>

      <div className="slide-body">
        <div className="slide-keypoints-col">
          <ul className="keypoints-list">
            {slide.keyPoints.map((pt, idx) => (
              <li key={idx}>{pt}</li>
            ))}
          </ul>
          {slide.callout && (
            <div className={`callout-box tone-${slide.callout.tone}`}>
              <strong>{slide.callout.title}</strong>
              <p>{slide.callout.body}</p>
            </div>
          )}
        </div>

        <div className="slide-interactive-col">
          {renderWidget(slide.primaryWidget)}
          {interactiveMode && slide.secondaryWidget && (
            <div className="secondary-widget-slot">
              {renderWidget(slide.secondaryWidget)}
            </div>
          )}
        </div>
      </div>
    </article>
  );
};
