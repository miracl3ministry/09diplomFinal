"use strict";
document.querySelectorAll('[data-bs-target="#changePassModal"]').forEach((button) => {
    button.addEventListener('click', () => {
        document.getElementById("newPassId").value = button.dataset.id;
    })
})
document.getElementById('changePasswordForm').addEventListener('submit', (formEvent) => {
    formEvent.preventDefault();
    if (formEvent.target.querySelector('input#newPass1').value !== formEvent.target.querySelector('input#newPass2').value) {
        formEvent.target.querySelector('.alert').classList.remove('d-none');
    } else {
        formEvent.target.submit();
    }
})
document.querySelectorAll('[data-bs-target="#deleteUserModal"]').forEach((button) => {
    button.addEventListener('click', () => {
        document.getElementById("deleteUserId").value = button.dataset.id;
    })
})
document.querySelectorAll('[data-bs-target="#changeAccessModal"]').forEach((button) => {
    button.addEventListener('click', () => {
        document.getElementById("changeAccessId").value = button.dataset.id;
        let form = document.getElementById('changeAccessForm');
        let checkboxes = form.querySelectorAll('input[type="checkbox"]');
        let access = button.dataset.access;
        for (let i = 7, j = 0; i >= 0; i--, j++) {
            checkboxes[j].checked = Boolean(access & 2**i);
        }
    })
})