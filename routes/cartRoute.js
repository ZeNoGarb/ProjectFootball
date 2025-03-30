import express from "express"
import * as cartC from "../controllers/cartController.js"

const router = express.Router()

// Routes ที่มีอยู่เดิม
router.post('/carts/chkcart', cartC.chkCart)
router.post('/carts/addcart', cartC.postCart)
router.post('/carts/addcartdtl', cartC.postCartDtl)
router.get('/carts/sumcart/:id', cartC.sumCart)
router.get('/carts/getcart/:id', cartC.getCart)
router.get('/carts/getcartdtl/:id', cartC.getCartDtl)
router.post('/carts/getcartbycus', cartC.getCartByCus)

// Routes ใหม่ที่ต้องเพิ่ม
router.delete('/carts/deleteItem/:cartId/:rowNumber', cartC.deleteItem)
router.delete('/carts/deleteCart/:cartId', cartC.deleteCart)
router.post('/orders/create', cartC.confirmOrder)
router.post('/create', async (req, res) => {
    try {
      const { memEmail, cartDate, remark } = req.body;
      
      const result = await db.query(`
        INSERT INTO carts ("memEmail", "cartDate", "remark")
        VALUES ($1, $2, $3) 
        RETURNING "cartId"
      `, [memEmail, cartDate, remark]);
      
      res.json({ 
        success: true,
        cartId: result.rows[0].cartId
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  });
  
  // อัปเดตตะกร้า
  router.put('/update/:cartId', async (req, res) => {
    try {
      const { cartDate, remark } = req.body;
      const { cartId } = req.params;
      
      await db.query(`
        UPDATE carts 
        SET "cartDate" = $1, "remark" = $2
        WHERE "cartId" = $3
      `, [cartDate, remark, cartId]);
      
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

export default router