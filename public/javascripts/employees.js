"use strict";
document.querySelectorAll('[data-bs-target="#updateEmployeeModal"]').forEach((button) => {
    button.addEventListener('click', () => {
        document.getElementById("id-updateForm").value = button.dataset.id;
        document.getElementById("fio-updateForm").value = button.dataset.fio;
        document.getElementById("subdivision-updateForm").value = button.dataset.subdivision;
        document.getElementById("position-updateForm").value = button.dataset.position;
        let a = new Date(button.dataset.dateofhiring);
        document.getElementById("dateOfHiring-updateForm").value = a.toISOString().slice(0,10) ?? null;
    })
})
document.querySelectorAll('[data-bs-target="#deleteEmployeeModal"]').forEach((button) => {
    button.addEventListener('click', () => {
        document.getElementById("id-deleteForm").value = button.dataset.id;
    })
})