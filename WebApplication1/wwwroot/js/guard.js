async function requireRole(roles){

const token = localStorage.getItem("token")

if(!token){
window.location.href="/"
return
}

const res = await fetch("/api/auth/me",{
headers:{
Authorization:"Bearer "+token
}
})

if(!res.ok){
window.location.href="/"
return
}

const data = await res.json()

if(!roles.includes(data.role)){
window.location.href="/"
}

}

function logout(){
localStorage.removeItem("token")
localStorage.removeItem("role")
window.location.href="/"
}