// auth.middleware.js - Middleware สำหรับตรวจสอบการยืนยันตัวตนของแอดมิน

const jwt = require('jsonwebtoken');
const Admin = require('../models/admin.model');
const config = require('../config');

// Middleware ตรวจสอบ token ของแอดมิน
exports.verifyAdminToken = async (req, res, next) => {
  try {
    // ดึง token จาก Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'ไม่พบ Token หรือรูปแบบ Token ไม่ถูกต้อง'
      });
    }

    const token = authHeader.split(' ')[1];

    // ตรวจสอบความถูกต้องของ token
    const decoded = jwt.verify(token, config.JWT_SECRET);

    // ตรวจสอบว่าเป็น token ของแอดมินหรือไม่
    if (!decoded.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'ไม่มีสิทธิ์เข้าถึงส่วนนี้'
      });
    }

    // ค้นหาแอดมินจากฐานข้อมูล
    const admin = await Admin.findById(decoded.id).select('-password');

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'ไม่พบข้อมูลแอดมิน'
      });
    }

    // เก็บข้อมูลแอดมินไว้ใน request
    req.admin = {
      id: admin._id,
      adminId: admin.adminId,
      name: admin.name,
      email: admin.email,
      role: admin.role
    };

    next();
  } catch (error) {
    console.error('Token verification error:', error);

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token หมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง'
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token ไม่ถูกต้อง'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการตรวจสอบ Token',
      error: error.message
    });
  }
};

// Middleware ตรวจสอบสิทธิ์ของแอดมิน (สำหรับแอดมินระดับสูงเท่านั้น)
exports.isAdminSuperUser = (req, res, next) => {
  if (req.admin && req.admin.role === 'superadmin') {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: 'ไม่มีสิทธิ์เข้าถึงส่วนนี้ เฉพาะผู้ดูแลระบบระดับสูงเท่านั้น'
    });
  }
};

// Middleware ตรวจสอบ token ของผู้ใช้ทั่วไป
exports.verifyToken = async (req, res, next) => {
  try {
    // ดึง token จาก Authorization header หรือ cookie
    let token;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'ไม่พบ Token กรุณาเข้าสู่ระบบ'
      });
    }

    // ตรวจสอบความถูกต้องของ token
    const decoded = jwt.verify(token, config.JWT_SECRET);

    // ค้นหาผู้ใช้จากฐานข้อมูล
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'ไม่พบข้อมูลผู้ใช้'
      });
    }

    // ตรวจสอบว่าบัญชีผู้ใช้ถูกระงับหรือไม่
    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        message: 'บัญชีผู้ใช้ถูกระงับ กรุณาติดต่อผู้ดูแลระบบ'
      });
    }

    // เก็บข้อมูลผู้ใช้ไว้ใน request
    req.user = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    };

    next();
  } catch (error) {
    console.error('Token verification error:', error);

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token หมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง'
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token ไม่ถูกต้อง'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการตรวจสอบ Token',
      error: error.message
    });
  }
};

// Middleware สำหรับตรวจสอบว่าผู้ใช้มีสิทธิ์เข้าถึงข้อมูลหรือไม่ (โดยตรวจสอบจาก ID ของผู้ใช้)
exports.checkUserOwnership = (req, res, next) => {
  // ตรวจสอบว่า ID ในคำขอตรงกับ ID ของผู้ใช้ที่เข้าสู่ระบบหรือไม่
  if (req.user.id === req.params.id || req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: 'ไม่มีสิทธิ์เข้าถึงข้อมูลนี้'
    });
  }
};

// Middleware สำหรับตรวจสอบว่าผู้ใช้เป็นเจ้าของคำสั่งซื้อหรือไม่
exports.checkOrderOwnership = async (req, res, next) => {
  try {
    const orderId = req.params.id;
    const userId = req.user.id;
    
    // ถ้าเป็นแอดมิน ให้ผ่านไปได้เลย
    if (req.user.role === 'admin') {
      return next();
    }
    
    // ค้นหาคำสั่งซื้อ
    const order = await Order.findById(orderId);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบคำสั่งซื้อ'
      });
    }
    
    // ตรวจสอบว่าผู้ใช้เป็นเจ้าของคำสั่งซื้อหรือไม่
    if (order.user.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'ไม่มีสิทธิ์เข้าถึงคำสั่งซื้อนี้'
      });
    }
    
    next();
  } catch (error) {
    console.error('Error checking order ownership:', error);
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์',
      error: error.message
    });
  }
};

module.exports = exports;