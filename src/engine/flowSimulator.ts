import {
  FAULT_PRESETS,
  FaultTypeId,
  FlowStep,
  SCENARIOS,
  ScenarioId,
} from '../data/packetFlowModel';

export interface SimulatorOptions {
  faultType: FaultTypeId;
  finRstEnabled: boolean;
  teardropDropEnabled: boolean;
  recheckDenyEnabled: boolean;
}

export interface SimulatorState {
  scenarioId: ScenarioId;
  stepIndex: number;
  steps: FlowStep[];
  options: SimulatorOptions;
}

export const DEFAULT_OPTIONS: SimulatorOptions = {
  faultType: 'l2-dot1q',
  finRstEnabled: false,
  teardropDropEnabled: false,
  recheckDenyEnabled: false,
};

function buildStepsForScenario(
  scenarioId: ScenarioId,
  options: SimulatorOptions
): FlowStep[] {
  const base = SCENARIOS.find((s) => s.id === scenarioId) ?? SCENARIOS[0]!;

  if (scenarioId === 'dropped-fault') {
    return FAULT_PRESETS[options.faultType].steps;
  }

  if (scenarioId === 'existing-fastpath' && options.finRstEnabled) {
    return [
      base.steps[0]!,
      {
        id: 's2-fin-1',
        title: 'Fast Path: 1st TCP FIN → Half-Closed Timer',
        stage: 'fastpath',
        activeEdgeFrom: 'ingress',
        description:
          'First FIN packet received on ACTIVE session: starts TCP Half-Closed timer (session closes if timer expires).',
        kbRef: 'Section 4',
        packet: {
          ...base.steps[1]!.packet,
          badge: 'FIN (Half-Closed)',
          sessionState: 'HALF_CLOSED',
        },
      },
      {
        id: 's2-fin-2',
        title: 'Fast Path: 2nd FIN / RST → TCP Time-Wait Timer',
        stage: 'fastpath',
        description:
          'Second FIN or RST received: starts TCP Time-Wait timer. Session closes cleanly upon timer expiration.',
        kbRef: 'Section 4',
        packet: {
          ...base.steps[1]!.packet,
          badge: 'FIN/RST (Time-Wait)',
          sessionState: 'TIME_WAIT',
        },
      },
      {
        ...base.steps[3]!,
        title: 'Egress: FIN/RST Forwarded & Session Closing',
        activeEdgeFrom: 'fastpath',
        packet: {
          ...base.steps[3]!.packet,
          badge: 'FIN/RST TX',
          sessionState: 'TIME_WAIT',
        },
      },
    ];
  }

  if (scenarioId === 'ip-fragmented' && options.teardropDropEnabled) {
    return [
      base.steps[0]!,
      {
        id: 's4-drop-teardrop',
        title: 'DROP: Tear-Drop Overlapping Fragments / Buffer Limit',
        stage: 'drop',
        activeEdgeFrom: 'ingress',
        description:
          'Ingress 2.3 detects overlapping fragments (tear-drop attack) or exceeds max buffered fragments threshold -> packet discarded.',
        kbRef: 'Section 2.3',
        packet: {
          ...base.steps[0]!.packet,
          badge: 'DROP (Defrag)',
          dropReason: 'Tear-drop attack (overlapping fragments) / buffer limit',
        },
      },
    ];
  }

  if (scenarioId === 'ssl-decrypt-appid-shift' && options.recheckDenyEnabled) {
    return [
      base.steps[0]!,
      base.steps[1]!,
      base.steps[2]!,
      base.steps[3]!,
      {
        id: 's6-drop-deny',
        title: 'DROP: Security Policy Denies "youtube" → Session DISCARD',
        stage: 'drop',
        activeEdgeFrom: 'slowpath',
        description:
          'Re-consulted Security Policy denies "youtube". Session transitions to DISCARD state and packet is dropped.',
        kbRef: 'Section 4 & 6',
        packet: {
          ...base.steps[3]!.packet,
          badge: 'DROP (App Deny)',
          sessionState: 'DISCARD',
          dropReason: 'Security Policy re-check denied shifted App-ID (youtube)',
        },
      },
    ];
  }

  return base.steps;
}

export function createInitialState(
  scenarioId: ScenarioId = 'new-tcp-http',
  partialOptions: Partial<SimulatorOptions> = {}
): SimulatorState {
  const options: SimulatorOptions = { ...DEFAULT_OPTIONS, ...partialOptions };
  const steps = buildStepsForScenario(scenarioId, options);
  return {
    scenarioId,
    stepIndex: 0,
    steps,
    options,
  };
}

export function stepForward(state: SimulatorState): SimulatorState {
  if (state.stepIndex >= state.steps.length - 1) {
    return state;
  }
  return {
    ...state,
    stepIndex: state.stepIndex + 1,
  };
}

export function stepBack(state: SimulatorState): SimulatorState {
  if (state.stepIndex <= 0) {
    return state;
  }
  return {
    ...state,
    stepIndex: state.stepIndex - 1,
  };
}

export function resetScenario(state: SimulatorState): SimulatorState {
  return {
    ...state,
    stepIndex: 0,
  };
}

export function selectScenario(
  scenarioId: ScenarioId,
  options: Partial<SimulatorOptions> = {}
): SimulatorState {
  return createInitialState(scenarioId, options);
}

export function updateSimulatorOptions(
  state: SimulatorState,
  partialOptions: Partial<SimulatorOptions>
): SimulatorState {
  const options: SimulatorOptions = { ...state.options, ...partialOptions };
  const steps = buildStepsForScenario(state.scenarioId, options);
  return {
    ...state,
    options,
    steps,
    stepIndex: 0,
  };
}

export function getCurrentStep(state: SimulatorState): FlowStep {
  return state.steps[state.stepIndex] ?? state.steps[0]!;
}

// 6-Tuple Flow Key Computation (KB Section 3)
export type SixTupleProtocol = 'TCP' | 'UDP' | 'ICMP' | 'IPSEC_ESP' | 'UNKNOWN';

export interface SixTupleInput {
  protocol: SixTupleProtocol;
  srcIp: string;
  dstIp: string;
  srcPort: string;
  dstPort: string;
  icmpId?: string;
  icmpSeq?: string;
  espSpi?: string;
  ingressZone: string;
  egressZone: string;
}

export interface FlowTupleKey {
  direction: 'C2S' | 'S2C';
  srcIp: string;
  dstIp: string;
  l4Src: string;
  l4Dst: string;
  ipProtocol: string;
  securityZone: string;
}

export interface SixTupleResult {
  c2s: FlowTupleKey;
  s2c: FlowTupleKey;
  l4Label: string;
  notes: string;
}

export function computeSixTuple(input: SixTupleInput): SixTupleResult {
  const srcIp = input.srcIp.trim() || '10.1.1.10';
  const dstIp = input.dstIp.trim() || '93.184.216.34';
  const ingressZone = input.ingressZone.trim() || 'trust';
  const egressZone = input.egressZone.trim() || 'untrust';

  switch (input.protocol) {
    case 'TCP': {
      const sp = input.srcPort.trim() || '51422';
      const dp = input.dstPort.trim() || '443';
      return {
        c2s: {
          direction: 'C2S',
          srcIp,
          dstIp,
          l4Src: sp,
          l4Dst: dp,
          ipProtocol: '6 (TCP)',
          securityZone: ingressZone,
        },
        s2c: {
          direction: 'S2C',
          srcIp: dstIp,
          dstIp: srcIp,
          l4Src: dp,
          l4Dst: sp,
          ipProtocol: '6 (TCP)',
          securityZone: egressZone,
        },
        l4Label: 'TCP Source / Destination Port',
        notes:
          'Standard TCP 6-tuple: C2S uses original sender as Client from firewall POV; S2C swaps IP & port pairs with egress zone.',
      };
    }
    case 'UDP': {
      const sp = input.srcPort.trim() || '55100';
      const dp = input.dstPort.trim() || '53';
      return {
        c2s: {
          direction: 'C2S',
          srcIp,
          dstIp,
          l4Src: sp,
          l4Dst: dp,
          ipProtocol: '17 (UDP)',
          securityZone: ingressZone,
        },
        s2c: {
          direction: 'S2C',
          srcIp: dstIp,
          dstIp: srcIp,
          l4Src: dp,
          l4Dst: sp,
          ipProtocol: '17 (UDP)',
          securityZone: egressZone,
        },
        l4Label: 'UDP Source / Destination Port',
        notes:
          'UDP 6-tuple: C2S & S2C unidirectional flows are both installed in the flow lookup table upon session allocation.',
      };
    }
    case 'ICMP': {
      const id = input.icmpId?.trim() || '0x1a2b';
      const seq = input.icmpSeq?.trim() || '1';
      return {
        c2s: {
          direction: 'C2S',
          srcIp,
          dstIp,
          l4Src: `ID:${id}`,
          l4Dst: `Seq:${seq}`,
          ipProtocol: '1 (ICMP)',
          securityZone: ingressZone,
        },
        s2c: {
          direction: 'S2C',
          srcIp: dstIp,
          dstIp: srcIp,
          l4Src: `ID:${id}`,
          l4Dst: `Seq:${seq}`,
          ipProtocol: '1 (ICMP)',
          securityZone: egressZone,
        },
        l4Label: 'ICMP Identifier & Sequence Number',
        notes:
          'ICMP has no TCP/UDP ports: PAN-OS substitutes ICMP Identifier and Sequence Number into the L4 tuple fields.',
      };
    }
    case 'IPSEC_ESP': {
      const spi = input.espSpi?.trim() || '0x9a12b401';
      return {
        c2s: {
          direction: 'C2S',
          srcIp,
          dstIp,
          l4Src: `SPI:${spi}`,
          l4Dst: `SPI:${spi}`,
          ipProtocol: '50 (ESP)',
          securityZone: ingressZone,
        },
        s2c: {
          direction: 'S2C',
          srcIp: dstIp,
          dstIp: srcIp,
          l4Src: `SPI:${spi}`,
          l4Dst: `SPI:${spi}`,
          ipProtocol: '50 (ESP)',
          securityZone: egressZone,
        },
        l4Label: 'IPSec Security Parameter Index (SPI)',
        notes:
          'For IPSec terminating on the firewall, the Security Parameter Index (SPI) populates the L4 port fields in the 6-tuple.',
      };
    }
    case 'UNKNOWN': {
      const reserved = 'RESERVED_CONST (skip L4 match)';
      return {
        c2s: {
          direction: 'C2S',
          srcIp,
          dstIp,
          l4Src: reserved,
          l4Dst: reserved,
          ipProtocol: '47 / Custom',
          securityZone: ingressZone,
        },
        s2c: {
          direction: 'S2C',
          srcIp: dstIp,
          dstIp: srcIp,
          l4Src: reserved,
          l4Dst: reserved,
          ipProtocol: '47 / Custom',
          securityZone: egressZone,
        },
        l4Label: 'Constant Reserved Value (Skip L4 Match)',
        notes:
          'For unknown protocols, PAN-OS uses a constant reserved value in the L4 fields to skip Layer-4 matching.',
      };
    }
  }
}
