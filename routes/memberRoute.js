import express from "express";
import * as memberC from "../controllers/memberController.js";

const router = express.Router();

// สมัครสมาชิกใหม่
router.post('/members', memberC.postMember);

// เข้าสู่ระบบ
router.post('/members/login', memberC.loginMember);

// ออกจากระบบ
router.get('/members/logout', memberC.logoutMember);

// อัปโหลดรูปโปรไฟล์
router.post('/members/uploadimg', memberC.uploadMember);

// ดึงข้อมูลโปรไฟล์สมาชิก
router.get('/members/profile', memberC.getMemberProfile);

// อัปเดตข้อมูลโปรไฟล์
router.put('/members/profile', memberC.updateMemberProfile);

// เปลี่ยนรหัสผ่าน
router.put('/members/password', memberC.changePassword);


export default router;