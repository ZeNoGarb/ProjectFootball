import database from "../service/database.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import multer from "multer"

// upload part
// กำหนดตำแหน่งที่จะเก็บ file ที่ upload --> img_mem
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
      cb(null, 'img_mem')
  },
  // กำหนดชื่อ file
  filename: function (req, file, cb) {
      const filename = `${req.body.memEmail}.jpg`
      cb(null, filename)
  }
})
// จำกัดประเภทของไฟล์ที่อัปโหลด
const upload = multer({
  storage: storage,
}).single('file');

export async function postMember(req, res) {
  console.log("POST /MEMBER is requested!!");
  try {
    //not null
    if (req.body.memEmail == null || req.body.memName == null) {
      return res.json({
        regist: false,
        message: "memEmail or memName  is requested!",
      });
    }
    //unique key
    const existsResult = await database.query({
      text: `SELECT EXISTS (SELECT * FROM members WHERE "memEmail" = $1) `,
      values: [req.body.memEmail],
    });
    if (existsResult.rows[0].exists) {
      return res.json({
        regist: false,
        message: "memEmail or memName  is Exists!",
      });
    }

    const pwd = req.body.password;
    const saltround = 7;
    const pwdhash = await bcrypt.hash(pwd, saltround);

    const result = await database.query({
      text: `  INSERT INTO members ("memEmail","memName","memHash")
                        VALUES ($1,$2,$3) `,
      values: [req.body.memEmail, req.body.memName, pwdhash],
    });
    // const bodyData = req.body;
    // const datetime = new Date();
    // bodyData.createDate = datetime;
    res.json({ regist: true, message: "Regist is" });
  } catch (err) {
    return res.json({ regist: false, message: err });
  }
}

export const loginMember = async (req, res) => {
  console.log("POST /LOGIN MEMBER is requested!!");
  try {
    if (req.body.loginname == null || req.body.password == null) {
      return res.json({ login: false });
    }

    const existsResult = await database.query({
      text: `SELECT EXISTS (SELECT * FROM members WHERE "memEmail" = $1) `,
      values: [req.body.loginname],
    });
    
    if (!existsResult.rows[0].exists) {
      return res.json({ login: false });
    }

    const result = await database.query({
      text: `SELECT * FROM members WHERE "memEmail" = $1`,
      values: [req.body.loginname],
    });

    const loginok = await bcrypt.compare(
      req.body.password,
      result.rows[0].memHash
    );

    if (loginok) {
      const theuser = {
        memEmail: result.rows[0].memEmail,
        memName: result.rows[0].memName,
        dutyId: result.rows[0].dutyId,
      };
      
      const secret_key = process.env.SECRET_KEY;
      const token = jwt.sign(theuser, secret_key, { expiresIn: "1h" });
      
      res.cookie("token", token, {
        maxAge: 3600000,
        secure: true,
        sameSite: "none",
      });
      
      res.json({ 
        login: true,
        token,
        isAdmin: result.rows[0].dutyId === 'admin'
      });
    } else {
      res.clearCookie("token", {
        secure: true,
        sameSite: "none",
      });
      res.json({ login: false });
    }
  } catch (err) {
    return res.json({ login: false });
  }
};

export async function logoutMember(req, res) {
  console.log(`GOT /LOGOUT MEMBER is requested!!`);
  try {
      //  const loginok = await bcrypt.compare(
      //   req.body.password,
      //   result.rows[0].memHash
      // );

      //login ไม่สำเร็จ
      res.clearCookie("token", {
        // maxAge:3600000,
        secure: true,
        ameSite: "none",
      });
      res.json({ login: false });
  } 
  catch (err) {
        return res.json({ error: err });
  }
}

export async function uploadMember(req, res) {
  console.log("Upload Member Image")
   upload(req, res, (err) => {
       if (err) {
           return res.status(400).json({ message: err.message });
       }
       res.status(200).json({ message: 'File uploaded successfully!' });
   });
}
export async function getMemberProfile(req, res) {
  console.log("GET /MEMBER/PROFILE is requested!!");
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    
    const result = await database.query({
      text: `SELECT "memEmail", "memName", "dutyId" FROM members WHERE "memEmail" = $1`,
      values: [decoded.memEmail],
    });

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Member not found" });
    }

    res.json({
      success: true,
      profile: result.rows[0]
    });
  } catch (err) {
    console.error("Error fetching profile:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ฟังก์ชันใหม่สำหรับอัปเดตโปรไฟล์
export async function updateMemberProfile(req, res) {
  console.log("PUT /MEMBER/PROFILE is requested!!");
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const decoded = jwt.verify(token, process.env.SECRET_KEY);
      console.log("Decoded token:", decoded);
    
      // ตรวจสอบว่ามีการส่งข้อมูลที่ต้องการอัปเดตมาหรือไม่
      if (!req.body.memName) {
        return res.status(400).json({ error: "memName is required" });
      }

      // อัปเดตข้อมูลในฐานข้อมูล
      const result = await database.query({
        text: `UPDATE members SET "memName" = $1 WHERE "memEmail" = $2 RETURNING "memEmail", "memName", "dutyId"`,
        values: [req.body.memName, decoded.memEmail],
      });
      console.log("Database result:", result);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Member not found" });
      }

      // สร้าง token ใหม่ด้วยข้อมูลที่อัปเดต
      const updatedUser = {
        memEmail: result.rows[0].memEmail,
        memName: result.rows[0].memName,
        dutyId: result.rows[0].dutyId,
      };
    
      const newToken = jwt.sign(updatedUser, process.env.SECRET_KEY, { expiresIn: "1h" });

      // อัปเดต cookie
      res.cookie("token", newToken, {
        maxAge: 3600000,
        secure: true,
        sameSite: "none",
      });

      return res.json({
        success: true,
        message: "Profile updated successfully",
        token: newToken,
        profile: updatedUser
      });
    } catch (jwtError) {
      console.error("JWT verification error:", jwtError);
      return res.status(401).json({ error: "Invalid token" });
    }
  } catch (err) {
    console.error("Error updating profile:", err);
    return res.status(500).json({ error: err.message });
  }
}

// ฟังก์ชันใหม่สำหรับเปลี่ยนรหัสผ่าน
export async function changePassword(req, res) {
  console.log("PUT /MEMBER/PASSWORD is requested!!");
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const decoded = jwt.verify(token, process.env.SECRET_KEY);
      
      // ตรวจสอบข้อมูลที่ส่งมา
      if (!req.body.currentPassword || !req.body.newPassword) {
        return res.status(400).json({ error: "Current and new password are required" });
      }

      // ดึงข้อมูล member จากฐานข้อมูล โดยใช้ memEmail จาก request body
      const memberResult = await database.query({
        text: `SELECT * FROM members WHERE "memEmail" = $1`,
        values: [req.body.memEmail], // ใช้ req.body.memEmail แทน decoded.memEmail
      });

      if (memberResult.rows.length === 0) {
        return res.status(404).json({ error: "Member not found" });
      }

      // ตรวจสอบรหัสผ่านปัจจุบัน
      const passwordMatch = await bcrypt.compare(
        req.body.currentPassword,
        memberResult.rows[0].memHash
      );

      if (!passwordMatch) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }

      // เข้ารหัสรหัสผ่านใหม่
      const saltround = 7;
      const newHash = await bcrypt.hash(req.body.newPassword, saltround);

      // อัปเดตรหัสผ่านในฐานข้อมูล
      await database.query({
        text: `UPDATE members SET "memHash" = $1 WHERE "memEmail" = $2`,
        values: [newHash, req.body.memEmail], // ใช้ req.body.memEmail แทน decoded.memEmail
      });

      res.json({
        success: true,
        message: "Password changed successfully"
      });
    } catch (jwtError) {
      console.error("JWT verification error:", jwtError);
      return res.status(401).json({ error: "Invalid token" });
    }
  } catch (err) {
    console.error("Error changing password:", err);
    return res.status(500).json({ error: err.message });
  }
}
