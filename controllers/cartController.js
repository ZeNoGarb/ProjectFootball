import database from "../service/database.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export async function chkCart(req, res) {
  console.log(`POST CART customer ${req.body.memEmail} is requested`);
  // ก่อนจะ Excuese Query ทำการ Validate Data ก่อน
  if (req.body.memEmail == null) {
    return res.json({ error: true, errormessage: "member Email is required" });
  }

  const result = await database.query({
    text: `SELECT * FROM carts WHERE "cusId" = $1 AND "cartCf" !=true `,
    values: [req.body.memEmail],
  });
  if (result.rows[0] != null) {
    return res.json({ cartExist: true, cartId: result.rows[0].cartId });
  } else {
    return res.json({ cartExist: false });
  }
}

export async function postCart(req, res) {
  console.log(`POST /CART is requested `);
  // const bodyData=req.body
  try {
    // ก่อนจะ Excuese Query ทำการ Validate Data ก่อน
    if (req.body.cusId == null) {
      return res.json({
        cartOK: false,
        messageAddCart: "Customer Id is required",
      });
    }
    // Gen ID
    // จัดรูปแบบวันที่ YYYYMMDD
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0"); // เดือนเริ่มจาก 0 ดังนั้นต้องบวก 1
    const day = String(now.getDate()).padStart(2, "0");
    const currentDate = `${year}${month}${day}`;

    let i = 0;
    let theId = "";
    let existsResult = [];
    // ทำการวน Loop หา id ที่ยังไม่มีในตะกร้า
    do {
      i++;
      theId = `${currentDate}${String(i).padStart(4, "0")}`;
      existsResult = await database.query({
        text: 'SELECT EXISTS (SELECT * FROM carts WHERE "cartId" = $1) ',
        values: [theId],
      });
    } while (existsResult.rows[0].exists);
    // ได้ id แล้ว ทำการบันทึกข้อมูลลงตะกร้า
    const result = await database.query({
      text: ` INSERT INTO carts ("cartId", "cusId", "cartDate")
                      VALUES ($1,$2,$3) `,
      values: [
        theId, //$1 รหัสที่ Gen มา
        req.body.cusId, //$2 รหัสที่ส่งมาจาก Frontend
        now, //$3 วันปัจจุบัน
      ],
    });

    return res.json({ cartOK: true, messageAddCart: theId });
  } catch (err) {
    return res.json({ cartOK: false, messageAddCart: err.message });
  }
}

export async function postCartDtl(req, res) {
  console.log(`POST /CARTDETAIL is requested `);
  try {
    // ก่อนจะ Excuese Query ทำการ Validate Data ก่อน
    if (
      req.body.cartId == null ||
      req.body.pdId == null ||
      req.body.pdPrice == null
    ) {
      return res.json({
        cartDtlOK: false,
        messageAddCartDtl: "CartId && ProductID  && Price  is required",
      });
    }
    // ดูว่ามี Product เดิมอยู่่หรือไม่
    const pdResult = await database.query({
      text: `  SELECT * FROM "cartDtl" ctd WHERE ctd."cartId" = $1 AND ctd."pdId" = $2 `,
      values: [req.body.cartId, req.body.pdId], //ค่า Parameter ที่ส่งมา
    });
    if (pdResult.rowCount == 0) {
      // ถ้าไม่มีให้ INSERT
      try {
        const result = await database.query({
          text: ` INSERT INTO "cartDtl" ("cartId", "pdId", "qty","price")
                              VALUES ($1,$2,$3,$4) `,
          values: [req.body.cartId, req.body.pdId, 1, req.body.pdPrice],
        });
        return res.json({ cartDtlOK: true, messageAddCart: req.body.cartId });
      } catch (err) {
        return res.json({
          cartDtlOK: false,
          messageAddCartDtl: "INSERT DETAIL ERROR",
        });
      }
    } else {
      // ถ้ามีแล้วให้ UPDATE
      try {
        const result = await database.query({
          text: ` UPDATE "cartDtl" SET "qty" = $1
                              WHERE "cartId" = $2
                              AND "pdId" = $3 `,
          values: [pdResult.rows[0].qty + 1, req.body.cartId, req.body.pdId],
        });
        return res.json({ cartDtlOK: true, messageAddCart: req.body.cartId });
      } catch (err) {
        return res.json({
          cartDtlOK: false,
          messageAddCartDtl: "INSERT DETAIL ERROR",
        });
      }
    }
  } catch (err) {
    return res.json({
      cartDtlOK: false,
      messageAddCartDtl: "INSERT DETAIL ERROR",
    });
  }
}

export async function sumCart(req, res) {
  console.log(`GET SumCart ${req.params.id} is requested `);
  const result = await database.query({
    text: `  SELECT SUM(qty) AS qty,SUM(qty*price) AS money
                FROM "cartDtl" ctd
                WHERE ctd."cartId" = $1`,
    values: [req.params.id], //ค่า Parameter ที่ส่งมา
  });
  console.log(result.rows[0]);
  return res.json({
    id: req.params.id,
    qty: result.rows[0].qty,
    money: result.rows[0].money,
  });
}

export async function getCart(req, res) {
  console.log(`GET Cart is Requested`)
  try {
      const result = await database.query({
          text:`  SELECT ct.*, SUM(ctd.qty) AS sqty,SUM(ctd.price*ctd.qty) AS sprice
                  FROM carts ct LEFT JOIN "cartDtl" ctd ON ct."cartId" = ctd."cartId"
                  WHERE ct."cartId"=$1
                  GROUP BY ct."cartId" ` ,
          values:[req.params.id]
      })
      console.log(`id=${req.params.id} \n`+result.rows[0])
      return res.json(result.rows)
  }
  catch (err) {
      return res.json({
          error: err.message
      })
  }
}

export async function getCartDtl(req, res) {
  console.log(`GET CartDtl is Requested`)
  try {
      const result = await database.query({
      text:`  SELECT  ROW_NUMBER() OVER (ORDER BY ctd."pdId") AS row_number,
                      ctd."pdId",pd."pdName",ctd.qty,ctd.price
              FROM    "cartDtl" ctd LEFT JOIN "products" pd ON ctd."pdId" = pd."pdId"  
              WHERE ctd."cartId" =$1
              ORDER BY ctd."pdId" ` ,
          values:[req.params.id]
      })
      console.log(`id=${req.params.id} \n`+result.rows[0])
      return res.json(result.rows)
  }
  catch (err) {
      return res.json({
          error: err.message
      })
  }
}

export async function getCartByCus(req, res) {
  console.log(`POST Cart By Customer is Requested`)
  try {
      const result = await database.query({
          text:`  SELECT ROW_NUMBER() OVER (ORDER BY ct."cartId" DESC) AS row_number,
                          ct.*, SUM(ctd.qty) AS sqty,SUM(ctd.price*ctd.qty) AS sprice
                  FROM carts ct LEFT JOIN "cartDtl" ctd ON ct."cartId" = ctd."cartId"
                  WHERE ct."cusId"=$1
                  GROUP BY ct."cartId"
                  ORDER BY ct."cartId" DESC` ,
          values:[req.body.id]
      })
      console.log(`id=${req.body.id} \n`+result.rows[0])
      return res.json(result.rows)
  }
  catch (err) {
      return res.json({
          error: err.message
      })
  }
  
}
// เพิ่มฟังก์ชันเหล่านี้ในไฟล์ cartController.js

// ฟังก์ชันลบสินค้าออกจากตะกร้า
export async function deleteItem(req, res) {
  console.log(`DELETE Item from Cart ${req.params.cartId}, row ${req.params.rowNumber} is requested`);
  try {
    const cartId = req.params.cartId;
    const rowNumber = req.params.rowNumber;
    
    // ดึงข้อมูลสินค้าตาม row_number
    const getItemResult = await database.query({
      text: `SELECT "pdId" FROM (
              SELECT ROW_NUMBER() OVER (ORDER BY ctd."pdId") AS row_number, ctd."pdId"
              FROM "cartDtl" ctd
              WHERE ctd."cartId" = $1
              ORDER BY ctd."pdId"
            ) AS numbered_rows
            WHERE row_number = $2`,
      values: [cartId, rowNumber]
    });
    
    if (getItemResult.rows.length === 0) {
      return res.json({
        success: false,
        message: "สินค้าไม่พบในตะกร้า"
      });
    }
    
    const pdId = getItemResult.rows[0].pdId;
    
    // ลบสินค้าจากตะกร้า
    const deleteResult = await database.query({
      text: `DELETE FROM "cartDtl" 
             WHERE "cartId" = $1 AND "pdId" = $2`,
      values: [cartId, pdId]
    });
    
    return res.json({
      success: true,
      message: "ลบสินค้าสำเร็จ"
    });
  }
  catch (err) {
    console.error("Error in deleteItem:", err);
    return res.json({
      success: false,
      message: err.message
    });
  }
}

// ฟังก์ชันลบตะกร้าสินค้า
export async function deleteCart(req, res) {
  console.log(`DELETE Cart ${req.params.cartId} is requested`);
  try {
    const cartId = req.params.cartId;
    
    // ลบสินค้าในตะกร้าก่อน
    await database.query({
      text: `DELETE FROM "cartDtl" WHERE "cartId" = $1`,
      values: [cartId]
    });
    
    // ลบตะกร้า
    await database.query({
      text: `DELETE FROM carts WHERE "cartId" = $1`,
      values: [cartId]
    });
    
    return res.json({
      success: true,
      message: "ลบตะกร้าสำเร็จ"
    });
  }
  catch (err) {
    console.error("Error in deleteCart:", err);
    return res.json({
      success: false,
      message: err.message
    });
  }
}

// ฟังก์ชันยืนยันคำสั่งซื้อ (สร้างออร์เดอร์)
export async function confirmOrder(req, res) {
  console.log(`POST Confirm Order for cart ${req.body.cartId} is requested`);
  try {
    const { cartId, cusId, status } = req.body;
    
    // ตรวจสอบว่ามีสินค้าในตะกร้าหรือไม่
    const checkCartResult = await database.query({
      text: `SELECT COUNT(*) FROM "cartDtl" WHERE "cartId" = $1`,
      values: [cartId]
    });
    
    if (parseInt(checkCartResult.rows[0].count) === 0) {
      return res.json({
        success: false,
        message: "ไม่มีสินค้าในตะกร้า"
      });
    }
    
    // อัปเดตสถานะตะกร้าเป็นยืนยันแล้ว
    await database.query({
      text: `UPDATE carts SET "cartCf" = true WHERE "cartId" = $1`,
      values: [cartId]
    });
    
    // สร้าง ID สำหรับออร์เดอร์ (สามารถปรับเปลี่ยนตามความต้องการ)
    // จัดรูปแบบวันที่ YYYYMMDD
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const currentDate = `${year}${month}${day}`;

    // สร้าง order ID แบบ YYYYMMDD#### เหมือนกับ cart ID
    let i = 0;
    let orderId = "";
    let existsResult = [];
    
    do {
      i++;
      orderId = `OR${currentDate}${String(i).padStart(4, "0")}`;
      existsResult = await database.query({
        text: 'SELECT EXISTS (SELECT * FROM orders WHERE "orderId" = $1) ',
        values: [orderId],
      });
    } while (existsResult.rows[0].exists);
    
    // เพิ่มข้อมูลในตาราง orders (ต้องปรับให้ตรงกับโครงสร้างตารางจริง)
    await database.query({
      text: `INSERT INTO orders ("orderId", "cartId", "cusId", "status", "orderDate")
             VALUES ($1, $2, $3, $4, $5)`,
      values: [orderId, cartId, cusId, status, now]
    });
    
    return res.json({
      success: true,
      message: "ยืนยันคำสั่งซื้อสำเร็จ",
      orderId: orderId
    });
  }
  catch (err) {
    console.error("Error in confirmOrder:", err);
    return res.json({
      success: false,
      message: err.message
    });
  }
}



