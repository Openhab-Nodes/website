<script>
  // You must have called ./update_oauth_clients.sh to download/update those files first.
  import oauth_clients from "./oauth_clients.json";
  import oauth_scopes from "./oauth_scopes.json";

  export let classes = "";

  let firebase;
  let userdata;
  let data;
  let user = {};
  let disabled = true;
  let error_messages = null;
  let done_without_redirect = false;
  let limited_access = false;

  import { onDestroy } from "svelte";
  let unsubscribe_user_listener = () => {};
  onDestroy(() => {
    userdata.removeEventListener("data", userdata_changed);
    unsubscribe_user_listener();
    unsubscribe_user_listener = () => {};
  });

  // Extract everything from the URL. We are redirected from `oauth.openhabx.com/authorize`
  // and additionally to the normal oauth arguments (client_id etc) there's also "code"
  // and "unsigned" which are required to call `oauth.openhabx.com/grant_scopes`.
  const url = new URL(window.location);
  const redirect_uri = url.searchParams.get("redirect_uri");
  const client_id = url.searchParams.get("client_id");
  const client_secret = url.searchParams.get("client_secret");
  const client_name = url.searchParams.get("client_name");
  const response_type = url.searchParams.get("response_type");
  const code = url.searchParams.get("code");
  const unsigned = url.searchParams.get("unsigned");
  const state = url.searchParams.get("state");
  const scope = (() => {
    let scope = url.searchParams.get("scope");
    if (scope) scope = scope.split(" ");
    return scope || "";
  })();

  const client = oauth_clients[client_id];
  const client_invalid = !oauth_clients[client_id];

  function userdata_changed(data_event) {
    data = data_event.detail;
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

  async function authorize() {
    client.disabled = true;

    let uri = null;
    if (redirect_uri) {
      uri = redirect_uri
        ? decodeURIComponent(redirect_uri)
        : client.redirect_uri[0];
      if (uri.startsWith("/"))
        uri = window.location.origin + decodeURIComponent(redirect_uri);
      if (!client.redirect_uri.includes(uri)) {
        error_messages = `Redirect URI ${uri} invalid!`;
        return;
      }
      uri = new URL(uri);
      if (state) uri.searchParams.append("tag", state);
      console.log(uri, user.ra);
    }

    try {
      const response = await userdata.fetchWithAuth(
        "oauth.openhabx.com/grant_scopes",
        "POST",
        JSON.stringify({
          unsigned,
          code,
          scopes: scope
        })
      );
      if (response.status !== 200)
        throw new Error("oauth.openhabx.com/grant_scopes not reachable!");
      const oauth_code = await response.text();
      
      if (uri) uri.searchParams.append("code", oauth_code);
    } catch (err) {
      error_messages = `Failed to fetch authorisation code: ${err.message}`;
      return;
    }

    if (uri) {
      setTimeout(() => window.location.assign(target), 500);
    } else {
      done_without_redirect = true;
    }
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
      {#each oauth_scopes as scope_entry}
        <div class="entry">
          <i class={scope_entry['fa-class']} />
          <div>
            {scope_entry.title}
            <div>{scope_entry.description}</div>
          </div>
        </div>
      {/each}
    </div>
    <hr />
    <div class="card-body">
      <div class="custom-control custom-checkbox">
        <input
          type="checkbox"
          class="custom-control-input"
          name="binding"
          bind:checked={limited_access} />
        <label class="custom-control-label" for="chkBindings">
          Limited Access (60 minutes)*
        </label>
      </div>
      <div class="text-center small">
        You can revoke unlimited authorisations in your account settings.
      </div>
      <button
        class="btn btn-success w-100 mb-2"
        disabled={client.disabled || !user.uid}
        on:click={authorize}>
        Authorize {client_name || client.title}
      </button>
      {#if client.redirect_uri}
        <div class="text-center">
          Authorizing will redirect to
          <div>
            <b>{client.redirect_uri}</b>
          </div>
        </div>
      {/if}
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
{#if done_without_redirect}
  <div style="max-width: 500px;margin:auto">
    Device or Addon Registry Command Line Tool authorisation confirmed. You can
    close this window now.
  </div>
{/if}
