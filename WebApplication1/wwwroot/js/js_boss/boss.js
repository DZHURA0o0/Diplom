const API = "";

let workersMap = {};
let specialists = [];
let specialistsMap = {};

window.onload = async function ()
{
    await loadPeople();
    await loadOrders();
};

function token()
{
    return localStorage.getItem("token");
}

function setStatus(text)
{
    document.getElementById("status").innerText = text;
}

function createCell(text)
{
    const td = document.createElement("td");
    td.innerText = text ?? "";
    return td;
}

function sortOrders(orders)
{
    const statusOrder =
    {
        "NEW": 1,
        "ASSIGNED": 2,
        "IN_PROGRESS": 3,
        "DONE": 4,
        "CANCELED": 5
    };

    return orders.sort(function (a, b)
    {
        const aAssigned = a.specialistId ? 1 : 0;
        const bAssigned = b.specialistId ? 1 : 0;

        // Сначала неназначенные, потом назначенные
        if (aAssigned !== bAssigned)
        {
            return aAssigned - bAssigned;
        }

        const aStatus = statusOrder[a.status] ?? 999;
        const bStatus = statusOrder[b.status] ?? 999;

        if (aStatus !== bStatus)
        {
            return aStatus - bStatus;
        }

        const aDate = new Date(a.createdAt).getTime();
        const bDate = new Date(b.createdAt).getTime();

        return bDate - aDate;
    });
}

async function loadPeople()
{
    try
    {
        const workersResponse = await fetch(API + "/api/boss/orders/workers",
        {
            method: "GET",
            headers:
            {
                "Authorization": "Bearer " + token()
            }
        });

        const specialistsResponse = await fetch(API + "/api/boss/orders/specialists",
        {
            method: "GET",
            headers:
            {
                "Authorization": "Bearer " + token()
            }
        });

        const workersText = await workersResponse.text();
        const specialistsText = await specialistsResponse.text();

        if (!workersResponse.ok)
        {
            throw new Error("Workers load error: " + workersText);
        }

        if (!specialistsResponse.ok)
        {
            throw new Error("Specialists load error: " + specialistsText);
        }

        const workers = JSON.parse(workersText);
        specialists = JSON.parse(specialistsText);

        workersMap = {};
        specialistsMap = {};

        for (let w of workers)
        {
            workersMap[w.id] = w.fullName;
        }

        for (let s of specialists)
        {
            specialistsMap[s.id] = s.fullName;
        }
    }
    catch (e)
    {
        console.error(e);
        setStatus("People load error: " + e.message);
    }
}

function updateActionButton(order, select, button)
{
    const initialSpecialistId = select.dataset.initialSpecialistId ?? "";
    const selectedSpecialistId = select.value ?? "";
    const editMode = select.dataset.editMode === "true";

    // Если заявка NEW и специалист ещё не назначен
    if (order.status === "NEW" && !initialSpecialistId)
    {
        button.innerText = "Assign";
        button.dataset.mode = "assign";
        return;
    }

    // Для статусов не NEW, пока не нажали Update - просто режим просмотра
    if (order.status !== "NEW" && !editMode)
    {
        button.innerText = "Update";
        button.dataset.mode = "unlock";
        return;
    }

    // Если вошли в режим редактирования и ничего не поменяли
    if (selectedSpecialistId === initialSpecialistId)
    {
        button.innerText = "Update";
        button.dataset.mode = "update";
        return;
    }

    // Если изменили специалиста или сняли его
    button.innerText = "Confirm";
    button.dataset.mode = "confirm";
}

function buildSpecialistControl(order)
{
    const wrap = document.createElement("div");

    const select = document.createElement("select");
    select.id = "sp_" + order.id;
    select.dataset.initialSpecialistId = order.specialistId ?? "";
    select.dataset.editMode = "false";

    const emptyOption = document.createElement("option");
    emptyOption.value = "";
    emptyOption.innerText = "-- choose specialist --";
    select.appendChild(emptyOption);

    for (let s of specialists)
    {
        const option = document.createElement("option");
        option.value = s.id;
        option.innerText = s.fullName;

        if (order.specialistId && order.specialistId === s.id)
        {
            option.selected = true;
        }

        select.appendChild(option);
    }

    // Если статус не NEW, то до нажатия Update селект блокируем
    if (order.status !== "NEW")
    {
        select.disabled = true;
    }

    const button = document.createElement("button");
    updateActionButton(order, select, button);

    select.addEventListener("change", function ()
    {
        updateActionButton(order, select, button);
    });

    button.addEventListener("click", async function ()
    {
        await handleAssign(order, select, button);
    });

    wrap.appendChild(select);
    wrap.appendChild(document.createTextNode(" "));
    wrap.appendChild(button);

    return wrap;
}

async function loadOrders()
{
    try
    {
        setStatus("Loading...");

        let status = document.getElementById("statusFilter").value;
        let url = API + "/api/boss/orders";

        if (status)
        {
            url += "?status=" + encodeURIComponent(status);
        }

        const r = await fetch(url,
        {
            method: "GET",
            headers:
            {
                "Authorization": "Bearer " + token()
            }
        });

        const text = await r.text();

        if (!r.ok)
        {
            setStatus("Load error: " + r.status + " " + text);
            return;
        }

        let data = JSON.parse(text);

        if (!Array.isArray(data))
        {
            setStatus("Wrong response format");
            return;
        }

        data = sortOrders(data);

        const body = document.getElementById("orders");
        body.innerHTML = "";

        if (data.length === 0)
        {
            setStatus("No orders");
            return;
        }

        for (let o of data)
        {
            const tr = document.createElement("tr");

            const workerName = workersMap[o.workerId] ?? o.workerId;
            const specialistName = o.specialistId
                ? (specialistsMap[o.specialistId] ?? o.specialistId)
                : "";

            tr.appendChild(createCell(o.id));
            tr.appendChild(createCell(workerName));
            tr.appendChild(createCell(specialistName));
            tr.appendChild(createCell(o.status));
            tr.appendChild(createCell(o.serviceType));
            tr.appendChild(createCell(o.descriptionProblem));

            const actionTd = document.createElement("td");
            actionTd.appendChild(buildSpecialistControl(o));
            tr.appendChild(actionTd);

            body.appendChild(tr);
        }

        setStatus("Loaded " + data.length + " orders");
    }
    catch (e)
    {
        console.error(e);
        setStatus("JS error: " + e.message);
    }
}

async function handleAssign(order, select, button)
{
    try
    {
        const specialistId = select.value;
        const initialSpecialistId = select.dataset.initialSpecialistId ?? "";
        const mode = button.dataset.mode ?? "";

        // Сначала только разблокируем select
        if (mode === "unlock")
        {
            select.disabled = false;
            select.dataset.editMode = "true";
            updateActionButton(order, select, button);
            setStatus("Edit mode enabled");
            return;
        }

        // Если вошли в режим редактирования, но ничего не поменяли
        if (mode === "update")
        {
            setStatus("Choose another specialist or clear selection");
            return;
        }

        let confirmText = "";

        if (!initialSpecialistId && specialistId)
        {
            confirmText = "Assign specialist to this order?";
        }
        else if (initialSpecialistId && !specialistId)
        {
            confirmText = "Remove specialist and return order to NEW status?";
        }
        else if (initialSpecialistId && specialistId && initialSpecialistId !== specialistId)
        {
            confirmText = "Update specialist for this order?";
        }
        else
        {
            setStatus("No changes");
            return;
        }

        const ok = confirm(confirmText);

        if (!ok)
        {
            return;
        }

        setStatus("Saving...");

        const r = await fetch(API + "/api/boss/orders/" + order.id + "/assign-specialist",
        {
            method: "PATCH",
            headers:
            {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token()
            },
            body: JSON.stringify(
            {
                specialistId: specialistId || null
            })
        });

        const text = await r.text();

        if (!r.ok)
        {
            setStatus("Assign error: " + text);
            return;
        }

        if (!initialSpecialistId && specialistId)
        {
            setStatus("Specialist assigned");
        }
        else if (initialSpecialistId && !specialistId)
        {
            setStatus("Specialist removed");
        }
        else
        {
            setStatus("Specialist updated");
        }

        await loadOrders();
    }
    catch (e)
    {
        console.error(e);
        setStatus("Assign JS error: " + e.message);
    }
}

