import React, { useState } from 'react';
import {
  DROP_REASONS,
  InterfaceMode,
  PacketTypeKey,
  SLOWPATH_STEPS,
  SessionState,
  getInterfaceMatrix,
} from '../data/packetFlowModel';
import { SixTupleProtocol, computeSixTuple } from '../engine/flowSimulator';

/* ============================================================================
 * D1: 6-Tuple Flow Key & C2S / S2C Explorer
 * ============================================================================ */
export const SixTupleExplorer: React.FC = () => {
  const [protocol, setProtocol] = useState<SixTupleProtocol>('TCP');
  const [srcIp, setSrcIp] = useState('10.1.1.10');
  const [dstIp, setDstIp] = useState('93.184.216.34');
  const [srcPort, setSrcPort] = useState('51422');
  const [dstPort, setDstPort] = useState('443');
  const [icmpId, setIcmpId] = useState('0x1a2b');
  const [icmpSeq, setIcmpSeq] = useState('1');
  const [espSpi, setEspSpi] = useState('0x9a12b401');
  const [ingressZone, setIngressZone] = useState('trust');
  const [egressZone, setEgressZone] = useState('untrust');

  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  const srcIpValid = ipv4Regex.test(srcIp.trim());
  const dstIpValid = ipv4Regex.test(dstIp.trim());

  const result = computeSixTuple({
    protocol,
    srcIp,
    dstIp,
    srcPort,
    dstPort,
    icmpId,
    icmpSeq,
    espSpi,
    ingressZone,
    egressZone,
  });

  return (
    <div className="widget-card" data-testid="widget-six-tuple">
      <div className="widget-header">
        <h3>6-Tuple Flow Key &amp; C2S / S2C Explorer</h3>
        <span className="badge badge-stage">Section 3</span>
      </div>

      <div className="tuple-controls">
        <div className="proto-pills" role="group" aria-label="Protocol preset">
          {(
            [
              ['TCP', 'TCP'],
              ['UDP', 'UDP'],
              ['ICMP', 'ICMP'],
              ['IPSEC_ESP', 'IPSec ESP'],
              ['UNKNOWN', 'Unknown'],
            ] as const
          ).map(([val, label]) => (
            <button
              key={val}
              type="button"
              className={`pill-btn ${protocol === val ? 'active' : ''}`}
              onClick={() => setProtocol(val)}
              data-testid={`proto-btn-${val}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="tuple-inputs">
          <label className="field">
            <span>Src IP (Client POV)</span>
            <input
              type="text"
              value={srcIp}
              onChange={(e) => setSrcIp(e.target.value)}
              aria-invalid={!srcIpValid}
            />
            {!srcIpValid && <span className="field-err">Enter valid IPv4</span>}
          </label>
          <label className="field">
            <span>Dst IP (Server POV)</span>
            <input
              type="text"
              value={dstIp}
              onChange={(e) => setDstIp(e.target.value)}
              aria-invalid={!dstIpValid}
            />
            {!dstIpValid && <span className="field-err">Enter valid IPv4</span>}
          </label>

          {(protocol === 'TCP' || protocol === 'UDP') && (
            <>
              <label className="field">
                <span>Src Port</span>
                <input
                  type="text"
                  value={srcPort}
                  onChange={(e) => setSrcPort(e.target.value)}
                />
              </label>
              <label className="field">
                <span>Dst Port</span>
                <input
                  type="text"
                  value={dstPort}
                  onChange={(e) => setDstPort(e.target.value)}
                />
              </label>
            </>
          )}

          {protocol === 'ICMP' && (
            <>
              <label className="field">
                <span>ICMP Identifier</span>
                <input
                  type="text"
                  value={icmpId}
                  onChange={(e) => setIcmpId(e.target.value)}
                />
              </label>
              <label className="field">
                <span>ICMP Sequence</span>
                <input
                  type="text"
                  value={icmpSeq}
                  onChange={(e) => setIcmpSeq(e.target.value)}
                />
              </label>
            </>
          )}

          {protocol === 'IPSEC_ESP' && (
            <label className="field">
              <span>IPSec SPI</span>
              <input
                type="text"
                value={espSpi}
                onChange={(e) => setEspSpi(e.target.value)}
              />
            </label>
          )}

          <label className="field">
            <span>Ingress Zone</span>
            <input
              type="text"
              value={ingressZone}
              onChange={(e) => setIngressZone(e.target.value)}
            />
          </label>
          <label className="field">
            <span>Egress Zone</span>
            <input
              type="text"
              value={egressZone}
              onChange={(e) => setEgressZone(e.target.value)}
            />
          </label>
        </div>
      </div>

      <div className="tuple-l4-banner">
        <strong>L4 Key Substitution:</strong> <span className="mono">{result.l4Label}</span>
      </div>

      <div className="tuple-grid">
        {[result.c2s, result.s2c].map((flow) => (
          <div
            key={flow.direction}
            className="tuple-box"
            data-testid={`tuple-box-${flow.direction}`}
          >
            <div className="tuple-box-title">
              {flow.direction === 'C2S'
                ? 'C2S Flow (Client → Server)'
                : 'S2C Flow (Server → Client)'}
            </div>
            <dl className="tuple-dl mono">
              <div>
                <dt>1. Src IP</dt>
                <dd>{flow.srcIp}</dd>
              </div>
              <div>
                <dt>2. Dst IP</dt>
                <dd>{flow.dstIp}</dd>
              </div>
              <div>
                <dt>3. L4 Src</dt>
                <dd>{flow.l4Src}</dd>
              </div>
              <div>
                <dt>4. L4 Dst</dt>
                <dd>{flow.l4Dst}</dd>
              </div>
              <div>
                <dt>5. Protocol</dt>
                <dd>{flow.ipProtocol}</dd>
              </div>
              <div>
                <dt>6. Zone</dt>
                <dd>{flow.securityZone}</dd>
              </div>
            </dl>
          </div>
        ))}
      </div>
      <p className="widget-footnote">{result.notes}</p>
    </div>
  );
};

/* ============================================================================
 * D2: Interface Operational Modes 4x6 Matrix
 * ============================================================================ */
export const InterfaceMatrixWidget: React.FC = () => {
  const [multicastFw, setMulticastFw] = useState(false);
  const [ipv6Fw, setIpv6Fw] = useState(true);
  const [selectedCell, setSelectedCell] = useState<{
    mode: InterfaceMode;
    packetType: PacketTypeKey;
  } | null>(null);

  const cells = getInterfaceMatrix(multicastFw, ipv6Fw);
  const modes: InterfaceMode[] = ['Layer-3', 'Layer-2', 'Virtual-Wire', 'Tap'];
  const types: PacketTypeKey[] = [
    'IPv4 unicast',
    'IPv4 Multicast',
    'IP broadcast',
    'IP local broadcast',
    'IPv6',
    'Non-IP',
  ];

  const activeCell = selectedCell
    ? cells.find(
        (c) => c.mode === selectedCell.mode && c.packetType === selectedCell.packetType
      )
    : cells[0];

  return (
    <div className="widget-card" data-testid="widget-interface-matrix">
      <div className="widget-header">
        <h3>Interface Operational Modes (4×6 Matrix)</h3>
        <div className="matrix-toggles">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={multicastFw}
              onChange={() => setMulticastFw((v) => !v)}
              data-testid="toggle-multicast-fw"
            />
            Multicast Firewalling
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={ipv6Fw}
              onChange={() => setIpv6Fw((v) => !v)}
              data-testid="toggle-ipv6-fw"
            />
            IPv6 Firewalling (default ON)
          </label>
        </div>
      </div>

      <div className="table-scroll">
        <table className="matrix-table">
          <thead>
            <tr>
              <th>Packet Type</th>
              {modes.map((m) => (
                <th key={m}>{m}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {types.map((pt) => (
              <tr key={pt}>
                <th scope="row">{pt}</th>
                {modes.map((m) => {
                  const cell = cells.find((c) => c.mode === m && c.packetType === pt)!;
                  const isSel =
                    selectedCell?.mode === m && selectedCell?.packetType === pt;
                  return (
                    <td key={`${m}-${pt}`}>
                      <button
                        type="button"
                        className={`matrix-cell tone-${cell.badgeTone} ${
                          cell.changedByToggle ? 'toggled-diff' : ''
                        } ${isSel ? 'selected' : ''}`}
                        onClick={() => setSelectedCell({ mode: m, packetType: pt })}
                        data-testid={`matrix-cell-${m}-${pt.replace(/\s+/g, '-')}`}
                      >
                        {cell.action}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {activeCell && (
        <div className="widget-footnote">
          <strong>
            {activeCell.mode} · {activeCell.packetType}:
          </strong>{' '}
          {activeCell.detail}
        </div>
      )}
    </div>
  );
};

/* ============================================================================
 * D3: SYN Cookies vs RED Simulator
 * ============================================================================ */
export const SynCookiesRedWidget: React.FC = () => {
  const [synRate, setSynRate] = useState(8500);
  const threshold = 5000;
  const [mode, setMode] = useState<'RED' | 'SYN_COOKIES'>('SYN_COOKIES');
  const [allowNonSyn, setAllowNonSyn] = useState(false);

  const overloaded = synRate > threshold;
  const legitTotal = 2000;
  const spoofTotal = Math.max(0, synRate - legitTotal);

  let legitPass = legitTotal;
  let spoofPass = spoofTotal;
  if (overloaded) {
    if (mode === 'RED') {
      const dropRatio = Math.min(0.85, (synRate - threshold) / synRate);
      legitPass = Math.round(legitTotal * (1 - dropRatio));
      spoofPass = Math.round(spoofTotal * (1 - dropRatio));
    } else {
      // SYN Cookies: proxies 3-way handshake, drops spoofed SYNs without valid ACK cookie
      legitPass = legitTotal;
      spoofPass = 0;
    }
  }

  return (
    <div className="widget-card" data-testid="widget-syn-cookies">
      <div className="widget-header">
        <h3>Section 3.2: SYN Cookies vs. Random Early Drop (RED)</h3>
        <span className="badge badge-stage">Zone Protection</span>
      </div>

      <div className="syn-controls">
        <label className="slider-label">
          <span>
            Incoming SYN Rate: <strong className="mono">{synRate}</strong> SYN/sec (Activate
            Threshold: <span className="mono">{threshold}</span>)
          </span>
          <input
            type="range"
            min={1000}
            max={15000}
            step={500}
            value={synRate}
            onChange={(e) => setSynRate(Number(e.target.value))}
            data-testid="syn-rate-slider"
          />
        </label>

        <div className="proto-pills">
          <button
            type="button"
            className={`pill-btn ${mode === 'RED' ? 'active' : ''}`}
            onClick={() => setMode('RED')}
            data-testid="mode-red-btn"
          >
            RED (Default)
          </button>
          <button
            type="button"
            className={`pill-btn ${mode === 'SYN_COOKIES' ? 'active' : ''}`}
            onClick={() => setMode('SYN_COOKIES')}
            data-testid="mode-syncookies-btn"
          >
            SYN Cookies
          </button>
        </div>

        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={allowNonSyn}
            onChange={() => setAllowNonSyn((v) => !v)}
            data-testid="toggle-allow-nonsyn"
          />
          Allow Non-SYN TCP (Asymmetric flow override)
        </label>
      </div>

      {allowNonSyn && mode === 'SYN_COOKIES' && (
        <div className="drop-alert" data-testid="nonsyn-warning">
          <strong>SECURITY WARNING (Section 3.2):</strong> You should configure the firewall to{' '}
          <strong>reject non-SYN TCP</strong> when SYN Cookies are enabled; otherwise attackers
          can bypass cookie validation.
        </div>
      )}

      <div className="syn-bars">
        <div className="syn-stat">
          <span>Legitimate SYNs Passed</span>
          <div className="bar-track">
            <div
              className="bar-fill good"
              style={{ width: `${(legitPass / legitTotal) * 100}%` }}
            />
          </div>
          <span className="mono">
            {legitPass} / {legitTotal}
          </span>
        </div>
        <div className="syn-stat">
          <span>Spoofed Flood SYNs Passed</span>
          <div className="bar-track">
            <div
              className="bar-fill bad"
              style={{ width: `${spoofTotal ? (spoofPass / spoofTotal) * 100 : 0}%` }}
            />
          </div>
          <span className="mono">
            {spoofPass} / {spoofTotal}
          </span>
        </div>
      </div>

      <div className="widget-footnote">
        {mode === 'RED'
          ? 'RED (default): Once threshold is exceeded, drops SYN packets randomly—impacting legitimate and flood traffic equally.'
          : 'SYN Cookies: Uses RNG seed generated at data-plane boot to encode cookie. Firewall proxies 3-way handshake; invalid ACKs are treated as non-SYN; passing sessions undergo TCP sequence number translation.'}
      </div>
    </div>
  );
};

/* ============================================================================
 * D4: Session State Lifecycle Diagram
 * ============================================================================ */
export const SessionLifecycleWidget: React.FC = () => {
  const [state, setState] = useState<SessionState>('INIT');
  const [appIdKnown, setAppIdKnown] = useState(false);
  const [message, setMessage] = useState(
    'Pre-allocation state. Click "Allocate Session" (Slowpath 3.8) to begin.'
  );

  const states: SessionState[] = [
    'INIT',
    'OPENING',
    'ACTIVE',
    'HALF_CLOSED',
    'TIME_WAIT',
    'CLOSED',
    'DISCARD',
  ];

  const trigger = (action: string) => {
    switch (action) {
      case 'ALLOC':
        if (state === 'INIT') {
          setState('OPENING');
          setMessage(
            '3.8 Session Allocated: INIT → OPENING. Populated flow keys, forwarding/policy results & default transport timeout.'
          );
        }
        break;
      case 'INSTALL':
        if (state === 'OPENING') {
          setState('ACTIVE');
          setMessage(
            '3.8 Flow Installed: No race-condition duplicate found. C2S & S2C flows added to flow table. OPENING → ACTIVE.'
          );
        }
        break;
      case 'REFRESH':
        if (state === 'ACTIVE') {
          setMessage('4. Fast Path: Session is ACTIVE — session timeout refreshed.');
        }
        break;
      case 'FIN1':
        if (state === 'ACTIVE') {
          setState('HALF_CLOSED');
          setMessage('4. Fast Path: 1st TCP FIN received — TCP Half-Closed timer started.');
        }
        break;
      case 'FIN2':
        if (state === 'ACTIVE' || state === 'HALF_CLOSED') {
          setState('TIME_WAIT');
          setMessage('4. Fast Path: 2nd FIN or RST received — TCP Time-Wait timer started.');
        }
        break;
      case 'EXPIRE':
        if (state === 'HALF_CLOSED' || state === 'TIME_WAIT') {
          setState('CLOSED');
          setMessage('4. Timer Expired: Session closed and removed from flow lookup table.');
        }
        break;
      case 'DENY':
        if (state === 'ACTIVE' || state === 'HALF_CLOSED') {
          setState('DISCARD');
          setMessage(
            '4 & 6. Policy Deny / Threat Detected: Session marked DISCARD; subsequent Fast Path packets are dropped.'
          );
        }
        break;
      case 'APPID':
        if (state === 'ACTIVE') {
          setAppIdKnown(true);
          setMessage(
            '5. App-ID Identified: Application-specific timeout overrides global transport timeout.'
          );
        }
        break;
      case 'RESET':
        setState('INIT');
        setAppIdKnown(false);
        setMessage('Reset to INIT (pre-allocation).');
        break;
    }
  };

  return (
    <div className="widget-card" data-testid="widget-session-lifecycle">
      <div className="widget-header">
        <h3>Session State Lifecycle (Sections 3.8 &amp; 4)</h3>
        <span className="mono badge badge-stage">
          Timeout: {appIdKnown ? 'App-ID Specific' : 'Global Transport Default'}
        </span>
      </div>

      <div className="lifecycle-states" data-testid="lifecycle-states">
        {states.map((st) => (
          <div
            key={st}
            className={`state-pill ${state === st ? 'active' : ''} ${
              st === 'DISCARD' ? 'danger' : ''
            }`}
            data-testid={`lifecycle-state-${st}`}
          >
            {st}
          </div>
        ))}
      </div>

      <div className="lifecycle-actions">
        <button
          type="button"
          className="ctrl-btn"
          disabled={state !== 'INIT'}
          onClick={() => trigger('ALLOC')}
          data-testid="lc-alloc"
        >
          1. Alloc (3.8)
        </button>
        <button
          type="button"
          className="ctrl-btn"
          disabled={state !== 'OPENING'}
          onClick={() => trigger('INSTALL')}
          data-testid="lc-install"
        >
          2. Install Flows
        </button>
        <button
          type="button"
          className="ctrl-btn"
          disabled={state !== 'ACTIVE'}
          onClick={() => trigger('APPID')}
        >
          App-ID Identified
        </button>
        <button
          type="button"
          className="ctrl-btn"
          disabled={state !== 'ACTIVE'}
          onClick={() => trigger('FIN1')}
          data-testid="lc-fin1"
        >
          1st FIN
        </button>
        <button
          type="button"
          className="ctrl-btn"
          disabled={state !== 'ACTIVE' && state !== 'HALF_CLOSED'}
          onClick={() => trigger('FIN2')}
          data-testid="lc-fin2"
        >
          2nd FIN / RST
        </button>
        <button
          type="button"
          className="ctrl-btn"
          disabled={state !== 'HALF_CLOSED' && state !== 'TIME_WAIT'}
          onClick={() => trigger('EXPIRE')}
        >
          Timer Expire
        </button>
        <button
          type="button"
          className="ctrl-btn danger"
          disabled={state !== 'ACTIVE' && state !== 'HALF_CLOSED'}
          onClick={() => trigger('DENY')}
          data-testid="lc-deny"
        >
          Policy Deny / Threat
        </button>
        <button type="button" className="ctrl-btn" onClick={() => trigger('RESET')}>
          ↺ Reset
        </button>
      </div>

      <div className="widget-footnote" data-testid="lifecycle-message">
        {message}
      </div>
    </div>
  );
};

/* ============================================================================
 * D5: SP3 Architecture Visual
 * ============================================================================ */
export const Sp3ArchitectureWidget: React.FC = () => {
  const [focus, setFocus] = useState<'single-pass' | 'parallel-hw'>('single-pass');

  return (
    <div className="widget-card" data-testid="widget-sp3">
      <div className="widget-header">
        <h3>SP3: Single Pass Parallel Processing Architecture</h3>
        <span className="badge badge-stage">Section 8</span>
      </div>

      <div className="sp3-grid">
        <button
          type="button"
          className={`sp3-panel ${focus === 'single-pass' ? 'active' : ''}`}
          onClick={() => setFocus('single-pass')}
        >
          <h4>Single Pass Software</h4>
          <ul>
            <li>Parse packet headers ONCE (Ingress 2.1)</li>
            <li>Policy lookup &amp; App-ID classify ONCE</li>
            <li>Signature &amp; Content-ID scan ONCE (stream-based)</li>
            <li>Eliminates multi-proxy re-parsing latency</li>
          </ul>
        </button>

        <button
          type="button"
          className={`sp3-panel ${focus === 'parallel-hw' ? 'active' : ''}`}
          onClick={() => setFocus('parallel-hw')}
        >
          <h4>Parallel Processing Hardware</h4>
          <ul>
            <li>Dedicated Data Plane vs Control Plane separation</li>
            <li>Hardware acceleration for IPSec/SSL crypto &amp; pattern matching</li>
            <li>Dedicated networking, security &amp; management engines</li>
            <li>High-throughput + low-latency transaction processing</li>
          </ul>
        </button>
      </div>
    </div>
  );
};

/* ============================================================================
 * D6: Slowpath 8-Step & PAN-48644 Explorer
 * ============================================================================ */
export const SlowpathExplorerWidget: React.FC = () => {
  const [selectedIdx, setSelectedIdx] = useState(5); // Default highlight 3.6 PAN-48644
  const [showPrePan48644, setShowPrePan48644] = useState(false);

  const orderedSteps = showPrePan48644
    ? [
        SLOWPATH_STEPS[0]!,
        SLOWPATH_STEPS[1]!,
        SLOWPATH_STEPS[2]!,
        SLOWPATH_STEPS[3]!,
        SLOWPATH_STEPS[4]!,
        SLOWPATH_STEPS[6]!, // 3.7 Security before DoS in legacy
        SLOWPATH_STEPS[5]!, // 3.6 DoS
        SLOWPATH_STEPS[7]!,
      ]
    : SLOWPATH_STEPS;

  const current = SLOWPATH_STEPS[selectedIdx] ?? SLOWPATH_STEPS[0]!;

  return (
    <div className="widget-card" data-testid="widget-slowpath">
      <div className="widget-header">
        <h3>Slowpath 8-Step Sequence (3.1–3.8)</h3>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={showPrePan48644}
            onChange={() => setShowPrePan48644((v) => !v)}
            data-testid="toggle-pan48644"
          />
          Compare Legacy Pre-PAN-48644 (&lt; 7.0.2 / 6.1.7)
        </label>
      </div>

      <div className="slowpath-stepper">
        {orderedSteps.map((step) => {
          const origIdx = SLOWPATH_STEPS.findIndex((s) => s.id === step.id);
          const isActive = origIdx === selectedIdx;
          const isPan48644 = step.stepNumber === '3.6' || step.stepNumber === '3.7';
          return (
            <button
              key={step.id}
              type="button"
              className={`sp-step-btn ${isActive ? 'active' : ''} ${
                isPan48644 ? 'highlight-48644' : ''
              }`}
              onClick={() => setSelectedIdx(origIdx)}
              data-testid={`sp-step-${step.stepNumber}`}
            >
              <span className="mono">{step.stepNumber}</span>
              <span>{step.title}</span>
            </button>
          );
        })}
      </div>

      <div className="sp-detail-card">
        <div className="sp-detail-head">
          <span className="badge badge-stage">{current.kbSection}</span>
          <strong>
            {current.stepNumber} {current.title}
          </strong>
        </div>
        <p>{current.summary}</p>
        <div className="sp-inputs">
          <span className="meta-label">Inputs available:</span>{' '}
          {current.inputsAvailable.map((inp) => (
            <span key={inp} className="badge-inline mono">
              {inp}
            </span>
          ))}
        </div>
        {current.caveat && <div className="caveat-inline">{current.caveat}</div>}
      </div>
    </div>
  );
};

/* ============================================================================
 * Slide 3: Ingress 2.1–2.3 Drop Gates Explorer
 * ============================================================================ */
export const IngressDropsWidget: React.FC = () => {
  const [filter, setFilter] = useState<'ALL' | 'L2' | 'IPv4' | 'IPv6' | 'TCP' | 'UDP' | 'DEFRAG'>(
    'ALL'
  );

  const ingressDrops = DROP_REASONS.filter((d) => d.stage === 'ingress');
  const filtered = ingressDrops.filter((d) => {
    if (filter === 'ALL') return true;
    if (filter === 'L2') return d.subStage.includes('L2');
    if (filter === 'IPv4') return d.subStage.includes('IPv4');
    if (filter === 'IPv6') return d.subStage.includes('IPv6');
    if (filter === 'TCP') return d.subStage.includes('TCP');
    if (filter === 'UDP') return d.subStage.includes('UDP');
    return d.subStage.includes('Defrag') || d.subStage.includes('Decap');
  });

  return (
    <div className="widget-card" data-testid="widget-ingress-drops">
      <div className="widget-header">
        <h3>Ingress Non-Configurable Drop Gates ({ingressDrops.length} Conditions)</h3>
        <div className="proto-pills">
          {(['ALL', 'L2', 'IPv4', 'IPv6', 'TCP', 'UDP', 'DEFRAG'] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              className={`pill-btn ${filter === cat ? 'active' : ''}`}
              onClick={() => setFilter(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>
      <div className="drops-grid">
        {filtered.map((item) => (
          <div key={item.id} className="drop-item">
            <span className="mono drop-sub">{item.subStage}</span>
            <span className="drop-reason">{item.reason}</span>
            {item.counters && (
              <span className="mono drop-counters">{item.counters.join(' · ')}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
