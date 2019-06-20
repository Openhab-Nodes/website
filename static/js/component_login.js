window.customElements.define('ui-login', class extends HTMLElement {
    constructor() {
        super();
        this.prepareLoginCb = () => this.prepareLogin();
    }
    prepareLogin() {
        let lang = document.getElementById("signed-in").dataset.lang;
        if (lang == "en") lang = ""; else lang = "/" + lang;
    
        let successURL = lang + '/dashboard';
        let redirect = new URL(window.location).searchParams.get("redirect");
        if (redirect)
            successURL = window.location.origin + decodeURIComponent(redirect);
    
        var uiConfig = {
            signInSuccessUrl: successURL,
            signInOptions: [
                firebase.auth.GoogleAuthProvider.PROVIDER_ID,
                //   firebase.auth.FacebookAuthProvider.PROVIDER_ID,
                //   firebase.auth.TwitterAuthProvider.PROVIDER_ID,
                firebase.auth.GithubAuthProvider.PROVIDER_ID,
                firebase.auth.EmailAuthProvider.PROVIDER_ID,
                //   firebase.auth.PhoneAuthProvider.PROVIDER_ID,
                //   firebaseui.auth.AnonymousAuthProvider.PROVIDER_ID
            ],
            credentialHelper:firebaseui.auth.CredentialHelper.GOOGLE_YOLO,
            signInFlow:"popup",
            tosUrl: lang + '/terms',
            privacyPolicyUrl: lang + '/privacy'
        };
    
        // Initialize the FirebaseUI Widget using Firebase.
        var ui = new firebaseui.auth.AuthUI(firebase.auth());
        // The start method will wait until the DOM is loaded.
        ui.start('#firebaseui-auth-container', uiConfig);
    }
    connectedCallback() {
        document.addEventListener("MainContentChanged", this.prepareLoginCb);
    }
    disconnectedCallback() {
        document.removeEventListener("MainContentChanged", this.prepareLoginCb);
    }
});