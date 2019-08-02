function getIdToken() {
    let user = firebase.auth().currentUser;
    if (user)
        return user.getIdToken();

    return new Promise((resolve, reject) => {
        const unsubscribe = firebase.auth().onAuthStateChanged((user) => {
            unsubscribe();
            if (user) {
                resolve(user.getIdToken());
            } else {
                resolve(null);
            }
        });
    });
}

window.customElements.define('ui-checklogin', class extends HTMLElement {
    constructor() {
        super();
        this.authCb = () => this.auth();
        window.fetchWithAuth = this.fetchWithAuth;
    }

    notLoggedIn() {
        //document.body.classList.remove("logged_in");
        if (window.location.search)
            window.location.assign("/login?redirect=" + encodeURIComponent("/" + window.location.pathname + window.location.search));
        else
            window.location.assign("/login");
    }

    auth() {
        if (!window.firebase) {
            this.notLoggedIn();
            return;
        }
        window.firebase.auth().onAuthStateChanged(function (user) {
            if (!user) {
                this.notLoggedIn();
            } else {
                if (!document.body.classList.contains("logged_in"))
                    document.body.classList.add("logged_in");
            }
        }, function (error) {
            console.log(error);
        });
    }

    fetchWithAuth(url, method = 'GET', body = null) {
        return getIdToken()
            .then(idToken => {
                if (!idToken)
                    return fetch(url, {
                        method, body, headers: {
                            'Content-Type': 'application/json'
                        }
                    });
                else
                    return fetch(url, {
                        method,
                        withCredentials: true,
                        credentials: 'include',
                        headers: new Headers({
                            'Authorization': 'Bearer ' + idToken,
                            'Content-Type': 'application/json'
                        }), body
                    });
            })
            .then(response => {
                if (response.ok)
                    return response.json();
                throw new Error('Network response was not ok.', response);
            })
            .then(json => {
                return json;
            }).catch(function (error) {
                console.log('Fetch failed: ', error.message);
            });
    }

    connectedCallback() {
        document.addEventListener("MainContentChanged", this.authCb);
    }
    disconnectedCallback() {
        document.removeEventListener("MainContentChanged", this.authCb);
        delete window.fetchWithAuth;
    }
});
//# sourceMappingURL=checklogin.js.map
