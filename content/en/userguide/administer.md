+++
title = "Administer your System"
author = "David Graeff"
weight = 20
tags = ["administration","users"]
+++

In this chapter you will learn about maintenance tasks and configuration of openHAB X in general, except Backup &amp; Restore which is handled separately in the next chapter. All tasks in this chapter are performed via the <a class="demolink" href="">Maintenance</a> page of the *Setup &amp; Maintenance* interface.

You should check by from time to time. All send notifications, logs and runtime metrics are accessible here.
If your SD-Card is about to die or if attackers have targeted you is what you can find out on the summary page.

## User Accounts

One the left side menu of the Maintenance page you will find "User Management". User accounts and permissions are managed by the **Identity and Access Management (IAM) service**.

Your currently logged in user must have the permission "USER_ADMIN" to view, edit, create and delete users. If you just have installed openHAB X, you are logged in as an administrative user and thus you have full access.

You can create a new user via the "New User" link on the left side menu. A user requires a name and a password and you can assign different permissions.

**Note**: You must have at least one administrative user.

## Device &amp; Service Tokens

Devices usually require a form of authorisation, like the Hue bridge with the pairing button or the Ikea Trafri Bridge with a security code on the back. The same is true for external services, like a weather service that requires an API Key.

Those tokens are stored as part of the addon configuration, so can only be seen and altered by the respective addon. A user with the ADDON_CONFIGURATION permission may view and revoke tokens.

If you have forcefully reset a device, like for example a Hue Bridge, the stored device token is not valid anymore and the first thing you should do is to revoke the respective token and initiate a new pairing sequence on the <a class="demolink" href="">Addons</a> page.

## Auth Tokens

The Identity and Access Management (IAM) service may issue **Service Access Tokens** to external services. Like for example the Cloud Connector addon for Amazon Alexa and Google Home requires a few permissions ("BACKUP_ADMIN", "THING_STATES").

IAM authorizes services by requiring you to log in as an administrative user and confirm the process.

The second form of tokens are **User Access Tokens**. If you have logged in via a mobile App, the initial credentials are exchanged for an access token. Some addons are integrated into this system. An example is the Mosquitto MQTT Broker that uses access tokens for authorized logins.

You can revoke service as well as user access tokens on the "Access Tokens" sub-page. Apps and services that try to use a revoked token will no longer work until a re-login has happened.

## Notification Services

Almost all services notify you on unusual behaviour or if you have enabled notifications explicitely for an event. For example IAM offers you to send a notification if a new user has been added, the admin account password has been changed or a login has failed.

Configure all notification services on the "Notification Services" sub-page.

{{< callout type="info" title="New here?" >}}
If you have just installed openHAB X you should configure at least one notification type. E-Mail is recommended, but might not work on your internet connection or behind firewalls. If you are a subscriber, you can use the Cloud Connector notification without any additional setup.
{{< /callout >}}

## Disk Space and System Resources

The system will notify you if disk space runs low (10% remaining free space). Each Addon is confined to 100 MB of disk quota and 1 MB of configuration data. An Addon might request a larger disk quota via the DISK_QUOTA_500 (500 MB), DISK_QUOTA_1000 (1 GB) and DISK_QUOTA_MAX permissions.

Addon configuration is kept even if an addon is uninstalled. If you reinstall the addon, and the configuration is still compatible, it will be used. Configuration for an addon can explicitely be removed on the <a class="demolink" href="">Addons</a> page.

CPU Time is limited to 20% for an Addon, except if you have granted the CPU_MAX permission. Some addons like Snips.ai for offline voice recognition will not work without CPU_MAX!

Main memory is restricted to 200 MB for an Addon, except if you have granted the MEM_500 (500 MB), MEM_1000 (1GB) or MEM_MAX permission.

The above restrictions make sure that a malicous addon cannot just start mining Bit-Coins on your system (at least not with full power and to the extend that the rest does not work correctly anymore) or abuse it in other ways or overheat the hardware.

## Updates

## Configuration Via Forms &amp; Textual

{{< colpic >}}
<div style="max-weight:250px">
<img src="/img/doc/form_based_input.png" class="w-100">
A Form based input guides you through inputs, but doesn't allow for Copy &amp; Paste or Find &amp; Replace.
</div>

<split>

All configurations (including Service-, and Thing configuration, Rules, Scheduled Events, Scenes) can be performed via the **Setup & Maintenance** user interface via Forms as well as textual.

Throughout this guide you will only encounter the textual representation for given examples, in all supported input formats though.

<div>
<tab-container>
	<tab-header>
		<tab-header-item class="tab-active">YAML</tab-header-item>
		<tab-header-item>TOML</tab-header-item>
		<tab-header-item>JSon</tab-header-item>
	</tab-header>
	<tab-body>
		<tab-body-item>
        </tab-body-item>
		<tab-body-item>
        </tab-body-item>
		<tab-body-item>
        </tab-body-item>
	</tab-body>
</tab-container>
</div>

You might be familiar with one of these formats. If not, YAML will serve you well. A brief introduction is given in the next section.
{{< /colpic >}}

### The YAML Format

You find the full specification at https://yaml.org/spec/1.2/spec.html.
The basics are simple.

Key-Value assignment
: {{< highlight yaml >}}
my_config_key: "my_value"
{{< /highlight >}}

Values can be Strings (Text) and Numbers with the dot "." as decimal separator (eg `12.54`).

Complex object with many key-value assignments
:  {{< highlight yaml >}}
important_service:
    my_config_key: "my_value"
    my_config_key2: 12.45
{{< /highlight >}}

A list
:  {{< highlight yaml >}}
favourite_colors:
    - first_item
    - second_item
{{< /highlight >}}
