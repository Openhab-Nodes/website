<script>
  export let lang;
  export let redirect_url = "";
  let firebase;
  let email_signin = false;
  let email_signup = false;
  let email = "";
  let password = "";
  let password_repeat = "";
  let first_lastname = "";
  let error_message = null;
  let loading = false;
  let mode = "";
  let locked_redirect = false;
  let unreg_auth_listener;
  export let legal_link_new_tab = false;

  import { onDestroy } from "svelte";
  onDestroy(() => {
   if (unreg_auth_listener) unreg_auth_listener();
      unreg_auth_listener = null;
  });

  $: langpath = lang == "en" ? "" : "/" + lang;
  $: tosUrl = langpath + "/terms";
  $: privacyPolicyUrl = langpath + "/privacy";

  const redirect = new URL(window.location).searchParams.get("redirect");

  function determine_redirect_url(redirect_url) {
    if (redirect) return window.location.origin + decodeURIComponent(redirect);
    if (redirect_url != null) {
      if (redirect_url.startsWith("/dashboard")) {
        return (
          window.location.origin + langpath + decodeURIComponent(redirect_url)
        );
      } else {
        return window.location.origin + decodeURIComponent(redirect_url);
      }
    }
    return redirect_url;
  }

  $: successURL = determine_redirect_url(redirect_url);
  $: signInOptions = [
    {
      p: firebase ? firebase.auth.GoogleAuthProvider : null,
      i: "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg",
      c: "google",
      t: "Google"
    },
    {
      p: firebase ? firebase.auth.GithubAuthProvider : null,
      i: "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/github.svg",
      c: "github",
      t: "Github"
    },
    {
      p: firebase ? firebase.auth.EmailAuthProvider : null,
      i: "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/mail.svg",
      c: "email",
      t: "email"
    }
  ];
  // {p:firebase.auth.GoogleAuthProvider.PROVIDER_ID,i:"https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/facebook.svg"},
  // {p:firebase.auth.GoogleAuthProvider.PROVIDER_ID,i:"https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/twitter.svg"},

  async function start() {
    let module = await import("/js/cmp/userdata.js");
    firebase = module.firebase;
    if (unreg_auth_listener) unreg_auth_listener();
    unreg_auth_listener = firebase.auth().onAuthStateChanged(
      user => {
        if (user && !locked_redirect) {
          setTimeout(perform_redirect, 200);
        }
      },
      error => {
        console.log(error);
        error_message = error.message;
      }
    );
  }
  start();

  function perform_redirect() {
    if (!successURL) return;

    // Create redirect url. Use successURL as base and copy over other search parameters
    const params = new URL(window.location).searchParams;
    let target = new URL(successURL);
    for (let p of params.entries()) {
      if (p[0] !== "redirect") continue;
      target.searchParams.append(p[0], p[1]);
    }
    window.location.assign(target);
  }

  function email_create_account(e) {
    e.preventDefault();
    if (first_lastname.trim().length == 0) {
      error_message =
        "No first and lastname set. We will only use your name to write you nice to read email greeting lines.";
      return;
    }
    if (password != password_repeat) {
      error_message = "Your passwords don't match.";
      return;
    }
    loading = true;
    firebase
      .auth()
      .createUserWithEmailAndPassword(email, password)
      .then(user => {
        return user.updateProfile({
          displayName: first_lastname
        });
      })
      .then(perform_redirect)
      .catch(error => {
        loading = false;
        error_message = error.message; // .code
      });
  }
  function signin_with_email(e) {
    e.preventDefault();
    loading = true;
    firebase
      .auth()
      .signInWithEmailAndPassword(email, password)
      .catch(error => {
        loading = false;
        error_message = error.message;
      });
  }
  function signin(e, item) {
    e.stopPropagation();
    e.preventDefault();
    if (item.c === "email") {
      mode = "email_signin";
    } else {
      loading = true;
      firebase
        .auth()
        .signInWithPopup(new item.p())
        .catch(error => {
          loading = false;
          error_message = error.message;
        });
    }
  }
  function emailsignup(e) {
    e.stopPropagation();
    e.preventDefault();
    loading = false;
    mode = "email_signup";
    error_message = null;
  }
  function back_to_sign_in() {
    loading = false;
    mode = "email_signin";
    error_message = null;
  }
</script>

<style>
  .firebaseui-idp-email,
  .firebaseui-idp-email:hover,
  .firebaseui-idp-email:active,
  .firebaseui-idp-email:focus {
    background-color: #db4437;
    color: white;
  }

  .firebaseui-idp-phone,
  .firebaseui-idp-phone:hover,
  .firebaseui-idp-phone:active,
  .firebaseui-idp-phone:focus {
    background-color: #02bd7e;
    color: white;
  }

  .firebaseui-idp-google,
  .firebaseui-idp-google:hover,
  .firebaseui-idp-google:active,
  .firebaseui-idp-google:focus {
    background-color: #fff;
    color: black;
  }

  .firebaseui-idp-github,
  .firebaseui-idp-github:hover,
  .firebaseui-idp-github:active,
  .firebaseui-idp-github:focus {
    background-color: #333;
    color: white;
  }

  .firebaseui-idp-facebook,
  .firebaseui-idp-facebook:hover,
  .firebaseui-idp-facebook:active,
  .firebaseui-idp-facebook:focus {
    background-color: #3b5998;
  }

  .firebaseui-idp-twitter,
  .firebaseui-idp-twitter:hover,
  .firebaseui-idp-twitter:active,
  .firebaseui-idp-twitter:focus {
    background-color: #55acee;
  }

  .firebaseui-idp-anonymous,
  .firebaseui-idp-anonymous:hover,
  .firebaseui-idp-anonymous:active,
  .firebaseui-idp-anonymous:focus {
    background-color: #f4b400;
  }

  .centered {
    margin: auto;
    max-width: 300px;
  }

  .container {
    display: flex;
    justify-content: center;
    flex-direction: column;
    max-width: 300px;
    align-items: center;
    margin: auto;
  }

  .container button img {
    max-width: 20px;
  }

  .container button {
    display: flex;
    align-items: center;
  }

  .container button span {
    flex: 1;
  }
</style>

{#if mode == 'email_signin'}
  <form class="centered">
    <div class="form-group">
      <label for="exampleInputEmail1">Email address</label>
      <input
        bind:value={email}
        type="email"
        autocomplete="email"
        class="form-control"
        id="exampleInputEmail1"
        aria-describedby="emailHelp"
        placeholder="Enter email" />
      <small id="emailHelp" class="form-text text-muted">
        We'll never share your email with anyone else.
      </small>
    </div>
    <div class="form-group">
      <label for="exampleInputPassword1">Password</label>
      <input
        bind:value={password}
        type="password"
        class="form-control"
        autocomplete="current-password"
        id="exampleInputPassword1"
        placeholder="Password" />
    </div>
    <button
      type="submit"
      class="btn btn-primary mr-3"
      on:click={signin_with_email}>
      Sign In
    </button>
    No account yet?
    <a href="/login#" on:click={emailsignup}>Sign Up</a>
    {#if error_message}
      <div class="text-danger mt-3">{error_message}</div>
    {/if}
  </form>
{:else if mode == 'email_signup'}
  <form class="centered">
    <div class="form-group">
      <label for="exampleInputEmail1">Email address</label>
      <input
        bind:value={email}
        type="email"
        class="form-control"
        autocomplete="email"
        id="exampleInputEmail1"
        aria-describedby="emailHelp"
        placeholder="Enter email" />
      <small id="emailHelp" class="form-text text-muted">
        We'll never share your email with anyone else.
      </small>
    </div>
    <div class="form-group">
      <label for="exampleInputPassword1">Password</label>
      <input
        bind:value={password}
        type="password"
        autocomplete="new-password"
        class="form-control"
        id="exampleInputPassword1"
        placeholder="Password" />
    </div>
    <div class="form-group">
      <label for="exampleInputPassword2">Repeat Password</label>
      <input
        bind:value={password_repeat}
        type="password"
        autocomplete="new-password"
        class="form-control"
        id="exampleInputPassword2"
        placeholder="Password" />
    </div>
    <div class="form-group">
      <label for="signupname">First & Last Name</label>
      <input
        bind:value={first_lastname}
        class="form-control"
        id="signupname"
        placeholder="First & Last Name" />
    </div>
    <button
      type="submit"
      class="btn btn-primary mr-3"
      on:click={email_create_account}>
      Create Account
    </button>
    <a href="/login#" on:click={back_to_sign_in}>Back</a>
    {#if error_message}
      <div class="text-danger mt-3">{error_message}</div>
    {/if}
  </form>
{:else}
  <form onsubmit="return false;" class="container">
    {#each signInOptions as item}
      <button
        disabled={loading}
        class="btn btn-primary firebaseui-idp-{item.c} mb-3 w-100"
        on:click={e => signin(e, item)}>
        <img alt="" src={item.i} />
        <span>Sign in with {item.t}</span>
      </button>
    {/each}
    {#if error_message}
      <div class="text-danger mt-3">{error_message}</div>
    {/if}
    <small>
      By continuing, you are indicating that you accept our
      <a href={tosUrl} target={legal_link_new_tab ? '_blank' : ''}>
        Terms of Service
      </a>
      and
      <a href={privacyPolicyUrl} target={legal_link_new_tab ? '_blank' : ''}>
        Privacy Policy
      </a>
      .
    </small>
  </form>
{/if}
