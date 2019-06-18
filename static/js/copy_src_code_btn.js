document.addEventListener("DOMContentLoaded", () => {
    var tables = document.querySelectorAll('div.highlight table');
    tables.forEach(function (table) {
        var tds = table.querySelectorAll('td');
        if (tds.length > 1) {
            var codeTd = tds[1];
            var pre = codeTd.querySelector('pre');
            var button = document.createElement('button');
            button.className = 'copy-button';
            button.textContent = 'Copy';
            pre.appendChild(button);

            var copyCode = new ClipboardJS('.copy-button', {
                target: function (trigger) {
                    return trigger.previousElementSibling;
                }
            });

            // success message
            copyCode.on('success', function (event) {
                event.clearSelection();
                event.trigger.textContent = 'Copied';
                window.setTimeout(function () {
                    event.trigger.textContent = 'Copy';
                }, 2000);
            });
            // error message
            copyCode.on('error', function (event) {
                event.trigger.textContent = 'Press "Ctrl + C" to copy';
                window.setTimeout(function () {
                    event.trigger.textContent = 'Copy';
                }, 2000);
            });
        }
    })
});