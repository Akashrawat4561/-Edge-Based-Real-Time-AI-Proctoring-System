import React, { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { EVENT_RISK_SCORES } from '../utils/constants';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const EVENT_ICONS = {
  'Multiple Faces': '👤',
  'No Face': '🫥',
  'Looking Away': '👀',
  'Phone Detected': '📱',
  'Book Detected': '📚',
  'Second Person Detected': '🧑',
  'Tab Switching': '🪟',
  'Fullscreen Exit': '🖥️',
  'Copy Paste': '📋',
  'Dev Tools Open': '🔧',
  'Multiple Voices': '🔊',
};

const getEventIcon = (type) => {
  if (!type) return '⚠️';
  for (const key of Object.keys(EVENT_ICONS)) {
    if (type.includes(key.split(' ')[0])) return EVENT_ICONS[key];
  }
  return '⚠️';
};

const getRiskColor = (score) => {
  if (score < 31) return '#10b981';
  if (score < 71) return '#f59e0b';
  return '#ef4444';
};

const EventTimeline = ({ events = [], showTab = 'analytics' }) => {
  // Build cumulative risk for chart
  const { chartLabels, chartData, riskAtEach } = useMemo(() => {
    let cumulative = 0;
    const labels = [];
    const data = [];
    const risks = [];
    events.forEach(e => {
      const base = EVENT_RISK_SCORES[e.eventType] ?? 10;
      cumulative = Math.min(100, cumulative + base * (e.confidence || 0.5));
      labels.push(new Date(e.timestamp).toLocaleTimeString());
      data.push(Math.round(cumulative));
      risks.push(cumulative);
    });
    return { chartLabels: labels, chartData: data, riskAtEach: risks };
  }, [events]);

  const chartConfig = {
    labels: chartLabels,
    datasets: [{
      label: 'Cumulative Risk Score',
      data: chartData,
      borderColor: '#3b82f6',
      backgroundColor: (context) => {
        const ctx = context.chart.ctx;
        const gradient = ctx.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, 'rgba(59,130,246,0.3)');
        gradient.addColorStop(1, 'rgba(59,130,246,0.0)');
        return gradient;
      },
      tension: 0.4,
      fill: true,
      pointRadius: 4,
      pointBackgroundColor: chartData.map(v => getRiskColor(v)),
      pointBorderColor: 'rgba(255,255,255,0.2)',
      pointBorderWidth: 1,
      borderWidth: 2,
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(15,22,41,0.95)',
        borderColor: 'rgba(59,130,246,0.3)',
        borderWidth: 1,
        titleColor: '#94a3b8',
        bodyColor: '#f1f5f9',
        callbacks: {
          label: (ctx) => ` Risk: ${ctx.raw}/100`,
          title: (items) => {
            const idx = items[0].dataIndex;
            return events[idx]?.eventType || items[0].label;
          }
        }
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255,255,255,0.04)' },
        ticks: { color: '#475569', font: { size: 10, family: 'JetBrains Mono, monospace' }, maxTicksLimit: 8 }
      },
      y: {
        min: 0, max: 100,
        grid: { color: 'rgba(255,255,255,0.04)' },
        ticks: { color: '#475569', font: { size: 10 }, stepSize: 20 },
        title: { display: true, text: 'Risk Score', color: '#475569', font: { size: 11 } }
      }
    }
  };

  if (showTab === 'timeline') {
    return (
      <div>
        {events.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>No events to display.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {events.map((e, idx) => {
              const riskBase = EVENT_RISK_SCORES[e.eventType] ?? 10;
              const color = riskBase >= 40 ? '#ef4444' : riskBase >= 25 ? '#f59e0b' : '#10b981';
              const isLast = idx === events.length - 1;
              return (
                <div key={e._id || idx} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  {/* Timeline line + dot */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: `rgba(${riskBase >= 40 ? '239,68,68' : riskBase >= 25 ? '245,158,11' : '16,185,129'},0.15)`,
                      border: `1.5px solid ${color}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, flexShrink: 0
                    }}>
                      {getEventIcon(e.eventType)}
                    </div>
                    {!isLast && (
                      <div style={{ width: 1, flex: 1, minHeight: 24, background: 'rgba(255,255,255,0.07)', margin: '4px 0' }} />
                    )}
                  </div>

                  {/* Content */}
                  <div style={{
                    flex: 1, paddingBottom: isLast ? 0 : 20,
                    paddingTop: 4
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>{e.eventType}</span>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                        background: `rgba(${riskBase >= 40 ? '239,68,68' : riskBase >= 25 ? '245,158,11' : '16,185,129'},0.15)`,
                        color: color, border: `1px solid ${color}33`
                      }}>
                        +{riskBase} pts
                      </span>
                      <span style={{ fontSize: 11, color: '#475569', marginLeft: 'auto', fontFamily: 'monospace' }}>
                        {new Date(e.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
                      Confidence: <strong style={{ color: '#94a3b8' }}>{Math.round((e.confidence || 0) * 100)}%</strong>
                      {e.metadata?.durationSeconds && ` · Duration: ${Math.round(e.metadata.durationSeconds)}s`}
                      {e.metadata?.reason && ` · Reason: ${e.metadata.reason}`}
                      {e.metadata?.action && ` · Action: ${e.metadata.action}`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Analytics / Graph view
  return (
    <div>
      {events.length > 0 && (
        <div style={{ height: 280, marginBottom: 28 }}>
          <Line data={chartConfig} options={chartOptions} />
        </div>
      )}

      {/* Summary table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              {['#', 'Event Type', 'Confidence', 'Risk Added', 'Cumulative Risk', 'Time'].map(h => (
                <th key={h} style={{
                  textAlign: 'left', padding: '10px 12px', fontSize: 11,
                  color: '#475569', fontWeight: 600, letterSpacing: '0.05em'
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {events.map((e, idx) => {
              const riskBase = EVENT_RISK_SCORES[e.eventType] ?? 10;
              const added = Math.round(riskBase * (e.confidence || 0.5));
              const color = riskBase >= 40 ? '#ef4444' : riskBase >= 25 ? '#f59e0b' : '#10b981';
              return (
                <tr key={e._id || idx} style={{
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  transition: 'background 0.15s'
                }}
                  onMouseEnter={e2 => e2.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                  onMouseLeave={e2 => e2.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '10px 12px', color: '#475569' }}>{idx + 1}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>{getEventIcon(e.eventType)}</span>
                      <span style={{ color: '#cbd5e1', fontWeight: 500 }}>{e.eventType}</span>
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', color: '#94a3b8', fontFamily: 'monospace' }}>
                    {Math.round((e.confidence || 0) * 100)}%
                  </td>
                  <td style={{ padding: '10px 12px', color, fontWeight: 700, fontFamily: 'monospace' }}>
                    +{added}
                  </td>
                  <td style={{ padding: '10px 12px', fontFamily: 'monospace' }}>
                    <span style={{ color: getRiskColor(riskAtEach[idx]) }}>
                      {riskAtEach[idx] ? Math.round(riskAtEach[idx]) : 0}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', color: '#475569', fontFamily: 'monospace', fontSize: 11 }}>
                    {new Date(e.timestamp).toLocaleTimeString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EventTimeline;