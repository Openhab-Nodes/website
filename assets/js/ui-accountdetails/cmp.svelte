<script>
  export let classes = "";
  let displayName = "";
  let new_email = "";

  let disabled = true;
  let verifcation_send = false;
  let error_message = null;

  let password = "";
  let password_repeat = "";

  /// User Aware Component
  import { onDestroy } from "svelte";
  let user = null;
  let data = { installations: {} };
  let actionqueue = null;
  let onDestroyProxy = () => {};
  let userdb = null;
  onDestroy(() => onDestroyProxy());

  async function start() {
    const module = await import("/js/cmp/userdata.js");
    onDestroyProxy = module.UserAwareComponent(
      u => {
        user = u;
        displayName = user && user.displayName ? user.displayName : "";
        new_email = user && user.email ? user.email : "";
      },
      data_ => (data = Object.assign({ installations: {} }, data_)),
      aq_ => (actionqueue = aq_)
    );
    userdb = module.userdata;
    disabled = false;
  }
  start();
  /// End -- User Aware Component

  function resend_verification(e) {
    e.preventDefault();
    if (!user) return;
    user
      .sendEmailVerification()
      .then(function() {
        verifcation_send = true;
      })
      .catch(function(error) {
        error_message = error.message;
      });
  }

  function submit_new_name() {
    e.preventDefault();
    if (!user) return;
    e.target.disabled = true;
    user
      .updateProfile({
        displayName
      })
      .then(function() {
        e.target.disabled = false;
        error_message = null;
      })
      .catch(function(error) {
        e.target.disabled = false;
        error_message = error.message;
      });
  }

  function submit_new_mail(e) {
    e.preventDefault();
    if (!user) return;
    e.target.disabled = true;
    user
      .updateEmail(new_email)
      .then(function() {
        e.target.disabled = false;
        error_message = null;
      })
      .catch(function(error) {
        e.target.disabled = false;
        error_message = error.message;
      });
  }

  function submit_new_password(e) {
    e.preventDefault();
    if (!user) return;
    if (password !== password_repeat || password.trim().length == 0) {
      error_message = "No password set!";
      return;
    }
    e.target.disabled = true;
    user
      .updatePassword(password)
      .then(function() {
        e.target.disabled = false;
        error_message = null;
        password = "";
        password_repeat = "";
      })
      .catch(function(error) {
        e.target.disabled = false;
        error_message = error.message;
      });
  }
</script>

<style>
  .img_details {
    display: flex;
  }
  .img_details > img {
    max-width: 200px;
  }
  .user_details {
    max-width: 400px;
    flex: 1;
    justify-content: center;
  }
</style>

<div class="img_details {classes}">
  {#if user && user.photoURL}
    <img class="mr-3" src={user.photoURL} alt="Profile picture" />
  {/if}
  <div class="user_details">

    {#if user && user.providerData.find(e => e.providerId === 'password')}
      <div class="form-group">
        <label>Name:</label>
        <input
          bind:value={displayName}
          class="form-control mr-3"
          id="signupname"
          placeholder="First & Last Name" />
      </div>
      <button
        class="btn"
        disabled={displayName === (user.displayName || '')}
        on:click={submit_new_name}>
        Change
      </button>

      <hr />
      <div class="form-group mt-4">
        <label>Email address:</label>
        <input
          bind:value={new_email}
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
      <button
        class="btn"
        disabled={new_email === (user.email || '')}
        on:click={submit_new_mail}>
        Change
      </button>
    {:else}
      <p>
        Name: {displayName}
        <br />
        E-Mail: {user?user.email:""}
      </p>
    {/if}

    {#if user && !user.emailVerified}
      <p>
        <span class="text-danger">
          Your E-Mail Address is not yet verified!
        </span>
        {#if !verifcation_send}
          <button class="btn-link" on:click={resend_verification}>
            Resend verification E-Mail
          </button>
        {/if}
      </p>
    {/if}

    {#if user && user.metadata}
      <hr />
      <p>
        Registered: {new Date(parseInt(user.metadata.a)).toLocaleString()}
        <br />
        Last login: {new Date(parseInt(user.metadata.b)).toLocaleString()}
      </p>
    {/if}

    <p>
      <b>Subscription</b>
      <br />
      {#if data && data.subscription && data.subscription.ends && data.subscription.ends < Date.now()}
        Status: {data.subscription.valid ? 'Enabled' : 'Payment pending'}
        <br />
        Period ends: {new Date(parseInt(data.subscription.ends)).toLocaleString()}
        <br />
        Automatic renewal: {data.subscription.renewal ? 'Enabled' : 'Disabled'}
      {:else}Status: Inactive{/if}
    </p>

    {#if data && data.queued_remove}
      <small class="text-danger">
        Your account is queued to be removed. This will happen after your
        current subscription ends or within 24 hours, whatever comes first.
      </small>
    {/if}

    {#if error_message}
      <p class="text-danger">{error_message}</p>
    {/if}
  </div>
  <div class="ml-3">

    {#if user && user.providerData.find(e => e.providerId === 'password')}
      <h4>Change Password</h4>
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
      <button
        class="btn"
        disabled={password !== password_repeat || password.trim().length === 0}
        on:click={submit_new_password}>
        Change Password
      </button>
    {/if}

  </div>
</div>
