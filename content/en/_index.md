+++
title = "Home"
author = "David Graeff"
tags = []
type = "index"
+++

## Digital assistants &amp; Voice control

<div class="row mb-4">
    <div class="col-md-4 text-center">
        <img src="/img/alexa.jpg" class="w-100" title="Amazon Alexa">
    </div>
    <div class="col-md-4 text-center">
        <img src="/img/google_home.jpg" class="w-100" title="Google Home">
    </div>
    <div class="col-md-4 text-center">
        <img src="/img/apple_homepod.webp" class="" style="max-width: 80%" title="Apple Homepod">
    </div>
</div>
<div class="row mb-4">
    <div class="col-md-5">
        <p>Digitial assistants can be pretty neat. The picture shows Amazon Alexa, Google Home and Apple Homepod
            (Siri) from left to right.
            You might use one or two of those already. And that's why it is especially easy to make them work with
            openHAB X*.
        </p>
        <small>* A subscription is required to balance costs of the cloud connector.</small>
    </div>
    <div class="col-md-5 offset-md-1 mt-md-4 pt-md-4">
        <p>If you want to go all offline, openHAB X also features a <a href="https://snips.ai/"
                target="_blank">Snips</a> integration.
        </p>
        <img src="/img/snips.png" class="" style="max-width: 100%"
            title="Snips AIR. You don't need them. Any microphone array, directly connected to the Raspberry PI3 works.">
    </div>
</div>

## Interact with openHAB X

<div class="row mb-4">
    <div class="col-md-5">
        <h4>Compatible to any Hue App</h4>
        <p>Control your lights with any Hue compatible App on Android or iOS. openHAB X supports Hue Rooms, Scenes, Timers and Rules.</p>
    </div>
    <div class="col-md-7">
        <img src="/img/features/Hue-app-scenes.png" class="w-100">
    </div>
</div>

<div class="row mb-4">
    <div class="col-md-7">
        <img src="/img/features/app_hand.webp" style="max-width:300px">
    </div>
    <div class="col-md-5" style="align-self: center;">
        <h4>Companion App for Android &amp; iOS</h4>
        <p>The companion App is not winning a design award, but does render all basic channel types. It allows free channel arrangement per screen, on multiple screens and supports remote control and authentication.</p>
    </div>
</div>

<div class="row mb-4">
    <div class="col-md-5" style="align-self: center;">
        <h4>Web-based Dashboard</h4>
        <p>You've got a wall mounted tablet or want to quickly turn on a light from your PC seat? The OHX Dashboard is probably what you want.</p>
    </div>
    <div class="col-md-7">
        <img src="/img/features/control_dash.png" class="w-100">
    </div>
</div>

## Make it smart

<div class="row mb-4">
    <div class="col-md-5">
        <h4>Channel Connections</h4>
        <p class="bs-callout bs-callout-tiny bs-callout-default">Imagine you want a ZWave Wall Button to toggle a
            Philips Hue Bulb.</p>
        <p>That's </p>
    </div>
    <div class="col-md-7">
        <img src="/img/connections.png" class="w-100">
    </div>
</div>
<div class="row" id="diy">
    <div class="col-md-6 swiper-container">
        <div class="swiper-wrapper">
            <div class="swiper-slide">
                <h4 style="position: absolute;bottom:30px;right:0;">Graphical Rule Editor</h4>
                <img src="/img/ruleeditor.png" style="width: 100%">
            </div>
            <div class="swiper-slide">
{{< highlight yaml "linenos=table" >}}
triggers:
  - id: '1'
    label: 'it is a fixed time of day'
    description: 'Triggers at a specified time'
    configuration:
      time: '12:12'
    type: timer.TimeOfDayTrigger
conditions: []
actions:
  - id: '2'
    inputs: {}
    label: 'execute a given script'
    description: 'A script that logs Hello World'
    configuration:
      type: application/javascript
      script: |
        var myLog = context.logger;
        myLog.info("Hello world!");
    type: script.ScriptAction
{{< / highlight >}}
            </div>
        </div>
        <div class="swiper-pagination"></div>
        <div class="swiper-button-next"></div>
        <div class="swiper-button-prev"></div>
        <ui-swiper target="diy" navigation></ui-swiper>
    </div>
    <div class="col-md-5 offset-md-1">
        <h4>Rules</h4>
        <p class="bs-callout bs-callout-tiny bs-callout-info">Rules are an advanced concept. If you use OHX only as
            an interconnection hub, you'll not need them.</p>
        <p>Rules consists of Triggers, Conditions and Actions, known as <button class="btn-link contexthelp"
                id="rule_modules" title="Context help">Rule Modules</button>.
        </p>
        <p>
            A <a href='{{< relref "/userguide/rules" >}}'>Rule Editor</a> makes creating Rules easy and keep the
            learning curve flat. Use JavaScript in Conditions and Actions to go beyond what the Rule Engine provides
            out of the box.</p>
        <p><a class="developer_link" href='{{< relref "/developer/ruleengine" >}}'>Develop your own Rule
                Modules</a></p>
    </div>
    <template data-popover="rule_modules">
        <p style="max-width: 500px">OHX comes with a predefined set of modules for dealing with date/time, different
            network protocols like HTTP, MQTT, and for interacting will all OHX concepts like <b>Things</b>,
            <b>Channels</b>, <b>Channel Connections</b>, User Management and many more.</p>
    </template>
    <ui-tooltip target="rule_modules"></ui-tooltip>
</div>


## Setup &amp; Maintenance

<section id="feature_ui"  class="row">
    <div class="col-md-6 px-3 swiper-container">
        <div class="swiper-wrapper">
            <div class="swiper-slide" style="background-image:url(/img/features/tutorials.png)"></div>
            <div class="swiper-slide" style="background-image:url(/img/features/addons.png)"></div>
            <div class="swiper-slide" style="background-image:url(/img/features/config.png)"></div>
            <div class="swiper-slide" style="background-image:url(/img/features/things.png)"></div>
            <div class="swiper-slide" style="background-image:url(/img/features/maintenance.png)"></div>
            <div class="swiper-slide" style="background-image:url(/img/features/scenes.png)"></div>
            <div class="swiper-slide" style="background-image:url(/img/features/scenes_text.png)"></div>
            <div class="swiper-slide" style="background-image:url(/img/features/automation.png)"></div>
            <div class="swiper-slide" style="background-image:url(/img/features/scheduler.png)"></div>
        </div>
        <div class="swiper-pagination"></div>
        <div class="swiper-button-next"></div>
        <div class="swiper-button-prev"></div>
    </div>
    <div class="col-md-6">
        <div class="swiper-content swiper-content-0">
            <h4>Setup &amp; Maintenance user-interface</h4>
            <p>The maintenance user-interface includes a full introduction tutorial and interactive exercises.</p>
            <p>All pages have a context help that walks you through new material.</p>
        </div>
        <div class="swiper-content swiper-content-1">
            <p><b>Addons</b> allow openHAB X to find and communicate with external devices and services.</p>
            <p>Install new <b><a class="demolink" href='{{< relref "/userguide/addons" >}}'>Addons</a></b> with a button
                click. Find available ones here on the webpage already without installing openHAB X first.</p>
            <p>Addons can be developed in many programming languages ranging from Java to C++ or Rust. More
                information is to be found in the <a href='{{< relref "/developer/addons" >}}'>Development</a> section.</p>
        </div>
        <div class="swiper-content swiper-content-2">
            <h4>Configuration</h4>
            <p>Something as complex as a smart acting home automation system requires configuration.</p>
            <p>openHAB X and Addon configuration can be performed in the maintenance user-interface in text form or
                graphically.</p>
        </div>
        <div class="swiper-content swiper-content-3">
            <p><b>Things</b> in openHAB X are a representation of external devices ("Light bulb") or Services
                ("Weather service") and are provided via Addons.</p>
            <p>A <b>Thing</b> will usually provide at least one <b>Channel</b> ("Light brightness") to control a
                feature or get data from it. </p>
            <p>If your installed <b>Addon</b> supports discovery, it will present its found <b>Things</b> in the
                Inbox section. Inbox Things are already configured for you, except if pairing or credentials are
                required.</p>
        </div>
        <div class="swiper-content swiper-content-4">
            <h4>Analyse and Verify Runtime Metrics</h4>
            <p>openHAB X uses InfluxDB &amp; Grafana to collect and visualize runtime metrics. You can setup alarm
                thresholds for all available metrics.</p>
            <p>If you are a subscriber, the openHAB X online platform will take appropriate actions to keep your
                system in a stable state.</p>
        </div>
        <div class="swiper-content swiper-content-5">
            <h4>Scenes</h4>
            <p>A <b>Scene</b> is a collection of previously selected <b>Channel</b> states.</p>
            <p>For example a "Cooking" scene could turn on all your kitchen lights to a dimmed value of 80% except
                the serving cabinet with a value of 100% and switch on the kitchen radio and tune in a specific
                radio channel.</p>
        </div>
        <div class="swiper-content swiper-content-6">
            <h4>Graphical and Textual</h4>
            <p>Edit your configuration in a graphical fashion or via a Visual Studio Code text editor interface,
                including</p>
            <ul>
                <li>auto-formatting,</li>
                <li>syntax highlighting,
                <li>auto-completion and</li>
                <li>syntax checking.</li>
            </ul>
        </div>
        <div class="swiper-content swiper-content-7">
            <h4>Rules</h4>
            <p>A graphical <a href='{{< relref "/userguide/rules" >}}'>Rule Editor</a> (next to the text mode)
                allows to setup simple as well as complex
                rules in an easy and fast fashion.</p>
            <p>A Rule consists of a Name, a unique ID and optional Triggers, Conditions and Actions. Rules are the
                fundament for <b>Scenes</b> and Time based actions.</p>
        </div>
        <div class="swiper-content swiper-content-8">
            <h4>Scheduler</h4>
            <p>Time based actions can have a very simple purpose like a "Weekday wake-up timer". Internally they are
                just Rules and they can be edited via the <a href='{{< relref "/userguide/rules" >}}'>Rule
                    Editor</a>.</p>
            <p>Use the Scheduler Editor however to add and modify Time based actions and easily create recurring
                Events more intuitively with a better overall view.</p>
        </div>
    </div>
    <ui-swiper target="feature_ui" content coverflow navigation></ui-swiper>
</section>

## DIY Integration

<div class="row">
    <div class="col-md-6">
        <a href='{{< relref "/userguide/diy" >}}' title="DIY Hardware / Service Integration Documentation"
            class="card-hover"><img src="/img/arduino_esp8266.jpg" style="width: 100%"></a>
        <div class="d-flex my-2">
            <a href="https://platformio.org/" target="_blank"
                title="PlatformIO is an open source ecosystem for IoT development" class="card-hover">
                <img src="/img/platformio.png" style="height: 3em;" class="m-2"><span style="font-size: 1.5em"
                    class="mr-2">PlatformIO</span>
            </a>
            <a href="https://esphome.io/" target="_blank"
                title="ESPHome is a framework that tries to provide the best possible use experience for using ESP8266/ESP32"
                class="card-hover">
                <img src="/img/logo-esphome.svg" style="height: 3em;width: 200px" class="m-2">
            </a>
        </div>
    </div>
    <div class="col-md-6">
        <p>Generic MQTT, CoAP and HTTP Addons let you integrate any kind of Do-It-Yourself (DIY) project in a few
            steps. Programming your own Addon isn't a hard exercise either.
        </p>
        <p>Flashing your devices with the right firmware allows <button class="btn-link contexthelp"
                id="diy_auto_discovery" title="Context help">auto discovery</button> of
            Things straight to your openHAB X Inbox. OHX supports two major initiatives for MQTT and HTTP
            respectively.</p>
        <a href="https://homieiot.github.io/" target="_blank" title="Homie (MQTT)" class="card-hover">
            <img src="/img/mqtt_homie.jpg" style="width: 150px" class="m-2">
        </a>
        <a href="https://www.w3.org/TR/wot-thing-description/" target="_blank" title="W3C WebThings (HTTP)"
            class="card-hover">
            <img src="/img/mozilla_webthings_wordmark.svg" style="width: 150px" class="m-2"></a>
        <p>Find a detailed step by step guide in <a href='{{< relref "/userguide/diy" >}}'>DIY
                Hardware / Service Integration</a>.</p>
    </div>
    <template data-popover="diy_auto_discovery">
        <p style="max-width: 500px">It is an ongoing effort to team up with established projects like ESPHome,
            ESPEasy and Tasmota to provide
            out-of-the-box auto discovery experience.</p>
    </template>
    <ui-tooltip target="diy_auto_discovery"></ui-tooltip>
</div>

## Up &amp; running in 3 steps

<div class="row" style="justify-content: space-between;">
    <div class="col-md-4 py-3 card-hover">
        <h3>1. Hardware</h3>
        <img style="float:left;height: 80px;" class="mr-4" src="/img/raspberry-pi-3-case-enclosure.jpg">
        <p>Head over to a <button class="btn-link contexthelp" id="hw_partners_tr"
                title="Context help">retailer</button>
            and get yourself a <button class="btn-link contexthelp" id="raspberry_detail"
                title="Context help">Raspberry Pi
                3/3+</button>.
        </p>
        <template data-popover="hw_partners_tr">
            <a target="_blank" href="https://core-electronics.com.au/raspberry-pi-3-starter-kit-34285.html"
                class="btn btn-sm btn-outline-dark my-2">Australia</a>
            <a target="_blank"
                href="https://www.amazon.de/Almost-Anything-Ltd-Raspberry-Offizielles/dp/B07CZLWPLF/ref=sr_1_20?ie=UTF8&keywords=raspberry%20pi%203&language=en_GB&qid=1559931725&s=gateway&sr=8-20"
                class="btn btn-sm btn-outline-dark my-2">Europe</a>
            <a target="_blank"
                href="https://www.amazon.com/CanaKit-Raspberry-Complete-Starter-Kit/dp/B01C6Q2GSY/ref=sr_1_18?keywords=Raspberry+Pi&qid=1559931481&s=gateway&sr=8-18"
                class="btn btn-sm btn-outline-dark my-2">USA / Canada</a>
        </template>
        <ui-tooltip target="hw_partners_tr"></ui-tooltip>
        <template data-popover="raspberry_detail">
            <div style="max-width: 500px">
                <p>A small and affordable computer with 4x1.4 GHz 64-bit, 1 GB memory and SD-Card Slot for storage.
                </p>
                <p>It's affordable price, fully open sourced firmware, long availability guarantee and low energy
                    consumption of 1.5W to 6.7W (max) makes it the most suiting core of a home automation solution.
                </p>
                <p>You need additional RPI-3 hardware extensions for ZWave, Zigbee, KNX and other non-IP-network
                    busses and radios.</p>
                <p>More info in the <a href='{{< relref "/userguide/getting_started" >}}'>Getting started</a>
                    guide.</p>
            </div>
        </template>
        <ui-tooltip target="raspberry_detail"></ui-tooltip>
    </div>
    <div class="p-3 card-hover">
        <h3 style="white-space: nowrap">2. Download</h3>
        <a href="{{ .Site.Data.downloads.pi3image.url }}" title="{{ .Site.Data.downloads.pi3image.desc }}"
            class="btn btn-dwnload">
            <img src="/img/raspberrypi.png" style="height: 1em" class="mr-2">
            <span>{{< readdata arch pi3image >}}</span>
        </a>
        <a href="{{ .Site.Data.downloads.x86docker.url }}" title="{{ .Site.Data.downloads.x86docker.desc }}"
            class="btn btn-dwnload">
            <i class="fas fa-desktop mr-2"></i>
            <span>{{< readdata arch x86docker >}}</span>
        </a>
        <button class="btn btn-dwnload" id="download_tr" title="Context help">Other &#9660;</button>
        <br>
        <small class="muted">Version: <button class="btn-link contexthelp" id="version_tr"
                title="Context help">{{< readdata version pi3image >}}</button></small>
        <template data-popover="download_tr">
            <dl style="max-width: 500px">
            {{< listofdownloads >}}
            </dl>
        </template>
        <ui-tooltip target="download_tr"></ui-tooltip>
        <template data-popover="version_tr">
            <dl style="max-width: 500px">
            {{< changelogs >}}
            </dl>
        </template>
        <ui-tooltip target="version_tr"></ui-tooltip>
    </div>
    <div class="col-md-4 py-3 card-hover">
        <h3>3. Flash</h3>
        <a href="https://www.balena.io/etcher/" target="_blank"><img style="float:left;height: 70px;" class="mr-3"
                src="/img/etcher.svg"></a>
        <p><a href="https://www.balena.io/etcher/" target="_blank">Etcher</a> transfers the Operating System
            and openHAB X Software onto your SD-Card.</p>
    </div>
</div>

## Subscription

<div id="subscriptions" class="row subscription-plans">
    <div class="col">
        <div class="header">
            <h4>Always Open Source</h4>
            <i class="img fas fa-heart" style="font-size: 60pt;line-height: 120pt"></i>
        </div>
        <p class="text-center p-2">All parts of openHAB X will always be open source! This includes:</p>
        <div class="mx-4 mb-2 table">
            <table>
                <tbody>
                    <tr>
                        <td>&check;</td>
                        <td>The Distribution<br><small>(OS Bundle, Docker Image)</small></td>
                        <td><a href='#'><i class="fas fa-external-link-alt"></i></a></td>
                    </tr>
                    <tr>
                        <td>&check;</td>
                        <td><button class="btn-link contexthelp" id="sub_openhab2addons_tr"
                                title="Context help">openHAB
                                Addons</button></td>
                        <td><a href='#'><i class="fas fa-external-link-alt"></i></a></td>
                    </tr>
                    <tr>
                        <td>&check;</td>
                        <td>
                            <button class="btn-link contexthelp" id="sub_openhabx_tr" title="Context help">openHAB X
                                Extensions</button>
                        </td>
                        <td></td>
                    </tr>
                    <tr>
                        <td>&check;</td>
                        <td><button class="btn-link contexthelp" id="sub_cloud_tr" title="Context help">Cloud
                                connectors</button></td>
                        <td></td>
                    </tr>
                    <tr>
                        <td>&check;</td>
                        <td><button class="btn-link contexthelp" id="sub_ui_tr" title="Context help">User
                                interfaces</button>
                        </td>
                        <td></td>
                    </tr>
                    <tr>
                        <td>&check;</td>
                        <td><button class="btn-link contexthelp" id="sub_integrations_tr"
                                title="Context help">Integrations</button> </td>
                        <td></td>
                    </tr>
                </tbody>
            </table>
        </div>
        <template data-popover="sub_openhab2addons_tr">
            <div style="max-width: 500px">
                <q>Add-ons that are implemented on top of openHAB 2 Core APIs</q>
            </div>
        </template>
        <ui-tooltip target="sub_openhab2addons_tr"></ui-tooltip>
        <template data-popover="sub_openhabx_tr">
            <div style="max-width: 500px">
                <ul>
                    <li>OpenHAB Core Shim <a href='#'><i class="fas fa-external-link-alt"></i></a></li>
                    <li>OHX Automation Engine <a href='#'><i class="fas fa-external-link-alt"></i></a></li>
                    <li>OHX GraphQL API + Identity / Access Management <a href='#'><i
                                class="fas fa-external-link-alt"></i></a>
                    </li>
                    <li>OHX Backup &amp; Restore <a href='#'><i class="fas fa-external-link-alt"></i></a></li>
                </ul>
            </div>
        </template>
        <ui-tooltip target="sub_openhabx_tr"></ui-tooltip>
        <template data-popover="sub_cloud_tr">
            <div style="max-width: 500px">
                <ul>
                    <li>Amazon Alexa <a href='#'><i class="fas fa-external-link-alt"></i></a></li>
                    <li>Google Home <a href='#'><i class="fas fa-external-link-alt"></i></a></li>
                    <li>IFTTT <a href='#'><i class="fas fa-external-link-alt"></i></a></li>
                </ul>
            </div>
        </template>
        <ui-tooltip target="sub_cloud_tr"></ui-tooltip>
        <template data-popover="sub_integrations_tr">
            <div style="max-width: 500px">
                <ul>
                    <li>Snips Local Voice Recognition Integration <a href='#'><i
                                class="fas fa-external-link-alt"></i></a></li>
                    <li>InfluxDB / Grafana Time Series Integration <a href='#'><i
                                class="fas fa-external-link-alt"></i></a></li>
                </ul>
            </div>
        </template>
        <ui-tooltip target="sub_integrations_tr"></ui-tooltip>
        <template data-popover="sub_ui_tr">
            <div style="max-width: 500px">
                <ul>
                    <li>Dashpanel UI for wall mounted tablets <a href='#'><i
                                class="fas fa-external-link-alt"></i></a></li>
                    <li>Flutter Android/iOS App <a href='#'><i class="fas fa-external-link-alt"></i></a></li>
                    <li>Management Web UI <a href='#'><i class="fas fa-external-link-alt"></i></a></li>
                </ul>
            </div>
        </template>
        <ui-tooltip target="sub_ui_tr"></ui-tooltip>
        <div class="text-center mb-3"><a href="#download"
                class="btn btn-primary btn-impressive">
                <span>Getting started</span>
            </a>
        </div>
    </div>
    <div class="col">
        <div class="header">
            <h4>Cloud connector</h4>
            <i class="img fas fa-cloud text-primary" style="font-size: 60pt;line-height: 120pt;"></i>
        </div>
        <p class="text-center p-2">A steady connection is required for any kind of cloud based service. The
            subscription fee is <button class="btn-link contexthelp" id="sub_cloudfee_tr" title="Context help">as
                low as
                possible</button>.</p>
        <div class="mx-4 mb-2 table">
            <table>
                <tbody>
                    <tr>
                        <td>3</td>
                        <td>Roadmap Influence Points</td>
                    </tr>
                    <tr>
                        <td>&check;</td>
                        <td>Amazon Alexa</td>
                    </tr>
                    <tr>
                        <td>&check;</td>
                        <td>Google Home</td>
                    </tr>
                    <tr>
                        <td>&check;</td>
                        <td>IFTTT</td>
                    </tr>
                    <tr>
                        <td>&check;</td>
                        <td>Online Backups</td>
                    </tr>
                </tbody>
            </table>
        </div>
        <template data-popover="sub_cloudfee_tr">
            <div style="max-width: 500px">
                <p>The subscription fee is as low as possible and covers bandwidth and connection-time costs, 1/4 is
                    taxes and 1/4 is for maintenance.</p>
                <p>The price may drop over time with more users and further implemented cost savings.</p>
            </div>
        </template>
        <ui-tooltip target="sub_cloudfee_tr"></ui-tooltip>
        <div class="text-center mb-3">
            <a href="#download" 
                class="btn btn-primary btn-impressive">
                <span>3€ / Month</span>
            </a>
        </div>
    </div>
    <form class="col" id="subscriptionSupportPlan">
        <div class="header">
            <h4>Support plan</h4>
            <i class="img fas fa-headset text-primary" style="font-size: 60pt;line-height: 120pt;"></i>
        </div>
        <p class="text-center p-2">This plan funds openHAB X development. It also includes dedicated support time.
        </p>
        <div class="mx-4 mb-2 table">
            <table>
                <tbody>
                    <tr>
                        <td><output name="influencepoints">10</output></td>
                        <td>Roadmap Influence Points</td>
                    </tr>
                    <tr>
                        <td><output name="supporttime">15</output></td>
                        <td>Minutes Support Time</td>
                    </tr>
                    <tr>
                        <td><output name="ruletemplates">3</output></td>
                        <td>Rule Template Requests</td>
                    </tr>
                    <tr>
                        <td>&check;</td>
                        <td>Remote access via <a target="_blank" href="https://pagekite.net/">Pagekite</a></td>
                    </tr>
                    <tr>
                        <td><output name="sla">95</output>%</td>
                        <td><button class="btn-link contexthelp" id="sub_sla_tr" title="Context help">Software
                                SLA</button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
        <div style="max-width: 500px;position:fixed;visibility:hidden" data-popover="sub_sla_tr">
            <q>A service-level agreement (SLA) is a commitment between a service provider and a client.
                Particular aspects of the service – quality, availability, responsibilities – are agreed between
                the service provider and the service user.
            </q><br><br>
            <p><output name="sla2">-</output>% means
            <b><output name="sla_hours">-</output>h a day</b> or
            <b><output name="sla_days">-</output> days every 31 days</b>.</p>
            <p>The Software-only SLA is limited to:<br>Cloud Connectors, Rule Engine, IAM-Service, Operating
                Sytem, Hue Emulation + API Access.
                Your own services will be limited to 1/4 of the available memory and 20% CPU-time in SLA mode.
            </p>
            <p>Manipulating the supervisior will free the service provider from any SLA obligations with
                immediate effect.</p>
        </div>
        <ui-tooltip target="sub_sla_tr"></ui-tooltip>
        <div class="text-center mb-3">
            <input type="range" min="10" max="100" value="10" class="slider" id="subscriptionValue">
            <a href="#download" 
                class="btn btn-primary btn-impressive">
                <span><output name="x" for="subscriptionValue">10</output>€ / Month</span>
            </a>
        </div>
    </form>
</div>
<ui-subscription target="subscriptionSupportPlan"></ui-subscription>

## For developers

<blockquote class="blockquote">
    “There Is One Thing Stronger Than All The Armies In The World, And That Is An
    Idea Whose Time Has Come.” <small>– Victor Hugo</small>
</blockquote>

We are organising a hang out every Thursday 6pm EST on Discord. If you are new, check out the
[Developer Documentation](/developer) first.
