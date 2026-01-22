import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Creates an audit log entry in Firestore.
 * 
 * @param {Object} params - The audit log parameters.
 * @param {string} params.action - The action performed (e.g., 'create', 'update', 'delete', 'approve', 'reject').
 * @param {string} params.targetType - The type of target (e.g., 'idol', 'group', 'submission').
 * @param {string} params.targetId - The ID of the target.
 * @param {Object} params.user - The user performing the action (must contain uid and name/email).
 * @param {Object} [params.details] - Additional details (e.g., changes, reason).
 * @param {Object} [params.originalSubmitter] - Information about the original submitter (if applicable).
 */
export async function logAudit({ action, targetType, targetId, user, details = {}, originalSubmitter = null }) {
    try {
        if (!user) {
            console.warn('Audit log attempt without user:', { action, targetType, targetId });
            return;
        }

        const logData = {
            action,
            targetType,
            targetId,
            userId: user.uid || user.id,
            userName: user.name || user.email || 'Unknown',
            createdAt: serverTimestamp(),
            details
        };

        // If 'changes' is in details, we can also promote it to top-level if needed, 
        // but AdminAuditLogs checks 'details' too, so keeping it nested is cleaner.
        // However, existing logs might have 'changes' at top level.
        // To be compatible with AdminAuditLogs which checks log.changes || log.details,
        // if we have changes, we might want to put it in details.
        
        // If details contains 'changes', AdminAuditLogs will print { changes: ... } which is fine.

        if (originalSubmitter) {
            logData.originalSubmitter = originalSubmitter;
        }

        await addDoc(collection(db, 'auditLogs'), logData);
    } catch (error) {
        console.error('Failed to create audit log:', error);
    }
}
