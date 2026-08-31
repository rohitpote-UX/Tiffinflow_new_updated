/**
 * AuditService — Reusable administrative audit logging
 */

import { localDb, AuditLog } from '../db';
import crypto from 'crypto';

export class AuditService {
  /**
   * Log administrative mutation
   */
  static async log(
    officeId: string,
    action: string,
    entityType: string,
    userId?: string,
    entityId?: string,
    metadata: Record<string, any> = {}
  ): Promise<AuditLog> {
    const entry: AuditLog = {
      id: crypto.randomUUID(),
      office_id: officeId,
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      metadata,
      created_at: new Date().toISOString(),
    };

    localDb.audit_logs.push(entry);
    localDb.save();
    return entry;
  }

  /**
   * Get audit log history for an office
   */
  static async getOfficeLogs(officeId: string, limit: number = 50): Promise<AuditLog[]> {
    return localDb.audit_logs
      .filter((l) => l.office_id === officeId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, limit);
  }
}
