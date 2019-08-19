<script>
  let visible = false;
  let timer = null;

  function notLoggedIn() {
    if (timer) clearTimeout(timer);
    //document.body.classList.remove("logged_in");
    if (window.location.search)
      window.location.assign(
        "/login?redirect=" +
          encodeURIComponent(
            "/" + window.location.pathname + window.location.search
          )
      );
    else window.location.assign("/login");
  }

  function check_user(user) {
    if (timer) clearTimeout(timer);
    timer = null;
    window.loggedin = !!user;
    visible = !user;
    if (!user) {
      notLoggedIn();
    }
  }

  async function auth() {
    // Show loading screen after 500ms
    timer = setTimeout(() => {
      const user = firebase.auth().currentUser;
      visible = !user;
      window.loggedin = !!user;
      if (!user) {
        // Backup timer
        timer = setTimeout(() => check_user(firebase.auth().currentUser), 2500);
      }
    }, 500);
    let module = await import("/js/cmp/userdata.js");
    let firebase = module.firebase;

    firebase.auth().onAuthStateChanged(check_user, function(error) {
      console.log("Check login error", error);
      notLoggedIn();
    });
  }

  auth();
</script>

<style>
  .loader,
  .loader:before,
  .loader:after {
    border-radius: 50%;
    width: 2.5em;
    height: 2.5em;
    -webkit-animation-fill-mode: both;
    animation-fill-mode: both;
    -webkit-animation: load7 1.8s infinite ease-in-out;
    animation: load7 1.8s infinite ease-in-out;
  }

  .loader {
    font-size: 10px;
    margin: 80px auto;
    position: relative;
    text-indent: -9999em;
    -webkit-transform: translateZ(0);
    -ms-transform: translateZ(0);
    transform: translateZ(0);
    -webkit-animation-delay: -0.16s;
    animation-delay: -0.16s;
  }

  .loader:before,
  .loader:after {
    content: "";
    position: absolute;
    top: 0;
  }

  .loader:before {
    left: -3.5em;
    -webkit-animation-delay: -0.32s;
    animation-delay: -0.32s;
  }

  .loader:after {
    left: 3.5em;
  }

  @-webkit-keyframes load7 {
    0%,
    80%,
    100% {
      box-shadow: 0 2.5em 0 -1.3em;
    }
    40% {
      box-shadow: 0 2.5em 0 0;
    }
  }

  @keyframes load7 {
    0%,
    80%,
    100% {
      box-shadow: 0 2.5em 0 -1.3em;
    }
    40% {
      box-shadow: 0 2.5em 0 0;
    }
  }

  .dimNotLoggedIn {
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 100;
    background-color: #00000083;
    display: flex;
    justify-content: center;
  }
  .dimNotLoggedIn .loader {
    color: white;
    align-self: center;
    font-size: 20px;
    text-align: center;
    text-indent: -1em;
    white-space: nowrap;
  }
</style>

{#if visible}
  <div class="dimNotLoggedIn">
    <div class="loader">Logging in...</div>
  </div>
{/if}
