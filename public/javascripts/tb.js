"use strict";
let categoryId, employeeId, categoryValidYears;
document.querySelectorAll('[data-bs-target="#tbAddInRowModal"]').forEach((button) => {
    button.addEventListener('click', () => {
        document.getElementById("tbAddInRow-fio").textContent = button.dataset.fio;
        document.getElementById('employeeId_add').value = button.dataset.employeeid;
        employeeId = button.dataset.employeeid;
        // let id = button.dataset.id;
        // console.log(id === '');
        document.getElementById('tbId_add').value = null;
        document.getElementById('tbDateOfIssue_add').value = null;
        document.getElementById('tbValidUntil_add').value = null;
        document.getElementById('tbGroup_add').value = null;
        document.getElementById('tbScanName_add').value = null;
        document.getElementById('tbScanHref_add').value = null;
    })
})
document.getElementById('tbCategory_add').addEventListener('change', (category) => {
    categoryId = category.target.children[category.target.selectedIndex].dataset.categoryId ?? null;
    categoryValidYears = Number(category.target.children[category.target.selectedIndex].dataset.validyears) ?? null;
    let data = document.querySelectorAll(`[data-find="${employeeId}-${categoryId}"]`);
    if (data.length === 0) {
        document.getElementById('tbId_add').value = null;
        document.getElementById('tbDateOfIssue_add').value = null;
        document.getElementById('tbValidUntil_add').value = null;
        document.getElementById('tbGroup_add').value = null;
        document.getElementById('tbScanName_add').value = null;
        document.getElementById('tbScanHref_add').value = null;
    } else {
        let dateOfIssue = new Date(data[0].dataset.value).toISOString().slice(0,10);
        let validUntil = new Date(data[1].dataset.value).toISOString().slice(0,10);
        document.getElementById('tbId_add').value = data[0].dataset.id;
        document.getElementById('tbDateOfIssue_add').value = dateOfIssue;
        document.getElementById('tbValidUntil_add').value = validUntil;
        document.getElementById('tbGroup_add').value = data[2].textContent.trim();
        document.getElementById('tbScanName_add').value = data[3].textContent.trim();
        document.getElementById('tbScanHref_add').value = data[3].firstElementChild.href;
    }
})
document.getElementById('tbDateOfIssue_add').addEventListener('change', (event) => {
    if (categoryValidYears) {
        let a = new Date(event.target.value);
        a.setFullYear(a.getFullYear() + categoryValidYears);
        document.getElementById('tbValidUntil_add').value = a.toISOString().slice(0,10);
    }
})

document.querySelectorAll('[data-bs-target="#tbDeleteFromRowModal"]').forEach((button) => {
    button.addEventListener('click', () => {
        let emplId = button.dataset.employeeid;
        document.getElementById("tbDeleteFromRow-fio").textContent = button.dataset.fio;
        document.getElementById('tbEmployeeId_delete').value = emplId;
        document.getElementById("tbCategoryId_delete").value = null;
        document.getElementById('tbCategorySelect_delete').value = null;
        let select = document.getElementById('tbCategorySelect_delete');
        for (let i = 1; i < select.childElementCount; i++) {
            let option = select.children[i];
            option.disabled = document.querySelectorAll(`[data-find="${emplId}-${option.dataset.categoryId}"]`).length !== 4;
        }
    })
})
document.getElementById('tbCategorySelect_delete').addEventListener('change', (category) => {
    document.getElementById("tbCategoryId_delete").value = category.target.children[category.target.selectedIndex].dataset.categoryId ?? null;
})
document.getElementById("checkTb").addEventListener('click', () => {
    let tds = document.querySelectorAll("[data-name=\"validUntil\"]");
    tds.forEach((td) => {
        let dateEnd = new Date(td.dataset.value);
        if (dateEnd < Date.now()){
            td.classList.toggle('red');
            td.parentElement.firstElementChild.classList.toggle('red');
        } else if (dateEnd < (Date.now() + 604800000)) {
            // если срок дейсвия меньше недели (1000 * 60 * 60 * 24 * 7 = 604800000 мс = 1 неделя)
            td.classList.toggle('yellow');
            td.parentElement.firstElementChild.classList.toggle('yellow');
        }
    })
})