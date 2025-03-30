import express from "express"
import database from "./service/database.js"
import dotnev from 'dotenv'
import cors from "cors"
//load body parser 
import bodyParser from "body-parser"

import  memberRoute from "./routes/memberRoute.js"
import  productRoute from "./routes/productRoute.js"
import  cartRoute from "./routes/cartRoute.js"

//import pkg from "pg"
//const {Pool} =pkg

// import ส่วนที่ติดตั้งเข้ามา
import swaggerUI from "swagger-ui-express"
import yaml from "yaml"
// ใช้ File
import fs from "fs"


dotnev.config()

const app = express()
//const port = 3000
const port =process.env.PORT

app.use(bodyParser.json())

app.use("/img_pd",express.static("img_pd"))

app.use("/img_mem",express.static("img_mem"))

// app.use(cors())
app.use(cors({
    origin:['http://localhost:5173','http://127.0.0.1:5173'],
    methods:['GET','POST','PUT','DELETE'],
    credentials:true
}))

app.use(productRoute)
app.use(memberRoute)
app.use(cartRoute)

// swagger
const swaggerfile = fs.readFileSync('service/swagger.yaml','utf-8')
const swaggerDoc = yaml.parse(swaggerfile)
// กำหนด path ที่จะให้เรียกหน้า Document ขึ้นมา
app.use('/api-docs',swaggerUI.serve,swaggerUI.setup(swaggerDoc))



app.get('/',(req,res)=>{
    console.log(`GET / requested`)
    res.status(200).json(
        {message:"Request OK"}
    )
})

app.listen(port,()=>{
    console.log(`Server is running on PORT:${port}`)
})