import express from "express"
import { sendSession , openUrl , status , takePrice , countQuotes ,createTicketpaid , createTicketunpaid , createTicketDenied , monthlySubs , subsstatus , responseBalance, checkLoad , getId} from "../route/route.js"
const router = express.Router()


router.post("/pay" , sendSession)
router.post("/stripesession" , openUrl)
router.get('/status' , status)
router.post("/price" , takePrice)
router.get("/count" , countQuotes)
router.post("/ticket" , createTicketpaid)
router.post("/unpaid" , createTicketunpaid)
router.post("/denied" , createTicketDenied)
router.post("/monthly" , monthlySubs)
router.get("/sessionstatus" , subsstatus)
router.post("/passresponse" , responseBalance)
router.get("/load" , checkLoad)
router.post("/id" , getId)


export default router