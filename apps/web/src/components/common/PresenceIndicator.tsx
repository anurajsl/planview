interface PresenceIndicatorProps {
  onlineUsers: {
    userId: string;
    name: string;
    initials: string;
    color: string;
    cursor?: { storyId: string | null };
  }[];
  isConnected: boolean;
}

export default function PresenceIndicator({ onlineUsers, isConnected }: PresenceIndicatorProps) {
  if (onlineUsers.length === 0 && isConnected) return null;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 6,
    }}>
      {/* Connection status dot */}
      <div
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: isConnected ? '#22c55e' : '#ef4444',
          boxShadow: isConnected ? '0 0 6px rgba(34,197,94,0.4)' : 'none',
          flexShrink: 0,
        }}
        title={isConnected ? 'Connected' : 'Disconnected'}
      />

      {/* Stacked avatars */}
      <div style={{ display: 'flex', marginLeft: 2 }}>
        {onlineUsers.slice(0, 5).map((user, i) => (
          <div
            key={user.userId}
            title={`${user.name} is online`}
            style={{
              width: 26,
              height: 26,
              borderRadius: '50%',
              background: user.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
              fontWeight: 700,
              color: '#fff',
              border: '2px solid #fff',
              marginLeft: i > 0 ? -8 : 0,
              zIndex: 5 - i,
              boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
              cursor: 'default',
            }}
          >
            {user.initials}
          </div>
        ))}
        {onlineUsers.length > 5 && (
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: '50%',
              background: '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 9,
              fontWeight: 700,
              color: '#fff',
              border: '2px solid #fff',
              marginLeft: -8,
              zIndex: 0,
            }}
          >
            +{onlineUsers.length - 5}
          </div>
        )}
      </div>

      {onlineUsers.length > 0 && (
        <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500 }}>
          {onlineUsers.length} online
        </span>
      )}
    </div>
  );
}
