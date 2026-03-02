import React from 'react';

/**
 * CameraPreview - small floating camera feed for the admin to see the candidate's
 * local video stream (within the same browser session / demo mode).
 * In production, this would be a WebRTC stream from the candidate to admin.
 */
const CameraPreview = ({ videoRef, isActive = true, label = 'Camera Feed' }) => {
    return (
        <div style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '16/9',
            borderRadius: 12,
            overflow: 'hidden',
            background: '#0a0e1a',
            border: '1px solid rgba(255,255,255,0.08)',
        }}>
            {isActive && videoRef ? (
                <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    style={{
                        width: '100%', height: '100%',
                        objectFit: 'cover',
                        transform: 'scaleX(-1)',
                    }}
                />
            ) : (
                <div style={{
                    width: '100%', height: '100%',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    gap: 8, color: '#334155'
                }}>
                    <span style={{ fontSize: 32 }}>📷</span>
                    <span style={{ fontSize: 12, fontWeight: 500 }}>No feed available</span>
                </div>
            )}

            {/* Label overlay */}
            <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                padding: '8px 12px',
                background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                display: 'flex', alignItems: 'center', gap: 6,
            }}>
                <span style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: isActive ? '#10b981' : '#475569',
                    boxShadow: isActive ? '0 0 6px #10b981' : 'none',
                    flexShrink: 0
                }} />
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>
                    {label}
                </span>
            </div>

            {/* Recording indicator */}
            {isActive && (
                <div style={{
                    position: 'absolute', top: 8, right: 8,
                    display: 'flex', alignItems: 'center', gap: 4,
                    background: 'rgba(0,0,0,0.6)', borderRadius: 20,
                    padding: '2px 8px',
                }}>
                    <span style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: '#ef4444',
                        animation: 'blink 1.2s infinite',
                    }} />
                    <span style={{ fontSize: 10, color: 'white', fontWeight: 700 }}>LIVE</span>
                </div>
            )}

            <style>{`@keyframes blink { 0%,100%{opacity:1;} 50%{opacity:0.2;} }`}</style>
        </div>
    );
};

export default CameraPreview;