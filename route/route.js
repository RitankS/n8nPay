import stripe from "stripe"
import CircularJSON from "circular-json"
import open from "open"
import cron from "node-cron"
import { triggerFlow } from "../router/n8n.js"
import { updateStatus , startpay , cancelSubscriptionFlow} from "../router/n8n.js"
const STRIPE_KEY = 'sk_test_51Nv0dVSHUS8UbeVicJZf3XZJf72DL9Fs3HP1rXnQzHtaXxMKXwWfua2zi8LQjmmboeNJc3odYs7cvT9Q5YIChY5I00Pocly1O1'


//creating the priceID in stripe and getting the product details and saving into priceID

let priceId;
export const takePrice = async (req, res) => {
  const Stripe = new stripe(STRIPE_KEY)
  const { price, name , custName} = req.body
  const newPrice = Math.ceil(parseFloat(price))
  console.log("new price is", newPrice)
  console.log("customer is ", custName)
  try {
    const customer = await Stripe.customers.create({
      name: custName,
    });
    const custId = customer.id
    console.log(custId)
    const newprice = await Stripe.prices.create({
      currency: 'inr',
      unit_amount: newPrice * 100,
      product_data: {
        name: name,
      },
    });
    priceId = newprice.id
    res.status(200).json(CircularJSON.stringify({ newprice }))

  }
  catch (error) {
    res.status(500).json(CircularJSON.stringify({ error: error.message }))
  }
}


//generating the session for the subscritption type payments and passing the id to sessionsID
let subssessionsId;
let custId;
export const monthlySubs = async(req,res)=>{
  const Stripe = new stripe(STRIPE_KEY)
  const {custName , price , name} = req.body
  const newPrice = Math.ceil(parseFloat(price))
  
  try{
    const customer = await Stripe.customers.create({
      name: custName,
    });
    custId = customer.id
    console.log(custId)
    const newprice = await Stripe.prices.create({
      currency: 'inr',
      unit_amount: newPrice * 100,
      recurring: {
        interval: 'month',
      },
      product_data: {
        name: name,
      },
    });
    priceId = newprice.id
    const session = await Stripe.checkout.sessions.create({
      customer: custId,
      success_url: 'http://localhost:3110/payments/sessionstatus',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
    });
    subssessionsId = session.id
    console.log(subssessionsId)
    res.status(200).json(CircularJSON.stringify({session}))
  }
  catch(error){
    res.status(500).json(CircularJSON.stringify({error: error.message}))
  }
}


//sending the session of the one type payments
let sessionsId;
export const sendSession = async (req, res) => {
  const Stripe = new stripe(STRIPE_KEY)
  const {priceId} = req.body
  try {

    const session = await Stripe.checkout.sessions.create({
      success_url: 'http://localhost:3110/payments/status',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'payment',
    });
    sessionsId = session.id
    res.status(200).json(CircularJSON.stringify({ session }))
    const paymentUrl = session.url
    const sessionId = session.id
    console.log(paymentUrl, sessionId)
  }
  catch (error) {
    res.status(500).json(CircularJSON.stringify({ error: error.message }))
    console.log(error)
  }
}


//opening the url in another browser
export const openUrl = async (req, res) => {
  try {
    const url = req.body.url; // Access the `url` property within `req.body`

    console.log("url is ", url);

    await open(url, { app: { name: 'Chrome' } }); // Specify the browser app

    console.log(`Opened ${url} in the default browser.`);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error(`Error opening ${url}:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};




//keeping the check on the Quotes created in the database
let count = -1
let newCount
export const countQuotes = async (req, res) => {
  try {
    const response = await fetch('https://webservices24.autotask.net/atservicesrest/v1.0/Quotes/query?search={ "filter":[{"op" : "exist", "field" : "id" }]}', {
      method: 'GET',
      headers: {
        "ApiIntegrationCode": 'FPN24RSGC2MFCSZ6SX5BAJJKWNG',
        'UserName': 'gg3ebdptems75sb@bask.com',
        'Secret': '6y*SZ@8s#1jNYq~7z3G$Xi$50',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch quotes');
    }

    const data = await response.json();
    newCount = (data.items.length) + 1

    if (newCount > count) {
      triggerFlow(newCount)
      count = newCount
    }
    else if (newCount == count) {
      console.log("No new Quote")
    }
    else {
      console.log("Quote Deleted")
    }
    console.log(count)
    res.status(200).json(CircularJSON.stringify({ data }))
  }
  catch (error) {
    res.status(500).json(CircularJSON.stringify({ error: error.message }))
    console.log(error)
  }
}


//status check for the one time payment
export const status = async (req, res) => {
  const Stripe = new stripe(STRIPE_KEY)
  try {
    const session = await Stripe.checkout.sessions.retrieve(
      sessionsId
    );
    const payStatus = session.payment_status
    if (payStatus === 'paid') {
      updateStatus(payStatus, count)
    } else {
      updateStatus("unpaid", count)
    }
    console.log(payStatus)
    res.status(200).json(CircularJSON.stringify({ payStatus }))
  }
  catch (error) {
    res.status(500).json(CircularJSON.stringify({ error: error.message }))
  }
}

//status check for the subscription type payments 
export const subsstatus = async (req, res) => {
  const Stripe = new stripe(STRIPE_KEY)
  try {
    const session = await Stripe.checkout.sessions.retrieve(
      subssessionsId
    );
    const payStatus = session.payment_status
    if (payStatus === 'paid') {
      updateStatus(payStatus, count , custId)
    } else {
      updateStatus("unpaid", count , custId)
    }
    console.log(payStatus)
    res.status(200).json(CircularJSON.stringify({payStatus }))
  }
  catch (error) {
    res.status(500).json(CircularJSON.stringify({ error: error.message }))
  }
}

//creating the ticket for the paid Quotes
export const createTicketpaid = async (req, res) => {
  const { companyID, title , customerId} = req.body;
  console.log(companyID, title , customerId);
  
  try {
    const payload = {
      companyID,
      dueDateTime: new Date(),
      priority: 1,
      status: 1,
      title,
      queueID: 5,
      description: `customer id for this payment is :- ${customerId}`
    };

    const response = await fetch('https://webservices24.autotask.net/atservicesrest/v1.0/Tickets', {
      method: 'POST',
      headers: {
        "ApiIntegrationCode": 'FPN24RSGC2MFCSZ6SX5BAJJKWNG',
        'UserName': 'gg3ebdptems75sb@bask.com',
        'Secret': '6y*SZ@8s#1jNYq~7z3G$Xi$50',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload) 
    });

    const responseData = await response.json();
    console.log(responseData);
    res.status(200).json(responseData); // Sending the response data directly
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};


//creating the tickets for the unpaid tickets
export const createTicketunpaid = async (req, res) => {
  const { companyID, title} = req.body;
  console.log(companyID, title);
  
  try {
    const payload = {
      companyID,
      dueDateTime: new Date(),
      priority: 2,
      status: 5,
      title,
      queueID: 6
    };

    const response = await fetch('https://webservices24.autotask.net/atservicesrest/v1.0/Tickets', {
      method: 'POST',
      headers: {
        "ApiIntegrationCode": 'FPN24RSGC2MFCSZ6SX5BAJJKWNG',
        'UserName': 'gg3ebdptems75sb@bask.com',
        'Secret': '6y*SZ@8s#1jNYq~7z3G$Xi$50',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload) 
    });

    const responseData = await response.json();
    console.log(responseData);
    res.status(200).json(responseData); // Sending the response data directly
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};


//creatinf the tickets for the denied quotes
export const createTicketDenied = async (req, res) => {
  const { companyID, title} = req.body;
  console.log(companyID, title);
  
  try {
    const payload = {
      companyID,
      dueDateTime: new Date(),
      priority: 2,
      status: 5,
      title,
      queueID: 6
    };

    const response = await fetch('https://webservices24.autotask.net/atservicesrest/v1.0/Tickets', {
      method: 'POST',
      headers: {
        "ApiIntegrationCode": 'FPN24RSGC2MFCSZ6SX5BAJJKWNG',
        'UserName': 'gg3ebdptems75sb@bask.com',
        'Secret': '6y*SZ@8s#1jNYq~7z3G$Xi$50',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload) 
    });

    const responseData = await response.json();
    console.log(responseData);
    res.status(200).json(responseData); // Sending the response data directly
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};




//creating a small n8n loadbalancer
export const responseBalance = async(req,res)=>{
  try{
       const {status} = req.body
       console.log(status)
       res.status(200).json(CircularJSON.stringify({status}))
  }
  catch(error){
    res.status(500).json(CircularJSON.stringify({error: error.message}))
  }
}


let ID
export const getId = async(req,res)=>{
  try{
    const {id} = req.body
    console.log(id)
    ID = id
  }
  catch(error){
      res.status(500).json(CircularJSON.stringify({error: error.message}))
  }
}


export const checkLoad = async () => {
  let desiredStat;
  console.log("id is", ID);
  try {
    const response = await fetch(`https://webservices24.autotask.net/atservicesrest/v1.0/Quotes/${ID}`, {
      method: 'GET',
      headers: {
        "ApiIntegrationCode": 'FPN24RSGC2MFCSZ6SX5BAJJKWNG',
        'UserName': 'gg3ebdptems75sb@bask.com',
        'Secret': '6y*SZ@8s#1jNYq~7z3G$Xi$50',
        'Content-Type': 'application/json'
      }
    });
    if (response.ok) {
      const responseData = await response.json();
      const extApprovalContactResponse = responseData.item.extApprovalContactResponse;
      desiredStat = extApprovalContactResponse;
      console.log("this is running every second", desiredStat, responseData.item.id);
      if (desiredStat !== null) {
        startpay(desiredStat, responseData.item.id);
        console.log("sent");
        ID= null; // Move this line inside the if block
      } else {
        console.log("status is null");
      }
      console.log(extApprovalContactResponse);
    } else {
      console.log("Not Found");
    }
  } catch (error) {
    console.error("Error occurred while running checkLoad:", error.message);
  }
};


//subscription cacellation using the Autotask ticket
let subsId;
export const getSubs = async (req, res) => {
  const Stripe = new stripe(STRIPE_KEY);
  try {
    const { custId , comapnyId } = req.body;
    const subscriptions = await Stripe.subscriptions.list({
      customer: custId,
      limit: 1,
    });

    // Check if there is any data in the subscriptions response
    if (subscriptions.data && subscriptions.data.length > 0) {
       subsId = subscriptions.data[0].id; // Accessing the id from the first element
      console.log("the subscriber's ID is:", subsId);
      res.status(200).json({ id: subsId , comapnyId}); // Sending just the ID in the response
    } else {
      res.status(404).json({ error: "No subscriptions found for the provided customer ID" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


const processedTicketIds = new Set(); // Initialize a set to store processed ticket IDs
let ticketId
export const checkTickets = async (req, res) => {
  try {
    const response = await fetch(`https://webservices24.autotask.net/atservicesrest/v1.0/Tickets/query?search={"filter":[{"op":"exist","field":"id"}]}`, {
      method: 'GET',
      headers: {
        "ApiIntegrationCode": 'FPN24RSGC2MFCSZ6SX5BAJJKWNG',
        'UserName': 'gg3ebdptems75sb@bask.com',
        'Secret': '6y*SZ@8s#1jNYq~7z3G$Xi$50',
        'Content-Type': 'application/json'
      }
    });

    if (response && response.ok) {
      const responseData = await response.json();
      const tickets = responseData.items;
      
      for (const ticket of tickets) {
        if (ticket.title.toLowerCase().includes('unsubscribe')) {
          ticketId = ticket.id;
          if (!processedTicketIds.has(ticketId)) { // Check if the ticket ID has not been processed
            // Call your function with the ticketId
            console.log(ticketId);
            secondLoadBalancer(ticketId)
            processedTicketIds.add(ticketId); // Add the processed ticket ID to the set
          }
        }
      }
    } else {
      console.error('Failed to fetch tickets');
    }
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ error: error.message });
  }
}



//cancel subscription 
export const cancelSubscription = async(req,res)=>{
  const Stripe = new stripe(STRIPE_KEY);
  const {subsId , companyId}= req.body
  try{
    const subscription = await Stripe.subscriptions.cancel(
      subsId
    );
    res.status(200).json(CircularJSON.stringify({subscription , companyId}))
  }
  catch(error){
    res.status(500).json(CircularJSON.stringify({error: error.message}))
  }
}

export const createTicketSubsCancel = async (req, res) => {
  const { companyId } = req.body;
  console.log("company id is", companyId);
  
  try {
    const payload = {
      companyID: companyId,
      dueDateTime: new Date(),
      priority: 2,
      status: 5,
      title: "Subscription Cancelled",
      queueID: 6
    };

    const response = await fetch('https://webservices24.autotask.net/atservicesrest/v1.0/Tickets', {
      method: 'POST',
      headers: {
        "ApiIntegrationCode": 'FPN24RSGC2MFCSZ6SX5BAJJKWNG',
        'UserName': 'gg3ebdptems75sb@bask.com',
        'Secret': '6y*SZ@8s#1jNYq~7z3G$Xi$50',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload) 
    });

    const responseData = await response.json();
    console.log(responseData);
    res.status(200).json(responseData); // Sending the response data directly
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

async function secondLoadBalancer(ticket) {
  try {
    fetch(`https://webservices24.autotask.net/atservicesrest/v1.0/Tickets/${ticket}`, {
      method: 'GET',
      headers: {
        "ApiIntegrationCode": 'FPN24RSGC2MFCSZ6SX5BAJJKWNG',
        'UserName': 'gg3ebdptems75sb@bask.com',
        'Secret': '6y*SZ@8s#1jNYq~7z3G$Xi$50',
        'Content-Type': 'application/json'
      }
    })
      .then(response => response.json())
      .then(data => {
        cancelSubscriptionFlow(data);
        console.log(data);
      })
      .catch(error => {
        console.log(error);
      });
  } catch (error) {
    console.log(error);
  }
}



//cron checking the quotes 
cron.schedule('* * * * * *', async () => {
  await countQuotes(null, null);
  
});
cron.schedule('* * * * * *', async () => {
  try {
    // Assuming req and res are not used in the cron job context, passing null for them
    await checkLoad(null, null);
  } catch (error) {
    console.error('Error occurred while running checkLoad:', error);
  }
});
cron.schedule('* * * * * *', async () => {
  try {
    console.log('Running checkTickets function...');
    await checkTickets(); // Assuming checkTickets function is defined globally
    console.log('checkTickets function executed successfully');
  } catch (error) {
    console.error('Error running checkTickets function:', error.message);
  }
});