+++
title = "Corporate Contact"
type = "plain"
+++

<img class="ml-md-3" style="float:right;max-width:500px" src="/img/tiomothy-swope-116695-unsplash.jpg" title="Thanks, Tiomothy Swope on Unsplash">

<blockquote class="blockquote p-4">
    “The Difficulty Lies Not So Much In Developing New Ideas As In Escaping From Old Ones.” <small>– John Maynard Keynes</small>
</blockquote>

openHAB X is a young player on the Home Automation Solutions market.

openHAB X is however also a very efficient and scalable technology, developed with cloud infrastructure expertise in mind. The careful choice of <button class="btn-link contexthelp" id="technology" title="Context help">technology</button> provides industrial grade robustness.

<template data-popover="technology">
<p style="max-width: 500px">
OHX Core shoulders on <b>Rust</b>, the modern, efficient, secure system programming language and relies on <b>EXT4</b> for document storage and <b>REDIS</b> for state management. <b>InfluxDB</b> makes up its long term memory.
</p>
</template>
<ui-tooltip target="technology"></ui-tooltip>

Feature overview:

* Used for Smart Building Automation, Home Automation Solutions,
* Compatible to Zigbee, ZWave, KNX, Modbus and many more industry standards,
* Handles over <button class="btn-link contexthelp" id="benchmark" title="Context help">7000</button> parallel IoT devices on a small single-board computer.

<template data-popover="benchmark">
<p style="max-width: 500px">
Based on a 95%-percentile 50ms response time on a Raspberry PI 3 with the openHAB X Distribution OS 2019-05-30 and simulated http connected WebThings.
</p>
<p>Perform your own benchmark with the <a href="#">Benchmark Tool</a>.
</template>
<ui-tooltip target="benchmark"></ui-tooltip>

<div style="clear:both" class="my-4 py-4"></div>

<h4 class="card-title text-center mb-4">Interested in more details?</h4>
<div style="display:flex;flex-direction:row">
    <div class="col-3" style="align-self: center;text-align:center">
        <img class="mb-2" style="max-width:200px" src="/img/david.jpg">
        <p>David Graeff<br>will be your personal contact</p>
    </div>
    <article class="col-9 card-body" style="max-width: 600px;">
        <form>
            <div class="form-group">
                <div class="input-group">
                    <div class="input-group-prepend">
                        <span class="input-group-text"> <i class="fa fa-user"></i> </span>
                    </div>
                    <input name="name" class="form-control" placeholder="Your Name" type="name">
                </div>
            </div>
            <div class="form-group">
                <div class="input-group">
                    <div class="input-group-prepend">
                        <span class="input-group-text"> <i class="fa fa-building"></i> </span>
                    </div>
                    <input name="company" class="form-control" placeholder="Your Company" type="company">
                </div>
            </div>
            <div class="form-group">
                <div class="input-group">
                    <div class="input-group-prepend">
                        <span class="input-group-text"> <i class="fa fa-envelope"></i> </span>
                    </div>
                    <input name="email" class="form-control" placeholder="Email" type="email">
                </div>
            </div>
            <div class="form-group">
                <div class="input-group">
                    <div class="input-group-prepend">
                        <span class="input-group-text"> <i class="fa fa-font"></i> </span>
                    </div>
                    <input name="subject" class="form-control" placeholder="Subject" type="text" list="subjects">
                </div>
            </div>
            <div class="form-group">
                <button type="submit" class="btn btn-info btn-block"> Get In Contact </button>
            </div>
            <datalist id="subjects">  
            <option value="Other">  
            <option value="I'm interested in Building Automation">
            <option value="I like to have support for my product in OHX">
            </datalist>  
        </form>
    </article>
</div>