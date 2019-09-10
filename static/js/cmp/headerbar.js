document.addEventListener("DOMContentLoaded", () => {
    // Sticky header
    const header = document.getElementById("header");
    const sticky = header.offsetTop;
    var prevScrollpos = window.pageYOffset;
    window.addEventListener('scroll', e => {
        var currentScrollPos = window.pageYOffset;
        if (prevScrollpos > currentScrollPos) {
            header.style.transform = "translateY(0px)";
        } else {
            header.style.transform = "translateY(-" + header.offsetHeight + "px)";
        }
        prevScrollpos = currentScrollPos;
    });

    // document read progress bar
    var progress = document.querySelector('.progress');
    document.addEventListener('scroll', function () {
        const st = 'scrollTop';
        const sh = 'scrollHeight';
        var scroll = (document.documentElement[st] || document.body[st]) / ((document.documentElement[sh] || document.body[sh]) - document.documentElement.clientHeight) * 100;
        progress.style.setProperty('--scroll', scroll + '%');
    });

    document.dispatchEvent(new Event('PreInit'));

    document.dispatchEvent(new Event('MainContentChanged'));
    window.loaded = true;
});
//# sourceMappingURL=headerbar.js.map
