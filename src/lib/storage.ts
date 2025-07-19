import { UserTasteProfile } from './spotify';

interface ComparisonSession {
  id: string;
  user1Profile: UserTasteProfile;
  user2Profile?: UserTasteProfile;
  createdAt: number;
  expiresAt: number;
}

class InMemoryStorage {
  private sessions = new Map<string, ComparisonSession>();
  private readonly TTL = 30 * 60 * 1000; // 30 minutes

  createSession(user1Profile: UserTasteProfile): string {
    const sessionId = this.generateSessionId();
    const now = Date.now();
    
    const session = {
      id: sessionId,
      user1Profile,
      createdAt: now,
      expiresAt: now + this.TTL,
    };
    
    this.sessions.set(sessionId, session);
    console.log('Created session:', sessionId);
    console.log('Total sessions:', this.sessions.size);

    // Clean up expired sessions
    this.cleanup();

    return sessionId;
  }

  getSession(sessionId: string): ComparisonSession | null {
    console.log('Looking for session:', sessionId);
    console.log('Available sessions:', Array.from(this.sessions.keys()));
    
    const session = this.sessions.get(sessionId);
    if (!session) {
      console.log('Session not found');
      return null;
    }

    if (Date.now() > session.expiresAt) {
      console.log('Session expired');
      this.sessions.delete(sessionId);
      return null;
    }

    console.log('Session found:', session.id);
    return session;
  }

  addUser2ToSession(sessionId: string, user2Profile: UserTasteProfile): boolean {
    const session = this.getSession(sessionId);
    if (!session) return false;

    session.user2Profile = user2Profile;
    this.sessions.set(sessionId, session);
    return true;
  }

  updateSessionData(sessionId: string, user1Profile: UserTasteProfile, user2Profile: UserTasteProfile): boolean {
    const session = this.getSession(sessionId);
    if (!session) return false;

    session.user1Profile = user1Profile;
    session.user2Profile = user2Profile;
    this.sessions.set(sessionId, session);
    return true;
  }

  private generateSessionId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  private cleanup() {
    const now = Date.now();
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        this.sessions.delete(sessionId);
      }
    }
  }
}

export const storage = new InMemoryStorage(); 