import Database from "better-sqlite3";
import path from "path";
import crypto from "crypto";

const DB_PATH = process.env.DB_PATH || "/app/data/doctor-drive.db";
const SESSION_DURATION = 15 * 60 * 1000; // 15 minutes

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    initSchema();
  }
  return db;
}

function initSchema() {
  const database = db!;

  database.exec(`
    CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      size INTEGER NOT NULL,
      mime_type TEXT,
      password TEXT,
      expires_at INTEGER,
      max_downloads INTEGER,
      download_count INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      user_id TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_files_expires_at ON files(expires_at);
    CREATE INDEX IF NOT EXISTS idx_files_created_at ON files(created_at);
    CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id);

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      is_admin INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

    CREATE TABLE IF NOT EXISTS login_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      username TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      success INTEGER DEFAULT 1,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_login_logs_user_id ON login_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_login_logs_created_at ON login_logs(created_at);

    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Ajouter is_active si la colonne n'existe pas (migration)
  try {
    database.prepare("SELECT is_active FROM users LIMIT 1").get();
  } catch {
    database.exec("ALTER TABLE users ADD COLUMN is_active INTEGER DEFAULT 1");
  }
}

// ==================== CONFIG ====================

export function getConfig(key: string): string | null {
  const database = getDb();
  const row = database.prepare("SELECT value FROM config WHERE key = ?").get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export function setConfig(key: string, value: string): void {
  const database = getDb();
  database.prepare("INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)").run(key, value);
}

export function isSetupComplete(): boolean {
  return getConfig("setup_complete") === "true";
}

export function getAppName(): string {
  return getConfig("app_name") || "Solilok Drive";
}

export function getMaxStorage(): number {
  const value = getConfig("max_storage");
  return value ? parseInt(value, 10) : 15 * 1024 * 1024 * 1024; // 15 Go par défaut
}

// Fonctions utilitaires pour le hashing des mots de passe
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(":");
  const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return hash === verifyHash;
}

// ==================== FILES ====================

export interface FileRecord {
  id: string;
  filename: string;
  original_name: string;
  size: number;
  mime_type: string | null;
  password: string | null;
  expires_at: number | null;
  max_downloads: number | null;
  download_count: number;
  created_at: number;
  updated_at: number;
  user_id: string | null;
}

export function createFile(file: Omit<FileRecord, "download_count" | "updated_at">): FileRecord {
  const database = getDb();
  const now = Date.now();

  const stmt = database.prepare(`
    INSERT INTO files (id, filename, original_name, size, mime_type, password, expires_at, max_downloads, download_count, created_at, updated_at, user_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
  `);

  stmt.run(
    file.id,
    file.filename,
    file.original_name,
    file.size,
    file.mime_type,
    file.password,
    file.expires_at,
    file.max_downloads,
    file.created_at,
    now,
    file.user_id
  );

  return { ...file, download_count: 0, updated_at: now };
}

export function getFileById(id: string): FileRecord | null {
  const database = getDb();
  const stmt = database.prepare("SELECT * FROM files WHERE id = ?");
  return stmt.get(id) as FileRecord | null;
}

export function getFileByFilename(filename: string): FileRecord | null {
  const database = getDb();
  const stmt = database.prepare("SELECT * FROM files WHERE filename = ?");
  return stmt.get(filename) as FileRecord | null;
}

export function getAllFiles(): FileRecord[] {
  const database = getDb();
  const stmt = database.prepare("SELECT * FROM files ORDER BY created_at DESC");
  return stmt.all() as FileRecord[];
}

export function getFilesByUserId(userId: string): FileRecord[] {
  const database = getDb();
  const stmt = database.prepare("SELECT * FROM files WHERE user_id = ? ORDER BY created_at DESC");
  return stmt.all(userId) as FileRecord[];
}

export function incrementDownloadCount(id: string): void {
  const database = getDb();
  const stmt = database.prepare("UPDATE files SET download_count = download_count + 1, updated_at = ? WHERE id = ?");
  stmt.run(Date.now(), id);
}

export function deleteFile(id: string): void {
  const database = getDb();
  const stmt = database.prepare("DELETE FROM files WHERE id = ?");
  stmt.run(id);
}

export function deleteFileByFilename(filename: string): void {
  const database = getDb();
  const stmt = database.prepare("DELETE FROM files WHERE filename = ?");
  stmt.run(filename);
}

export function getExpiredFiles(): FileRecord[] {
  const database = getDb();
  const now = Date.now();
  const stmt = database.prepare(`
    SELECT * FROM files
    WHERE (expires_at IS NOT NULL AND expires_at < ?)
    OR (max_downloads IS NOT NULL AND download_count >= max_downloads)
  `);
  return stmt.all(now) as FileRecord[];
}

export function cleanupExpiredFiles(): string[] {
  const expired = getExpiredFiles();
  const filenames: string[] = [];

  for (const file of expired) {
    deleteFile(file.id);
    filenames.push(file.filename);
  }

  return filenames;
}

export function getTotalStorageUsed(): number {
  const database = getDb();
  const result = database.prepare("SELECT COALESCE(SUM(size), 0) as total FROM files").get() as { total: number };
  return result.total;
}

export function getFilesCount(): number {
  const database = getDb();
  const result = database.prepare("SELECT COUNT(*) as count FROM files").get() as { count: number };
  return result.count;
}

// ==================== USERS ====================

export interface UserRecord {
  id: string;
  username: string;
  password_hash: string;
  is_admin: number;
  is_active: number;
  created_at: number;
  updated_at: number;
}

export function getUserByUsername(username: string): UserRecord | null {
  const database = getDb();
  const stmt = database.prepare("SELECT * FROM users WHERE username = ?");
  return stmt.get(username) as UserRecord | null;
}

export function getUserById(id: string): UserRecord | null {
  const database = getDb();
  const stmt = database.prepare("SELECT * FROM users WHERE id = ?");
  return stmt.get(id) as UserRecord | null;
}

export function getAllUsers(): UserRecord[] {
  const database = getDb();
  const stmt = database.prepare("SELECT * FROM users ORDER BY created_at DESC");
  return stmt.all() as UserRecord[];
}

export function getUsersCount(): number {
  const database = getDb();
  const result = database.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
  return result.count;
}

export function createUser(username: string, password: string, isAdmin: boolean = false): UserRecord {
  const database = getDb();
  const id = crypto.randomUUID();
  const passwordHash = hashPassword(password);
  const now = Date.now();

  database.prepare(`
    INSERT INTO users (id, username, password_hash, is_admin, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, 1, ?, ?)
  `).run(id, username, passwordHash, isAdmin ? 1 : 0, now, now);

  return { id, username, password_hash: passwordHash, is_admin: isAdmin ? 1 : 0, is_active: 1, created_at: now, updated_at: now };
}

export function deleteUser(id: string): void {
  const database = getDb();
  database.prepare("DELETE FROM sessions WHERE user_id = ?").run(id);
  database.prepare("DELETE FROM login_logs WHERE user_id = ?").run(id);
  database.prepare("DELETE FROM users WHERE id = ?").run(id);
}

export function updateUserPassword(id: string, newPassword: string): void {
  const database = getDb();
  const passwordHash = hashPassword(newPassword);
  database.prepare("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?").run(passwordHash, Date.now(), id);
}

export function toggleUserActive(id: string): boolean {
  const database = getDb();
  const user = getUserById(id);
  if (!user) return false;
  const newStatus = user.is_active === 1 ? 0 : 1;
  database.prepare("UPDATE users SET is_active = ?, updated_at = ? WHERE id = ?").run(newStatus, Date.now(), id);
  // Supprimer les sessions si désactivé
  if (newStatus === 0) {
    database.prepare("DELETE FROM sessions WHERE user_id = ?").run(id);
  }
  return newStatus === 1;
}

// ==================== SESSIONS ====================

export interface SessionRecord {
  id: string;
  user_id: string;
  expires_at: number;
  created_at: number;
}

export function createSession(userId: string): SessionRecord {
  const database = getDb();
  const id = crypto.randomUUID();
  const now = Date.now();
  const expiresAt = now + SESSION_DURATION; // 15 minutes

  database.prepare(`
    INSERT INTO sessions (id, user_id, expires_at, created_at)
    VALUES (?, ?, ?, ?)
  `).run(id, userId, expiresAt, now);

  return { id, user_id: userId, expires_at: expiresAt, created_at: now };
}

export function refreshSession(sessionId: string): void {
  const database = getDb();
  const newExpiresAt = Date.now() + SESSION_DURATION;
  database.prepare("UPDATE sessions SET expires_at = ? WHERE id = ?").run(newExpiresAt, sessionId);
}

export function getSessionById(id: string): SessionRecord | null {
  const database = getDb();
  const stmt = database.prepare("SELECT * FROM sessions WHERE id = ?");
  return stmt.get(id) as SessionRecord | null;
}

export function deleteSession(id: string): void {
  const database = getDb();
  database.prepare("DELETE FROM sessions WHERE id = ?").run(id);
}

export function cleanupExpiredSessions(): void {
  const database = getDb();
  database.prepare("DELETE FROM sessions WHERE expires_at < ?").run(Date.now());
}

export function getValidSession(sessionId: string): { session: SessionRecord; user: UserRecord } | null {
  const session = getSessionById(sessionId);
  if (!session) return null;
  if (session.expires_at < Date.now()) {
    deleteSession(sessionId);
    return null;
  }
  const user = getUserById(session.user_id);
  if (!user) return null;
  // Vérifier si l'utilisateur est actif
  if (user.is_active !== 1) {
    deleteSession(sessionId);
    return null;
  }
  // Rafraîchir la session à chaque utilisation
  refreshSession(sessionId);
  return { session, user };
}

// ==================== LOGIN LOGS ====================

export interface LoginLogRecord {
  id: string;
  user_id: string;
  username: string;
  ip_address: string | null;
  user_agent: string | null;
  success: number;
  created_at: number;
}

export function createLoginLog(userId: string, username: string, ipAddress: string | null, userAgent: string | null, success: boolean): void {
  const database = getDb();
  const id = crypto.randomUUID();
  database.prepare(`
    INSERT INTO login_logs (id, user_id, username, ip_address, user_agent, success, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, userId, username, ipAddress, userAgent, success ? 1 : 0, Date.now());
}

export function getLoginLogs(limit: number = 50): LoginLogRecord[] {
  const database = getDb();
  const stmt = database.prepare("SELECT * FROM login_logs ORDER BY created_at DESC LIMIT ?");
  return stmt.all(limit) as LoginLogRecord[];
}

export function getLoginLogsByUserId(userId: string, limit: number = 20): LoginLogRecord[] {
  const database = getDb();
  const stmt = database.prepare("SELECT * FROM login_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT ?");
  return stmt.all(userId, limit) as LoginLogRecord[];
}

// ==================== STATS ====================

export interface Stats {
  totalStorage: number;
  maxStorage: number;
  filesCount: number;
  usersCount: number;
  storagePercent: number;
}

export function getStats(): Stats {
  const totalStorage = getTotalStorageUsed();
  const maxStorage = getMaxStorage();
  const filesCount = getFilesCount();
  const usersCount = getUsersCount();
  const storagePercent = maxStorage > 0 ? Math.round((totalStorage / maxStorage) * 100) : 0;

  return {
    totalStorage,
    maxStorage,
    filesCount,
    usersCount,
    storagePercent,
  };
}
