
window.customElements.define('ui-loginstatus', class extends HTMLElement {
    constructor() {
        super();
        this.signoutCb = e => this.signout(e);
        this.authCb = () => this.auth();
        this.initCb = () => this.init();
    }

    init() {
        var firebaseConfig = {
            apiKey: "AIzaSyDtVk7gzBYy4ub3B1JuB4xErb_CMcYXHtU",
            authDomain: "openhabx.firebaseapp.com",
            databaseURL: "https://openhabx.firebaseio.com",
            projectId: "openhabx",
            storageBucket: "openhabx.appspot.com",
            messagingSenderId: "889637406242",
            appId: "1:889637406242:web:68e31a7134337311"
        };

        if (!firebase.apps.length) {
            console.log("Start firebase");
            firebase.initializeApp(firebaseConfig);
        }
    }

    auth() {
        firebase.auth().onAuthStateChanged(function (user) {
            document.getElementById('signed-temp').classList.add("d-none");
            if (user) {
                let el = document.getElementById('signed-in');
                el.classList.remove("d-none");
                if (user.photoURL) el.querySelector(".userimg").src = user.photoURL;
                if (user.displayName) el.querySelector(".username").innerHTML = user.displayName;
                else if (user.email) el.querySelector(".username").innerHTML = user.email;
                document.getElementById('signed-out').classList.add("d-none");
            } else {
                document.getElementById('signed-in').classList.add("d-none");
                document.getElementById('signed-out').classList.remove("d-none");
            }
        }, function (error) {
            console.log(error);
        });
    }
    
    signout(e) {
        e.preventDefault();
        firebase.auth().signOut();
    }
    
    connectedCallback() {
        document.addEventListener("PreInit", this.initCb);
        document.addEventListener("MainContentChanged", this.authCb);
        document.getElementById("signout").addEventListener("click", this.signoutCb);
    }
    disconnectedCallback() {
        document.removeEventListener("PreInit", this.initCb);
        document.removeEventListener("MainContentChanged", this.authCb);
        document.getElementById("signout").addEventListener("click", this.signoutCb);
    }
});
