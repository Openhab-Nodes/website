<div class="bs-callout ml-md-2" style="float:right;max-width:350px">
    <h2>Author's Note</h2>
    <p>
        When I started this project, I already had been a long time contributor to the <a
            href="https://www.openhab.org">openHAB</a> project.
        I once decided to give openHAB a go, because of its well defined concepts to unify amongst so many different
        devices.
    </p>
    <p><button class="btn-link contexthelp" id="leaking_openhab" title="Context help">Technical insufficiencies</button>
        makes it not the best of a candidate for a long-running, stable, self-healing system.</p>
    <p>It's monolithic architecture executes addons in-process, preventing any modern security mechanisms for process
        isolation, capability or resource restrictions.</p>
    <template data-popover="leaking_openhab">
        <div style="max-width: 500px">
            <h2>Leaking ressources</h2>
            <ul>
                <li>Openhab filling up Memory and Swap:
                    <a href="https://community.openhab.org/t/openhab-filling-up-memory-and-swap/63394">https://community.openhab.org/t/openhab-filling-up-memory-and-swap/63394</a>
                </li>
                <li>Extreme CPU and Memory Load since 2.5 Build 1579: <a href="https://github.com/openhab/openhab-core/issues/829">https://github.com/openhab/openhab-core/issues/829</a>
                </li>
            </ul>
            <h2>REST API</h2>
            <ul>
                <li>Problems with the current REST API:
                    <a href="https://github.com/openhab/openhab-webui/issues/24#issuecomment-493075190">https://github.com/openhab/openhab-webui/issues/24#issuecomment-493075190</a>
                    </li>
            </ul>
        </div>
    </template>
    <ui-tooltip target="leaking_openhab"></ui-tooltip>
    <p>Let's learn from design mistakes of the past! openHAB X's greatest ambition is to eliminate the trade-offs that
        home automation users have accepted for so long by providing safety and productivity, speed and ergonomics. </p>
    <p>Give openHAB X a try and see if its choices work for you.</p>
    <p>— David Graeff</p>
</div>
