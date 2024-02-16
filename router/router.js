import express from "express"
import { sendSession , openUrl , status , takePrice , countQuotes ,createTicketpaid , createTicketunpaid , createTicketDenied , monthlySubs , subsstatus , responseBalance, checkLoad , getId , getSubs ,cancelSubscription , checkTickets , createTicketSubsCancel} from "../route/route.js"
const router = express.Router()


router.post("/pay" , sendSession)
router.post("/stripesession" , openUrl)
router.get('/status' , status)
router.post("/price" , takePrice)
router.get("/count" , countQuotes)
router.post("/ticketcreate" , createTicketpaid)
router.post("/unpaid" , createTicketunpaid)
router.post("/denied" , createTicketDenied)
router.post("/monthly" , monthlySubs)
router.get("/sessionstatus" , subsstatus)
router.post("/passresponse" , responseBalance)
router.get("/load" , checkLoad)
router.post("/id" , getId)
router.post("/subs" ,getSubs )
router.get("/ticket" , checkTickets)
router.post("/cancel" , cancelSubscription)
router.post("/cancelticket" , createTicketSubsCancel)

export default router