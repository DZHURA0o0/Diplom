requireRole(["WORKER"])

async function loadOrders(){

const token = localStorage.getItem("token")

if(!token){
window.location.href="/"
return
}

const status=document.getElementById("status").value

let url="/api/orders/my"

if(status)
url+="?status="+status

const res = await fetch(url,{
headers:{
Authorization:"Bearer "+token
}
})

if(!res.ok){
document.getElementById("orders").textContent="Error "+res.status
return
}

const data = await res.json()

document.getElementById("orders").textContent =
JSON.stringify(data,null,2)

}