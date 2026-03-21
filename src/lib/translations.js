/**
 * EN-TH translations. Key format: section.key or section.subkey
 * Usage: t('common.cancel') => lang === 'th' ? 'ยกเลิก' : 'Cancel'
 */
const translations = {
    common: {
        cancel: { en: 'Cancel', th: 'ยกเลิก' },
        confirm: { en: 'Confirm', th: 'ยืนยัน' },
        close: { en: 'Close', th: 'ปิด' },
        submit: { en: 'Submit', th: 'ส่ง' },
        save: { en: 'Save', th: 'บันทึก' },
        delete: { en: 'Delete', th: 'ลบ' },
        reject: { en: 'Reject', th: 'ปฏิเสธ' },
        approve: { en: 'Approve', th: 'อนุมัติ' },
        back: { en: 'Back', th: 'กลับ' },
        loading: { en: 'Loading...', th: 'กำลังโหลด...' },
        optional: { en: 'Optional', th: 'ไม่บังคับ' },
    },
    deleteRequest: {
        titleIdol: { en: 'Submit delete request (Artist)', th: 'ส่งคำขอลบศิลปิน' },
        titleGroup: { en: 'Submit delete request (Group)', th: 'ส่งคำขอลบกลุ่ม' },
        titleCompany: { en: 'Submit delete request (Company)', th: 'ส่งคำขอลบบริษัท' },
        message: { en: 'Submit delete request? Item will be hidden and wait for admin approval (admin password required to confirm deletion).', th: 'ส่งคำขอลบ ใช่หรือไม่? รายการจะหายจากหน้ารายการและรอการอนุมัติจากแอดมิน (ต้องใส่รหัสผ่านเพื่อยืนยันการลบ)' },
        confirmButton: { en: 'Submit request', th: 'ส่งคำขอ' },
        reasonPlaceholder: { en: 'Reason for request (optional)', th: 'เหตุผล (ไม่บังคับ) / Reason (optional)' },
        success: { en: 'Delete request submitted. Waiting for admin approval.', th: 'ส่งคำขอลบแล้ว รอการอนุมัติจากแอดมิน' },
        error: { en: 'Failed to submit delete request', th: 'ส่งคำขอลบไม่สำเร็จ' },
        tabLabel: { en: 'Delete requests', th: 'คำขอลบ' },
        cardLabel: { en: 'Delete request', th: 'คำขอลบ' },
        typeIdol: { en: 'Artist', th: 'ศิลปิน' },
        typeGroup: { en: 'Group', th: 'กลุ่ม' },
        typeCompany: { en: 'Company', th: 'บริษัท' },
        reasonLabel: { en: 'Reason', th: 'เหตุผลที่ขอลบ / Reason' },
        confirmPasswordHint: { en: 'Enter admin password to approve deletion', th: 'ยืนยันการลบด้วยรหัสผ่านแอดมินเพื่อดำเนินการลบจริง' },
        clickToView: { en: 'Click to view detail page', th: 'คลิกเพื่อดูหน้ารายละเอียด' },
        replyToRequester: { en: 'Reply to requester', th: 'ส่งข้อความถามยืนยันผู้ขอ / Reply to requester' },
        replyModalTitle: { en: 'Reply to requester', th: 'ส่งข้อความถึงผู้ขอ / Reply to requester' },
        replyModalHint: { en: 'Send a message to confirm the delete request (e.g. Do you really want to delete?)', th: 'ส่งข้อความถามยืนยันคำขอลบ (เช่น ต้องการลบจริง ๆ ใช่ไหม)' },
        replyPlaceholder: { en: 'Type your message to the requester...', th: 'พิมพ์ข้อความที่ต้องการส่งให้ผู้ขอ...' },
        replySend: { en: 'Send message', th: 'ส่งข้อความ' },
        replySuccess: { en: 'Message sent', th: 'ส่งข้อความแล้ว' },
        replyError: { en: 'Failed to send message', th: 'ส่งข้อความไม่สำเร็จ' },
        adminReplyNotificationTitle: { en: 'Admin asked about your delete request', th: 'แอดมินถามยืนยันคำขอลบ' },
        confirmDelete: { en: 'Confirm deletion', th: 'ยืนยันการลบ' },
        confirmDeletePassword: { en: 'Enter admin password to approve deletion of', th: 'ใส่รหัสผ่านของแอดมินเพื่ออนุมัติการลบ' },
        confirmDeleteButton: { en: 'Confirm deletion', th: 'ยืนยันการลบ' },
        processing: { en: 'Processing...', th: 'กำลังดำเนินการ...' },
    },
    submissions: {
        pageTitle: { en: 'Pending Submissions', th: 'เรื่องที่รอดำเนินการ' },
        pageSubtitle: { en: 'Review and manage user submissions', th: 'ตรวจสอบและจัดการเรื่องที่ผู้ใช้ส่งมา' },
        pendingIdols: { en: 'Pending Idols', th: 'ไอดอลรออนุมัติ' },
        pendingGroups: { en: 'Pending Groups', th: 'กลุ่มรออนุมัติ' },
        editRequests: { en: 'Edit Requests', th: 'คำขอแก้ไข' },
        allCaughtUp: { en: 'All caught up! No pending submissions.', th: 'ไม่มีเรื่องรอดำเนินการแล้ว' },
        viewFullDetails: { en: 'View Full Details', th: 'ดูรายละเอียดเต็ม' },
        rejectSubmission: { en: 'Reject Submission', th: 'ปฏิเสธเรื่องส่ง' },
        rejectReasonPlaceholder: { en: 'Reason for rejection...', th: 'เหตุผลในการปฏิเสธ...' },
        confirmReject: { en: 'Confirm Reject', th: 'ยืนยันการปฏิเสธ' },
        missingIndex: { en: 'Missing Index', th: 'ขาด Index' },
        missingIndexHint: { en: 'A Firestore index is required for sorting.', th: 'ต้องสร้าง Firestore index สำหรับการเรียงลำดับ' },
        clickHereToCreate: { en: 'Click here to create it', th: 'คลิกเพื่อสร้าง' },
        checkSecurityRules: { en: 'Check your Firestore Security Rules.', th: 'ตรวจสอบ Firestore Security Rules' },
    },
    admin: {
        title: { en: 'Admin Management', th: 'จัดการแอดมิน' },
        subtitle: { en: 'Manage and configure system settings', th: 'จัดการและตั้งค่าระบบ' },
        open: { en: 'Open', th: 'เปิด' },
        dashboard: { en: 'Dashboard', th: 'แดชบอร์ด' },
        dashboardDesc: { en: 'System overview, statistics & analytics', th: 'ภาพรวมระบบ สถิติ และวิเคราะห์' },
        userManagement: { en: 'User Management', th: 'จัดการผู้ใช้' },
        userManagementDesc: { en: 'Manage users, roles & permissions', th: 'จัดการผู้ใช้ บทบาท และสิทธิ์' },
        companyManagement: { en: 'Company Management', th: 'จัดการบริษัท' },
        companyManagementDesc: { en: 'Manage companies & agencies', th: 'จัดการบริษัทและเอเจนซี' },
        pendingSubmissions: { en: 'Pending Submissions', th: 'เรื่องที่รอดำเนินการ' },
        pendingSubmissionsDesc: { en: 'Review & approve user submissions', th: 'ตรวจสอบและอนุมัติเรื่องที่ผู้ใช้ส่งมา' },
        awardManagement: { en: 'Award Management', th: 'จัดการรางวัล' },
        awardManagementDesc: { en: 'Manage awards & achievements', th: 'จัดการรางวัลและความสำเร็จ' },
        auditLogs: { en: 'Audit Logs', th: 'บันทึกการตรวจสอบ' },
        auditLogsDesc: { en: 'View system activity & changes', th: 'ดูกิจกรรมและการเปลี่ยนแปลงของระบบ' },
    },
    home: {
        heroTitle1: { en: 'Discover Your', th: 'ค้นพบ' },
        heroTitle2: { en: 'K-Pop Destiny', th: 'ไอดอลในดวงใจ' },
        heroSubtitle: { en: 'Experience the next generation of idol discovery. Seamlessly browse, interact, and stay updated with your favorite artists.', th: 'ค้นหาและติดตามศิลปิน K-Pop ที่คุณชื่นชอบ เรียกดู ติดตาม และอัปเดตข้อมูลได้ในที่เดียว' },
        all: { en: 'All', th: 'ทั้งหมด' },
        groups: { en: 'Groups', th: 'กลุ่ม' },
        soloists: { en: 'Soloists', th: 'ศิลปินเดี่ยว' },
        allCompanies: { en: 'All Companies', th: 'ทุกบริษัท' },
        searchCompany: { en: 'Search company...', th: 'ค้นหาบริษัท...' },
        groupsSection: { en: 'Groups', th: 'กลุ่ม' },
        group: { en: 'Group', th: 'กลุ่ม' },
        groupsCount: { en: 'Groups', th: 'กลุ่ม' },
        soloArtistsSection: { en: 'Solo Artists', th: 'ศิลปินเดี่ยว' },
        artist: { en: 'Artist', th: 'ศิลปิน' },
        artists: { en: 'Artists', th: 'ศิลปิน' },
        year: { en: 'Year', th: 'ปี' },
        aToZ: { en: 'A-Z', th: 'ก-ฮ' },
        backToDiscovery: { en: 'Back to Discovery', th: 'กลับไปค้นหา' },
    },
    groupPage: {
        information: { en: 'Information', th: 'ข้อมูล' },
        foundation: { en: 'Foundation', th: 'ค่าย' },
        debutEra: { en: 'Debut Era', th: 'เดบิวต์' },
        status: { en: 'Status', th: 'สถานะ' },
        socialMedia: { en: 'Social Media', th: 'โซเชียลมีเดีย' },
        members: { en: 'Members', th: 'สมาชิก' },
        fandom: { en: 'Fandom', th: 'ด้อม / ชื่อแฟนคลับ' },
        gallery: { en: 'Gallery', th: 'แกลเลอรี' },
        timeline: { en: 'Timeline', th: 'ไทม์ไลน์' },
        discography: { en: 'Discography', th: 'ดิสโกกราฟี' },
        videoGallery: { en: 'Video Gallery', th: 'วิดีโอ' },
        news: { en: 'News', th: 'ข่าว' },
        fanTalk: { en: 'Fan Talk', th: 'แฟนทอล์ก' },
        activeMembers: { en: 'Active Members', th: 'สมาชิกปัจจุบัน' },
        edit: { en: 'Edit', th: 'แก้ไข' },
        noGalleryYet: { en: 'No gallery images yet.', th: 'ยังไม่มีรูปแกลเลอรี' },
        unsavedConfirmTitle: { en: 'Unsaved changes', th: 'ยังไม่ได้บันทึก' },
        unsavedConfirmMessage: { en: 'You have unsaved changes. Leave this tab?', th: 'ยังไม่ได้บันทึก ต้องการออกจากแท็บนี้ไหม?' },
        unsavedConfirmLeave: { en: 'Leave', th: 'ออก' },
    },
    idolDetail: {
        biography: { en: 'Biography', th: 'ประวัติ' },
        featuredVideos: { en: 'Featured Videos', th: 'วิดีโอเด่น' },
        noVideosAvailable: { en: 'No videos available.', th: 'ยังไม่มีวิดีโอ' },
        noVideosAdded: { en: 'No videos added.', th: 'ยังไม่ได้เพิ่มวิดีโอ' },
        discography: { en: 'Discography', th: 'ดิสโกกราฟี' },
        addAlbumsHint: { en: 'Add albums/works to show here.', th: 'เพิ่มอัลบั้ม/ผลงานเพื่อแสดงที่นี่' },
        gallery: { en: 'Gallery', th: 'แกลเลอรี' },
        noGalleryImages: { en: 'No gallery images.', th: 'ยังไม่มีรูปแกลเลอรี' },
        noBiography: { en: 'No biography available.', th: 'ยังไม่มีประวัติ' },
        readMore: { en: 'Read more', th: 'อ่านเพิ่มเติม' },
    },
    notifications: {
        title: { en: 'Notifications', th: 'การแจ้งเตือน' },
        markAllRead: { en: 'Mark all read', th: 'อ่านทั้งหมดแล้ว' },
        noNotifications: { en: 'No notifications yet', th: 'ยังไม่มีการแจ้งเตือน' },
    },
    nav: {
        searchPlaceholder: { en: 'Search idols...', th: 'ค้นหาไอดอล...' },
        logIn: { en: 'Log In', th: 'เข้าสู่ระบบ' },
        addNew: { en: 'Add New', th: 'เพิ่มใหม่' },
        addIdol: { en: 'Add Idol', th: 'เพิ่มศิลปิน' },
        addGroup: { en: 'Add Group', th: 'เพิ่มกลุ่ม' },
        addCompany: { en: 'Add Company', th: 'เพิ่มบริษัท' },
        languageSwitch: { en: 'Language', th: 'ภาษา' },
    },
    langSwitched: {
        toThai: { en: 'Switched to Thai', th: 'เปลี่ยนเป็นไทยแล้ว' },
        toEnglish: { en: 'Switched to English', th: 'เปลี่ยนเป็นอังกฤษแล้ว' },
    },
};

/**
 * Get translation for key. Key can be 'common.cancel' or nested.
 */
export function getT(lang) {
    return function t(key) {
        const keys = key.split('.');
        let v = translations;
        for (const k of keys) {
            v = v?.[k];
        }
        if (v && typeof v === 'object' && (v.en !== undefined || v.th !== undefined)) {
            return v[lang] ?? v.en ?? v.th ?? key;
        }
        return key;
    };
}

export { translations };
