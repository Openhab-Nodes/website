+++
title = "Do It Yourself"
author = "David Graeff"
weight = 80
tags = ["DIY","project_chapter"]
summary = "Do it yourself (DIY) is the method of building, modifying, or repairing things without the direct aid of experts or professionals. Learn about hardware and software solutions that easily integrate into OHX. We will also add a weather forecast service into OHX without writing a single line of code."
+++
<link rel="stylesheet" href="/css/diy.css">

<p class="p-4">
Do it yourself" ("DIY") is the method of building, modifying, or repairing things without the direct aid of experts or professionals.
</p>

DIY in this context means that you integrate non-shelf solutions, like self programmed microcontrollers or, for example, an arbitrary internet weather service into openHAB X (OHX) without writing any openHAB X addon. As you might have guessed, you can archive that in two ways.

<img src="/img/doc/diy-2-ways.jpg" class="w-100">

1. Either you craft your device firmware or service software in a way that it speaks a *native* protocol of OHX,
2. or you use any of the inbuild internet and Internet-Of-Things (IoT) protocols, namely [MQTT](https://www.mqtt.org), [CoAP](https://coap.technology/) and [HTTP](https://en.wikipedia.org/wiki/Hypertext_Transfer_Protocol) (including HTTP2 &amp; Websockets).

Option 1 has the big advantage that auto dicovery and configuration works. You can hand your device to any other openHAB X user or move it to a completely fresh installation and it is found and setup with one click.

Integrating an HTTP based weather service is of course only possible via a specific OHX addon or variant 2 and this is what we will look at in the [first part](#integrate-a-weather-service-via-http) of this chapter.

<div style="float:right;clear:both">
<a href="https://homieiot.github.io/" target="_blank" title="Homie (MQTT)" class="card-hover">
    <img src="/img/mqtt_homie.jpg" style="width: 150px" class="m-2">
</a>
<a href="https://www.w3.org/TR/wot-thing-description/" target="_blank" title="W3C WebThings (HTTP)"
    class="card-hover">
    <img src="/img/mozilla_webthings_wordmark.svg" style="width: 150px" class="m-2">
</a>
</div>

The second part [MQTT Homie and Mozilla WebThings](#mqtt-homie-and-mozilla-webthings) is about the two native protocols (MQTT Homie and Mozilla WebThings) that OHX supports to allow auto discovery of Things straight to your OHX Inbox; and where you can find ready to use libraries and solutions.

<span class="badge badge-danger">Advanced</span> In the last section [Automate your Home Cheap And Easy](#automate-your-home-cheap-and-easy) you will learn how to develop a WebThing with the ESP8266 microcontroller, from setting up the developer environment to having a device that you can control via OHX remotely.

# Integrate a Weather service via HTTP

<a href="https://www.weather.gov/" style="float:right;max-width:50%" target="_blank" class="card-hover"><img src="/img/doc/usa-national-weather-service.png" class="w-100"></a>

In this section we are going to integrate a weather forecast service into OHX (without writing an addon).
We are going to use the National Weather Service (USA), because it does not require any form of authorisation.
Usually you want to register to your favourite, locale weather service and use the API Key in your requests.

We are using the HTTP based API. This is exemplary - CoAP and MQTT work in a similar fashion.

To start with, all the endpoints use the API base https://api.weather.gov (as documented on their website). The basic endpoints are all extensions of that original API base to include latitude and longitude values. 

#### Familiarize with the required HTTP endpoints

For this walkthrough, we’re going to get the local weather for Richmond, Va. We’re going to use the following location:

* latitude = 37.540726
* longitude = -77.436050

Lets get the metadata for that location using the metadata endpoint:

    https://api.weather.gov/points/{<latitude>,<longitude>}

So for the Richmond location, this would look like:

    https://api.weather.gov/points/37.540726,-77.436050

A response contains content like this:

```json
{
  "properties": {
     "forecast": "https://api.weather.gov/gridpoints/AKQ/45,76/forecast",
     "forecastHourly": "https://api.weather.gov/gridpoints/AKQ/45,76/forecast/hourly",
     "forecastGridData": "https://api.weather.gov/gridpoints/AKQ/45,76",
  }
}
```

Evaluating the response we find the link for a 12h-period forecast: "https://api.weather.gov/gridpoints/AKQ/45,76/forecast".

A forecast response, again, contains a *properties* key which contains a list of *periods*.
```json
{
  "properties": {
    "periods": [
        {
            "number": 1,
            "name": "Today",
            "startTime": "2019-06-17T11:00:00-04:00",
            "endTime": "2019-06-17T18:00:00-04:00",
            "isDaytime": true,
            "temperature": 93,
            "temperatureUnit": "F",
            "temperatureTrend": null,
            "windSpeed": "6 to 12 mph",
            "windDirection": "SW",
            "icon": "https://api.weather.gov/icons/land/day/sct/tsra_hi,40?size=medium",
            "shortForecast": "Mostly Sunny then Chance Showers And Thunderstorms",
            "detailedForecast": "A chance of showers and thunderstorms between 2pm and 5pm, ..."
        },
    ]
  }
}
```

#### Channel topology

We now need to decide on the channel topology.
One way is to create two Things called **WeatherForecast12hoursPeriod** for a 12hours period and **WeatherForecast1hourPeriod** for a 1h forecast period. We then assign a few channels for today and tomorrow and for now, in 1h, in 2h, in 3h respectively.

    [Addon] HTTP -> [Thing] WeatherForecast12hoursPeriod -> [Channel] Today (Number, Unit: °F)
                                                         -> [Channel] Tonight (Number, Unit: °F)
                                                         -> [Channel] Tomorrow (Number, Unit: °F)
                                                         -> [Channel] Tomorrow Night (Number, Unit: °F)
                 -> [Thing] WeatherForecast1hourPeriod -> [Channel] Now (Number, Unit: °F)
                                                       -> [Channel] In1h (Number, Unit: °F)
                                                       -> [Channel] In2h (Number, Unit: °F)
                                                       -> [Channel] In3h (Number, Unit: °F)

#### Define channels via Channel configurations

The channel configuration can be performed entirely in the graphical interface.
For brevity we will only look at the textual representation of the first channel *Today (Number, Unit: °F)* though.
If you are interested in all channel configuration options of the http addon, check the documentation page out:
[HTTP Addon](/addons/http).

A channel is by default read-only and a http channel in particular is by default a GET request with no additional http headers attached. Have a look at the channel definition:

{{< highlight yaml "linenos=table" >}}
today:
    context: Temperature
    image:
        uri: https://api.weather.gov/icons/land/day/sct/tsra_hi,40?size=medium
    type: integer
    unit: °F
    http_in:
        cache: 180 # Cache time in minutes
        uri: https://api.weather.gov/gridpoints/AKQ/45,76/forecast
    processors_in:
        - jsonpath:
            path: $.properties.periods[0].temperature # http://jsonpathfinder.com/ helps here
{{< / highlight >}}

We choose an **image** (can be a statically uploaded image or an internet URL), a type, [unit](/developer/addons#unit-of-measurement) and where to get the data from. For an http channel that is set via the **http_in** configuration.

As we already know the data is a json encoded object. In OHX we use so called *processors* to transform an input to another value. Via **processors_in** we can define one or multiple [processors](/userguide/channellinks#processors). We use the *jsonpath* processor to extract the temperature. 

The **context** refers to a specific defined schema, in our case the value represents a "Temperature". This helps user interfaces to render the channel correctly.
Schema repositories can be found at http://iotschema.org/ and https://iot.mozilla.org/schemas). The graphical interface will show a selection.

#### A few notable things

That's it for our weather forecast integration. 

A non read-only (writable) http channel would need to have `http_out` and probably a method like *post* and an authorisation header to be defined. You can find all options in the documentation: [HTTP Addon](/addons/http).
 
MQTT (and CoAP) speaking devices can be integrated in a very similar fashion, you would just define an *mqtt_subscribe* and *mqtt_publish* topics for retrieving and sending values. See [MQTT Addon](/addons/mqtt) and [CoAP Addon](/addons/coap).

# MQTT Homie and Mozilla WebThings

As you have seen in the previous section, integrating a device or service via the generic protocol support is feasible but not something that you want to repeat very often. You might want to have a look at [Addon Development](/developer/addons) if you are interested in developing reusable addons.

Another option is to let your device or service speak a language (protocol) that OHX understands.
OHX supports two major initiatives on top of MQTT and HTTP respectively:

<a href="https://homieiot.github.io/" target="_blank" title="Homie (MQTT)" class="card-hover">
    <img src="/img/mqtt_homie.jpg" style="width: 150px" class="m-2">
</a>
<a href="https://www.w3.org/TR/wot-thing-description/" target="_blank" title="W3C WebThings (HTTP)"
    class="card-hover">
    <img src="/img/mozilla_webthings_wordmark.svg" style="width: 150px" class="m-2">
</a>

Both initiatives have ready-to-go libraries and instructions for multiple programming languages and device form factors. No matter if you want to program an Arduino, an ESP8266 or ARM microcontroller or an x86/ARM computer system.

* WebThings: https://iot.mozilla.org/framework/#things-framework-intro
* Homie: https://homieiot.github.io/implementations/

In the following tutorial you will implement a WebThing on a cheap WiFi enabled microcontroller.

# Automate your Home Cheap And Easy

<div class="bs-callout bs-callout-info mb-3">
<span class="badge badge-danger">Advanced</span> The target audience are Tinkerers &amp; Makers.
If you do not understand an abbreviation or term, please feel encouraged to research.
</div>

Espressif Systems (A Shanghai-based Semiconductor Company) has released an adorable, bite-sized WiFi enabled microcontroller – ESP8266, at an unbelievable price! For about US $3, it can monitor and control things from anywhere in the world – perfect for your Garage Door control, Light switch, Light Dimmer and so on.

### Commercial products 

There are commercial products using the ESP8266 that can be programmed with your own firmware.
(Soldering might be required.)

<div style="display:flex;flex-basis: 45%;">
<a href="https://homieiot.github.io/" target="_blank" title="Homie (MQTT)" class="card-hover text-center">
    <img src="/img/doc/shelly1.jpg" class="p-2 w-100">
    <h3>Shelly.Cloud</h3>
</a>
<a href="https://www.w3.org/TR/wot-thing-description/" target="_blank" title="W3C WebThings (HTTP)"
    class="card-hover text-center">
    <img src="/img/doc/sonoff.jpg" class="p-2 w-100">
    <h3>Sonoff</h3>
</a>
</div>

<div class="text-center pt-3">
<p>A non extensive list of firmare projects that support those devices with detailed instructions are the following.</p>

<a href="https://esphome.io/" target="_blank"
    title="ESPHome is a framework that tries to provide the best possible use experience for using ESP8266/ESP32"
    class="card-hover">
    <img src="/img/logo-esphome.svg" style="height: 3em;width: 200px" class="m-2">
</a>
<a href="https://esphome.io/" target="_blank"
    title="ESPHome is a framework that tries to provide the best possible use experience for using ESP8266/ESP32"
    class="card-hover">
    <img src="/img/TASMOTA_FullLogo_Vector.svg" style="height: 3em;width: 200px" class="m-2">
</a>
<a href="https://github.com/letscontrolit/ESPEasy#espeasy-development-branch" target="_blank"
    title="ESPHome is a framework that tries to provide the best possible use experience for using ESP8266/ESP32"
    class="card-hover">
    <span style="display:inline-block;color:black;font-size:2.5em;vertical-align: middle;" class="p-1">ESPEasy</span>
</a>
</div>

The mentioned projects allow out of the box use of the listed commercial products, but also integrate support for a bunch of additional sensors and actors compatible with the ESP8266, ranging from humidity sensors to relais and LED strips.

They do not yet support MQTT Homie or WebThings, yet, but we are in close contact to make that happen.

### NodeMCU

In this tutorial we are going to use the NodeMCU development board. The US $6 board is equipped with an ESP-12E module containing an ESP8266 chip. It can be programmed via USB and allows to connect jumper wires for rapid prototyping without any soldering.

<div class="row esp8266">
    <div class="col-3 features">
        <strong>ESP-12E Chip</strong>
        <p></p>
        <div class="line-container">
            <div class="line1"></div>
            <div class="line2"></div>
        </div>
        <ul>
            <li>Tensilica Xtensa® 32-bit LX106</li>
            <li>80 to 160 MHz Clock Freq.</li>
            <li>128kB internal RAM</li>
            <li>4MB external flash</li>
            <li>802.11b/g/n Wi-Fi transceiver</li>
        </ul>
        <p>For more details about ESP8266 chip and ESP-12E module, refer below datasheet.</p>
        <a class="btn btn-light d-block mb-2" target="_blank" href="#"><i class="fas fa-download"></i> ESP8266 Chip Datasheet</a>
        <a class="btn btn-light d-block" target="_blank" href="#"><i class="fas fa-download"></i> ESP-12E Module Datasheet</a>
    </div>
<div class="col-6">
    <img class="aligncenter size-full wp-image-875"
        src="/img/doc/NodeMCU_DEVKIT_1.0.jpg"
        alt="ESP8266 NodeMCU Hardware Specifications - ESP-12E Chip">
</div>
</div>

There’s also 128 KB RAM and 4MB of Flash memory (for program and data storage) just enough to cope with the large strings that make up web pages, JSON/XML data, and everything we throw at IoT devices nowadays.

The ESP8266 Integrates 802.11b/g/n HT40 Wi-Fi transceiver, so it can not only connect to a WiFi network and interact with the Internet, but it can also set up a network of its own, allowing other devices to connect directly to it. This makes the ESP8266 NodeMCU even more versatile.

## Power Requirement
As the operating voltage range of ESP8266 is 3V to 3.6V, the board comes with a LDO voltage regulator to keep the voltage steady at 3.3V. It can reliably supply up to 600mA, which should be more than enough when ESP8266 pulls as much as 80mA during RF transmissions. The output of the regulator is also broken out to one of the sides of the board and labeled as 3V3. This pin can be used to supply power to external components.

<div class="row esp8266">
    <div class="col-3 features">
        <strong>Power Requirement</strong>
        <p></p>
        <div class="line-container">
            <div class="line1"></div>
            <div class="line2"></div>
        </div>
        <ul>
            <li>Operating Voltage: 2.5V to 3.6V</li>
            <li>On-board 3.3V 600mA regulator</li>
            <li>80mA Operating Current</li>
            <li>20 µA during Sleep Mode</li>
        </ul>
    </div>
<div class="col-6">
    <img class=""
        src="/img/doc/ESP8266-NodeMCU-Hardware-Specifications-Power-Supply.jpg"
        alt="ESP8266 NodeMCU Hardware Specifications - Power Supply">
</div>
</div>

Power to the ESP8266 NodeMCU is supplied via the on-board MicroB USB connector. Alternatively, if you have a regulated 5V voltage source, the VIN pin can be used to directly supply the ESP8266 and its peripherals.

<div class="bs-callout bs-callout-info mb-3">
<h4>WARNING</h4>
The ESP8266 requires a 3.3V power supply and 3.3V logic levels for communication. The GPIO pins are not 5V-tolerant! If you want to interface the board with 5V (or higher) components, you’ll need to do some level shifting.
</div>

## On-board Switches & LED Indicator

The ESP8266 NodeMCU features two buttons. One marked as RST located on the top left corner is the Reset button, used of course to reset the ESP8266 chip. The other FLASH button on the bottom left corner is the download button used while upgrading firmware.

<div class="row esp8266">
    <div class="col-3 features">
        <strong>Multiplexed I/Os</strong>
        <p></p>
        <div class="line-container">
            <div class="line1"></div>
            <div class="line2"></div>
        </div>
        <ul>
            <li>RST – Reset the ESP8266 chip</li>
            <li>FLASH – Download new programs</li>
            <li>Blue LED – User Programmable</li>
        </ul>
    </div>
<div class="col-6">
    <img class=""
        src="/img/doc/ESP8266-NodeMCU-Hardware-Specifications-Reset-Flash-Buttons-LED-Indicators.jpg"
        alt="ESP8266 NodeMCU Hardware Specifications - Multiplexed I/Os">
</div>
</div>

The board also has a LED indicator which is user programmable and is connected to the D0 pin of the board.

## Serial Communication
The board includes CP2102 USB-to-UART Bridge Controller from Silicon Labs, which converts USB signal to serial and allows your computer to program and communicate with the ESP8266 chip.

<div class="row esp8266 mb-3">
    <div class="col-3 features">
        <strong>Serial Communication</strong>
        <p></p>
        <div class="line-container">
            <div class="line1"></div>
            <div class="line2"></div>
        </div>
        <ul>
            <li>CP2102 USB-to-UART converter</li>
            <li>4.5 Mbps communication speed</li>
            <li>Flow Control support</li>
        </ul>
    </div>
<div class="col-6">
    <img class=""
        src="/img/doc/ESP8266-NodeMCU-Hardware-Specifications-CP2102-USB-to-TTL-Converter.jpg"
        alt="ESP8266 NodeMCU Hardware Specifications - CP2102 USB to TTL Converter">
</div>
</div>

If you have an older version of CP2102 driver installed on your PC, we recommend upgrading now.

<center>
<a class="btn btn-primary" target="_blank" href="https://www.silabs.com/products/development-tools/software/usb-to-uart-bridge-vcp-drivers"><i class="fas fa-download"></i> CP2102 Driver</a>
</center>

## ESP8266 NodeMCU Pinout

The ESP8266 NodeMCU has total 30 pins that interface it to the outside world. The connections are as follows:

<center><img src="/img/doc/ESP-12E-Development-Board-ESP8266-NodeMCU-Pinout.jpg"></center>

<span class="badge badge-gpio">GPIO Pins</span> ESP8266 NodeMCU has 17 GPIO pins which can be assigned to various functions such as I2C, I2S, UART, PWM, IR Remote Control, LED Light and Button programmatically. Each digital enabled GPIO can be configured to internal pull-up or pull-down, or set to high impedance. When configured as an input, it can also be set to edge-trigger or level-trigger to generate CPU interrupts.

## ESP8266 Development Platforms

Now, let’s move on to the interesting stuff!

There are a variety of development platforms that can be equipped to program the ESP8266. You can go with [Mongoose OS](https://mongoose-os.com/) – An operating system for IoT devices (recommended platform by Espressif Systems and Google Cloud IoT) or use a software development kit (SDK) provided by Espressif or one of the platforms listed on [Wikipedia](https://en.wikipedia.org/wiki/ESP8266#SDKs).

Fortunately, the amazing ESP8266 community took the IDE selection a step further by creating an Arduino add-on. If you’re just getting started programming the ESP8266, this is the environment we recommend beginning with, and the one we’ll document in this tutorial.

This ESP8266 add-on for Arduino is based on the amazing work by [Ivan Grokhotkov](https://github.com/igrr) and the rest of the ESP8266 community. Check out the [ESP8266 Arduino GitHub repository](https://github.com/esp8266/Arduino) for more information.

1. Install Visual Studio Code (VSCode) and PlatformIO: https://platformio.org/platformio-ide
2. Within VSCode clone the Moziall WebThings repository for ESP8266 development.
   * Open the Command Palette (`Ctrl+Shift+P`) and enter `Git: Clone`.
   * You will be asked for the repository url. Enter `git@github.com:mozilla-iot/webthing-arduino.git` and confirm.
   * Select a directory and confirm to open the repository after it has been cloned.
3. Open PlatformIO Home via the Command Palette (`Ctrl+Shift+P`): `PlatformIO: Home` and open the project `examples/PlatformIO/Led`.

## Enter Wifi Credentials and Upload Firmware

<img style="float:right;clear:both;height:350px" src="/img/doc/diy-vscode-pio-example.png">

You can navigate through the files of this project in the `Explorer` (`Ctrl+Shift+E`). Open the file `src/LED.cpp`.

Around line 16 you will find the following lines:

```cpp
//TODO: Hardcode your wifi credentials here (and keep it private)
const char* ssid = "";
const char* password = "";
```

Enter your WiFi credentials. This example project will expose the inbuild LED as a WebThing that we can control in a few moments from openHAB X.

Build the project via the **PlatformIO: Home** screen or via the task commander (`Ctrl+Alt+T`). Enter or select: `PlatformIO:Build (nodemcuv2)`.

<img style="max-width:600px" src="/img/doc/diy-vscode-pio-task.jpg">

A terminal window should open at the bottom half of the screen and succeed with the build after all relevant packages have been downloaded and necessary files are compiled.

Connect your NodeMCU board to your developer PC and execute `PlatformIO:Upload (nodemcuv2)` via the task commander (`Ctrl+Alt+T`) or the **PlatformIO: Home** screen.

After completion, the led should start blinking and turn off after a connection to your Wifi has been established.

Open "http://w25.local/things/led" in a Webbrowser - You might need to wait a few seconds. A modern operating system is able to resolve `.local` addresses (mDNS). You are now talking to your WebThing. You can issue commands directly via the Browser and request the current Thing state.

## Add to openHAB X

Navigate to your openHAB X Inbox and approve the automatically discovered WebThing.

<img style="max-width:600px" src="/img/doc/diy-inbox.png">
