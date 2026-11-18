export type StageId =
  | 'ingress'
  | 'slowpath'
  | 'fastpath'
  | 'appid'
  | 'contentid'
  | 'egress'
  | 'drop';

export type LoopBackId =
  | 'decap-loop'
  | 'defrag-loop'
  | 'encrypt-loop'
  | 'appid-recheck-loop';

export type ScenarioId =
  | 'new-tcp-http'
  | 'existing-fastpath'
  | 'ipsec-tunnel'
  | 'ip-fragmented'
  | 'dropped-fault'
  | 'ssl-decrypt-appid-shift';

export type FaultTypeId =
  | 'l2-dot1q'
  | 'ipv4-ttl0'
  | 'tcp-port0'
  | 'dos-protect'
  | 'security-deny'
  | 'content-threat';

export type SessionState =
  | 'NONE'
  | 'INIT'
  | 'OPENING'
  | 'ACTIVE'
  | 'HALF_CLOSED'
  | 'TIME_WAIT'
  | 'CLOSED'
  | 'DISCARD';

export interface PipelineStage {
  id: StageId;
  label: string;
  shortLabel: string;
  kbSection: string;
  category: 'per-packet' | 'session-based' | 'discard';
  colorVar: string;
  x: number;
  y: number;
  summary: string;
  subModules: string[];
}

export interface LoopBackArc {
  id: LoopBackId;
  from: StageId;
  to: StageId;
  label: string;
  kbSection: string;
  description: string;
  svgPath: string;
  labelX: number;
  labelY: number;
}

export interface DropReason {
  id: string;
  stage: StageId;
  subStage: string;
  reason: string;
  counters?: string[];
  configurable: boolean;
}

export interface PacketSnapshot {
  badge: string;
  protocol: string;
  srcIp: string;
  dstIp: string;
  srcPort: string;
  dstPort: string;
  ingressIf: string;
  egressIf: string;
  zoneIn: string;
  zoneOut: string;
  appId: string;
  sessionState: SessionState;
  natApplied: boolean;
  decrypted: boolean;
  fragmented: boolean;
  dropReason?: string;
  counters?: string[];
}

export interface FlowStep {
  id: string;
  title: string;
  stage: StageId;
  activeEdgeFrom?: StageId;
  activeLoop?: LoopBackId;
  description: string;
  kbRef: string;
  packet: PacketSnapshot;
}

export interface ScenarioDefinition {
  id: ScenarioId;
  title: string;
  shortTitle: string;
  subtitle: string;
  kbSections: string;
  steps: FlowStep[];
}

export const PIPELINE_STAGES: PipelineStage[] = [
  {
    id: 'ingress',
    label: '1. Ingress Stage',
    shortLabel: 'Ingress',
    kbSection: 'Section 2',
    category: 'per-packet',
    colorVar: 'var(--stage-ingress)',
    x: 95,
    y: 165,
    summary:
      'Per-packet network stage: parses L2/L3/L4 headers, decapsulates tunnels (2.2), and reassembles IP fragments (2.3).',
    subModules: [
      '2.1 L2 (Port, 802.1q, Dst MAC)',
      '2.1 L3/L4 Protocol Checks',
      '2.2 Tunnel Decapsulation',
      '2.3 IP Defragmentation',
    ],
  },
  {
    id: 'slowpath',
    label: '2. Slowpath Setup',
    shortLabel: 'Slowpath',
    kbSection: 'Section 3.1–3.8',
    category: 'session-based',
    colorVar: 'var(--stage-slowpath)',
    x: 275,
    y: 85,
    summary:
      'Executed on flow-lookup miss: Zone Protection, TCP State, Forwarding, NAT, User-ID, DoS (PAN-48644), Security Policy (App=ANY), Session Alloc.',
    subModules: [
      '3.1 Zone Protection',
      '3.2 TCP State / SYN Cookies',
      '3.3 Forwarding Setup',
      '3.4 NAT Policy Lookup',
      '3.5 User-ID',
      '3.6 DoS Protection',
      '3.7 Security Policy (ANY)',
      '3.8 Session Allocation',
    ],
  },
  {
    id: 'fastpath',
    label: '3. Fast Path',
    shortLabel: 'Fast Path',
    kbSection: 'Section 4',
    category: 'session-based',
    colorVar: 'var(--stage-fastpath)',
    x: 275,
    y: 245,
    summary:
      'Session hit or post-allocation path: DISCARD check, timeout refresh, FIN/RST timers, NAT L3/L4 translation, TCP reassembly, Captive Portal.',
    subModules: [
      'L2–L4 Processing & NAT Xlate',
      'TCP Reassembly & Window Check',
      '4.1 Security Processing Gate',
      '4.2 Captive Portal (TCP/80)',
    ],
  },
  {
    id: 'appid',
    label: '4. App-ID',
    shortLabel: 'App-ID',
    kbSection: 'Section 5',
    category: 'session-based',
    colorVar: 'var(--stage-appid)',
    x: 475,
    y: 245,
    summary:
      'Application-Override check or signature matching; triggers Security Policy re-lookup, Traffic Log on App-ID change, QoS, and SSL/SSH Decryption.',
    subModules: [
      'Application-Override Lookup',
      'Application Signatures',
      'Security Policy Re-lookup',
      'QoS & SSL/SSH Decryption Setup',
    ],
  },
  {
    id: 'contentid',
    label: '5. Content-ID',
    shortLabel: 'Content-ID',
    kbSection: 'Section 6',
    category: 'session-based',
    colorVar: 'var(--stage-contentid)',
    x: 665,
    y: 245,
    summary:
      'Protocol decoders, tunneled app detection (loops back to Policy on app change), Security Profile threat inspection, and SSL/SSH re-encryption.',
    subModules: [
      'Protocol Decoders & Tunnel App Detection',
      'Security Profiles Inspection',
      'SSL/SSH Re-encryption',
    ],
  },
  {
    id: 'egress',
    label: '6. Forwarding / Egress',
    shortLabel: 'Egress',
    kbSection: 'Section 7',
    category: 'per-packet',
    colorVar: 'var(--stage-egress)',
    x: 845,
    y: 165,
    summary:
      'Per-packet egress stage: forwarding domain, QoS shaping, MTU fragmentation, IPSec/SSL-VPN tunnel encryption loop-back, physical TX.',
    subModules: [
      'Forwarding Domain & QoS Shaping',
      'Egress MTU Fragmentation',
      'Tunnel Encryption (IPSec/SSL-VPN)',
      'Physical Egress Transmit',
    ],
  },
  {
    id: 'drop',
    label: 'DROP / DISCARD',
    shortLabel: 'DROP',
    kbSection: 'Sec 2–6',
    category: 'discard',
    colorVar: 'var(--stage-drop)',
    x: 475,
    y: 375,
    summary:
      'Packet discarded due to L2–L4 protocol violation, DoS/Zone Protection, Policy Deny, Resource Limit, or Content-ID Threat.',
    subModules: ['Hardware / Global Counters', 'Session DISCARD State'],
  },
];

export const LOOP_BACK_ARCS: LoopBackArc[] = [
  {
    id: 'decap-loop',
    from: 'ingress',
    to: 'ingress',
    label: '2.2 Tunnel Decap → IP Parser',
    kbSection: 'Section 2.2',
    description:
      'Decapsulates IPSec/SSL-VPN, assigns tunnel.N as new ingress interface, and feeds inner packet back to IP header parser.',
    svgPath: 'M 60 125 C 20 55, 170 55, 130 125',
    labelX: 95,
    labelY: 54,
  },
  {
    id: 'defrag-loop',
    from: 'ingress',
    to: 'ingress',
    label: '2.3 IP Defrag → IP Parser',
    kbSection: 'Section 2.3',
    description:
      'Buffers and reassembles IP fragments, then feeds the reassembled packet back to the parser starting at the IP header.',
    svgPath: 'M 52 205 C 12 275, 178 275, 138 205',
    labelX: 95,
    labelY: 282,
  },
  {
    id: 'appid-recheck-loop',
    from: 'contentid',
    to: 'slowpath',
    label: '6. App-ID Change → Policy Re-check',
    kbSection: 'Section 6',
    description:
      'When Content-ID protocol decoders detect a tunneled/shifted application, PAN-OS re-consults Security Policies to verify the session may continue.',
    svgPath: 'M 665 205 C 625 90, 460 60, 355 82',
    labelX: 525,
    labelY: 72,
  },
  {
    id: 'encrypt-loop',
    from: 'egress',
    to: 'egress',
    label: '7. Tunnel Encrypt → Re-evaluate Fwd',
    kbSection: 'Section 7',
    description:
      'If egress interface is a tunnel interface, IPSec/SSL-VPN encryption runs and packet forwarding is re-evaluated for the outer header.',
    svgPath: 'M 810 125 C 770 55, 920 55, 880 125',
    labelX: 845,
    labelY: 54,
  },
];

export const DROP_REASONS: DropReason[] = [
  // Section 2.1 L2 (1)
  {
    id: 'l2-interface-not-found',
    stage: 'ingress',
    subStage: '2.1 L2 Parsing',
    reason: 'Logical interface not found for (ingress port, 802.1q tag, dst MAC)',
    counters: ['receive error', 'flow_rcv_dot1q_tag_err'],
    configurable: false,
  },
  // Section 2.1 IPv4 (8)
  { id: 'ipv4-eth-mismatch', stage: 'ingress', subStage: '2.1 IPv4', reason: 'Mismatch of Ethernet type and IP version', configurable: false },
  { id: 'ipv4-truncated', stage: 'ingress', subStage: '2.1 IPv4', reason: 'Truncated IP header', configurable: false },
  { id: 'ipv4-proto-0', stage: 'ingress', subStage: '2.1 IPv4', reason: 'IP protocol number 0', configurable: false },
  { id: 'ipv4-ttl-0', stage: 'ingress', subStage: '2.1 IPv4', reason: 'TTL zero (TTL == 0)', configurable: false },
  { id: 'ipv4-land', stage: 'ingress', subStage: '2.1 IPv4', reason: 'Land attack (src IP == dst IP)', configurable: false },
  { id: 'ipv4-pod', stage: 'ingress', subStage: '2.1 IPv4', reason: 'Ping of death', configurable: false },
  { id: 'ipv4-martian', stage: 'ingress', subStage: '2.1 IPv4', reason: 'Martian IP address', configurable: false },
  { id: 'ipv4-checksum', stage: 'ingress', subStage: '2.1 IPv4', reason: 'IP checksum errors', configurable: false },
  // Section 2.1 IPv6 (5)
  { id: 'ipv6-eth-mismatch', stage: 'ingress', subStage: '2.1 IPv6', reason: 'IPv6 mismatch of Ethernet type and IP version', configurable: false },
  { id: 'ipv6-truncated-hdr', stage: 'ingress', subStage: '2.1 IPv6', reason: 'Truncated IPv6 header', configurable: false },
  { id: 'ipv6-truncated-pkt', stage: 'ingress', subStage: '2.1 IPv6', reason: 'Truncated IP packet (payload buffer < payload field)', configurable: false },
  { id: 'ipv6-jumbogram', stage: 'ingress', subStage: '2.1 IPv6', reason: 'JumboGram extension (RFC 2675)', configurable: false },
  { id: 'ipv6-truncated-ext', stage: 'ingress', subStage: '2.1 IPv6', reason: 'Truncated extension header', configurable: false },
  // Section 2.1 TCP (5)
  { id: 'tcp-truncated', stage: 'ingress', subStage: '2.1 TCP', reason: 'TCP header is truncated', configurable: false },
  { id: 'tcp-data-offset', stage: 'ingress', subStage: '2.1 TCP', reason: 'TCP data-offset field is less than 5', configurable: false },
  { id: 'tcp-checksum', stage: 'ingress', subStage: '2.1 TCP', reason: 'TCP checksum error', configurable: false },
  { id: 'tcp-port-zero', stage: 'ingress', subStage: '2.1 TCP', reason: 'TCP port is zero', configurable: false },
  { id: 'tcp-invalid-flags', stage: 'ingress', subStage: '2.1 TCP', reason: 'Invalid combination of TCP flags', configurable: false },
  // Section 2.1 UDP (3)
  { id: 'udp-truncated-hdr', stage: 'ingress', subStage: '2.1 UDP', reason: 'UDP header truncated', configurable: false },
  { id: 'udp-truncated-payload', stage: 'ingress', subStage: '2.1 UDP', reason: 'UDP payload truncated (not fragment & buffer < UDP length)', configurable: false },
  { id: 'udp-checksum', stage: 'ingress', subStage: '2.1 UDP', reason: 'UDP checksum error', configurable: false },
  // Section 2.2 & 2.3 (4)
  { id: 'decap-error', stage: 'ingress', subStage: '2.2 Tunnel Decap', reason: 'Tunnel decapsulation / decryption error', configurable: false },
  { id: 'defrag-teardrop', stage: 'ingress', subStage: '2.3 IP Defrag', reason: 'Tear-drop attack (overlapping fragments)', configurable: false },
  { id: 'defrag-error', stage: 'ingress', subStage: '2.3 IP Defrag', reason: 'IP fragmentation errors', configurable: false },
  { id: 'defrag-limit', stage: 'ingress', subStage: '2.3 IP Defrag', reason: 'System limits on buffered fragments reached (max packet threshold)', configurable: false },
  // Section 3.1 - 3.8 Slowpath (7)
  { id: 'sp-zone-prot', stage: 'slowpath', subStage: '3.1 Zone Protection', reason: 'Zone Protection Profile violation', configurable: true },
  { id: 'sp-tcp-non-syn', stage: 'slowpath', subStage: '3.2 TCP State', reason: 'First TCP packet without SYN bit (default) or SYN Flood RED drop', configurable: true },
  { id: 'sp-fwd-none', stage: 'slowpath', subStage: '3.3 Forwarding Setup', reason: 'Tap mode policy drop or L3 forwarding table no match', configurable: true },
  { id: 'sp-snat-alloc', stage: 'slowpath', subStage: '3.4 NAT Lookup', reason: 'Source NAT IP allocation check failed', configurable: true },
  { id: 'sp-dos-protect', stage: 'slowpath', subStage: '3.6 DoS Protection', reason: 'DoS Protection Protect threshold exceeded or Deny action (PAN-48644)', configurable: true },
  { id: 'sp-sec-deny', stage: 'slowpath', subStage: '3.7 Security Policy', reason: 'Security Policy explicit Deny or implicit rulebase deny', configurable: true },
  { id: 'sp-alloc-limit', stage: 'slowpath', subStage: '3.8 Session Alloc', reason: 'VSYS or global session max reached / race-condition duplicate', configurable: false },
  // Section 4 Fast Path (2)
  { id: 'fp-discard-state', stage: 'fastpath', subStage: '4. Fast Path', reason: 'Session marked DISCARD (policy change to deny or threat detected)', configurable: true },
  { id: 'fp-tcp-reasm', stage: 'fastpath', subStage: '4. Fast Path', reason: 'TCP reassembly error or reassembly buffer full (out-of-order limit)', configurable: false },
  // Section 6 Content-ID (1)
  { id: 'cid-threat-block', stage: 'contentid', subStage: '6. Content Inspection', reason: 'Content-ID threat detected with block/reset security profile action', configurable: true },
];

export interface SlowpathStepInfo {
  id: string;
  stepNumber: string;
  title: string;
  kbSection: string;
  inputsAvailable: string[];
  summary: string;
  caveat?: string;
}

export const SLOWPATH_STEPS: SlowpathStepInfo[] = [
  {
    id: 'sp-3.1',
    stepNumber: '3.1',
    title: 'Zone Protection Checks',
    kbSection: 'Section 3.1',
    inputsAvailable: ['Ingress Interface', 'Ingress Security Zone'],
    summary:
      'Maps ingress interface to ingress zone and evaluates any configured Zone Protection Profile (floods, reconnaissance, packet-based attacks).',
  },
  {
    id: 'sp-3.2',
    stepNumber: '3.2',
    title: 'TCP State Check',
    kbSection: 'Section 3.2',
    inputsAvailable: ['TCP Flags (SYN/ACK)', 'Zone Protection SYN Flood Settings'],
    summary:
      'Drops first TCP packet if SYN bit is not set (default). Evaluates SYN Flood protection: Random Early Drop (RED, default) or SYN Cookies (RNG seed at data plane boot + proxy 3-way handshake + seq translation).',
    caveat: 'Allow Non-SYN should be disabled when SYN Cookies are enabled.',
  },
  {
    id: 'sp-3.3',
    stepNumber: '3.3',
    title: 'Forwarding Setup',
    kbSection: 'Section 3.3',
    inputsAvailable: ['Interface Mode (L3/L2/VW/Tap)', 'Dst IP / Dst MAC'],
    summary:
      'Determines egress interface/zone: Tap drops; Virtual-Wire uses peer interface; L2 checks MAC table (floods VLAN on miss); L3 checks forwarding table (drops on no match).',
  },
  {
    id: 'sp-3.4',
    stepNumber: '3.4',
    title: 'NAT Policy Lookup',
    kbSection: 'Section 3.4',
    inputsAvailable: ['Ingress Zone', 'Egress Zone', 'Original Packet'],
    summary:
      'Applies only in Layer-3 or Virtual-Wire mode. Evaluates NAT rules on original packet. Destination NAT triggers a second route lookup for translated address; Source NAT checks IP allocation (discards on failure).',
    caveat: 'Only applies to Layer-3 and Virtual-Wire modes.',
  },
  {
    id: 'sp-3.5',
    stepNumber: '3.5',
    title: 'User-ID',
    kbSection: 'Section 3.5',
    inputsAvailable: ['Source IP', 'Per-VSYS User-IP & User-Group Tables'],
    summary:
      'Queries per-VSYS User-IP mapping table, fetches user, and queries user-group mapping table. If unavailable and Captive Portal policy exists, defers to Section 4.2.',
  },
  {
    id: 'sp-3.6',
    stepNumber: '3.6',
    title: 'DoS Protection Policy Lookup',
    kbSection: 'Section 3.6 (PAN-48644)',
    inputsAvailable: ['Ingress/Egress Zones', 'DoS Profile Thresholds'],
    summary:
      'Since PAN-OS 7.0.2 & 6.1.7 (PAN-48644), DoS Protection runs PRIOR to Security Policy. Protect checks profile thresholds; Allow/Deny takes precedence regardless of thresholds.',
    caveat: 'PAN-48644: Moved before Security Policy (3.7) to protect policy/session resources.',
  },
  {
    id: 'sp-3.7',
    stepNumber: '3.7',
    title: 'Security Policy Lookup',
    kbSection: 'Section 3.7',
    inputsAvailable: ['Ingress/Egress Zones', 'Application = ANY', 'Original Pre-NAT Packet', 'User-ID'],
    summary:
      'Evaluates rules with Application = ANY against the ORIGINAL packet (even when NAT is configured). Intra-zone traffic permitted by default; no match = implicit deny.',
    caveat: 'Always matches original pre-NAT packet contents.',
  },
  {
    id: 'sp-3.8',
    stepNumber: '3.8',
    title: 'Session Allocation',
    kbSection: 'Section 3.8',
    inputsAvailable: ['Free Session Pool', '6-Tuple C2S & S2C Keys'],
    summary:
      'Allocates session (INIT -> OPENING), populates flow keys/forwarding/policy & default transport timeout, checks flow table for race-condition duplicate, installs C2S & S2C flows, transitions OPENING -> ACTIVE, and forwards to Fast Path.',
  },
];

export type InterfaceMode = 'Layer-3' | 'Layer-2' | 'Virtual-Wire' | 'Tap';
export type PacketTypeKey =
  | 'IPv4 unicast'
  | 'IPv4 Multicast'
  | 'IP broadcast'
  | 'IP local broadcast'
  | 'IPv6'
  | 'Non-IP';

export interface MatrixCell {
  mode: InterfaceMode;
  packetType: PacketTypeKey;
  action: string;
  badgeTone: 'inspect' | 'forward' | 'drop' | 'conditional';
  detail: string;
  changedByToggle?: boolean;
}

export function getInterfaceMatrix(
  multicastFirewalling: boolean,
  ipv6Firewalling: boolean
): MatrixCell[] {
  const modes: InterfaceMode[] = ['Layer-3', 'Layer-2', 'Virtual-Wire', 'Tap'];
  const types: PacketTypeKey[] = [
    'IPv4 unicast',
    'IPv4 Multicast',
    'IP broadcast',
    'IP local broadcast',
    'IPv6',
    'Non-IP',
  ];

  const cells: MatrixCell[] = [];
  for (const packetType of types) {
    for (const mode of modes) {
      if (packetType === 'IPv4 unicast') {
        cells.push({
          mode,
          packetType,
          action: mode === 'Tap' ? 'Inspect & Drop' : 'Inspect & Forward',
          badgeTone: mode === 'Tap' ? 'drop' : 'inspect',
          detail:
            mode === 'Tap'
              ? 'Tap mode inspects IPv4 unicast and then drops (egress = ingress zone).'
              : `${mode} inspects and forwards IPv4 unicast traffic.`,
        });
      } else if (packetType === 'IPv4 Multicast') {
        if (mode === 'Layer-3') {
          cells.push({
            mode,
            packetType,
            action: 'Inspect & Forward',
            badgeTone: 'inspect',
            detail: 'Layer-3 inspects and forwards IPv4 Multicast (224.0.0.1–239.255.255.255).',
          });
        } else if (mode === 'Layer-2') {
          cells.push({
            mode,
            packetType,
            action: 'Forward Only (Flood)',
            badgeTone: 'forward',
            detail: 'Layer-2 floods IPv4 Multicast across VLAN without session inspection.',
          });
        } else if (mode === 'Virtual-Wire') {
          cells.push({
            mode,
            packetType,
            action: multicastFirewalling ? 'Inspect & Forward' : 'Forward Only',
            badgeTone: multicastFirewalling ? 'inspect' : 'forward',
            changedByToggle: multicastFirewalling,
            detail: multicastFirewalling
              ? 'Multicast Firewalling ON: Virtual-Wire inspects and forwards.'
              : 'Multicast Firewalling OFF: Virtual-Wire forwards without inspection.',
          });
        } else {
          cells.push({
            mode,
            packetType,
            action: 'Inspect & Drop',
            badgeTone: 'drop',
            detail: 'Tap mode inspects IPv4 Multicast and drops.',
          });
        }
      } else if (packetType === 'IP broadcast' || packetType === 'IP local broadcast') {
        if (mode === 'Layer-3' || mode === 'Tap') {
          cells.push({
            mode,
            packetType,
            action: 'Drop',
            badgeTone: 'drop',
            detail: `${mode} drops ${packetType}.`,
          });
        } else if (mode === 'Layer-2') {
          cells.push({
            mode,
            packetType,
            action: 'Forward Only (Flood)',
            badgeTone: 'forward',
            detail: `Layer-2 floods ${packetType} across VLAN.`,
          });
        } else {
          cells.push({
            mode,
            packetType,
            action: multicastFirewalling ? 'Inspect & Forward' : 'Forward Only',
            badgeTone: multicastFirewalling ? 'inspect' : 'forward',
            changedByToggle: multicastFirewalling,
            detail: multicastFirewalling
              ? `Multicast Firewalling ON: Virtual-Wire inspects and forwards ${packetType}.`
              : `Multicast Firewalling OFF: Virtual-Wire forwards ${packetType} without inspection.`,
          });
        }
      } else if (packetType === 'IPv6') {
        if (mode === 'Layer-3') {
          cells.push({
            mode,
            packetType,
            action: ipv6Firewalling ? 'Inspect & Forward' : 'Not Forwarded (Disabled)',
            badgeTone: ipv6Firewalling ? 'inspect' : 'drop',
            changedByToggle: !ipv6Firewalling,
            detail: 'Layer-3 inspects and forwards IPv6 if IPv6 is enabled.',
          });
        } else if (mode === 'Layer-2' || mode === 'Virtual-Wire') {
          cells.push({
            mode,
            packetType,
            action: ipv6Firewalling ? 'Inspect & Forward' : 'Forward Only',
            badgeTone: ipv6Firewalling ? 'inspect' : 'forward',
            changedByToggle: !ipv6Firewalling,
            detail: `${mode}: forwards IPv6; inspects only if IPv6 firewalling is on (default ON).`,
          });
        } else {
          cells.push({
            mode,
            packetType,
            action: ipv6Firewalling ? 'Inspect & Drop' : 'Drop',
            badgeTone: 'drop',
            changedByToggle: !ipv6Firewalling,
            detail: 'Tap: drops IPv6; inspects only if IPv6 firewalling is on (default ON).',
          });
        }
      } else {
        // Non-IP
        if (mode === 'Layer-3') {
          cells.push({
            mode,
            packetType,
            action: 'Process (Not Forward)',
            badgeTone: 'conditional',
            detail: 'Layer-3 processes Non-IP if applicable (e.g., ARP), does not forward.',
          });
        } else if (mode === 'Layer-2' || mode === 'Virtual-Wire') {
          cells.push({
            mode,
            packetType,
            action: 'Forward Only',
            badgeTone: 'forward',
            detail: `${mode} forwards Non-IP traffic without firewall inspection.`,
          });
        } else {
          cells.push({
            mode,
            packetType,
            action: 'Drop',
            badgeTone: 'drop',
            detail: 'Tap mode drops Non-IP traffic.',
          });
        }
      }
    }
  }
  return cells;
}

export const FAULT_PRESETS: Record<
  FaultTypeId,
  { label: string; dropReasonId: string; targetStage: StageId; steps: FlowStep[] }
> = {
  'l2-dot1q': {
    label: 'L2: Unknown 802.1q Tag',
    dropReasonId: 'l2-interface-not-found',
    targetStage: 'ingress',
    steps: [
      {
        id: 'f-l2-1',
        title: 'Ingress L2 Lookup (ethernet1/1, VLAN 999)',
        stage: 'ingress',
        description:
          'Firewall looks up logical interface using (ingress port, 802.1q tag 999, dst MAC). No matching subinterface exists.',
        kbRef: 'Section 2.1',
        packet: {
          badge: '802.1Q:999',
          protocol: 'TCP',
          srcIp: '10.1.1.10',
          dstIp: '172.16.10.50',
          srcPort: '51422',
          dstPort: '443',
          ingressIf: 'ethernet1/1.999?',
          egressIf: '-',
          zoneIn: 'unknown',
          zoneOut: '-',
          appId: 'none',
          sessionState: 'NONE',
          natApplied: false,
          decrypted: false,
          fragmented: false,
        },
      },
      {
        id: 'f-l2-2',
        title: 'DROP: Logical Interface Not Found',
        stage: 'drop',
        activeEdgeFrom: 'ingress',
        description:
          'Packet discarded at Ingress L2 parsing. Increments hardware counter "receive error" and global counter "flow_rcv_dot1q_tag_err".',
        kbRef: 'Section 2.1',
        packet: {
          badge: 'DROP (L2)',
          protocol: 'TCP',
          srcIp: '10.1.1.10',
          dstIp: '172.16.10.50',
          srcPort: '51422',
          dstPort: '443',
          ingressIf: 'ethernet1/1',
          egressIf: '-',
          zoneIn: 'unknown',
          zoneOut: '-',
          appId: 'none',
          sessionState: 'NONE',
          natApplied: false,
          decrypted: false,
          fragmented: false,
          dropReason: 'Logical interface not found (802.1q tag mismatch)',
          counters: ['receive error', 'flow_rcv_dot1q_tag_err'],
        },
      },
    ],
  },
  'ipv4-ttl0': {
    label: 'L3: IPv4 TTL = 0 / Land',
    dropReasonId: 'ipv4-ttl-0',
    targetStage: 'ingress',
    steps: [
      {
        id: 'f-ip-1',
        title: 'Ingress L3 IPv4 Header Parse (TTL=0)',
        stage: 'ingress',
        description:
          'L2 logical interface ethernet1/1 found. L3 IPv4 parser inspects header and detects TTL == 0 (one of 8 mandatory non-configurable IPv4 drop conditions).',
        kbRef: 'Section 2.1',
        packet: {
          badge: 'IPv4 TTL=0',
          protocol: 'TCP',
          srcIp: '10.1.1.10',
          dstIp: '172.16.10.50',
          srcPort: '51422',
          dstPort: '80',
          ingressIf: 'ethernet1/1',
          egressIf: '-',
          zoneIn: 'trust',
          zoneOut: '-',
          appId: 'none',
          sessionState: 'NONE',
          natApplied: false,
          decrypted: false,
          fragmented: false,
        },
      },
      {
        id: 'f-ip-2',
        title: 'DROP: IPv4 Protocol Violation (TTL=0)',
        stage: 'drop',
        activeEdgeFrom: 'ingress',
        description: 'Packet discarded immediately without configurable override.',
        kbRef: 'Section 2.1',
        packet: {
          badge: 'DROP (L3)',
          protocol: 'TCP',
          srcIp: '10.1.1.10',
          dstIp: '172.16.10.50',
          srcPort: '51422',
          dstPort: '80',
          ingressIf: 'ethernet1/1',
          egressIf: '-',
          zoneIn: 'trust',
          zoneOut: '-',
          appId: 'none',
          sessionState: 'NONE',
          natApplied: false,
          decrypted: false,
          fragmented: false,
          dropReason: 'IPv4 TTL zero (TTL == 0)',
        },
      },
    ],
  },
  'tcp-port0': {
    label: 'L4: TCP Port = 0',
    dropReasonId: 'tcp-port-zero',
    targetStage: 'ingress',
    steps: [
      {
        id: 'f-tcp-1',
        title: 'Ingress L4 TCP Header Parse (Port=0)',
        stage: 'ingress',
        description:
          'L2 and L3 checks pass. L4 TCP parser detects destination port == 0 (one of 5 mandatory TCP discard conditions).',
        kbRef: 'Section 2.1',
        packet: {
          badge: 'TCP Port=0',
          protocol: 'TCP',
          srcIp: '10.1.1.10',
          dstIp: '172.16.10.50',
          srcPort: '51422',
          dstPort: '0',
          ingressIf: 'ethernet1/1',
          egressIf: '-',
          zoneIn: 'trust',
          zoneOut: '-',
          appId: 'none',
          sessionState: 'NONE',
          natApplied: false,
          decrypted: false,
          fragmented: false,
        },
      },
      {
        id: 'f-tcp-2',
        title: 'DROP: TCP Port Zero',
        stage: 'drop',
        activeEdgeFrom: 'ingress',
        description: 'Discarded at Ingress L4 parsing before session lookup.',
        kbRef: 'Section 2.1',
        packet: {
          badge: 'DROP (L4)',
          protocol: 'TCP',
          srcIp: '10.1.1.10',
          dstIp: '172.16.10.50',
          srcPort: '51422',
          dstPort: '0',
          ingressIf: 'ethernet1/1',
          egressIf: '-',
          zoneIn: 'trust',
          zoneOut: '-',
          appId: 'none',
          sessionState: 'NONE',
          natApplied: false,
          decrypted: false,
          fragmented: false,
          dropReason: 'TCP port is zero (src == 0 or dst == 0)',
        },
      },
    ],
  },
  'dos-protect': {
    label: 'Slowpath 3.6: DoS Protect',
    dropReasonId: 'sp-dos-protect',
    targetStage: 'slowpath',
    steps: [
      {
        id: 'f-dos-1',
        title: 'Ingress Parse & Flow Miss',
        stage: 'ingress',
        description: 'Valid TCP SYN arrives on ethernet1/1; no matching session in flow lookup table.',
        kbRef: 'Section 2.1 / 3',
        packet: {
          badge: 'SYN',
          protocol: 'TCP',
          srcIp: '198.51.100.44',
          dstIp: '203.0.113.10',
          srcPort: '40112',
          dstPort: '443',
          ingressIf: 'ethernet1/1',
          egressIf: '-',
          zoneIn: 'untrust',
          zoneOut: '-',
          appId: 'none',
          sessionState: 'NONE',
          natApplied: false,
          decrypted: false,
          fragmented: false,
        },
      },
      {
        id: 'f-dos-2',
        title: 'Slowpath 3.6: DoS Protection Policy Lookup (PAN-48644)',
        stage: 'slowpath',
        activeEdgeFrom: 'ingress',
        description:
          'Runs PRIOR to Security Policy (3.7). DoS Policy action is "Protect" and CPS threshold is exceeded.',
        kbRef: 'Section 3.6 (PAN-48644)',
        packet: {
          badge: 'SYN (DoS!)',
          protocol: 'TCP',
          srcIp: '198.51.100.44',
          dstIp: '203.0.113.10',
          srcPort: '40112',
          dstPort: '443',
          ingressIf: 'ethernet1/1',
          egressIf: 'ethernet1/2',
          zoneIn: 'untrust',
          zoneOut: 'dmz',
          appId: 'none',
          sessionState: 'INIT',
          natApplied: false,
          decrypted: false,
          fragmented: false,
        },
      },
      {
        id: 'f-dos-3',
        title: 'DROP: DoS Threshold Exceeded',
        stage: 'drop',
        activeEdgeFrom: 'slowpath',
        description:
          'Packet discarded before Security Policy evaluation or Session Allocation, protecting firewall resources.',
        kbRef: 'Section 3.6',
        packet: {
          badge: 'DROP (DoS)',
          protocol: 'TCP',
          srcIp: '198.51.100.44',
          dstIp: '203.0.113.10',
          srcPort: '40112',
          dstPort: '443',
          ingressIf: 'ethernet1/1',
          egressIf: 'ethernet1/2',
          zoneIn: 'untrust',
          zoneOut: 'dmz',
          appId: 'none',
          sessionState: 'NONE',
          natApplied: false,
          decrypted: false,
          fragmented: false,
          dropReason: 'DoS Protection Protect threshold exceeded (PAN-48644)',
        },
      },
    ],
  },
  'security-deny': {
    label: 'Slowpath 3.7: Policy Deny',
    dropReasonId: 'sp-sec-deny',
    targetStage: 'slowpath',
    steps: [
      {
        id: 'f-sec-1',
        title: 'Ingress Parse & Flow Miss',
        stage: 'ingress',
        description: 'TCP SYN packet passes L2–L4 parsing and misses flow lookup table.',
        kbRef: 'Section 2.1 / 3',
        packet: {
          badge: 'SYN',
          protocol: 'TCP',
          srcIp: '10.1.1.25',
          dstIp: '192.0.2.99',
          srcPort: '55100',
          dstPort: '23',
          ingressIf: 'ethernet1/1',
          egressIf: '-',
          zoneIn: 'trust',
          zoneOut: '-',
          appId: 'none',
          sessionState: 'NONE',
          natApplied: false,
          decrypted: false,
          fragmented: false,
        },
      },
      {
        id: 'f-sec-2',
        title: 'Slowpath 3.7: Security Policy Lookup (App=ANY)',
        stage: 'slowpath',
        activeEdgeFrom: 'ingress',
        description:
          'Evaluates Security Policy with App=ANY on original packet (pre-NAT). Matches explicit Deny rule (or implicit inter-zone deny).',
        kbRef: 'Section 3.7',
        packet: {
          badge: 'SYN (DENY)',
          protocol: 'TCP',
          srcIp: '10.1.1.25',
          dstIp: '192.0.2.99',
          srcPort: '55100',
          dstPort: '23',
          ingressIf: 'ethernet1/1',
          egressIf: 'ethernet1/2',
          zoneIn: 'trust',
          zoneOut: 'untrust',
          appId: 'ANY',
          sessionState: 'INIT',
          natApplied: false,
          decrypted: false,
          fragmented: false,
        },
      },
      {
        id: 'f-sec-3',
        title: 'DROP: Security Policy Deny',
        stage: 'drop',
        activeEdgeFrom: 'slowpath',
        description: 'Session is not allocated; packet is dropped at Slowpath 3.7.',
        kbRef: 'Section 3.7',
        packet: {
          badge: 'DROP (Policy)',
          protocol: 'TCP',
          srcIp: '10.1.1.25',
          dstIp: '192.0.2.99',
          srcPort: '55100',
          dstPort: '23',
          ingressIf: 'ethernet1/1',
          egressIf: 'ethernet1/2',
          zoneIn: 'trust',
          zoneOut: 'untrust',
          appId: 'ANY',
          sessionState: 'NONE',
          natApplied: false,
          decrypted: false,
          fragmented: false,
          dropReason: 'Security Policy action = deny (App=ANY)',
        },
      },
    ],
  },
  'content-threat': {
    label: 'Content-ID 6: Threat Block',
    dropReasonId: 'cid-threat-block',
    targetStage: 'contentid',
    steps: [
      {
        id: 'f-cid-1',
        title: 'Ingress -> Fast Path (Active Session)',
        stage: 'fastpath',
        activeEdgeFrom: 'ingress',
        description: 'HTTP payload packet matches existing ACTIVE session and enters Fast Path.',
        kbRef: 'Section 4',
        packet: {
          badge: 'HTTP (Payload)',
          protocol: 'TCP',
          srcIp: '10.1.1.10',
          dstIp: '93.184.216.34',
          srcPort: '51422',
          dstPort: '80',
          ingressIf: 'ethernet1/1',
          egressIf: 'ethernet1/2',
          zoneIn: 'trust',
          zoneOut: 'untrust',
          appId: 'web-browsing',
          sessionState: 'ACTIVE',
          natApplied: true,
          decrypted: false,
          fragmented: false,
        },
      },
      {
        id: 'f-cid-2',
        title: 'Content-ID: Vulnerability / Threat Detected',
        stage: 'contentid',
        activeEdgeFrom: 'appid',
        description:
          'Security profile attached to matching rule detects malicious payload signature; profile action is reset-both / drop.',
        kbRef: 'Section 6',
        packet: {
          badge: 'THREAT!',
          protocol: 'TCP',
          srcIp: '203.0.113.5',
          dstIp: '93.184.216.34',
          srcPort: '51422',
          dstPort: '80',
          ingressIf: 'ethernet1/1',
          egressIf: 'ethernet1/2',
          zoneIn: 'trust',
          zoneOut: 'untrust',
          appId: 'web-browsing',
          sessionState: 'DISCARD',
          natApplied: true,
          decrypted: false,
          fragmented: false,
        },
      },
      {
        id: 'f-cid-3',
        title: 'DROP: Threat Blocked & Session -> DISCARD',
        stage: 'drop',
        activeEdgeFrom: 'contentid',
        description:
          'Packet dropped and session transitions to DISCARD state so subsequent packets are immediately dropped in Fast Path.',
        kbRef: 'Section 4 & 6',
        packet: {
          badge: 'DROP (Threat)',
          protocol: 'TCP',
          srcIp: '203.0.113.5',
          dstIp: '93.184.216.34',
          srcPort: '51422',
          dstPort: '80',
          ingressIf: 'ethernet1/1',
          egressIf: 'ethernet1/2',
          zoneIn: 'trust',
          zoneOut: 'untrust',
          appId: 'web-browsing',
          sessionState: 'DISCARD',
          natApplied: true,
          decrypted: false,
          fragmented: false,
          dropReason: 'Content-ID threat detected (session marked DISCARD)',
        },
      },
    ],
  },
};

export const SCENARIOS: ScenarioDefinition[] = [
  {
    id: 'new-tcp-http',
    title: 'Scenario 1: New TCP/HTTP Session (Slowpath → Fast Path)',
    shortTitle: '1. New TCP/HTTP',
    subtitle: 'First SYN triggers Slowpath 3.1–3.8 (INIT→OPENING→ACTIVE); HTTP GET uses Fast Path + App-ID + Content-ID.',
    kbSections: 'Sections 2–7',
    steps: [
      {
        id: 's1-1',
        title: 'Ingress: L2–L4 Parsing (TCP SYN)',
        stage: 'ingress',
        description:
          'Packet 1 (SYN) arrives on ethernet1/1. L2 lookup (port, 802.1q, dst MAC) succeeds; IPv4 & TCP checks pass. Subject to firewall inspection.',
        kbRef: 'Section 2.1',
        packet: {
          badge: 'SYN',
          protocol: 'TCP',
          srcIp: '10.1.1.10',
          dstIp: '93.184.216.34',
          srcPort: '51422',
          dstPort: '80',
          ingressIf: 'ethernet1/1',
          egressIf: '-',
          zoneIn: 'trust',
          zoneOut: '-',
          appId: 'none',
          sessionState: 'NONE',
          natApplied: false,
          decrypted: false,
          fragmented: false,
        },
      },
      {
        id: 's1-2',
        title: 'Slowpath 3.1–3.5: Zone, TCP, Route, NAT & User-ID',
        stage: 'slowpath',
        activeEdgeFrom: 'ingress',
        description:
          'Flow lookup misses. Slowpath checks Zone Protection (3.1), TCP SYN (3.2), L3 Route -> ethernet1/2 (3.3), Source NAT rule on original packet (3.4), and User-ID lookup (3.5).',
        kbRef: 'Section 3.1–3.5',
        packet: {
          badge: 'SYN (Slowpath)',
          protocol: 'TCP',
          srcIp: '10.1.1.10',
          dstIp: '93.184.216.34',
          srcPort: '51422',
          dstPort: '80',
          ingressIf: 'ethernet1/1',
          egressIf: 'ethernet1/2',
          zoneIn: 'trust',
          zoneOut: 'untrust',
          appId: 'none',
          sessionState: 'INIT',
          natApplied: false,
          decrypted: false,
          fragmented: false,
        },
      },
      {
        id: 's1-3',
        title: 'Slowpath 3.6–3.8: DoS, Security (ANY) & Session Alloc',
        stage: 'slowpath',
        description:
          'DoS Protection (3.6, PAN-48644) passes; Security Policy (3.7) matches App=ANY on original packet; Session Alloc (3.8) transitions INIT → OPENING → ACTIVE and installs C2S/S2C flows.',
        kbRef: 'Section 3.6–3.8',
        packet: {
          badge: 'SYN (ACTIVE)',
          protocol: 'TCP',
          srcIp: '10.1.1.10',
          dstIp: '93.184.216.34',
          srcPort: '51422',
          dstPort: '80',
          ingressIf: 'ethernet1/1',
          egressIf: 'ethernet1/2',
          zoneIn: 'trust',
          zoneOut: 'untrust',
          appId: 'ANY',
          sessionState: 'ACTIVE',
          natApplied: false,
          decrypted: false,
          fragmented: false,
        },
      },
      {
        id: 's1-4',
        title: 'Fast Path: NAT Translation (SYN)',
        stage: 'fastpath',
        activeEdgeFrom: 'slowpath',
        description:
          'SYN enters Fast Path: Source NAT translates 10.1.1.10 → 203.0.113.5. No TCP payload yet, so App-ID/Content-ID wait for data.',
        kbRef: 'Section 4',
        packet: {
          badge: 'SYN (NAT)',
          protocol: 'TCP',
          srcIp: '203.0.113.5',
          dstIp: '93.184.216.34',
          srcPort: '51422',
          dstPort: '80',
          ingressIf: 'ethernet1/1',
          egressIf: 'ethernet1/2',
          zoneIn: 'trust',
          zoneOut: 'untrust',
          appId: 'ANY',
          sessionState: 'ACTIVE',
          natApplied: true,
          decrypted: false,
          fragmented: false,
        },
      },
      {
        id: 's1-5',
        title: 'Egress: SYN Transmitted on Wire',
        stage: 'egress',
        activeEdgeFrom: 'fastpath',
        description: 'QoS shaping and MTU check pass; SYN packet exits physical interface ethernet1/2.',
        kbRef: 'Section 7',
        packet: {
          badge: 'SYN TX',
          protocol: 'TCP',
          srcIp: '203.0.113.5',
          dstIp: '93.184.216.34',
          srcPort: '51422',
          dstPort: '80',
          ingressIf: 'ethernet1/1',
          egressIf: 'ethernet1/2',
          zoneIn: 'trust',
          zoneOut: 'untrust',
          appId: 'ANY',
          sessionState: 'ACTIVE',
          natApplied: true,
          decrypted: false,
          fragmented: false,
        },
      },
      {
        id: 's1-6',
        title: 'Packet 2 (HTTP GET): Fast Path → App-ID (web-browsing)',
        stage: 'appid',
        activeEdgeFrom: 'fastpath',
        description:
          'After 3-way handshake, HTTP GET hits Fast Path (TCP reassembly) and enters App-ID: signatures identify "web-browsing", re-lookup Security Policy, and override session timeout.',
        kbRef: 'Section 4.1 & 5',
        packet: {
          badge: 'HTTP GET',
          protocol: 'TCP',
          srcIp: '203.0.113.5',
          dstIp: '93.184.216.34',
          srcPort: '51422',
          dstPort: '80',
          ingressIf: 'ethernet1/1',
          egressIf: 'ethernet1/2',
          zoneIn: 'trust',
          zoneOut: 'untrust',
          appId: 'web-browsing',
          sessionState: 'ACTIVE',
          natApplied: true,
          decrypted: false,
          fragmented: false,
        },
      },
      {
        id: 's1-7',
        title: 'Content-ID: Security Profiles Clean',
        stage: 'contentid',
        activeEdgeFrom: 'appid',
        description:
          'Security rule has Antivirus/Vulnerability profiles attached. Content-ID inspects HTTP payload; no threats detected.',
        kbRef: 'Section 6',
        packet: {
          badge: 'HTTP (Clean)',
          protocol: 'TCP',
          srcIp: '203.0.113.5',
          dstIp: '93.184.216.34',
          srcPort: '51422',
          dstPort: '80',
          ingressIf: 'ethernet1/1',
          egressIf: 'ethernet1/2',
          zoneIn: 'trust',
          zoneOut: 'untrust',
          appId: 'web-browsing',
          sessionState: 'ACTIVE',
          natApplied: true,
          decrypted: false,
          fragmented: false,
        },
      },
      {
        id: 's1-8',
        title: 'Egress: HTTP GET Forwarded',
        stage: 'egress',
        activeEdgeFrom: 'contentid',
        description: 'Packet exits ethernet1/2 toward web server.',
        kbRef: 'Section 7',
        packet: {
          badge: 'HTTP TX',
          protocol: 'TCP',
          srcIp: '203.0.113.5',
          dstIp: '93.184.216.34',
          srcPort: '51422',
          dstPort: '80',
          ingressIf: 'ethernet1/1',
          egressIf: 'ethernet1/2',
          zoneIn: 'trust',
          zoneOut: 'untrust',
          appId: 'web-browsing',
          sessionState: 'ACTIVE',
          natApplied: true,
          decrypted: false,
          fragmented: false,
        },
      },
    ],
  },
  {
    id: 'existing-fastpath',
    title: 'Scenario 2: Existing Fast-Path Session',
    shortTitle: '2. Fast Path Hit',
    subtitle: 'Flow lookup hit bypasses Slowpath, refreshes timeout, translates NAT, reassembles TCP, and optionally starts FIN/RST timers.',
    kbSections: 'Section 4',
    steps: [
      {
        id: 's2-1',
        title: 'Ingress: L2–L4 Parse & Flow Lookup Hit',
        stage: 'ingress',
        description:
          'Packet matches existing 6-tuple C2S flow in the flow lookup table. Slowpath (3.1–3.8) is completely bypassed.',
        kbRef: 'Section 2.1 / 3',
        packet: {
          badge: 'DATA',
          protocol: 'TCP',
          srcIp: '10.1.1.10',
          dstIp: '93.184.216.34',
          srcPort: '51422',
          dstPort: '443',
          ingressIf: 'ethernet1/1',
          egressIf: 'ethernet1/2',
          zoneIn: 'trust',
          zoneOut: 'untrust',
          appId: 'ssl',
          sessionState: 'ACTIVE',
          natApplied: false,
          decrypted: false,
          fragmented: false,
        },
      },
      {
        id: 's2-2',
        title: 'Fast Path: Timeout Refresh, NAT Xlate & TCP Reassembly',
        stage: 'fastpath',
        activeEdgeFrom: 'ingress',
        description:
          'Session is ACTIVE: refreshes session timeout, translates L3/L4 NAT headers, and runs TCP reassembly (window check, out-of-order buffer, skip retransmissions).',
        kbRef: 'Section 4',
        packet: {
          badge: 'DATA (NAT)',
          protocol: 'TCP',
          srcIp: '203.0.113.5',
          dstIp: '93.184.216.34',
          srcPort: '51422',
          dstPort: '443',
          ingressIf: 'ethernet1/1',
          egressIf: 'ethernet1/2',
          zoneIn: 'trust',
          zoneOut: 'untrust',
          appId: 'ssl',
          sessionState: 'ACTIVE',
          natApplied: true,
          decrypted: false,
          fragmented: false,
        },
      },
      {
        id: 's2-3',
        title: 'Content-ID: Security Profile Inspection',
        stage: 'contentid',
        activeEdgeFrom: 'fastpath',
        description:
          'App-ID is already known ("ssl"); rule has a security profile attached, so payload goes directly to Content-ID.',
        kbRef: 'Section 4.1 & 6',
        packet: {
          badge: 'DATA (Clean)',
          protocol: 'TCP',
          srcIp: '203.0.113.5',
          dstIp: '93.184.216.34',
          srcPort: '51422',
          dstPort: '443',
          ingressIf: 'ethernet1/1',
          egressIf: 'ethernet1/2',
          zoneIn: 'trust',
          zoneOut: 'untrust',
          appId: 'ssl',
          sessionState: 'ACTIVE',
          natApplied: true,
          decrypted: false,
          fragmented: false,
        },
      },
      {
        id: 's2-4',
        title: 'Egress: Transmit on Physical Interface',
        stage: 'egress',
        activeEdgeFrom: 'contentid',
        description: 'Packet exits ethernet1/2 with minimal SP3 latency.',
        kbRef: 'Section 7',
        packet: {
          badge: 'DATA TX',
          protocol: 'TCP',
          srcIp: '203.0.113.5',
          dstIp: '93.184.216.34',
          srcPort: '51422',
          dstPort: '443',
          ingressIf: 'ethernet1/1',
          egressIf: 'ethernet1/2',
          zoneIn: 'trust',
          zoneOut: 'untrust',
          appId: 'ssl',
          sessionState: 'ACTIVE',
          natApplied: true,
          decrypted: false,
          fragmented: false,
        },
      },
    ],
  },
  {
    id: 'ipsec-tunnel',
    title: 'Scenario 3: IPSec Tunnel Packet (Decap + Encrypt Loops)',
    shortTitle: '3. IPSec Tunnel',
    subtitle: 'Inbound ESP decapsulates to tunnel.1 and loops back to IP parser; outbound tunnel.2 encrypts and re-evaluates forwarding.',
    kbSections: 'Sections 2.2, 3, 7',
    steps: [
      {
        id: 's3-1',
        title: 'Ingress: Outer ESP Packet Parsed',
        stage: 'ingress',
        description:
          'IPSec ESP packet (SPI 0x9a12b401) arrives on ethernet1/1. L2/L3 parsing succeeds and matches configured IPSec tunnel.',
        kbRef: 'Section 2.1 & 2.2',
        packet: {
          badge: 'IPSec ESP',
          protocol: 'ESP (50)',
          srcIp: '198.51.100.2',
          dstIp: '203.0.113.1',
          srcPort: 'SPI:0x9a12',
          dstPort: 'SPI:0x9a12',
          ingressIf: 'ethernet1/1',
          egressIf: '-',
          zoneIn: 'untrust',
          zoneOut: '-',
          appId: 'ipsec-esp',
          sessionState: 'ACTIVE',
          natApplied: false,
          decrypted: false,
          fragmented: false,
        },
      },
      {
        id: 's3-2',
        title: 'Loop-Back #1: Tunnel Decap → IP Parser (tunnel.1)',
        stage: 'ingress',
        activeLoop: 'decap-loop',
        description:
          'Firewall decrypts/decapsulates ESP, assigns tunnel.1 as the new ingress interface, and feeds the inner IP packet back to the IP header parser.',
        kbRef: 'Section 2.2',
        packet: {
          badge: 'Inner IP (Decap)',
          protocol: 'TCP',
          srcIp: '10.20.0.15',
          dstIp: '10.30.0.80',
          srcPort: '49152',
          dstPort: '445',
          ingressIf: 'tunnel.1',
          egressIf: '-',
          zoneIn: 'vpn-branch',
          zoneOut: '-',
          appId: 'none',
          sessionState: 'NONE',
          natApplied: false,
          decrypted: true,
          fragmented: false,
        },
      },
      {
        id: 's3-3',
        title: 'Slowpath / Fast Path: Inspect Inner Packet',
        stage: 'fastpath',
        activeEdgeFrom: 'ingress',
        description:
          'Inner packet undergoes 6-tuple lookup in zone vpn-branch, enters Fast Path, and routes toward egress tunnel.2.',
        kbRef: 'Section 3 & 4',
        packet: {
          badge: 'Inner TCP',
          protocol: 'TCP',
          srcIp: '10.20.0.15',
          dstIp: '10.30.0.80',
          srcPort: '49152',
          dstPort: '445',
          ingressIf: 'tunnel.1',
          egressIf: 'tunnel.2',
          zoneIn: 'vpn-branch',
          zoneOut: 'vpn-hq',
          appId: 'ms-ds-smb',
          sessionState: 'ACTIVE',
          natApplied: false,
          decrypted: true,
          fragmented: false,
        },
      },
      {
        id: 's3-4',
        title: 'Egress: Egress Interface is tunnel.2',
        stage: 'egress',
        activeEdgeFrom: 'fastpath',
        description: 'Packet arrives at Forwarding/Egress destined for tunnel interface tunnel.2.',
        kbRef: 'Section 7',
        packet: {
          badge: 'To tunnel.2',
          protocol: 'TCP',
          srcIp: '10.20.0.15',
          dstIp: '10.30.0.80',
          srcPort: '49152',
          dstPort: '445',
          ingressIf: 'tunnel.1',
          egressIf: 'tunnel.2',
          zoneIn: 'vpn-branch',
          zoneOut: 'vpn-hq',
          appId: 'ms-ds-smb',
          sessionState: 'ACTIVE',
          natApplied: false,
          decrypted: true,
          fragmented: false,
        },
      },
      {
        id: 's3-5',
        title: 'Loop-Back #3: Tunnel Encrypt → Re-evaluate Forwarding',
        stage: 'egress',
        activeLoop: 'encrypt-loop',
        description:
          'IPSec encryption encapsulates the packet with new outer IP/ESP headers, re-evaluates packet forwarding, and transmits out physical ethernet1/2.',
        kbRef: 'Section 7',
        packet: {
          badge: 'ESP TX',
          protocol: 'ESP (50)',
          srcIp: '203.0.113.1',
          dstIp: '192.0.2.50',
          srcPort: 'SPI:0x44f1',
          dstPort: 'SPI:0x44f1',
          ingressIf: 'tunnel.1',
          egressIf: 'ethernet1/2',
          zoneIn: 'vpn-branch',
          zoneOut: 'untrust',
          appId: 'ms-ds-smb',
          sessionState: 'ACTIVE',
          natApplied: false,
          decrypted: false,
          fragmented: false,
        },
      },
    ],
  },
  {
    id: 'ip-fragmented',
    title: 'Scenario 4: IP Fragmented Packet (Defrag + Egress MTU)',
    shortTitle: '4. IP Fragment',
    subtitle: 'Ingress buffers & reassembles fragments (loop-back to IP parser); Egress fragments if packet exceeds egress MTU.',
    kbSections: 'Sections 2.3 & 7',
    steps: [
      {
        id: 's4-1',
        title: 'Ingress: IP Fragments Received (Frag 1 + Frag 2)',
        stage: 'ingress',
        description:
          'Packet arrives as IP fragments. Ingress 2.3 buffers fragments and checks for tear-drop overlap, errors, and buffer limits.',
        kbRef: 'Section 2.3',
        packet: {
          badge: 'IP FRAG 1/2',
          protocol: 'UDP',
          srcIp: '10.1.1.10',
          dstIp: '172.16.20.10',
          srcPort: '5060',
          dstPort: '5060',
          ingressIf: 'ethernet1/1',
          egressIf: '-',
          zoneIn: 'trust',
          zoneOut: '-',
          appId: 'none',
          sessionState: 'NONE',
          natApplied: false,
          decrypted: false,
          fragmented: true,
        },
      },
      {
        id: 's4-2',
        title: 'Loop-Back #2: IP Defrag → IP Parser (Reassembled)',
        stage: 'ingress',
        activeLoop: 'defrag-loop',
        description:
          'Defragmentation reassembles the full IP packet (2100 B) and feeds it back to the parser starting at the IP header.',
        kbRef: 'Section 2.3',
        packet: {
          badge: 'Reassembled',
          protocol: 'UDP',
          srcIp: '10.1.1.10',
          dstIp: '172.16.20.10',
          srcPort: '5060',
          dstPort: '5060',
          ingressIf: 'ethernet1/1',
          egressIf: '-',
          zoneIn: 'trust',
          zoneOut: '-',
          appId: 'none',
          sessionState: 'NONE',
          natApplied: false,
          decrypted: false,
          fragmented: false,
        },
      },
      {
        id: 's4-3',
        title: 'Fast Path & App-ID (sip)',
        stage: 'appid',
        activeEdgeFrom: 'fastpath',
        description:
          'Reassembled packet passes session lookup, Fast Path, and App-ID ("sip"), then Content-ID ALG inspection.',
        kbRef: 'Section 4 & 5',
        packet: {
          badge: 'SIP (2100B)',
          protocol: 'UDP',
          srcIp: '10.1.1.10',
          dstIp: '172.16.20.10',
          srcPort: '5060',
          dstPort: '5060',
          ingressIf: 'ethernet1/1',
          egressIf: 'ethernet1/2',
          zoneIn: 'trust',
          zoneOut: 'untrust',
          appId: 'sip',
          sessionState: 'ACTIVE',
          natApplied: false,
          decrypted: false,
          fragmented: false,
        },
      },
      {
        id: 's4-4',
        title: 'Egress: MTU Fragmentation (MTU 1500, DF=0)',
        stage: 'egress',
        activeEdgeFrom: 'contentid',
        description:
          'Egress interface ethernet1/2 has MTU 1500 and DF bit is 0. Firewall fragments the 2100 B packet before physical TX.',
        kbRef: 'Section 7',
        packet: {
          badge: 'MTU Frag TX',
          protocol: 'UDP',
          srcIp: '10.1.1.10',
          dstIp: '172.16.20.10',
          srcPort: '5060',
          dstPort: '5060',
          ingressIf: 'ethernet1/1',
          egressIf: 'ethernet1/2',
          zoneIn: 'trust',
          zoneOut: 'untrust',
          appId: 'sip',
          sessionState: 'ACTIVE',
          natApplied: false,
          decrypted: false,
          fragmented: true,
        },
      },
    ],
  },
  {
    id: 'dropped-fault',
    title: 'Scenario 5: Dropped / Fault Packet Injector',
    shortTitle: '5. Drop / Fault',
    subtitle: 'Select a fault condition across L2, L3, L4, DoS (PAN-48644), Security Policy, or Content-ID to inspect exact drop gates.',
    kbSections: 'Sections 2.1, 3.6, 3.7, 6',
    steps: FAULT_PRESETS['l2-dot1q'].steps,
  },
  {
    id: 'ssl-decrypt-appid-shift',
    title: 'Scenario 6: SSL Decryption + App-ID Shift',
    shortTitle: '6. SSL + App Shift',
    subtitle: 'App-ID detects "ssl" -> Decryption Policy -> Content-ID decodes inner app -> App-ID shifts -> Security Policy re-check -> Re-encrypt.',
    kbSections: 'Sections 5, 6, 7',
    steps: [
      {
        id: 's6-1',
        title: 'Fast Path: TLS Handshake (TCP/443)',
        stage: 'fastpath',
        activeEdgeFrom: 'ingress',
        description:
          'Session established in Slowpath (App=ANY). TLS ClientHello arrives on Fast Path with payload.',
        kbRef: 'Section 4',
        packet: {
          badge: 'TLS Hello',
          protocol: 'TCP',
          srcIp: '10.1.1.10',
          dstIp: '142.250.190.46',
          srcPort: '53210',
          dstPort: '443',
          ingressIf: 'ethernet1/1',
          egressIf: 'ethernet1/2',
          zoneIn: 'trust',
          zoneOut: 'untrust',
          appId: 'ANY',
          sessionState: 'ACTIVE',
          natApplied: true,
          decrypted: false,
          fragmented: false,
        },
      },
      {
        id: 's6-2',
        title: 'App-ID: Identifies "ssl" & Sets Up Decryption Proxy',
        stage: 'appid',
        activeEdgeFrom: 'fastpath',
        description:
          'App-ID identifies "ssl". Security policy allows it; Decryption Policy lookup matches SSL Forward Proxy and sets up proxy contexts.',
        kbRef: 'Section 5',
        packet: {
          badge: 'App: ssl',
          protocol: 'TCP',
          srcIp: '203.0.113.5',
          dstIp: '142.250.190.46',
          srcPort: '53210',
          dstPort: '443',
          ingressIf: 'ethernet1/1',
          egressIf: 'ethernet1/2',
          zoneIn: 'trust',
          zoneOut: 'untrust',
          appId: 'ssl',
          sessionState: 'ACTIVE',
          natApplied: true,
          decrypted: true,
          fragmented: false,
        },
      },
      {
        id: 's6-3',
        title: 'Content-ID: Decrypts & Decodes Inner App (ssl → youtube)',
        stage: 'contentid',
        activeEdgeFrom: 'appid',
        description:
          'Protocol decoders inspect decrypted HTTP stream and identify tunneled application "youtube". Traffic log generated for App-ID change.',
        kbRef: 'Section 5 & 6',
        packet: {
          badge: 'App Shift: youtube',
          protocol: 'TCP',
          srcIp: '203.0.113.5',
          dstIp: '142.250.190.46',
          srcPort: '53210',
          dstPort: '443',
          ingressIf: 'ethernet1/1',
          egressIf: 'ethernet1/2',
          zoneIn: 'trust',
          zoneOut: 'untrust',
          appId: 'youtube',
          sessionState: 'ACTIVE',
          natApplied: true,
          decrypted: true,
          fragmented: false,
        },
      },
      {
        id: 's6-4',
        title: 'Loop-Back #4: Security Policy Re-check for "youtube"',
        stage: 'slowpath',
        activeLoop: 'appid-recheck-loop',
        description:
          'Because App-ID changed (ssl → youtube), firewall re-consults Security Policies to verify whether "youtube" is permitted to continue.',
        kbRef: 'Section 6',
        packet: {
          badge: 'Policy Re-check',
          protocol: 'TCP',
          srcIp: '203.0.113.5',
          dstIp: '142.250.190.46',
          srcPort: '53210',
          dstPort: '443',
          ingressIf: 'ethernet1/1',
          egressIf: 'ethernet1/2',
          zoneIn: 'trust',
          zoneOut: 'untrust',
          appId: 'youtube',
          sessionState: 'ACTIVE',
          natApplied: true,
          decrypted: true,
          fragmented: false,
        },
      },
      {
        id: 's6-5',
        title: 'Content-ID: Threat Scan Clean & SSL Re-encryption',
        stage: 'contentid',
        activeEdgeFrom: 'appid',
        description:
          'Security Policy permits "youtube". Content-ID scans decrypted payload (no threat) and re-encrypts packet before Forwarding/Egress.',
        kbRef: 'Section 6',
        packet: {
          badge: 'Re-encrypted',
          protocol: 'TCP',
          srcIp: '203.0.113.5',
          dstIp: '142.250.190.46',
          srcPort: '53210',
          dstPort: '443',
          ingressIf: 'ethernet1/1',
          egressIf: 'ethernet1/2',
          zoneIn: 'trust',
          zoneOut: 'untrust',
          appId: 'youtube',
          sessionState: 'ACTIVE',
          natApplied: true,
          decrypted: false,
          fragmented: false,
        },
      },
      {
        id: 's6-6',
        title: 'Egress: Re-encrypted Packet Transmitted',
        stage: 'egress',
        activeEdgeFrom: 'contentid',
        description: 'QoS shaping applied; re-encrypted TLS packet exits ethernet1/2.',
        kbRef: 'Section 7',
        packet: {
          badge: 'TLS TX',
          protocol: 'TCP',
          srcIp: '203.0.113.5',
          dstIp: '142.250.190.46',
          srcPort: '53210',
          dstPort: '443',
          ingressIf: 'ethernet1/1',
          egressIf: 'ethernet1/2',
          zoneIn: 'trust',
          zoneOut: 'untrust',
          appId: 'youtube',
          sessionState: 'ACTIVE',
          natApplied: true,
          decrypted: false,
          fragmented: false,
        },
      },
    ],
  },
];
