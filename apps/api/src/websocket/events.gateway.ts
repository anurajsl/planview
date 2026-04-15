import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';

/**
 * Event types that flow through the WebSocket.
 * Matches the WsEvent enum in @planview/shared.
 */
interface WsPayload {
  event: string;
  tenantId: string;
  projectId: string;
  actorId: string;
  data: any;
  timestamp: string;
}

interface ConnectedUser {
  userId: string;
  tenantId: string;
  projectId: string | null;
  name: string;
  initials: string;
  color: string;
  cursor?: { storyId: string | null };
}

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  },
  namespace: '/ws',
  transports: ['websocket', 'polling'],
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger('WebSocket');

  /**
   * Track connected users per tenant+project for presence.
   * Key: `${tenantId}:${projectId}` → Map<socketId, ConnectedUser>
   */
  private rooms = new Map<string, Map<string, ConnectedUser>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  // ─── Connection Lifecycle ─────────────────────────────────

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        throw new UnauthorizedException('No token provided');
      }

      const payload = this.jwtService.verify(token, {
        secret: this.config.get('JWT_SECRET'),
      });

      // Attach user data to socket
      (client as any).user = {
        userId: payload.sub,
        tenantId: payload.tenantId,
        email: payload.email,
        role: payload.role,
        name: payload.name || payload.email,
      };

      // Join tenant room (all events for this tenant)
      client.join(`tenant:${payload.tenantId}`);

      this.logger.log(
        `Client connected: ${payload.email} (tenant: ${payload.tenantId})`,
      );
    } catch (err: any) {
      this.logger.warn(`Connection rejected: ${err.message}`);
      client.emit('error', { message: 'Authentication failed' });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const user = (client as any).user;
    if (!user) return;

    // Remove from all presence rooms
    for (const [roomKey, members] of this.rooms.entries()) {
      if (members.has(client.id)) {
        members.delete(client.id);

        // Broadcast departure to room
        this.server.to(roomKey).emit('user:left', {
          userId: user.userId,
          timestamp: new Date().toISOString(),
        });

        // Clean up empty rooms
        if (members.size === 0) {
          this.rooms.delete(roomKey);
        }
      }
    }

    this.logger.log(`Client disconnected: ${user.email}`);
  }

  // ─── Presence ─────────────────────────────────────────────

  /**
   * Client joins a project room for presence + live updates.
   * Called when user navigates to a project's Gantt view.
   */
  @SubscribeMessage('project:join')
  handleProjectJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { projectId: string; name: string; initials: string; color: string },
  ) {
    const user = (client as any).user;
    if (!user) return;

    const roomKey = `tenant:${user.tenantId}:project:${data.projectId}`;

    // Leave previous project room if any
    for (const [key, members] of this.rooms.entries()) {
      if (members.has(client.id) && key !== roomKey) {
        members.delete(client.id);
        client.leave(key);
        this.server.to(key).emit('user:left', {
          userId: user.userId,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Join new project room
    client.join(roomKey);

    if (!this.rooms.has(roomKey)) {
      this.rooms.set(roomKey, new Map());
    }

    const connectedUser: ConnectedUser = {
      userId: user.userId,
      tenantId: user.tenantId,
      projectId: data.projectId,
      name: data.name,
      initials: data.initials,
      color: data.color,
      cursor: { storyId: null },
    };

    this.rooms.get(roomKey)!.set(client.id, connectedUser);

    // Send current room members to the joining client
    const members = Array.from(this.rooms.get(roomKey)!.values());
    client.emit('presence:sync', { members });

    // Broadcast new user to everyone else in the room
    client.to(roomKey).emit('user:joined', {
      user: connectedUser,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(
      `${data.name} joined project ${data.projectId} (${members.length} online)`,
    );
  }

  /**
   * Client leaves a project room.
   */
  @SubscribeMessage('project:leave')
  handleProjectLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { projectId: string },
  ) {
    const user = (client as any).user;
    if (!user) return;

    const roomKey = `tenant:${user.tenantId}:project:${data.projectId}`;
    client.leave(roomKey);

    const members = this.rooms.get(roomKey);
    if (members) {
      members.delete(client.id);
      this.server.to(roomKey).emit('user:left', {
        userId: user.userId,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Client broadcasts cursor position (which story they're hovering/selecting).
   */
  @SubscribeMessage('cursor:move')
  handleCursorMove(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { projectId: string; storyId: string | null },
  ) {
    const user = (client as any).user;
    if (!user) return;

    const roomKey = `tenant:${user.tenantId}:project:${data.projectId}`;
    const members = this.rooms.get(roomKey);
    if (members?.has(client.id)) {
      const member = members.get(client.id)!;
      member.cursor = { storyId: data.storyId };
    }

    // Broadcast to everyone else in the room
    client.to(roomKey).emit('cursor:update', {
      userId: user.userId,
      storyId: data.storyId,
      timestamp: new Date().toISOString(),
    });
  }

  // ─── Data Events (called from services) ───────────────────

  /**
   * Broadcast a data change to all connected clients in the
   * same tenant + project room. Called by services after mutations.
   */
  broadcastToProject(tenantId: string, projectId: string, event: string, data: any, actorId: string) {
    const roomKey = `tenant:${tenantId}:project:${projectId}`;
    this.server.to(roomKey).emit(event, {
      event,
      tenantId,
      projectId,
      actorId,
      data,
      timestamp: new Date().toISOString(),
    } as WsPayload);
  }

  /**
   * Broadcast to all sockets in a tenant (for cross-project events).
   */
  broadcastToTenant(tenantId: string, event: string, data: any) {
    this.server.to(`tenant:${tenantId}`).emit(event, {
      event,
      tenantId,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get online users for a project.
   */
  getProjectPresence(tenantId: string, projectId: string): ConnectedUser[] {
    const roomKey = `tenant:${tenantId}:project:${projectId}`;
    const members = this.rooms.get(roomKey);
    return members ? Array.from(members.values()) : [];
  }
}
