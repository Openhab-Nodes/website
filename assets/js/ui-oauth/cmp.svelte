<script>
  export let classes = "";

  let firebase;
  let userdata;
  let data;
  let user = {};
  let disabled = true;
  let error_messages = null;
  let client = {
    title: "&hellip;",
    author: "&hellip;",
    logo_url: "",
    redirect_uri: "&hellip;",
    disabled: true
  };
  let client_invalid = false;

  import { onDestroy } from "svelte";
  let unsubscribe_user_listener = () => {};
  onDestroy(() => {
    userdata.removeEventListener("data", userdata_changed);
    unsubscribe_user_listener();
    unsubscribe_user_listener = () => {};
  });

  const url = new URL(window.location);
  const redirect_uri = url.searchParams.get("redirect_uri");
  const client_id = url.searchParams.get("client_id");
  const client_secret = url.searchParams.get("client_secret");
  const client_name = url.searchParams.get("client_name");
  const state = url.searchParams.get("client_name");
  const scope = url.searchParams.get("scope").split(",");

  function userdata_changed(data_event) {
    data = data_event.detail;
  }

  async function start_client_load() {
    const response = await fetch("/run/oauth_clients.json");
    if (response.status !== 200)
      throw new Error("oauth_clients.json not found!");
    const json = await response.json();

    if (!json[client_id]) {
      client_invalid = true;
      return;
    }

    client = json[client_id];
    if (client.requires_state && !state) {
      error_messages = "State not defined, but required!";
      client.disabled = true;
    }
  }

  async function start_user_login() {
    const module = await import("/js/cmp/userdata.js");
    firebase = module.firebase;
    userdata = module.userdata;
    await userdata.ready();
    data = userdata.data || {};
    unsubscribe_user_listener = firebase.auth().onAuthStateChanged(
      u => {
        user = u;
      },
      error => {
        loading_msg = "Connection Issue!";
      }
    );
    userdata.addEventListener("data", userdata_changed);
    disabled = false;
  }

  start_user_login().catch(err => {
    error_messages = err.message;
    console.warn("OAuth Dialog", err, error_messages);
  });
  start_client_load().catch(err => {
    error_messages = err.message;
    console.warn("OAuth Dialog", err, error_messages);
  });

  async function authorize() {
    client.disabled = true;

    let uri = redirect_uri
      ? decodeURIComponent(redirect_uri)
      : client.redirect_uri[0];
    if (uri.startsWith("/"))
      uri = window.location.origin + decodeURIComponent(redirect_uri);
    if (!client.redirect_uri.includes(uri)) {
      error_messages = `Redirect URI ${uri} invalid!`;
      return;
    }
    let target = new URL(uri);
    if (state) target.searchParams.append("tag", state);

    console.log(target, user.ra);

    try {
      const response = await userdata.fetchWithAuth(
        "oauth.openhabx.com/generate_token",
        "POST",
        JSON.stringify({
          client_id,
          client_secret,
          scope,
          state
        })
      );
      if (response.status !== 200)
        throw new Error("oauth.openhabx.com/auth not reachable!");
      const json = await response.json();
      if (!json.refreshToken) throw new Error("No refresh token in response!");
      target.searchParams.append("code", json.refreshToken);
    } catch (err) {
      error_messages = `Failed to fetch authorisation code: ${err.message}`;
      return;
    }

    console.log(target, user);
    return;
    setTimeout(() => window.location.assign(target), 500);
  }
</script>

<style>
  .entry {
    display: flex;
    margin-bottom: 1em;
  }
  .entry > img {
    width: 2.5em;
    height: 2.5em;
    margin-right: 1em;
  }
  .entry > i {
    font-size: 2.5em;
    line-height: 1;
    width: 65px;
  }
  .logos {
    display: flex;
    justify-content: center;
    margin-bottom: 3em;
  }
  .logos > img {
    max-width: 120px;
    max-height: 120px;
  }
  hr {
    margin: 0;
  }
  .dashline line {
    stroke: #b1b1b1;
    stroke-dasharray: 8;
    stroke-width: 5;
  }
  .dashline circle {
    fill: rgb(0, 158, 0);
  }
  .opacity50 {
    opacity: 0.5;
  }
</style>

<div class="logos">
  <img src={client ? client.logo_url : ''} alt="Loading" />
  <svg class="dashline" width="180" height="120">
    <line x1="0" x2="180" y1="60" y2="60" />
    <circle cx="90" cy="60" r="20" />
    <g transform="translate(78,50)">
      <path
        fill="white"
        d="M 19.28125 5.28125 L 9 15.5625 L 4.71875 11.28125 L 3.28125 12.71875
        L 8.28125 17.71875 L 9 18.40625 L 9.71875 17.71875 L 20.71875 6.71875 Z " />
    </g>
  </svg>
  <img src="/img/logo.png" alt="Logo" />
</div>
{#if user === null}
  <h1 class="text-center">Login to authorize {client.title}</h1>
  <ui-login no-redirect legal-link-new-tab />
{:else}
  <h1 class="text-center">Authorize {client_name || client.title}</h1>
  <div class="card mb-4" class:opacity50={client.disabled || !user.uid}>
    <div class="card-body">
      <div class="entry">
        <img src={client.logo_url} alt="Logo" />
        <div>
          <b>{client.title}</b>
          by
          <i>{client.author}</i>
          <div>
            wants to access your
            <b>{user.displayName || user.email}</b>
            account
          </div>
        </div>
      </div>
      <div class="entry">
        <i class="fas fa-globe-europe" />
        <div>
          Only Public Data
          <div>Limited access to your public data (Name, E-Mail).</div>
        </div>
      </div>
      {#if scope.includes('cloud_connector')}
        <div class="entry">
          <i class="fas fa-cloud" />
          <div>
            Cloud Connector Access
            <div>
              Potential access to all configured Things and Thing States.
            </div>
          </div>
        </div>
      {/if}
      {#if scope.includes('addon_registry')}
        <div class="entry">
          <i class="fas fa-sitemap" />
          <div>
            Addon Registry
            <div>Allows adding, altering Addon Registry entries.</div>
          </div>
        </div>
      {/if}

    </div>
    <hr />
    <div class="card-body">
      <button
        class="btn btn-success w-100 mb-2"
        disabled={client.disabled || !user.uid}
        on:click={authorize}>
        Authorize {client_name || client.title}
      </button>
      <div class="text-center">
        Authorizing will redirect to
        <div>
          <b>{client.redirect_uri}</b>
        </div>
      </div>

    </div>
  </div>
  <div class="small text-center">
    Learn more about access tokens on your
    <a href="/dashboard/access_tokens">accounts dashboard</a>
  </div>
{/if}
{#if error_messages}
  <p>{error_messages}</p>
{/if}
