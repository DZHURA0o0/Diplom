let isRegistering = false;

const msg = document.getElementById("msg");
const btn = document.getElementById("btnRegister");

const inputs = [
"fullName",
"passNumber",
"login",
"password",
"position",
"phone",
"email",
"floorNumber",
"officeNumber",
"workshopNumber"
];

function getFields(){

return {
fullName: document.getElementById("fullName").value.trim(),
passNumber: parseInt(document.getElementById("passNumber").value),
login: document.getElementById("login").value.trim(),
password: document.getElementById("password").value,
position: document.getElementById("position").value.trim(),
phone: document.getElementById("phone").value.trim(),
email: document.getElementById("email").value.trim(),
floorNumber: parseInt(document.getElementById("floorNumber").value),
officeNumber: parseInt(document.getElementById("officeNumber").value),
workshopNumber: parseInt(document.getElementById("workshopNumber").value)
};

}

function validate(){

const f = getFields();

const rules = [
[() => !f.fullName, "Введите Full Name"],
[() => !f.login || f.login.length < 3, "Login минимум 3 символа"],
[() => !f.password || f.password.length < 6, "Password минимум 6 символов"],
[() => Number.isNaN(f.passNumber) || f.passNumber <= 0, "Некорректный PassNumber"],
[() => !f.email.includes("@"), "Некорректный Email"],
[() => Number.isNaN(f.floorNumber), "Некорректный FloorNumber"],
[() => Number.isNaN(f.officeNumber), "Некорректный OfficeNumber"],
[() => Number.isNaN(f.workshopNumber), "Некорректный WorkshopNumber"]
];

const error = rules.find(r => r[0]());

if(error){
msg.textContent = error[1];
btn.disabled = true;
return false;
}

msg.textContent = "";
btn.disabled = false;
return true;

}

inputs.forEach(id=>{
document.getElementById(id).addEventListener("input",validate);
});

async function register(){

if(isRegistering) return;

if(!validate()) return;

const fields = getFields();

const data = {
...fields,
roleInSystem:"WORKER"
};

try{

isRegistering = true;

btn.disabled = true;
msg.textContent = "Регистрация...";

const res = await fetch("/api/auth/register",{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify(data)
});

let text = await res.text();

try{
const json = JSON.parse(text);
text = json.message ?? text;
}catch{}

if(!res.ok){

msg.textContent = text || ("Error "+res.status);

btn.disabled = false;
isRegistering = false;

return;

}

msg.textContent = "Регистрация успешна";

btn.style.display = "none";

setTimeout(()=>{
window.location.href="/";
},1500);

}
catch(e){

msg.textContent = "Ошибка сети";

btn.disabled = false;
isRegistering = false;

}

}