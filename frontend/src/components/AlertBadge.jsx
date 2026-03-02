import React from 'react';

const SEVERITY_MAP = {
    danger: { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.35)', color: '#ef4444', icon: '🚨' },
    warning: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.35)', color: '#f59e0b', icon: '⚠️' },
    info: { bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.35)', color: '#3b82f6', icon: 'ℹ️' },
    success: { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.35)', color: '#10b981', icon: '✅' },
};

const AlertBadge = ({ type = 'warning', message, count, onDismiss }) => {
    const style = SEVERITY_MAP[type] || SEVERITY_MAP.warning;

    return (
        <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '6px 14px',
            background: style.bg,
            border: `1px solid ${style.border}`,
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 600,
            color: style.color,
            transition: 'all 0.2s',
        }}>
            <span>{style.icon}</span>
            {message && <span>{message}</span>}
            {count !== undefined && (
                <span style={{
                    background: style.color, color: 'white',
                    borderRadius: '50%', width: 18, height: 18,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 800, flexShrink: 0
                }}>
                    {count > 99 ? '99+' : count}
                </span>
            )}
            {onDismiss && (
                <button onClick={onDismiss} style={{
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    color: style.color, fontSize: 14, lineHeight: 1, padding: 0,
                    opacity: 0.7, marginLeft: 2
                }}>✕</button>
            )}
        </div>
    );
};

export default AlertBadge;