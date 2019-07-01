+++
title = "Install Addons & Devices"
author = "David Graeff"
weight = 30
tags = ["addons"]
+++

{{< scss file="addons" >}}

openHAB X has been developed with extendability in mind. OHX extensions are called **Bindings** if they integrate physical hardware, external systems and web services, and called **Add-ons** if they add *Channel Link Processors* or *Rule Modules*.

{{< callout type="danger" title="Security considerations" >}}
{{< advanced >}} openHAB X addons are isolated containers with no access to the base operating system, a dedicated, limited space for configuration and a user restrictable access to system resources like CPU and main memory.

Like with Android or iOS mobile applications you must acknowledge elevated permission requests, for example to enumerate or alter *Thing* states or to raise the default CPU / memory limit.

It is **generally safe to install Addons**, even from untrusted sources, as long as you are <u>responsible with granting permissions</u>.
{{< /callout >}}

Some of the installed extensions have their own extension system like for example the voice recognition service **Snips.Ai** (It allows to install additional *Intends* for more recognised commands). If so, you find instructions on the respective addon page in the **Setup &amp; Maintenance** interface.

## Install Addons

{{< colpic ratio="40" >}}

Install extensions via the **Setup &amp; Maintenance** interface on the <a class="demolink" href="">Addons</a> page in the subsection "Install Addon" or here on this website if you are logged in.

The *Install* button will by default install the latest version. If you want a different one, click on the settings icon first.

Review the permissions and accept if appropriate. Some addons like to have elevated permissions for more CPU time or a larger disk storage quota. Read the description carefully and grant those permissions if wanted. You can change permissions later on.

<split>

<div id="addons_stack_wrapper">
<div id="addons_stack" class="ui_addon_cards">
    <article>
        <header>
            <span>Astro Binding</span> <small class="ml-2">2.5M1</small>
        </header>
        <section class="actions"><span role="group" class="btn-group"><a title="Change Version"
                    class="btn btn-secondary-hover"><i
                        class="fas fa-cog"></i><span class="ml-2">Configure</span></a>
            </span></section>
        <section class="description"><span>Computes andprovides astronomic data</span>
            <small style="white-space: nowrap; text-overflow: ellipsis;">– By Gerhard Riegler</small></section>
        <footer>
            <button class="ml-auto btn btn-outline-success">Check Permissions &amp; Install</button>
        </footer>
    </article>
    <article>
        <header>
            <span>Dresden Elektronik Deconz</span> <small class="ml-2">2.5M1</small>
        </header>
        <section class="actions"><span role="group" class="btn-group"><a title="Change Version"
                    class="btn btn-secondary-hover"><i class="fas fa-cog"></i><span class="ml-2">Configure</span></a>
            </span></section>
        <section class="description"><span>Supports the Raspbee und Conbee Zigbee Dongles via Deconz</span> <small
                style="white-space: nowrap; text-overflow: ellipsis;">– By David Graeff</small></section>
        <footer>
            <button class="ml-auto btn btn-outline-success">Check Permissions &amp; Install</button>
        </footer>
    </article>
    <article>
        <header>
            <span>Hue Binding</span> <small class="ml-2">2.5M1</small>
        </header>
        <section class="actions"><span role="group" class="btn-group"><a title="Change Version"
                    class="btn btn-secondary-hover"><i
                        class="fas fa-cog"></i><span class="ml-2">Configure</span></a>
            </span>
        </section>
        <section class="description"><span>Integrates the Philips Hue Bridge &hellip; </span> <small
                style="white-space: nowrap; text-overflow: ellipsis;">– By David Graeff</small>
        </section>
        <footer>
            <button class="ml-auto btn btn-outline-success">Check Permissions &amp; Install</button>
        </footer>
    </article>
    <article >
        <header>
            <span>MQTT Binding</span> <small class="ml-2">2.5M1</small>
            <oh-doc-link title="Known problems and workarounds for your installed version" show=""
                class="ml-2 link text-nowrap" tabindex="0"><i
                    class="fas fa-exclamation-triangle"></i></oh-doc-link>
        </header>
        <section class="actions"><span role="group" class="btn-group"><a title="Change Version"
                    class="btn btn-secondary-hover"><i
                        class="fas fa-cog"></i><span class="ml-2">Configure</span></a>
            </span>
        </section>
        <section class="description"><span>Manages MQTT Connections and allow for MQTT topic autodiscovery.</span> <small style="white-space: nowrap; text-overflow: ellipsis;">– By David Graeff</small>
        </section>
        <footer>
            <button class="ml-auto btn btn-outline-success">Check Permissions &amp; Install</button>
        </footer>
    </article>
    <article>
        <header><span>Network Binding</span> <small class="ml-2">2.5M1</small>
        </header>
        <section class="actions"><span role="group" class="btn-group"><a title="Change Version"
                    class="btn btn-secondary-hover"><i
                        class="fas fa-cog"></i><span class="ml-2">Configure</span></a>
            </span>
        </section>
        <section class="description"><span>The network addon checks a local subnet for pingable or by other means detectable network devices.</span> <small style="white-space: nowrap; text-overflow: ellipsis;">– By David
                Graeff</small>
        </section>
        <footer>
            <button class="ml-auto btn btn-outline-success">Check Permissions &amp; Install</button>
        </footer>
    </article>
</div>
</div>

{{< /colpic >}}

**Note**: Not every version of every Add-on is reviewed. Check for user ratings, comments, the release date and the open Issues count before installing.

## Device Inbox

Newer devices and services have means to perform a discovery on them.
Automatically discovered Things end up in the <a class="demolink" href="">Inbox</a>. Check the Setup &amp; Maintenance interface.

You may hide results or approve them. Approved Things are moved to the <a class="demolink" href="">Things</a> screen. 

Some devices require a pairing procedure as part of the approval.

## Add a Device Manually

An Inbox Thing is a pre-configured Thing. You may at any time create a Thing manually and enter the required configuration. This is usually not required or recommended, except for addons that do not support discovery. An example is the KNX addon.

Head to <a class="demolink" href="">Things</a> and find "Add Thing" on the left side menu. You will be asked for the unique *Thing* ID (`uid`) that will be used to identify the *Thing* in Rules, logs and metrics. Additionally the Thing type and a title need to be entered as well as whatever configuration values are required.

Some *Things* want you to also configure (additional) Thing Channels. You will find an "Add Channel" link on the Thing configuration page if that is the case. The respective addon documentation will explain the details.