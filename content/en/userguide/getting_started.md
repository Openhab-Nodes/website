+++
title = "Getting Started"
author = "David Graeff"
weight = 10
+++

You've got a few options.

{{< col3md >}}

{{< img src="/img/raspberry-pi-3-case-enclosure.jpg" title="Standalone"  maxwidth="300px" height="220px">}}

OHX comes as a [standalone](#standalone) SD-Card Image for the Raspberry PI Hardware Bundle.

This is the easiest and most secure way to get a copy of OHX running.

<split>

{{< imgicon src="fab fa-docker" title="Container" color="var(--primary)" maxwidth="300px" height="220px">}}

There is also a [container](#container) ("Docker") based installation for Windows, Mac OS or Linux.

You want this option to try OHX out and if you want to manage the operating system yourself. The provided container is stateless (easy updates!) and you only need to provide a writable directory and network connection.

<split> 

{{< imgicon src="fas fa-laptop-code" color="var(--primary)" title="From Source"  maxwidth="300px" height="220px">}}

A third option is to dowload the open sourced services that OHX is composed of and build and start those individually.

Head over to the [Developer Documentation](/developer) for more information, if interested.

{{< /col3md >}}

Minimal OHX Requirements (including basic Addons):

* 256 MB Memory
* 1GHz Dual Core x86 or ARM CPU

## Standalone

{{< colpic >}}

<img src="/img/rasp-pi-3_-starterkit-1.jpg" style="" class="w-100">

<split>

What you will need:

* Powersupply (minimum 2.5A)
* A Raspberry Pi® 3B (minimum*)
* Casing
* A microSD card (minimum 8GB, class 10)
* A microSD card Writer

Starter Kit Set - Retailer:<br>
<a target="_blank" href="https://core-electronics.com.au/raspberry-pi-3-starter-kit-34285.html"
    class="btn btn-sm btn-outline-dark my-2">Australia</a>
<a target="_blank"
    href="https://www.amazon.de/Almost-Anything-Ltd-Raspberry-Offizielles/dp/B07CZLWPLF/ref=sr_1_20?ie=UTF8&keywords=raspberry%20pi%203&language=en_GB&qid=1559931725&s=gateway&sr=8-20"
    class="btn btn-sm btn-outline-dark my-2">Europe</a>
<a target="_blank"
    href="https://www.amazon.com/CanaKit-Raspberry-Complete-Starter-Kit/dp/B01C6Q2GSY/ref=sr_1_18?keywords=Raspberry+Pi&qid=1559931481&s=gateway&sr=8-18"
    class="btn btn-sm btn-outline-dark my-2">USA / Canada</a>
    
*: The Raspberry Pi® 3 is the recommended, but only one of many single board computer options. You will find download links for other systems down below.

{{< /colpic >}}

{{< callout >}}
Note: The Raspberry Pi 3 and 4 come with Wi-Fi and Bluetooth radios. Optional USB dongles help with Zigbee and Z-Wave.
{{< /callout >}}

{{< col3md >}}
<h4>Zigbee Dongles</h4>

[Digi XStick](https://www.digi.com/products/xbee-rf-solutions/boxed-rf-modems-adapters/xstick) (ZB mesh version),
[ConBee Zigbee USB stick](https://phoscon.de/conbee),
[ConBee II Zigbee USB stick](https://phoscon.de/en/conbee2) also available on [Amazon](https://www.amazon.com/dresden-elektronik-ConBee-Universal-Gateway/dp/B07PZ7ZHG5)

<split>

<h4>ZWave Dongles</h4>

[Sigma Designs UZB Stick](http://www.vesternet.com/z-wave-sigma-designs-usb-controller), [Aeotec Z-Stick](http://aeotec.com/z-wave-usb-stick) (Gen5), Any [OpenZWave compatible dongle](https://github.com/OpenZWave/open-zwave/wiki/Controller-Compatibility-List)

{{< /col3md >}}

{{< col3md >}}
#### Offline Voice Control

A microphone array is required. Head mounted on the Raspberry PI: [ReSpeaker-4-Mic-Array](https://www.seeedstudio.com/ReSpeaker-4-Mic-Array-for-Raspberry-Pi-p-2941.html)

Offline Voice Control is implemented via [Snips.ai](https://www.snips.ai).
Snips Satelites like the [Snips AIR](https://www.snips.ai) can be used for recording voice.

<split>

{{< /col3md >}}

### 1. Download Image
<small class="muted">Latest Version:
<ui-tooltip maxwidth>
<button class="btn-link contexthelp" title="Context help" slot="button">{{< getversion tag_name >}}</button>
    <dl>
        {{< changelogs >}}
    </dl>
</ui-tooltip>
</small>

<div style="display:inline">
<a href="{{< readdata browser_download_url rpi3-64 >}}" title="{{< readdata name rpi3-64 >}}"
    class="btn btn-dwnload">
    <img src="/img/raspberrypi.png" style="height: 1em" class="mr-2">
    <span>RPI 3</span>
</a>
<ui-tooltip maxwidth>
<button class="btn btn-dwnload" title="Context help" slot="button">Other &#9660;</button>
<dl>
    {{< listofdownloads >}}
</dl>
</ui-tooltip>
</div>

Please uncompress the downloaded file with any tool that can handle `gz` files (7-Zip, WinRar, `tar xfv` etc).

### 2. Flash Image
There are various methods of flashing the downloaded image onto your microSD card. We recommend using <a href="https://www.balena.io/etcher/" target="_blank">Etcher</a>.

<div class="flashimage">
<div class="title">
{{< readdata name rpi3-64 >}}
</div>
<img src="/img/doc/etcher_screenshot.png">
</div>

1. Insert your SD card | 2. Select the downloaded image | 3. Select your SD card as the target | 4. Click “Flash!”

### 3. Boot Raspberry Pi

<img src="/img/doc/plug_in.png">

1. Insert the flashed microSD card into your Raspberry Pi
1. Plug in any USB dongles
1. Connect the power supply to boot the Pi. The first boot takes about 2 minutes. The software adapts your SD-Card and configures the hardware.
1. Connect to your network

{{< col3md >}}
#### Wired

Connect the Raspberry Pi to your home network using an Ethernet cable.
Type in “http://gateway.local” into your web browser to connect to it.

<split>

#### Wireless

When the gateway starts up it will create a Wi-Fi hotspot called “OHX XXXX” with XXXX being 4 device specific characters. Once connected the welcome screen should pop up. If not, type in “http://gateway.local” into your web browser.

{{< /col3md >}}

Skip to [First Time Setup](#first-time-setup).

## Container

A software container allows one or muliple applications to run in an isolated, defined environment.
The most known implementation for containers is [Docker](https://www.docker.io) and runs on all major operating systems. 

OHX requires the [Redis Key-Value Database](https://redis.io) as well as [Influx Time Series Database](https://influxdata.com).

The command line on any operating system will allow to download required images via:

```
docker pull {{< readdata name x86 >}}
docker pull redis
docker pull influxdb
docker pull keycloak
```

Download and use the [Docker Compose](https://example.com) file to run the full OHX distribution.

## First Time Setup

The first time setup process will guide you through the last installation steps.

{{< colpic ratio="50"  >}}
### 1. Optional WiFi Setup

Select your home network from the list and enter your Wi-Fi password to connect.
<img src="/img/features/connect_to_wifi.png" class="w-100">

<split>
### 2. Create User Account
Enter your login name or email address and a password to create your administrative user account.

<img src="/img/features/create_account.png" class="w-100">
{{< /colpic >}}

## Setup &amp; Maintenance interface

After you have finished the initial setup, you will see the welcome screen of the Setup &amp; Maintenance interface.
Throughout the guide, references to different pages are given like this: <a class="demolink" href="">Things</a> for example.

You generally use *Setup &amp; Maintenance* for administering your installation, add and remove addons as well as configuring Things and connections between Things. Remember that you can always log into the interface by entering “http://gateway.local” into your webbroser (as long as you haven't changed the respective configuration).

Learn in the next chapter on how to administer your OHX installation including how to create additional user accounts.
