import stripe from "stripe";
import CircularJSON from "circular-json";
import open from "open";
import cron from "node-cron";
import { triggerFlow } from "../router/n8n.js"
import { updateStatus , startpay , cancelSubscriptionFlow} from "../router/n8n.js"


const STRIPE_KEY = 'sk_test_51Nv0dVSHUS8UbeVicJZf3XZJf72DL9Fs3HP1rXnQzHtaXxMKXwWfua2zi8LQjmmboeNJc3odYs7cvT9Q5YIChY5I00Pocly1O1';
const API_HEADERS = {
  "ApiIntegrationCode": 'FPN24RSGC2MFCSZ6SX5BAJJKWNG',
  'UserName': 'gg3ebdptems75sb@bask.com',
  'Secret': '6y*SZ@8s#1jNYq~7z3G$Xi$50',
  'Content-Type': 'application/json'
};

let priceId, subssessionsId, sessionsId, count = -1, ID, subsId, ticketId;
const processedTicketIds = new Set();

const Stripe = new stripe(STRIPE_KEY);

export const takePrice = async (req, res) => {
  try {
    const { price, name, custName } = req.body;
    const newPrice = Math.ceil(parseFloat(price));

    const customer = await Stripe.customers.create({ name: custName });
    const custId = customer.id;

    const newprice = await Stripe.prices.create({
      currency: 'inr',
      unit_amount: newPrice * 100,
      product_data: { name: name },
    });

    priceId = newprice.id;
    res.status(200).json(CircularJSON.stringify({ newprice }));
  } catch (error) {
    res.status(500).json(CircularJSON.stringify({ error: error.message }));
  }
};

export const monthlySubs = async (req, res) => {
  try {
    const { custName, price, name } = req.body;
    const newPrice = Math.ceil(parseFloat(price));

    const customer = await Stripe.customers.create({ name: custName });
    const custId = customer.id;

    const newprice = await Stripe.prices.create({
      currency: 'inr',
      unit_amount: newPrice * 100,
      recurring: { interval: 'month' },
      product_data: { name: name },
    });

    priceId = newprice.id;

    const session = await Stripe.checkout.sessions.create({
      customer: custId,
      success_url: 'http://localhost:3110/payments/sessionstatus',
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
    });

    subssessionsId = session.id;
    res.status(200).json(CircularJSON.stringify({ session }));
  } catch (error) {
    res.status(500).json(CircularJSON.stringify({ error: error.message }));
  }
};

export const sendSession = async (req, res) => {
  try {
    const { priceId } = req.body;

    const session = await Stripe.checkout.sessions.create({
      success_url: 'http://localhost:3110/payments/status',
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'payment',
    });

    sessionsId = session.id;
    res.status(200).json(CircularJSON.stringify({ session }));
  } catch (error) {
    res.status(500).json(CircularJSON.stringify({ error: error.message }));
  }
};

export const openUrl = async (req, res) => {
  try {
    const { url } = req.body;
    await open(url, { app: { name: 'Chrome' } });
    console.log(`Opened ${url} in the default browser.`);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error(`Error opening ${url}:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const countQuotes = async (req, res) => {
  try {
    const response = await fetch('https://webservices24.autotask.net/atservicesrest/v1.0/Quotes/query?search={ "filter":[{"op" : "exist", "field" : "id" }]}', {
      method: 'GET',
      headers: API_HEADERS
    });

    if (!response.ok) throw new Error('Failed to fetch quotes');

    const data = await response.json();
    const newCount = data.items.length + 1;

    if (newCount > count) {
      triggerFlow(newCount);
      count = newCount;
    } else if (newCount === count) {
      console.log("No new Quote");
    } else {
      console.log("Quote Deleted");
    }

    console.log(count);
    res.status(200).json(CircularJSON.stringify({ data }));
  } catch (error) {
    res.status(500).json(CircularJSON.stringify({ error: error.message }));
  }
};

export const status = async (req, res) => {
  try {
    const session = await Stripe.checkout.sessions.retrieve(sessionsId);
    const payStatus = session.payment_status;
    const status = payStatus === 'paid' ? 'paid' : 'unpaid';
    updateStatus(status, count);
    console.log(payStatus);
    res.status(200).json(CircularJSON.stringify({ payStatus }));
  } catch (error) {
    res.status(500).json(CircularJSON.stringify({ error: error.message }));
  }
};

export const subsstatus = async (req, res) => {
  try {
    const session = await Stripe.checkout.sessions.retrieve(subssessionsId);
    const payStatus = session.payment_status;
    const status = payStatus === 'paid' ? 'paid' : 'unpaid';
    updateStatus(status, count, custId);
    console.log(payStatus);
    res.status(200).json(CircularJSON.stringify({ payStatus }));
  } catch (error) {
    res.status(500).json(CircularJSON.stringify({ error: error.message }));
  }
};

export const createTicketpaid = async (req, res) => {
  try {
    const { companyID, title, customerId } = req.body;

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
      headers: API_HEADERS,
      body: JSON.stringify(payload)
    });

    const responseData = await response.json();
    console.log(responseData);
    res.status(200).json(responseData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

export const createTicketunpaid = async (req, res) => {
  try {
    const { companyID, title } = req.body;

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
      headers: API_HEADERS,
      body: JSON.stringify(payload)
    });

    const responseData = await response.json();
    console.log(responseData);
    res.status(200).json(responseData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

export const createTicketDenied = async (req, res) => {
  try {
    const { companyID, title } = req.body;

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
      headers: API_HEADERS,
      body: JSON.stringify(payload)
    });

    const responseData = await response.json();
    console.log(responseData);
    res.status(200).json(responseData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

export const responseBalance = async (req, res) => {
  try {
    const { status } = req.body;
    console.log(status);
    res.status(200).json(CircularJSON.stringify({ status }));
  } catch (error) {
    res.status(500).json(CircularJSON.stringify({ error: error.message }));
  }
};

export const getId = async (req, res) => {
  try {
    const { id } = req.body;
    console.log(id);
    ID = id;
  } catch (error) {
    res.status(500).json(CircularJSON.stringify({ error: error.message }));
  }
};

export const checkLoad = async () => {
  let desiredStat;
  console.log("id is", ID);
  try {
    const response = await fetch(`https://webservices24.autotask.net/atservicesrest/v1.0/Quotes/${ID}`, {
      method: 'GET',
      headers: API_HEADERS
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

export const getSubs = async (req, res) => {
  try {
    const { custId, companyId } = req.body;
    const subscriptions = await Stripe.subscriptions.list({ customer: custId, limit: 1 });

    if (subscriptions.data && subscriptions.data.length > 0) {
      subsId = subscriptions.data[0].id;
      console.log("the subscriber's ID is:", subsId);
      res.status(200).json({ id: subsId , comapnyId});
    } else {
      res.status(404).json({ error: "No subscriptions found for the provided customer ID" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const checkTickets = async (req, res) => {
  try {
    const response = await fetch(`https://webservices24.autotask.net/atservicesrest/v1.0/Tickets/query?search={"filter":[{"op":"exist","field":"id"}]}`, {
      method: 'GET',
      headers: API_HEADERS
    });

    if (response && response.ok) {
      const responseData = await response.json();
      const tickets = responseData.items;
      
      for (const ticket of tickets) {
        if (ticket.title.toLowerCase().includes('unsubscribe')) {
          ticketId = ticket.id;
          if (!processedTicketIds.has(ticketId)) {
            console.log(ticketId);
            secondLoadBalancer(ticketId)
            processedTicketIds.add(ticketId);
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
};

export const cancelSubscription = async(req,res)=>{
  try {
    const { subsId, companyId } = req.body;
    const subscription = await Stripe.subscriptions.cancel(subsId);
    res.status(200).json(CircularJSON.stringify({ subscription , companyId }));
  } catch (error) {
    res.status(500).json(CircularJSON.stringify({ error: error.message }));
  }
};

export const createTicketSubsCancel = async (req, res) => {
  try {
    const { companyId } = req.body;
    console.log("company id is", companyId);
  
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
      headers: API_HEADERS,
      body: JSON.stringify(payload) 
    });

    const responseData = await response.json();
    console.log(responseData);
    res.status(200).json(responseData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

async function secondLoadBalancer(ticket) {
  try {
    fetch(`https://webservices24.autotask.net/atservicesrest/v1.0/Tickets/${ticket}`, {
      method: 'GET',
      headers: API_HEADERS
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

cron.schedule('* * * * * *', async () => {
  await countQuotes(null, null);
});

cron.schedule('* * * * * *', async () => {
  try {
    await checkLoad(null, null);
  } catch (error) {
    console.error('Error occurred while running checkLoad:', error);
  }
});

cron.schedule('* * * * * *', async () => {
  try {
    console.log('Running checkTickets function...');
    await checkTickets();
    console.log('checkTickets function executed successfully');
  } catch (error) {
    console.error('Error running checkTickets function:', error.message);
  }
});
