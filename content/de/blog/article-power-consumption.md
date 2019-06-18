+++
title = "Little adventures in determining battery dimensions for Wifi enabled products"
date = "2019-05-10T13:07:31+02:00"
archives = "2019"
tags = ["iot"]
categories = ["lorem"]
author = "David Graeff"
+++

At some point in time, when the low energy Zigbee and Bluetooth LE as well as the new proposed [Wi-Fi HaLow](https://www.wi-fi.org/news-events/newsroom/wi-fi-alliance-introduces-low-power-long-range-wi-fi-halow) are more common, it will be a lot easier to optimize for long battery runtime with known patterns. Unfortunately we are not quite there yet. If you need to stick to the Wi-Fi 802.11 standard and want to conserve power, your application needs some adaption and you are usually required to highly interact with the operating system or firmware framework to control the Wi-Fi sleep states.
<!--more-->
Let us dive into a power consumption analysis of the ESP8266, our recently used Wi-Fi enabled processing unit.
All good stories start with a [Data-sheet](https://espressif.com/sites/default/files/documentation/0a-esp8266ex_datasheet_en.pdf).

The ESP8266 supports the power states "Modem-sleep", "Light-sleep" and "Deep-sleep" with the characteristics shown in the table below:


| Item         | Modem-sleep | Light-sleep | Deep-sleep |
|--------------|:-----------:|:-----------:|------------|
| Wi-Fi        | OFF         |     OFF     | OFF        |
| System clock | ON          |     OFF     | OFF        |
| Real time cl.| ON          |      ON     | ON         |
| CPU          | ON          |   Pending   | OFF        |

Typical power consumption for some operations and power states in mA with a core voltage of 3.3V can be found in the next table:

| Mode                                             |  Min | Unit |
|--------------------------------------------------|:----:|:---:|
| Transmit 802.11b, CCK 1Mbps, POUT=+19.5dBm       | 215  |  mA |
| Transmit 802.11b, CCK 11Mbps, POUT=+18.5dBm      | 197  |  mA |
| Transmit 802.11g, OFDM 54Mbps, POUT =+16dBm      | 145  |  mA |
| Transmit 802.11n, MCS7, POUT=+14dBm              | 135  |  mA |
| Receive 802.11b, packet length=1024 byte, -80dBm | 60   |  mA |
| Receive 802.11g, packet length=1024 byte, -70dBm | 60   |  mA |
| Receive 802.11n, packet length=1024 byte, -65dBm | 62   |  mA |
| Standby                                          | 0.9  | mA  |
| Deep sleep                                       | 10   | µA  |
| Total shutdown                                   | 0.5  | µA  |

What you need to know is that Wi-Fi access points send periodic packets (beacon frames) to confirm that they are still available.
The 802.11 standards define a power-save mode for client devices.
In power-save mode, a client device may choose to sleep for one or more beacon intervals.
A DTIM (Delivery Traffic Indication Message) is included in beacon frames, according to the DTIM period,
to indicate to the client devices whether the access point has buffered broadcast and/or multicast data waiting for them.
When the DTIM period is 2, a client device in power-save mode will awaken to receive every other beacon frame. Upon entering power-save mode, a client device will transmit a notification to the access point. The client device will begin to sleep according to the negotiated DTIM period.

## Which ESP8266 powerstate to use
It very much depends on the use-cases and application type if you are able to use the lowest of all offered sleep states.
Modem-sleep is the default mode for the ESP8266.

### Deep sleep
If your external stimula (real time clock or pin change) is not going to happen often, this is the right power save mode for you.
The manufacturer, Espressif, recommends to enter Deep-sleep if you are going to sleep for longer than two seconds and do not need to be connected to the Wi-Fi network all the time.

We recently developed a battery conservative, portable product that could use the processors deep sleep mode.
The goal was to notify a Wi-Fi connected monitoring station and a mobile application if a light barrier got interrupted. A 3µA comperator (MCP65R41) circuit allowed us to trigger the processors wake-up (reset) pin when the light beam got interrupted. The entire circuit including voltage regulator to compensate battery discharge takes 77µA peak power in deep sleep mode. This will last for years.


### Light-sleep

As with deep-sleep an external stimula is required to wake-up the CPU.
But in contrast to deep-sleep the device stays connected to the WiFi by respecting the DTIM intervals.
Waking up from Light-sleep only takes about [3ms](https://www.espressif.com/sites/default/files/9b-esp8266-low_power_solutions_en_0.pdf).
The next table compares power usage of modem and light-sleep:

| Item    | Modem-sleep | Light-sleep | Deep-sleep |
|---------|:-----------:|:-----------:|------------|
| DTIM 1  | 16.2 mA     |    1.8 mA   | -          |
| DTIM 3  | 15.4 mA     |    0.9 mA   | -          |
| DTIM 10 | 15.2 mA     |   0.55 mA   | -          |

## How does the power considerations affect your code?

**Deep-sleep**: They way this is implemented on the ESP8266, a deep-sleep basically ends your program. An external stimulation (real time clock or pin change) restarts the processor and begins running the user program from the very beginning.
Depending on if you want RF calibration to happen after waking up, the wake-up time varies between 150ms, as seen in the next graph, up to 350ms for a full RF calibration. The manufacturers framework allows to influence RF calibration with these APIs:

* `system_deep_sleep_set_option(uint8_t)`: 0: RF calibration happens in intervals; Interval depends on flash config value, 1: always calibrate, 2: No calibration, 3: Disable the transmitter after wake-up
* `system_phy_set_rfoption(uint8_t)`: Like `system_deep_sleep_set_option` but set and evaluated on wake-up.
* `system_phy_set_powerup_option(uint8_t)`: 0: Depends on flash config value, 1: only calibrate VDD33 and Tx power (~18ms), 2:  only calibrate VDD33 (~2ms), 3: full calibration (~200ms)

Because you can't save complex state information (except a few bytes in the RTC itself), IP negotation (IPv4 DHCP, IPv6 Stateless autoconfiguration) and the protocol handshakes and state synchronisation very likely have to happen again.

Let us have a look at an example and used application protocols and how modem-sleep and light-sleep affects power consumption.
Next image shows our basic product, with a push button and a visual indicator.

[FIG1]

Specifications to meet:

* We allow 1 second to pass from the moment of the WiFi event triggering to lightning up of the indicator.
* The aimed operating time is a full day of 24 hours.

Our example product is using a lwm2m application protocol stack.
lwM2M is based on CoAP which itself is transported via UDP packets.
CoAP is configured to require acknowdlege packets, so receiving always involves sending as well.
DTLS is used to encrypt the traffic.
lwM2M as well as DTLS need a successful handshake before exchanging data.

In lwM2M terminology our device is a lwM2M client.

The LwM2M protocol uses a lifetime parameter, negotiated with a connected server.
The client is required to confirm the active session before the lifetime ends.
If no session refresh interval is missed, one handshake per device power-on is enough.
A 5 second value allows us to quickly react if a client failed.

A lwM2M server connection can be set to queue mode, which means the server will queue messages if the client reported to be offline / in battery saving mode.

**Modem-sleep**: The low-lowel framework enters modem-sleep automatically according to the DTIM interval.
In general, the application should batch data to be send, to leave modem-sleep as few times as possible.

**Light-sleep**:

The ESP8266 processor is switched off and needs to be woken up via an external GPIO or the real time clock.

Your application design is ideally mono-threaded with each module of your program reporting its next required wake-up time in milliseconds.
Each main loop iteration is finished with a request to put the CPU to sleep for the minimum of all reported times.

If you are in a pre-emptive or coperative threaded model, your scheduler need to be extended to put the CPU to sleep during idle periods.
The Espressif frameworks scheduler does this for us, so a simple call to `delay` is enough:

```cpp
  wifi_set_sleep_type(LIGHT_SLEEP_T);
  ...
  delay(1000);  //  Put the esp to sleep for 1s
```

The next figure quantifies power consumption while sending, receiving and while in modem- or light sleep.

[grpah]

The black graph shows the power consumption within a 5 second period, using automatic modem-sleep.
Observing 5 seconds is sufficient to compute the devices power consumption, because the comsumption pattern repeats every 5 seconds.

The DTIM interval is 3, which means every 300ms a beacon contains a DTIM and the modem needs to wake-up.
If no data is queued at the access point, the ESP immediately goes down to modem-sleep again.
The lwm2m session lifetime is 5 seconds and 10% before the lifetime ends, we are going to refresh the session (at about 4500ms).
Two requests are made, first all lwm2m resources are requested, a second time only the light indicator state is requested.

If we just exploit modem-sleep, this gives us a mean power consumption of `~22.7mA`.

We now define a sleep time **S** in milliseconds, that is initialized to 5 seconds on each new event loop iteration.
The following pseudo code demonstrates the processing flow and manipulation of **S**:

```cpp
void loop() {
    if (!wifi_connected()) { return; }
    
    int S = 5*1000; // Init to 5 seconds in ms
    
    // If dtls session established
    if (!dtls_process_handshake(&S)) {
        // lwm2m state machine processing
        lwm2m_process(&S);
    }
    
    if (S > 100)
        delay(S);
}
```

If **S** is above a specific threshold **T**, we put the modem and processor into sleep.

If you look at the diagram again, the blue graph shows the power consumption within a 5 second period, using light-sleep.
As you can see, the circuit is mostly in light-sleep, only waking up for the DTIM intervals.

If we exploit light-sleep, this gives us a mean power consumption of `~4.9mA` which is just a quarter of the modem-sleep consumption.

The light indicator is a bank of leds with a power rating of 100mA on 3.3V.
With an average of 10 events an hour and 15 seconds on-time/event we get 60 min runtime/24h. This makes another `4.1mA` to consider in the overall sum.

For modem sleep and light sleep with a very conservative 90% efficiency voltage regulator the battery dimensions for 24h runtime is as follows:

|          |   Modem-Sleep  | Light-Sleep |
|----------|:--------------:|:-----------:|
| ESP8266  |         22.7mA |       4.9mA |
| Leds     |          4.1mA |       4.1mA |
|          |                |             |
| Formular | 24h*26.8mA/90% | 24h*9mA/90% |
| Battery  |   = 714.6mAh   |  = 240.0mAh |

Just to get an idea: A Limskey Lipo battery with 300mAh costs about 1,84€ pp, the 800mAh model is 2,42€ pp.

### Conserve even more power

With an access points beacon interval of 100ms and a DTIM period of 10, the mean power consumption drops to `~1.8mA`.
Assuming that we have a less strict specification and allow the light indicator to react within 5 seconds of an external event,
we could save even more battery by exploiting the lwm2m server queue mode and are down to `1mA`.

To complete the picture let us quickly compute the required battery capacity: `24h * 5mA / 90% = 133.3mAh`.
An even cheaper 150mAh battery model would suffice under this conditions.

## Conclusion

We discussed the energy saving technique for 802.11, the Wi-Fi standard, and how exploiting specific hardware abilities affect program design.
Because product specifications influence it's power characteristics considerabily as seen in the last section, consequences should best
be discussed early as it can potentially save you money by an order of magnitudes.

Stay tuned for a follow up blog series about the beauty of C++ abstractions and how they help to produce maintainable and at the same time
optimal, small assembler code, reducting the overall processing time.
