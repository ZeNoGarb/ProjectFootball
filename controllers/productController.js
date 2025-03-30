import database from "../service/database.js";

export async function getProductByBrandId(req, res) {
  console.log(`GET /productsByBrandId Brand_id${req.params.id} = is requested`);

  try {
    //const strQry='SELECT * FROM "products" ORDER BY "pdId" '
    const result = await database.query({
      text: `
                        SELECT p.*,

                                (
                                    SELECT row_to_json(pdt_obj)
                                    FROM (
                                        SELECT * FROM "pdTypes" WHERE "pdTypeid" = p."pdTypeid"
                                    )
                                    pdt_obj
                                ) AS pdt

                                FROM products p
                                WHERE p."brandId" ILIKE $1            
                        `,
      values: [req.params.id],
    });
    if (result.rowCount == 0)
      return res
        .status(404)
        .json({ error: `brand id${req.params.id} not found` });

    return res.status(200).json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export async function deleteProduct(req, res) {
  console.log(`DELETE /products id${req.params.id} = is requested`);

  try {
    const result = await database.query({
      text: `
                        DELETE FROM products
                        WHERE  "pdId"=$1         
                    `,
      values: [req.params.id],
    });
    if (result.rowCount == 0)
      return res.status(404).json({ error: `id${req.params.id} not found` });

    //return res.status(201).json({message:`delete success ${result.rowCount} rows`})
    return res.status(204).end();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export async function putProduct(req, res) {
  console.log(`PUT /products id${req.params.id} = is requested`);

  try {
    const result = await database.query({
      text: `
                        UPDATE "products" SET
                                "pdId"=$1 , 
                                "pdName"=$2 , 
                                "pdPrice"=$3 , 
                                "pdRemark"=$4 , 
                                "pdTypeid"=$5 , 
                                "brandId"=$6 

                        WHERE  "pdId"=$7         
                    `,
      values: [
        req.body.pdId,
        req.body.pdName,
        req.body.pdPrice,
        req.body.pdRemark,
        req.body.pdTypeid,
        req.body.brandId,
        req.params.id,
      ],
    });
    if (result.rowCount == 0)
      return res.status(404).json({ error: `id${req.params.id} not found` });

    const bodyData = req.body;
    const datetime = new Date();
    bodyData.updateDate = datetime;
    return res.status(201).json(bodyData);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export async function getProductById(req, res) {
  console.log(`GET /productsById id${req.params.id} = is requested`);

  try {
    //const strQry='SELECT * FROM "products" ORDER BY "pdId" '
    const result = await database.query({
      text: `
                        SELECT p.*,(
                                    SELECT row_to_json(brand_obj)
                                    FROM (
                                        SELECT * FROM brands WHERE "brandId" = p."brandId"
                                    )
                                    brand_obj
                                ) AS brand,

                                (
                                    SELECT row_to_json(pdt_obj)
                                    FROM (
                                        SELECT * FROM "pdTypes" WHERE "pdTypeid" = p."pdTypeid"
                                    )
                                    pdt_obj
                                ) AS pdt

                                FROM products p
                                WHERE p."pdId" = $1            
                        `,
      values: [req.params.id],
    });
    if (result.rowCount == 0)
      return res.status(404).json({ error: `id${req.params.id} not found` });

    return res.status(200).json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export async function getSearchProduct(req, res) {
  console.log(`GET /getSearchProduct id${req.params.id} = is requested`);

  try {
    //const strQry='SELECT * FROM "products" ORDER BY "pdId" '
    const result = await database.query({
      text: `
                         SELECT p.*,(
                                    SELECT row_to_json(brand_obj)
                                    FROM (
                                        SELECT * FROM brands WHERE "brandId" = p."brandId"
                                    )
                                    brand_obj
                                ) AS brand,

                                (
                                    SELECT row_to_json(pdt_obj)
                                    FROM (
                                        SELECT * FROM "pdTypes" WHERE "pdTypeid" = p."pdTypeid"
                                    )
                                    pdt_obj
                                ) AS pdt

                                FROM products p
                                WHERE (
										  p."pdId" ILIKE $1
										  OR  p."pdName" ILIKE $1
										  OR  p."pdRemark" ILIKE $1 )            
                        `,
      values: [`%${req.params.id}%`],
    });
    // if (result.rowCount == 0)
    //   return res.status(404).json({ error: `id${req.params.id} not found` });

    return res.status(200).json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export async function getAllProduct(req, res) {
  console.log(`GET /products requested`);
  try {
    //const strQry='SELECT * FROM "products" ORDER BY "pdId" '
    const result = await database.query(`
                SELECT p.*,(
	                    SELECT row_to_json(brand_obj)
	                    FROM (
		                    SELECT * FROM brands WHERE "brandId" = p."brandId"
	                    )
	                    brand_obj
                    ) AS brand,

                     (
	                    SELECT row_to_json(pdt_obj)
	                    FROM (
		                    SELECT * FROM "pdTypes" WHERE "pdTypeid" = p."pdTypeid"
	                    )
	                    pdt_obj
                    ) AS pdt

                    FROM products p                
                `);
    return res.status(200).json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export async function getTenProduct(req, res) {
  console.log(`GET /Ten products is requested`);
  try {
    //const strQry='SELECT * FROM "products" ORDER BY "pdId" '
    const result = await database.query(`
               SELECT p.*,(
                       SELECT row_to_json(brand_obj)
                       FROM (
                           SELECT * FROM brands WHERE "brandId" = p."brandId"
                       )
                       brand_obj
                   ) AS brand,

                    (
                       SELECT row_to_json(pdt_obj)
                       FROM (
                           SELECT * FROM "pdTypes" WHERE "pdTypeid" = p."pdTypeid"
                       )
                       pdt_obj
                   ) AS pdt

                   FROM products p LIMIT 50              
               `);
    return res.status(200).json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export async function postProduct(req, res) {
  console.log("POST /products is requested!!");
  try {
    //not null
    if (req.body.pdId == null || req.body.pdName == null) {
      return res.status(422).json({ error: "pdId and pdName is required." });
    }
    //unique key
    const existsResult = await database.query({
      text: `SELECT EXISTS (SELECT * FROM products WHERE "pdId" = $1) `,
      values: [req.body.pdId],
    });
    if (existsResult.rows[0].exists) {
      return res
        .status(409)
        .json({ error: `pdId ${req.body.pdId} is Exists!` });
    }

    const result = await database.query({
      text: `  INSERT INTO products ("pdId","pdName","pdPrice","pdTypeid","brandId")
                        VALUES ($1,$2,$3,$4,$5) `,
      values: [
        req.body.pdId,
        req.body.pdName,
        req.body.pdPrice,
        req.body.pdTypeid,
        req.body.brandId,
      ],
    });
    const bodyData = req.body;
    const datetime = new Date();
    bodyData.createDate = datetime;
    res.status(201).json(bodyData);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
  
}
export async function deletestockAll(req, res) {
  console.log(`DELETE /stockAlls itemId ${req.params.itemId} = is requested`);

  try {
    const result = await database.query({
      text: `
        DELETE FROM "stockAll"
        WHERE "itemId" = $1        
      `,
      values: [req.params.itemId],
    });

    if (result.rowCount === 0) {
      return res.status(404).json({ error: `itemId ${req.params.itemId} not found` });
    }

    return res.status(204).end();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}


export async function putstockAll(req, res) {
  console.log(`PUT /stockAlls itemId ${req.params.itemId} = is requested`);

  try {
    const result = await database.query({
      text: `
        UPDATE "stockAll" SET
          "itemId" = $1,
          "itemName" = $2,
          "itemPrice" = $3,
          "itemRemark" = $4,
          "stockId" = $5,
          "brandId" = $6
        WHERE "itemId" = $7        
      `,
      values: [
        req.body.itemId,
        req.body.itemName,
        req.body.itemPrice,
        req.body.itemRemark,
        req.body.stockId,
        req.body.brandId,
     
      ],
    });

    if (result.rowCount === 0) {
      return res.status(404).json({ error: `ID ${req.params.itemId} not found` });
    }

    const bodyData = req.body;
    bodyData.updateDate = new Date(); // เพิ่ม timestamp เวลาปรับปรุง
    return res.status(200).json(bodyData);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}


export async function poststockAll(req, res) {
  console.log("POST /stockAlls is requested!!");
  console.log("Received Data:", req.body);

  try {
    const { pdId, pdName, pdPrice, pdRemark, pdTypeid, brandId } = req.body;

    // ตรวจสอบค่าที่จำเป็นต้องมี
    if (!pdId || !pdName || !pdPrice || !pdTypeid || !brandId) {
      return res.status(422).json({ error: "Missing required fields." });
    }

    // ตรวจสอบว่า pdId ซ้ำหรือไม่
    const existsResult = await database.query({
      text: `SELECT EXISTS (SELECT * FROM "products" WHERE "pdId" = $1)`,
      values: [pdId],
    });

    if (existsResult.rows[0].exists) {
      return res.status(409).json({ error: `pdId ${pdId} already exists!` });
    }

    // เพิ่มข้อมูลใหม่ลงใน products
    const result = await database.query({
      text: `  
        INSERT INTO "products" ("pdId", "pdName", "pdPrice", "pdRemark", "pdTypeid", "brandId")
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *;
      `,
      values: [pdId, pdName, pdPrice, pdRemark, pdTypeid, brandId],
    });

    // ส่งข้อมูลที่เพิ่มกลับไป
    res.status(201).json({ product: result.rows[0], message: "Product added successfully!" });
  } catch (err) {
    console.error("Database error:", err);
    return res.status(500).json({ error: err.message });
  }
}
