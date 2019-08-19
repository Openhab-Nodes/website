function done(btn, err = null) {
    let oldTxt = btn.textContent;
    if (err)
        btn.textContent = err.message;
    else
        btn.textContent = "Done!";
    btn.disabled = true;
    setTimeout(() => {
        button.disabled = false;
        button.textContent = oldTxt;
    }, 1000);
}

document.addEventListener("DOMContentLoaded", () => {
    if (!navigator.clipboard) return;

    var tables = document.querySelectorAll('div.highlight table');
    tables.forEach(function (table) {
        var tds = table.querySelectorAll('td');
        if (tds.length > 1) {
            var codeTd = tds[1];
            var pre = codeTd.querySelector('pre');
            var button = document.createElement('button');
            button.className = 'copy-button';
            button.textContent = 'Copy';
            button.title = "Copy to clipboard";
            button.addEventListener("click", () => {
                navigator.clipboard.writeText(pre.innerText).then(() => done(button)).catch(err => done(button, err));
            });
            pre.appendChild(button);
        }
    })
});