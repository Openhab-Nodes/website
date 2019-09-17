<script>
  // You must have called ./update_oauth_clients.sh to download/update those files first.
  import oauth_clients from "./oauth_clients.json";
  import oauth_scopes from "./oauth_scopes.json";

  export let classes = "";

  let loading = "Fetching data &hellip;";
  let data;
  let fetchWithAuth;
  let user = null;
  let error_messages = null;
  let done_without_redirect = false;
  let limited_access = false;
  let selected_scopes = [];

  /// User Aware Component
  import { onDestroy } from "svelte";
  let onDestroyProxy = () => {};
  onDestroy(() => onDestroyProxy());

  async function start() {
    const module = await import("/js/cmp/userdata.js");
    loading = "Waiting for User Session &hellip;";
    onDestroyProxy = module.UserAwareComponent(
      user_ => {
        loading = "Waiting for confirmation &hellip;";
        user = user_;
        setTimeout(() => (loading = null), 700);
      },
      data_ => (data = data_)
    );
    fetchWithAuth = module.fetchWithAuth;
  }
  start().catch(err => {
    error_messages = err.message;
    console.warn("OAuth Dialog", err, error_messages);
  });

  // Extract everything from the URL. We are redirected from `oauth.openhabx.com/authorize`
  // and additionally to the normal oauth arguments (client_id etc) there's also "code"
  // and "unsigned" which are required to call `oauth.openhabx.com/grant_scopes`.
  const url = new URL(window.location);
  let redirect_uri = url.searchParams.get("redirect_uri");
  const client_id = url.searchParams.get("client_id");
  const client_secret = url.searchParams.get("client_secret");
  const client_name = url.searchParams.get("client_name");
  const response_type = url.searchParams.get("response_type");
  const code = url.searchParams.get("code");
  const unsigned = url.searchParams.get("unsigned");
  const state = url.searchParams.get("state");
  // Split scope string, which is whitespace separated into array
  // and preselect all scopes that are requested (as long as they are
  // listed in oauth_scopes).
  const scope = (() => {
    let scope = url.searchParams.get("scope");
    scope = scope ? scope.split(" ") : [];
    for (let scope_id of Object.keys(oauth_scopes)) {
      if (scope.includes(scope_id)) selected_scopes.push(scope_id);
    }
    return scope;
  })();

  const client = oauth_clients[client_id];
  const client_invalid = !oauth_clients[client_id];

  let uri = null;

  if (redirect_uri && client) {
    if (!client.redirect_uri.includes(redirect_uri)) {
      client.disabled = true;
      error_messages = `Invalid redirect URL ${redirect_uri}. This is probably our fault. Please report this problem.`;
      redirect_uri = null;
    } else {
      if (redirect_uri.startsWith("/"))
        redirect_uri =
          window.location.origin + decodeURIComponent(redirect_uri);
      else redirect_uri = decodeURIComponent(redirect_uri);

      redirect_uri = new URL(redirect_uri);
      if (state) redirect_uri.searchParams.append("state", state);
      console.log(redirect_uri, user.ra);
    }
  }

  async function authorize(limited = false) {
    selected_scopes.push("offline_access");

    if (limited)
      selected_scopes = selected_scopes.filter(e => e != "offline_access");

    client.disabled = true;

    try {
      const response = await fetchWithAuth(
        "https://oauth.openhabx.com/grant_scopes",
        "POST",
        JSON.stringify({
          unsigned,
          code,
          scopes: selected_scopes
        })
      );
      const oauth_code = await response.text();

      if (redirect_uri) redirect_uri.searchParams.append("code", oauth_code);
    } catch (err) {
      let response = err.response;
      if (response && response.status == 400) {
        let err_json = await response.json();
        let err = err_json.error;
        switch (err) {
          case "access_denied":
            error_messages = `Access denied`;
            break;
          case "already_used":
            error_messages = `Token already used`;
            break;
          case "expired":
            error_messages = `This session has already expired. Just try again.`;
            break;
          default:
            error_messages = err;
        }
      } else {
        error_messages = `Failed to fetch authorisation code: ${err.message}`;
      }
      return;
    }

    if (redirect_uri) {
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
    max-width: 5em;
    height: 2.5em;
    margin-right: 1em;
    object-fit: contain;
  }
  .entry > i {
    font-size: 2.5em;
    line-height: 1;
    width: 65px;
  }
  .logos {
    display: flex;
    justify-content: center;
    margin-bottom: 1em;
  }
  .logos > img {
    max-width: 120px;
    max-height: 120px;
    object-fit: contain;
  }
  hr {
    margin: 0;
  }
  .dashline line {
    stroke: #b1b1b1;
    stroke-dasharray: 8;
    stroke-width: 5;
  }
  .opacity50 {
    opacity: 0.5;
  }
</style>

<div class="logos">
  <img src={client ? client.logo_url : ''} alt="Loading" />
  <svg class="dashline" width="180" height="120">
    <line x1="0" x2="180" y1="60" y2="60" />
  </svg>
  <img src="/img/logo.png" alt="Logo" />
</div>

{#if loading}
  <p class="text-center">
    {@html loading}
  </p>
{:else if user === null || !user.email}
  <p class="text-center">
    Please identify yourself before authorizing
    <b>{client.title}</b>
  </p>
  <ui-login no-redirect legal-link-new-tab />
{:else if done_without_redirect}
  <p>
    <b>{client_name || client.title}</b>
    authorisation confirmed. You can close this window now.
  </p>
{:else}
  <h4 class="text-center">Authorize {client_name || client.title}</h4>
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
      {#each Object.entries(oauth_scopes) as [scope_id, scope_entry]}
        {#if scope.includes(scope_id)}
          <div class="entry">
            <i class={scope_entry['fa-class']} />
            <label>
              <input
                type="checkbox"
                bind:group={selected_scopes}
                checked={true}
                disabled={client.scopes.includes(scope_id)}
                value={scope_id} />
              {scope_entry.title}
              <div class="small">{scope_entry.description}</div>
            </label>
          </div>
        {/if}
      {/each}
    </div>
    <hr />
    <div class="card-body">
      <button
        class="btn btn-success w-100 mb-2"
        disabled={client.disabled || !user.uid}
        on:click={() => authorize(false)}>
        Authorize {client_name || client.title}
      </button>
      <div class="text-center small">
        You can revoke unlimited authorisations in your account settings.
        {#if !client.scopes.includes('offline_access')}
          You can also
          <button
            class="btn btn-link"
            disabled={client.disabled || !user.uid}
            on:click={() => authorize(true)}>
            Authorize for only 60 minutes
          </button>
          .
        {/if}
      </div>
      {#if redirect_uri}
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
    <a target="_blank" href="/dashboard/access_tokens">accounts dashboard</a>
  </div>
{/if}
{#if error_messages}
  <p class="text-danger text-center mt-4">{error_messages}</p>
{/if}
