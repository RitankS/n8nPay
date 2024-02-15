import express from "express"
import payments from "./router/router.js"
import cors from "cors"
const app = express()
const port = 3110
app.use(cors())
app.use(express.json())




app.use("/payments" , payments)








app.listen(port, ()=>{
    console.log("App is listening fine !!")
})