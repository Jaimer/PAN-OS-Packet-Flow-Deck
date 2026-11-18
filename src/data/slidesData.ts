import { ScenarioId, StageId } from './packetFlowModel';

export type WidgetId =
  | 'pipeline'
  | 'sp3'
  | 'six-tuple'
  | 'interface-matrix'
  | 'syn-cookies-red'
  | 'session-lifecycle'
  | 'slowpath-explorer'
  | 'ingress-drops';

export interface SlideDefinition {
  id: string;
  number: number;
  title: string;
  sectionBadge: string;
  sectionGroup: string;
  kbRefs: string;
  subtitle: string;
  keyPoints: string[];
  callout?: {
    title: string;
    body: string;
    tone: 'info' | 'warning' | 'caveat';
  };
  speakerNotes: string;
  primaryWidget: WidgetId;
  secondaryWidget?: WidgetId;
  defaultScenarioId: ScenarioId;
  highlightStages: StageId[];
}

export const SLIDES: SlideDefinition[] = [
  {
    id: 'slide-1',
    number: 1,
    title: 'PAN-OS Packet Flow & SP3 Architecture',
    sectionBadge: 'Section 1 & 8 · Overview & SP3',
    sectionGroup: 'Overview',
    kbRefs: 'KB 1620318 · Sections 1 & 8',
    subtitle:
      'Decoupling per-packet network forwarding from session-based stateful security via Single Pass Parallel Processing (SP3).',
    keyPoints: [
      'Per-Packet Stages: Ingress (Sec 2) and Forwarding/Egress (Sec 7) handle network functions and forwarding per packet.',
      'Session-Based Stages: Session Lookup/Slowpath (Sec 3), Fast Path (Sec 4), App-ID (Sec 5), and Content-ID (Sec 6) operate on stateful sessions.',
      'SP3 Architecture: Single Pass software (parse once, classify once, inspect once) + Parallel Processing hardware (data/control plane separation).',
      'Historical Note (PAN-48644): Since PAN-OS 7.0.2 & 6.1.7, DoS Protection lookup runs PRIOR to Security Policy lookup.',
    ],
    callout: {
      title: 'Why Decouple Per-Packet & Session-Based?',
      body: 'Decoupling provides stateful application-layer security (App-ID + Content-ID) while preserving resilient per-packet forwarding and deployment flexibility (L3, L2, Virtual-Wire, Tap).',
      tone: 'info',
    },
    speakerNotes:
      'Introduce the core mental model of PAN-OS: unlike multi-proxy firewalls that re-parse packets at every security engine, SP3 parses once in software and accelerates crypto/pattern matching in hardware. Emphasize the split between per-packet stages (Ingress, Egress) and session-based stages (Slowpath, Fast Path, App-ID, Content-ID).',
    primaryWidget: 'sp3',
    defaultScenarioId: 'new-tcp-http',
    highlightStages: ['ingress', 'egress'],
  },
  {
    id: 'slide-2',
    number: 2,
    title: 'End-to-End Packet Journey Overview',
    sectionBadge: 'Sections 1–7 · Master Pipeline',
    sectionGroup: 'Overview',
    kbRefs: 'KB 1620318 · Sections 1–7',
    subtitle:
      'Interactive 6-stage pipeline with Slowpath vs. Fast Path branching, 4 loop-back arcs, and explicit drop exits.',
    keyPoints: [
      'First packet of a flow misses the Flow Lookup Table and enters Slowpath (3.1–3.8) to allocate an ACTIVE session.',
      'Subsequent packets hit the Flow Lookup Table and jump directly to Fast Path (Sec 4), bypassing Slowpath.',
      'Four curved loop-back arcs: Tunnel Decap (2.2), IP Defrag (2.3), App-ID Change Policy Re-check (6), and Tunnel Encrypt (7).',
      'Use Play, Step Forward/Back, Speed (0.5x/1x/2x), and Scenario Presets below to trace every branch.',
    ],
    callout: {
      title: 'Interactive Tip',
      body: 'Click any stage node in the SVG diagram to inspect its sub-modules, or switch between all 6 scenarios.',
      tone: 'info',
    },
    speakerNotes:
      'Walk learners through Scenario 1 (New TCP/HTTP) first: notice how the SYN packet goes through Slowpath to establish the session, and then the HTTP GET packet takes Fast Path -> App-ID -> Content-ID -> Egress. Then switch to Scenario 2 to show how existing sessions bypass Slowpath.',
    primaryWidget: 'pipeline',
    defaultScenarioId: 'new-tcp-http',
    highlightStages: ['ingress', 'slowpath', 'fastpath', 'appid', 'contentid', 'egress'],
  },
  {
    id: 'slide-3',
    number: 3,
    title: 'Ingress Stage: L2–L4 Parsing & Drop Gates',
    sectionBadge: 'Section 2.1 · Ingress Parsing',
    sectionGroup: 'Ingress',
    kbRefs: 'KB 1620318 · Section 2.1',
    subtitle:
      'Header parsing from Ethernet (L2) to IPv4/IPv6 (L3) to TCP/UDP (L4) with 22+ non-configurable protocol-violation drops.',
    keyPoints: [
      'L2 Lookup Key: (ingress port, 802.1q tag, destination MAC). Miss increments HW "receive error" and global "flow_rcv_dot1q_tag_err".',
      'IPv4 (8 drops): eth-type mismatch, truncated hdr, proto=0, TTL=0, Land attack, Ping of death, Martian IP, checksum error.',
      'IPv6 (5 drops): eth-type mismatch, truncated hdr, truncated payload, JumboGram (RFC 2675), truncated extension header.',
      'TCP (5 drops) & UDP (3 drops): truncated hdr, data-offset < 5, checksum error, port=0, invalid TCP flags, UDP payload truncated.',
    ],
    callout: {
      title: 'Non-Configurable Attack Prevention',
      body: 'Discards in Section 2.1 occur for protocol violations or built-in attack prevention without configurable options.',
      tone: 'warning',
    },
    speakerNotes:
      'Point out the exact counters for L2 logical interface miss: hardware counter "receive error" and global counter "flow_rcv_dot1q_tag_err". Use the interactive Drop Gate Inspector to filter and review all 22+ Ingress 2.1 discard reasons.',
    primaryWidget: 'ingress-drops',
    defaultScenarioId: 'dropped-fault',
    highlightStages: ['ingress', 'drop'],
  },
  {
    id: 'slide-4',
    number: 4,
    title: 'Ingress Loop-Backs: Tunnel Decap & IP Defrag',
    sectionBadge: 'Sections 2.2 & 2.3 · Ingress Loops',
    sectionGroup: 'Ingress',
    kbRefs: 'KB 1620318 · Sections 2.2 & 2.3',
    subtitle:
      'How PAN-OS decapsulates IPSec/SSL-VPN tunnels and reassembles IP fragments by looping back to the IP header parser.',
    keyPoints: [
      '2.2 Tunnel Decapsulation: Decapsulates IPSec or SSL-VPN; discards on error; assigns tunnel.N as new ingress interface.',
      'Loop-Back #1: Feeds decrypted inner packet back to parser starting at the IP header.',
      '2.3 IP Defragmentation: Buffers & reassembles IP fragments, then loops back to the IP header parser (Loop-Back #2).',
      'Defrag Drops (3): Tear-drop attack (overlapping fragments), fragmentation errors, or max buffered fragments limit reached.',
    ],
    callout: {
      title: 'Why Loop Back to the IP Header?',
      body: 'Because the inner tunneled packet or newly reassembled IP packet has its own L3/L4 headers and must be validated and mapped to a 6-tuple in its new ingress zone (e.g., tunnel.1).',
      tone: 'info',
    },
    speakerNotes:
      'Step through Scenario 3 (IPSec Tunnel) or Scenario 4 (IP Fragmented) in the pipeline. Highlight how the ingress interface changes to tunnel.1 on decapsulation.',
    primaryWidget: 'pipeline',
    defaultScenarioId: 'ipsec-tunnel',
    highlightStages: ['ingress'],
  },
  {
    id: 'slide-5',
    number: 5,
    title: 'Interface Modes & 6-Tuple Flow Lookup',
    sectionBadge: 'Section 3 · Session Lookup',
    sectionGroup: 'Slowpath',
    kbRefs: 'KB 1620318 · Section 3',
    subtitle:
      'Determining inspection eligibility across 4 interface modes and building bidirectional C2S / S2C 6-tuple flow keys.',
    keyPoints: [
      '4 Interface Operational Modes (L3, L2, Virtual-Wire, Tap) × 6 Packet Types determine inspect/forward/flood/drop behavior.',
      '6-Tuple Flow Key: Src IP, Dst IP, Src Port (or ICMP ID / SPI / reserved), Dst Port (or ICMP Seq / SPI / reserved), IP Protocol, Security Zone.',
      'Firewall POV: Client = sender of first packet; Server = receiver. Two unidirectional flows (C2S & S2C) are stored.',
      'Flow table hit -> Fast Path (Sec 4). Flow table miss -> Slowpath (3.1–3.8).',
    ],
    callout: {
      title: 'Tap Mode & Unknown Protocols',
      body: 'Tap mode inspects eligible packets and then drops them. For unknown IP protocols, PAN-OS uses a constant reserved value to skip L4 matching.',
      tone: 'caveat',
    },
    speakerNotes:
      'Have learners toggle Multicast Firewalling and IPv6 Firewalling in the 4x6 matrix, then switch protocols in the 6-Tuple Explorer (TCP -> ICMP -> IPSec ESP -> Unknown) to see L4 field substitution.',
    primaryWidget: 'interface-matrix',
    secondaryWidget: 'six-tuple',
    defaultScenarioId: 'existing-fastpath',
    highlightStages: ['ingress', 'slowpath', 'fastpath'],
  },
  {
    id: 'slide-6',
    number: 6,
    title: 'Slowpath Part 1: Zone Protection & TCP State',
    sectionBadge: 'Sections 3.1 & 3.2 · Slowpath',
    sectionGroup: 'Slowpath',
    kbRefs: 'KB 1620318 · Sections 3.1 & 3.2',
    subtitle:
      'Evaluating Zone Protection Profiles, non-SYN TCP enforcement, and SYN Flood mitigation (RED vs. SYN Cookies).',
    keyPoints: [
      '3.1 Zone Protection: Ingress interface -> ingress zone -> evaluate Zone Protection Profile -> discard on violation.',
      '3.2 TCP State Check: First TCP packet without SYN bit is discarded by default (overridable for asymmetric flows, but a security risk).',
      'Random Early Drop (RED, default): Drops SYN packets randomly after threshold, impacting legitimate traffic equally.',
      'SYN Cookies: Data-plane boot RNG seed; firewall proxies 3-way handshake; failing ACKs treated as non-SYN; passing sessions get TCP sequence number translation.',
    ],
    callout: {
      title: 'SYN Cookies + Allow Non-SYN Warning',
      body: 'Always reject non-SYN TCP packets when SYN Cookies are enabled—otherwise attackers can bypass cookie validation.',
      tone: 'warning',
    },
    speakerNotes:
      'Use the interactive SYN Cookies vs RED simulator: push the SYN rate above the activate threshold to compare random drops (RED) against proxy handshake + sequence translation (SYN Cookies).',
    primaryWidget: 'syn-cookies-red',
    defaultScenarioId: 'new-tcp-http',
    highlightStages: ['slowpath'],
  },
  {
    id: 'slide-7',
    number: 7,
    title: 'Slowpath Part 2: Forwarding, NAT & User-ID',
    sectionBadge: 'Sections 3.3, 3.4, 3.5 · Slowpath',
    sectionGroup: 'Slowpath',
    kbRefs: 'KB 1620318 · Sections 3.3–3.5',
    subtitle:
      'Resolving egress interface/zone, evaluating NAT on the original packet, and querying per-VSYS User-ID tables.',
    keyPoints: [
      '3.3 Forwarding Setup: Tap drops; Virtual-Wire uses peer interface; L2 checks MAC table (floods VLAN on miss); L3 checks route table (drops on no match).',
      '3.4 NAT Policy Lookup (L3 & Virtual-Wire only): Evaluates NAT on the original packet once ingress & egress zones are known.',
      'DNAT performs a SECOND route lookup for the translated destination address; SNAT checks IP allocation (discards on failure).',
      '3.5 User-ID: Queries per-VSYS User-IP table -> user -> user-group mapping table; if missing, defers to Captive Portal (Sec 4.2).',
    ],
    callout: {
      title: 'Why DNAT Triggers a Second Route Lookup',
      body: 'Because translating the destination IP may change which egress interface and egress security zone the packet should leave from.',
      tone: 'info',
    },
    speakerNotes:
      'Select steps 3.3, 3.4, and 3.5 in the Slowpath Explorer to inspect the exact inputs available at each step.',
    primaryWidget: 'slowpath-explorer',
    defaultScenarioId: 'new-tcp-http',
    highlightStages: ['slowpath'],
  },
  {
    id: 'slide-8',
    number: 8,
    title: 'Slowpath Part 3: DoS, Security (ANY) & Session Alloc',
    sectionBadge: 'Sections 3.6, 3.7, 3.8 · Slowpath',
    sectionGroup: 'Slowpath',
    kbRefs: 'KB 1620318 · Sections 3.6–3.8',
    subtitle:
      'PAN-48644 DoS-before-Security ordering, pre-NAT Security Policy (App=ANY), and INIT → OPENING → ACTIVE allocation.',
    keyPoints: [
      '3.6 DoS Protection (PAN-48644): Runs BEFORE Security Policy since PAN-OS 7.0.2 / 6.1.7. Allow/Deny overrides profile thresholds; Protect drops on threshold match.',
      '3.7 Security Policy: Matches App=ANY on the ORIGINAL pre-NAT packet. Intra-zone permitted by default; no match = implicit deny.',
      '3.8 Session Allocation: Allocates from free pool (fails if VSYS/global max reached). INIT -> OPENING -> sets default transport timeout.',
      'Flow Installation: Checks flow table for race-condition duplicate (discards duplicate), installs C2S & S2C flows, transitions OPENING -> ACTIVE.',
    ],
    callout: {
      title: 'Key Exam & Troubleshooting Fact (Pre-NAT Security)',
      body: 'Even though NAT (3.4) ran earlier, Security Policy (3.7) evaluates the ORIGINAL packet contents and zones (with DNAT zone update if applicable).',
      tone: 'caveat',
    },
    speakerNotes:
      'Toggle PAN-48644 in the Slowpath Explorer to highlight the DoS-before-Security ordering, and step through INIT -> OPENING -> ACTIVE in the Session Lifecycle widget.',
    primaryWidget: 'slowpath-explorer',
    secondaryWidget: 'session-lifecycle',
    defaultScenarioId: 'new-tcp-http',
    highlightStages: ['slowpath', 'fastpath'],
  },
  {
    id: 'slide-9',
    number: 9,
    title: 'Fast Path: L2–L4, TCP Reassembly & Captive Portal',
    sectionBadge: 'Sections 4, 4.1, 4.2 · Fast Path',
    sectionGroup: 'Fast Path',
    kbRefs: 'KB 1620318 · Sections 4–4.2',
    subtitle:
      'High-speed L2–L4 processing, FIN/RST session timers, out-of-order TCP reassembly, and TCP/80 Captive Portal triggers.',
    keyPoints: [
      'L2–L4 Checks: Drops if session is in DISCARD state; refreshes timeout if ACTIVE; translates L3/L4 NAT headers.',
      'TCP FIN/RST Timers: 1st FIN starts Half-Closed timer; 2nd FIN or RST starts Time-Wait timer; session closes on expiration.',
      'TCP Reassembly: Window check, buffers out-of-order segments, skips retransmissions; drops on reassembly error or buffer exhaustion.',
      '4.1 Security Processing & 4.2 Captive Portal: Payload enters App-ID/Content-ID; missing User-ID + TCP/80 redirects after 3-way handshake & HTTP Host headers.',
    ],
    callout: {
      title: 'Captive Portal Timing Dependency',
      body: 'Captive Portal (4.2) cannot trigger on the initial SYN; it waits for the TCP 3-way handshake to complete and HTTP Host headers to arrive for URL-category lookup.',
      tone: 'info',
    },
    speakerNotes:
      'Walk through the Session Lifecycle widget triggering FIN 1 -> Half-Closed, FIN 2/RST -> Time-Wait, and Policy Deny/Threat -> DISCARD.',
    primaryWidget: 'session-lifecycle',
    defaultScenarioId: 'existing-fastpath',
    highlightStages: ['fastpath'],
  },
  {
    id: 'slide-10',
    number: 10,
    title: 'App-ID: Override, Signatures & Policy Re-Lookup',
    sectionBadge: 'Section 5 · App-ID',
    sectionGroup: 'App-ID',
    kbRefs: 'KB 1620318 · Section 5',
    subtitle:
      'Application-Override bypass, signature matching, Security Policy re-evaluation, QoS assignment, and SSL/SSH Decryption.',
    keyPoints: [
      'Application-Override Policy: If matched, application is known and Content Inspection (Sec 6) is skipped for the session.',
      'Signatures & Decoding: Without override, App-ID signatures identify the app (and Content-ID decoders detect mid-session app changes).',
      'Post-ID Actions: Re-lookup Security Policy with identified app; generate Traffic Log each time App-ID changes (if log at start enabled).',
      'Allow Actions: Trigger Content-ID (if profile/inspection applies), assign QoS class, and lookup SSL/SSH Decryption Policy to set up proxy contexts.',
    ],
    callout: {
      title: 'Session Timeout Override',
      body: 'Once App-ID identifies the application, application-specific timeout values override the global transport-protocol timeout set in Slowpath 3.8.',
      tone: 'info',
    },
    speakerNotes:
      'Use Scenario 6 (SSL Decryption + App-ID Shift) to show how App-ID first identifies "ssl", sets up decryption proxy contexts, and then hands off to Content-ID.',
    primaryWidget: 'pipeline',
    defaultScenarioId: 'ssl-decrypt-appid-shift',
    highlightStages: ['appid'],
  },
  {
    id: 'slide-11',
    number: 11,
    title: 'Content Inspection & Re-Encryption',
    sectionBadge: 'Section 6 · Content-ID',
    sectionGroup: 'Content-ID',
    kbRefs: 'KB 1620318 · Section 6',
    subtitle:
      'Protocol decoders, tunneled app-shift policy re-check, Security Profile threat inspection, and SSL/SSH re-encryption.',
    keyPoints: [
      'Protocol Decoders: Decode flow to identify tunneled applications (e.g., web-browsing / youtube inside ssl).',
      'Loop-Back #4 (App Change): If identified app changes, PAN-OS re-consults Security Policies to verify the session may continue.',
      'Security Profiles: If app is unchanged, inspects content against all profiles on the matching rule (Antivirus, Vulnerability, Spyware, etc.).',
      'Forwarding Gate & Re-encryption: Forwards if no detection OR detection action is allow; re-encrypts SSL forward proxy / SSH before Egress.',
    ],
    callout: {
      title: 'What if Policy Re-check Denies the Shifted App?',
      body: 'Toggle "Deny on App-ID Shift" in Scenario 6 to see the session transition to DISCARD and drop immediately.',
      tone: 'warning',
    },
    speakerNotes:
      'Step through Scenario 6 steps 3–5 to animate the App-ID change loop-back to Security Policy and the subsequent SSL re-encryption before Egress.',
    primaryWidget: 'pipeline',
    defaultScenarioId: 'ssl-decrypt-appid-shift',
    highlightStages: ['contentid', 'slowpath'],
  },
  {
    id: 'slide-12',
    number: 12,
    title: 'Forwarding / Egress & SP3 Summary',
    sectionBadge: 'Sections 7 & 8 · Egress & SP3',
    sectionGroup: 'Egress',
    kbRefs: 'KB 1620318 · Sections 7 & 8',
    subtitle:
      'Egress forwarding domain, QoS shaping, MTU fragmentation, Tunnel Encryption loop-back, physical TX, and SP3 recap.',
    keyPoints: [
      'Forwarding Domain & QoS: Uses forwarding domain from 3.3 and applies egress QoS shaping.',
      'MTU Fragmentation: Fragments packet if needed based on egress interface MTU and IP DF (Don\'t Fragment) bit.',
      'Loop-Back #3 (Tunnel Encryption): If egress interface is a tunnel interface, performs IPSec/SSL-VPN encryption and re-evaluates forwarding.',
      'Physical Egress & SP3: Transmits packet out physical interface—completing Single Pass software + Parallel Processing hardware execution.',
    ],
    callout: {
      title: 'Complete Mastery Check',
      body: 'You have traced all 8 sections, 4 loop-back arcs, 25+ drop gates, Slowpath 3.1–3.8, and SP3 architecture.',
      tone: 'info',
    },
    speakerNotes:
      'Summarize the entire journey using Scenario 3 (IPSec Tunnel) or Scenario 4 (IP Fragment) to show the final Egress tunnel encryption loop-back and MTU fragmentation.',
    primaryWidget: 'pipeline',
    secondaryWidget: 'sp3',
    defaultScenarioId: 'ipsec-tunnel',
    highlightStages: ['egress'],
  },
];
