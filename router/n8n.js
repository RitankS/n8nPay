import CircularJSON from "circular-json"

const webhook = 'http://127.0.0.1:5678/webhook/startAutotask'
 export async function triggerFlow(newCount){
    try{
        await fetch(webhook, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ newCount }),
                    });
                    
    }
    catch(error){
        console.log(error)
    }
 }


export async function updateStatus(status , count , custId){
    try{
        await fetch('http://127.0.0.1:5678/webhook/sendpaymentstatus', {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({status , count , custId})
        })
    }
    catch(error){
        console.log(error)
    }
}

export async function startpay(extApprovalContactResponse , id){
    try{
        await fetch('http://127.0.0.1:5678/webhook/startpaymentflow', {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({extApprovalContactResponse , id})
        })
    }
    catch(error){
        console.log(error)
    }
}

export async function cancelSubscriptionFlow(data){
    try{
        await fetch('http://127.0.0.1:5678/webhook/subscriptioncancellation', {
            method: 'POST',
            headers:{
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({data})
        })
    }
    catch(error){
        console.log(error)
    }
}