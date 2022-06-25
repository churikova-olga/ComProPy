function checkbox(flag){
    // let checkAll = document.getElementById('checkAll')
    let checkboxes = document.querySelectorAll('.checkbox');
    if (flag===1) {
        for (let i = 0; i < checkboxes.length; i++) {
            checkboxes[i].checked = true;
        }
    }
    else{
        for (let i = 0; i < checkboxes.length; i++) {
            checkboxes[i].checked = false;
        }
    }

}

