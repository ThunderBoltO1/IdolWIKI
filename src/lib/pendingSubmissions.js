import { collection, addDoc, updateDoc, deleteDoc, doc, getDoc, setDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Submit a new idol for approval (for non-admin users)
 */
export async function submitPendingIdol(idolData, submittedBy) {
    try {
        const docRef = await addDoc(collection(db, 'pendingIdols'), {
            ...idolData,
            submittedBy: submittedBy.uid || submittedBy.id,
            submitterName: submittedBy.name || submittedBy.email,
            submitterEmail: submittedBy.email,
            status: 'pending', // pending, approved, rejected
            submittedAt: serverTimestamp(),
            reviewedAt: null,
            reviewedBy: null,
            reviewNotes: ''
        });
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error('Error submitting pending idol:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Submit a new group for approval (for non-admin users)
 */
export async function submitPendingGroup(groupData, submittedBy) {
    try {
        const docRef = await addDoc(collection(db, 'pendingGroups'), {
            ...groupData,
            submittedBy: submittedBy.uid || submittedBy.id,
            submitterName: submittedBy.name || submittedBy.email,
            submitterEmail: submittedBy.email,
            status: 'pending',
            submittedAt: serverTimestamp(),
            reviewedAt: null,
            reviewedBy: null,
            reviewNotes: ''
        });
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error('Error submitting pending group:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Submit an edit request for existing idol/group
 */
export async function submitEditRequest(targetType, targetId, targetName, changes, reason, submittedBy) {
    try {
        const docRef = await addDoc(collection(db, 'editRequests'), {
            targetType, // 'idol' or 'group'
            targetId,
            targetName,
            changes, // Object with field changes: { fieldName: { old: ..., new: ... } }
            reason,
            submittedBy: submittedBy.uid || submittedBy.id,
            submitterName: submittedBy.name || submittedBy.email,
            submitterEmail: submittedBy.email,
            status: 'pending', // pending, approved, rejected
            submittedAt: serverTimestamp(),
            reviewedAt: null,
            reviewedBy: null,
            reviewNotes: ''
        });
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error('Error submitting edit request:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Approve a pending idol submission (admin only)
 */
export async function approvePendingIdol(pendingId, adminUser, reviewNotes = '') {
    try {
        const pendingRef = doc(db, 'pendingIdols', pendingId);

        // Get pending data
        const pendingSnap = await getDoc(pendingRef);
        if (!pendingSnap.exists()) {
            throw new Error('Pending idol not found');
        }

        const pendingData = pendingSnap.data();
        const { submittedBy, submitterName, submitterEmail, status, submittedAt, reviewedAt, reviewedBy, reviewNotes: oldNotes, ...idolData } = pendingData;

        // Create idol ID from Stage Name (slugify)
        const idolId = idolData.name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

        // Add to main idols collection
        await setDoc(doc(db, 'idols', idolId), {
            ...idolData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            approvedBy: adminUser.uid || adminUser.id,
            originalSubmitter: submittedBy
        });

        // Update pending status
        await updateDoc(pendingRef, {
            status: 'approved',
            reviewedAt: serverTimestamp(),
            reviewedBy: adminUser.uid || adminUser.id,
            reviewerName: adminUser.name || adminUser.email,
            reviewNotes,
            approvedIdolId: idolId
        });

        // Create audit log
        await addDoc(collection(db, 'auditLogs'), {
            action: 'approve_pending_idol',
            targetId: idolId,
            targetType: 'idol',
            userId: adminUser.uid || adminUser.id,
            userName: adminUser.name || adminUser.email,
            pendingId,
            originalSubmitter: submittedBy,
            createdAt: serverTimestamp()
        });

        return { success: true, idolId };
    } catch (error) {
        console.error('Error approving pending idol:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Approve a pending group submission (admin only)
 */
export async function approvePendingGroup(pendingId, adminUser, reviewNotes = '') {
    try {
        const pendingRef = doc(db, 'pendingGroups', pendingId);

        // Similar to approvePendingIdol
        const pendingSnap = await getDoc(pendingRef);
        if (!pendingSnap.exists()) {
            throw new Error('Pending group not found');
        }

        const pendingData = pendingSnap.data();
        const { submittedBy, submitterName, submitterEmail, status, submittedAt, reviewedAt, reviewedBy, reviewNotes: oldNotes, ...groupData } = pendingData;

        // Create group ID from name
        const groupId = groupData.name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

        // Add to main groups collection
        await setDoc(doc(db, 'groups', groupId), {
            ...groupData,
            createdAt: serverTimestamp(),
            approvedBy: adminUser.uid || adminUser.id,
            originalSubmitter: submittedBy
        });

        // Update pending status
        await updateDoc(pendingRef, {
            status: 'approved',
            reviewedAt: serverTimestamp(),
            reviewedBy: adminUser.uid || adminUser.id,
            reviewerName: adminUser.name || adminUser.email,
            reviewNotes,
            approvedGroupId: groupId
        });

        // Create audit log
        await addDoc(collection(db, 'auditLogs'), {
            action: 'approve_pending_group',
            targetId: groupId,
            targetType: 'group',
            userId: adminUser.uid || adminUser.id,
            userName: adminUser.name || adminUser.email,
            pendingId,
            originalSubmitter: submittedBy,
            createdAt: serverTimestamp()
        });

        return { success: true, groupId };
    } catch (error) {
        console.error('Error approving pending group:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Reject a pending submission
 */
export async function rejectPendingSubmission(collectionName, pendingId, adminUser, reviewNotes) {
    try {
        const pendingRef = doc(db, collectionName, pendingId);

        await updateDoc(pendingRef, {
            status: 'rejected',
            reviewedAt: serverTimestamp(),
            reviewedBy: adminUser.uid || adminUser.id,
            reviewerName: adminUser.name || adminUser.email,
            reviewNotes
        });

        return { success: true };
    } catch (error) {
        console.error('Error rejecting submission:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Approve an edit request and apply changes
 */
export async function approveEditRequest(requestId, adminUser, reviewNotes = '') {
    try {
        const requestRef = doc(db, 'editRequests', requestId);
        const requestSnap = await getDoc(requestRef);

        if (!requestSnap.exists()) {
            throw new Error('Edit request not found');
        }

        const requestData = requestSnap.data();
        const { targetType, targetId, changes } = requestData;

        // Apply changes to target document
        const targetRef = doc(db, targetType === 'idol' ? 'idols' : 'groups', targetId);
        const updateData = {};

        Object.keys(changes).forEach(field => {
            updateData[field] = changes[field].new;
        });

        updateData.updatedAt = serverTimestamp();

        await updateDoc(targetRef, updateData);

        // Update request status
        await updateDoc(requestRef, {
            status: 'approved',
            reviewedAt: serverTimestamp(),
            reviewedBy: adminUser.uid || adminUser.id,
            reviewerName: adminUser.name || adminUser.email,
            reviewNotes
        });

        // Create audit log
        await addDoc(collection(db, 'auditLogs'), {
            action: 'approve_edit_request',
            targetId,
            targetType,
            userId: adminUser.uid || adminUser.id,
            userName: adminUser.name || adminUser.email,
            requestId,
            changes,
            createdAt: serverTimestamp()
        });

        return { success: true };
    } catch (error) {
        console.error('Error approving edit request:', error);
        return { success: false, error: error.message };
    }
}
