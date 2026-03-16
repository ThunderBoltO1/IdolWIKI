import { collection, addDoc, updateDoc, deleteDoc, doc, getDoc, setDoc, serverTimestamp, writeBatch, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import { logAudit } from './audit';

const COLLECTION_DELETE_REQUESTS = 'deleteRequests';

async function notifyAdmins(title, message, type, targetId) {
    try {
        const q = query(collection(db, 'users'), where('role', '==', 'admin'));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) return;

        const batch = writeBatch(db);
        snapshot.docs.forEach(adminDoc => {
            const ref = doc(collection(db, 'notifications'));
            batch.set(ref, {
                recipientId: adminDoc.id,
                type: 'admin_alert',
                title,
                message,
                targetId: targetId || null,
                targetType: type,
                read: false,
                createdAt: serverTimestamp()
            });
        });
        await batch.commit();
    } catch (error) {
        console.error("Error notifying admins:", error);
    }
}

/**
 * ส่งการแจ้งเตือนไปยังผู้ใช้คนเดียว (ใช้เมื่อแอดมิน reply ไปหาผู้ส่งคำขอ)
 */
export async function notifyUser(recipientId, title, message) {
    if (!recipientId) return;
    try {
        await addDoc(collection(db, 'notifications'), {
            recipientId,
            type: 'admin_reply',
            title,
            message,
            read: false,
            createdAt: serverTimestamp()
        });
    } catch (error) {
        console.error('Error notifying user:', error);
    }
}

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
            submitterAvatar: submittedBy.avatar || '',
            status: 'pending', // pending, approved, rejected
            submittedAt: serverTimestamp(),
            reviewedAt: null,
            reviewedBy: null,
            reviewNotes: ''
        });
        notifyAdmins('New Idol Submission', `New idol "${idolData.name}" submitted for review.`, 'idol', docRef.id);
        await logAudit({
            action: 'submit_create',
            targetType: 'idol',
            targetId: docRef.id,
            user: submittedBy,
            details: { name: idolData.name }
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
            submitterAvatar: submittedBy.avatar || '',
            status: 'pending',
            submittedAt: serverTimestamp(),
            reviewedAt: null,
            reviewedBy: null,
            reviewNotes: ''
        });
        notifyAdmins('New Group Submission', `New group "${groupData.name}" submitted for review.`, 'group', docRef.id);
        await logAudit({
            action: 'submit_create',
            targetType: 'group',
            targetId: docRef.id,
            user: submittedBy,
            details: { name: groupData.name }
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
            submitterAvatar: submittedBy.avatar || '',
            status: 'pending', // pending, approved, rejected
            submittedAt: serverTimestamp(),
            reviewedAt: null,
            reviewedBy: null,
            reviewNotes: ''
        });
        notifyAdmins('New Edit Request', `Edit request for ${targetType} "${targetName}" submitted.`, 'edit_request', docRef.id);
        await logAudit({
            action: 'submit_update',
            targetType: targetType,
            targetId: targetId,
            user: submittedBy,
            details: { changes, reason, requestId: docRef.id }
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
            companyLower: (idolData.company || '').trim().toLowerCase(),
            soloCompanyLower: (idolData.soloCompany || '').trim().toLowerCase(),
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
        logAudit({
            action: 'approve_pending_idol',
            targetType: 'idol',
            targetId: idolId,
            user: adminUser,
            details: { pendingId },
            originalSubmitter: submittedBy
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
            companyLower: (groupData.company || '').trim().toLowerCase(),
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
        logAudit({
            action: 'approve_pending_group',
            targetType: 'group',
            targetId: groupId,
            user: adminUser,
            details: { pendingId },
            originalSubmitter: submittedBy
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

        const pendingSnap = await getDoc(pendingRef);
        let originalSubmitter = null;
        let targetName = '';
        if (pendingSnap.exists()) {
            const data = pendingSnap.data();
            originalSubmitter = data.submittedBy;
            targetName = data.name || data.targetName || 'Unknown';
        }

        await updateDoc(pendingRef, {
            status: 'rejected',
            reviewedAt: serverTimestamp(),
            reviewedBy: adminUser.uid || adminUser.id,
            reviewerName: adminUser.name || adminUser.email,
            reviewNotes
        });

        // Create audit log
        logAudit({
            action: 'reject_submission',
            targetType: collectionName === 'pendingIdols' ? 'idol' : collectionName === 'pendingGroups' ? 'group' : 'edit_request',
            targetId: pendingId,
            user: adminUser,
            details: { collectionName, reviewNotes, targetName },
            originalSubmitter
        });

        return { success: true };
    } catch (error) {
        console.error('Error rejecting submission:', error);
        return { success: false, error: error.message };
    }
}

/**
 * ส่งคำขอลบ (idol / group / company) — ไม่ลบทันที รอการอนุมัติ
 * ตั้ง pendingDeletion บนเอกสารเป้าหมาย เพื่อให้รายการหายจากหน้ารายการ
 * @param {string} [reason] - เหตุผลที่ผู้ขอระบุ
 */
export async function submitDeleteRequest(targetType, targetId, targetName, submittedBy, reason = '') {
    try {
        const col = targetType === 'idol' ? 'idols' : targetType === 'group' ? 'groups' : 'companies';
        const targetRef = doc(db, col, targetId);

        let targetImage = null;
        try {
            const targetSnap = await getDoc(targetRef);
            if (targetSnap.exists()) {
                const d = targetSnap.data();
                targetImage = d.image || d.coverImage || d.profileImage || d.logo || null;
            }
        } catch (_) {}

        const docRef = await addDoc(collection(db, COLLECTION_DELETE_REQUESTS), {
            targetType,
            targetId,
            targetName,
            targetImage,
            reason: reason || '',
            submittedBy: submittedBy?.uid || submittedBy?.id,
            submitterName: submittedBy?.name || submittedBy?.email,
            submitterEmail: submittedBy?.email,
            submitterAvatar: submittedBy?.avatar || '',
            status: 'pending',
            submittedAt: serverTimestamp(),
            reviewedAt: null,
            reviewedBy: null,
            reviewNotes: ''
        });

        await updateDoc(targetRef, { pendingDeletion: true });

        notifyAdmins('คำขอลบ', `มีคำขอลบ${targetType === 'idol' ? 'ศิลปิน' : targetType === 'group' ? 'กลุ่ม' : 'บริษัท'} "${targetName}" รอการอนุมัติ`, 'delete_request', docRef.id);
        await logAudit({
            action: 'submit_delete',
            targetType,
            targetId,
            user: submittedBy,
            details: { targetName, requestId: docRef.id, reason: reason || undefined }
        });
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error('Error submitting delete request:', error);
        return { success: false, error: error.message };
    }
}

/**
 * อนุมัติคำขอลบ (หลังแอดมินยืนยันรหัสผ่านแล้ว) — ทำ soft delete จริง
 */
export async function approveDeleteRequest(requestId, adminUser, reviewNotes = '') {
    try {
        const requestRef = doc(db, COLLECTION_DELETE_REQUESTS, requestId);
        const requestSnap = await getDoc(requestRef);
        if (!requestSnap.exists()) throw new Error('คำขอลบไม่พบ');

        const { targetType, targetId, targetName, submittedBy } = requestSnap.data();
        const col = targetType === 'idol' ? 'idols' : targetType === 'group' ? 'groups' : 'companies';
        const targetRef = doc(db, col, targetId);

        const expireDate = new Date();
        expireDate.setDate(expireDate.getDate() + 7);

        await updateDoc(targetRef, {
            deleted: true,
            deletedAt: serverTimestamp(),
            expireAt: Timestamp.fromDate(expireDate),
            pendingDeletion: false
        });

        await updateDoc(requestRef, {
            status: 'approved',
            reviewedAt: serverTimestamp(),
            reviewedBy: adminUser?.uid || adminUser?.id,
            reviewerName: adminUser?.name || adminUser?.email,
            reviewNotes
        });

        await logAudit({
            action: 'approve_delete_request',
            targetType,
            targetId,
            user: adminUser,
            details: { requestId, targetName },
            originalSubmitter: submittedBy
        });
        return { success: true };
    } catch (error) {
        console.error('Error approving delete request:', error);
        return { success: false, error: error.message };
    }
}

/**
 * ปฏิเสธคำขอลบ — เอา pendingDeletion ออกจากเอกสาร
 */
export async function rejectDeleteRequest(requestId, adminUser, reviewNotes = '') {
    try {
        const requestRef = doc(db, COLLECTION_DELETE_REQUESTS, requestId);
        const requestSnap = await getDoc(requestRef);
        if (!requestSnap.exists()) throw new Error('คำขอลบไม่พบ');

        const { targetType, targetId, submittedBy } = requestSnap.data();
        const col = targetType === 'idol' ? 'idols' : targetType === 'group' ? 'groups' : 'companies';
        const targetRef = doc(db, col, targetId);
        await updateDoc(targetRef, { pendingDeletion: false });

        await updateDoc(requestRef, {
            status: 'rejected',
            reviewedAt: serverTimestamp(),
            reviewedBy: adminUser?.uid || adminUser?.id,
            reviewerName: adminUser?.name || adminUser?.email,
            reviewNotes
        });

        await logAudit({
            action: 'reject_delete_request',
            targetType,
            targetId,
            user: adminUser,
            details: { requestId, reviewNotes },
            originalSubmitter: submittedBy
        });
        return { success: true };
    } catch (error) {
        console.error('Error rejecting delete request:', error);
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
        const { targetType, targetId, changes, submittedBy } = requestData;

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
        logAudit({
            action: 'approve_edit_request',
            targetType,
            targetId,
            user: adminUser,
            details: { requestId, changes },
            originalSubmitter: submittedBy
        });

        return { success: true };
    } catch (error) {
        console.error('Error approving edit request:', error);
        return { success: false, error: error.message };
    }
}
