import { describe, expect, it } from 'vitest';
import {
  DROP_REASONS,
  LOOP_BACK_ARCS,
  PIPELINE_STAGES,
  SCENARIOS,
  SLOWPATH_STEPS,
  getInterfaceMatrix,
} from '../data/packetFlowModel';
import { SLIDES } from '../data/slidesData';
import {
  computeSixTuple,
  createInitialState,
  getCurrentStep,
  resetScenario,
  selectScenario,
  stepBack,
  stepForward,
  updateSimulatorOptions,
} from '../engine/flowSimulator';

describe('PAN-OS Packet Flow Simulator', () => {
  it('initializes at step 0 and clamps stepBack / stepForward bounds', () => {
    let state = createInitialState('new-tcp-http');
    expect(state.stepIndex).toBe(0);
    expect(getCurrentStep(state).stage).toBe('ingress');

    // stepBack at 0 is a no-op
    expect(stepBack(state).stepIndex).toBe(0);

    // Advance through all steps
    for (let i = 0; i < state.steps.length + 2; i++) {
      state = stepForward(state);
    }
    expect(state.stepIndex).toBe(state.steps.length - 1);
    expect(getCurrentStep(state).stage).toBe('egress');

    // stepBack restores previous state deterministically
    const prev = stepBack(state);
    expect(prev.stepIndex).toBe(state.steps.length - 2);
    expect(getCurrentStep(prev).stage).toBe('contentid');

    // resetScenario returns to step 0
    expect(resetScenario(state).stepIndex).toBe(0);
  });

  it('supports all 6 scenarios and their specialized branches', () => {
    expect(SCENARIOS).toHaveLength(6);

    // Scenario 2 with FIN/RST timers
    let s2 = selectScenario('existing-fastpath', { finRstEnabled: true });
    s2 = stepForward(s2);
    expect(getCurrentStep(s2).packet.sessionState).toBe('HALF_CLOSED');
    s2 = stepForward(s2);
    expect(getCurrentStep(s2).packet.sessionState).toBe('TIME_WAIT');

    // Scenario 3 IPSec decap + encrypt loop-backs
    let s3 = selectScenario('ipsec-tunnel');
    s3 = stepForward(s3);
    expect(getCurrentStep(s3).activeLoop).toBe('decap-loop');
    expect(getCurrentStep(s3).packet.ingressIf).toBe('tunnel.1');
    s3 = stepForward(stepForward(stepForward(s3)));
    expect(getCurrentStep(s3).activeLoop).toBe('encrypt-loop');

    // Scenario 4 IP defrag loop-back & teardrop drop option
    let s4 = selectScenario('ip-fragmented');
    s4 = stepForward(s4);
    expect(getCurrentStep(s4).activeLoop).toBe('defrag-loop');
    const s4Drop = updateSimulatorOptions(s4, { teardropDropEnabled: true });
    expect(getCurrentStep(stepForward(s4Drop)).stage).toBe('drop');

    // Scenario 5 Fault injection
    let s5 = selectScenario('dropped-fault', { faultType: 'l2-dot1q' });
    s5 = stepForward(s5);
    expect(getCurrentStep(s5).stage).toBe('drop');
    expect(getCurrentStep(s5).packet.counters).toContain('flow_rcv_dot1q_tag_err');
    expect(getCurrentStep(s5).packet.counters).toContain('receive error');

    const s5Dos = updateSimulatorOptions(s5, { faultType: 'dos-protect' });
    const s5DosLast = stepForward(stepForward(s5Dos));
    expect(getCurrentStep(s5DosLast).stage).toBe('drop');
    expect(getCurrentStep(s5DosLast).packet.dropReason).toContain('PAN-48644');

    // Scenario 6 SSL Decryption + App-ID Shift + Deny option
    let s6 = selectScenario('ssl-decrypt-appid-shift');
    s6 = stepForward(stepForward(stepForward(s6))); // step 3 -> policy re-check loop
    expect(getCurrentStep(s6).activeLoop).toBe('appid-recheck-loop');
    expect(getCurrentStep(s6).packet.appId).toBe('youtube');

    const s6Deny = updateSimulatorOptions(s6, { recheckDenyEnabled: true });
    let endDeny = s6Deny;
    for (let i = 0; i < 5; i++) endDeny = stepForward(endDeny);
    expect(getCurrentStep(endDeny).stage).toBe('drop');
    expect(getCurrentStep(endDeny).packet.sessionState).toBe('DISCARD');
  });

  it('computes 6-tuple C2S and S2C keys for TCP, UDP, ICMP, IPSec ESP, and Unknown', () => {
    const tcp = computeSixTuple({
      protocol: 'TCP',
      srcIp: '10.0.0.5',
      dstIp: '1.1.1.1',
      srcPort: '12345',
      dstPort: '443',
      ingressZone: 'trust',
      egressZone: 'untrust',
    });
    expect(tcp.c2s.l4Src).toBe('12345');
    expect(tcp.s2c.srcIp).toBe('1.1.1.1');
    expect(tcp.s2c.l4Src).toBe('443');
    expect(tcp.s2c.securityZone).toBe('untrust');

    const icmp = computeSixTuple({
      protocol: 'ICMP',
      srcIp: '10.0.0.5',
      dstIp: '8.8.8.8',
      srcPort: '',
      dstPort: '',
      icmpId: '0xabcd',
      icmpSeq: '42',
      ingressZone: 'trust',
      egressZone: 'untrust',
    });
    expect(icmp.c2s.l4Src).toBe('ID:0xabcd');
    expect(icmp.c2s.l4Dst).toBe('Seq:42');

    const esp = computeSixTuple({
      protocol: 'IPSEC_ESP',
      srcIp: '198.51.100.2',
      dstIp: '203.0.113.1',
      srcPort: '',
      dstPort: '',
      espSpi: '0xdeadbeef',
      ingressZone: 'untrust',
      egressZone: 'untrust',
    });
    expect(esp.c2s.l4Src).toBe('SPI:0xdeadbeef');

    const unknown = computeSixTuple({
      protocol: 'UNKNOWN',
      srcIp: '10.0.0.5',
      dstIp: '10.0.0.6',
      srcPort: '',
      dstPort: '',
      ingressZone: 'trust',
      egressZone: 'trust',
    });
    expect(unknown.c2s.l4Src).toContain('RESERVED_CONST');
  });

  it('maintains complete KB technical inventory (slides, stages, loops, drops, slowpath, matrix)', () => {
    expect(SLIDES).toHaveLength(12);
    expect(PIPELINE_STAGES).toHaveLength(7); // 6 core stages + drop
    expect(LOOP_BACK_ARCS).toHaveLength(4);
    expect(DROP_REASONS.length).toBeGreaterThanOrEqual(25);
    expect(SLOWPATH_STEPS).toHaveLength(8);
    expect(SLOWPATH_STEPS[5]!.stepNumber).toBe('3.6'); // DoS
    expect(SLOWPATH_STEPS[6]!.stepNumber).toBe('3.7'); // Security Policy after DoS

    const matrixOff = getInterfaceMatrix(false, false);
    const matrixOn = getInterfaceMatrix(true, true);
    expect(matrixOff).toHaveLength(24); // 4 modes x 6 packet types
    const vwMcastOff = matrixOff.find(
      (c) => c.mode === 'Virtual-Wire' && c.packetType === 'IPv4 Multicast'
    );
    const vwMcastOn = matrixOn.find(
      (c) => c.mode === 'Virtual-Wire' && c.packetType === 'IPv4 Multicast'
    );
    expect(vwMcastOff?.action).toBe('Forward Only');
    expect(vwMcastOn?.action).toBe('Inspect & Forward');
  });
});
