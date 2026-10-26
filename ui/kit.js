// The drawing kit the KubeVirt pages share: icons, chips and buttons, the
// honeycomb of machines, the machine's "screen" badge, meters, the tooltip,
// the charts, the guard that keeps a poll from redrawing whatever is under
// the user's pointer, the page state each view remembers per cluster, and the
// table that sorts and filters by any column.
//
// Everything that came from the cluster is written with textContent, never
// innerHTML: the frame is sandboxed, but a page that let a machine's name run
// as markup would be handing that name the bridge.
(function () {
    'use strict';

    var M = window.KubeVirt;
    var SVG = 'http://www.w3.org/2000/svg';
    var FALLBACK = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'];

    function el(tag, className, text) {
        var node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined && text !== null) node.textContent = text;
        return node;
    }

    function add(parent) {
        for (var i = 1; i < arguments.length; i++) {
            var child = arguments[i];
            if (child === null || child === undefined || child === false || child === '') continue;
            parent.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
        }
        return parent;
    }

    function svg(tag, attrs) {
        var node = document.createElementNS(SVG, tag);
        Object.keys(attrs || {}).forEach(function (k) {
            node.setAttribute(k, attrs[k]);
        });
        return node;
    }

    // Single-stroke icons on a 24-unit grid. The action icons carry the same
    // names the manifest gives them (play, pause, repeat, power, forward, stop).
    var ICONS = {
        logo: ['M3 4.5h18v12H3z', 'M8.5 20h7', 'M12 16.5V20', 'M12 7l3.2 1.8v3.6L12 14.2l-3.2-1.8V8.8z', 'M12 10.6l3.2-1.8', 'M12 10.6v3.6', 'M12 10.6L8.8 8.8'],
        monitor: ['M3 5h18v11H3z', 'M8 20h8', 'M12 16v4'],
        play: ['M7 4.5v15l12-7.5z'],
        pause: ['M7 5h3.5v14H7z', 'M13.5 5H17v14h-3.5z'],
        stop: ['M6 6h12v12H6z'],
        power: ['M12 3v8', 'M6.3 6.3a8 8 0 1 0 11.4 0'],
        repeat: ['M17 2l4 4-4 4', 'M3 11V9a4 4 0 0 1 4-4h14', 'M7 22l-4-4 4-4', 'M21 13v2a4 4 0 0 1-4 4H3'],
        forward: ['M3 8h5v8H3z', 'M16 8h5v8h-5z', 'M9.5 12h5', 'M12.5 10l2 2-2 2'],
        alert: ['M12 3l10 18H2z', 'M12 10v4', 'M12 17.5h.01'],
        check: ['M4 12.5l5 5L20 6.5'],
        close: ['M6 6l12 12', 'M18 6L6 18'],
        arrow: ['M5 12h14', 'M13 6l6 6-6 6'],
        open: ['M14 4h6v6', 'M20 4l-9 9', 'M18 14v6H4V6h6'],
        edit: ['M4 20h4L19 9l-4-4L4 16z', 'M14 6l4 4'],
        clock: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M12 7v5l3 2'],
        search: ['M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z', 'M20 20l-4-4'],
        cpu: ['M7 7h10v10H7z', 'M10 10h4v4h-4z', 'M9.5 3v4', 'M14.5 3v4', 'M9.5 17v4', 'M14.5 17v4', 'M3 9.5h4', 'M3 14.5h4', 'M17 9.5h4', 'M17 14.5h4'],
        memory: ['M3 7h18v9H3z', 'M7 10v3', 'M11 10v3', 'M15 10v3', 'M6 16v3', 'M10 16v3', 'M14 16v3', 'M18 16v3'],
        disk: ['M3 13.5h18V19H3z', 'M5 13.5L8 5h8l3 8.5', 'M7 16.3h.01', 'M10 16.3h.01'],
        network: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M3.5 12h17', 'M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9', 'M12 3c-2.5 2.5-3.5 5.5-3.5 9s1 6.5 3.5 9'],
        node: ['M4 5h16v5H4z', 'M4 14h16v5H4z', 'M7.5 7.5h.01', 'M7.5 16.5h.01'],
        pod: ['M20 8 12 4 4 8v8l8 4 8-4V8z', 'M4 8l8 4 8-4', 'M12 12v8'],
        windows: ['M4 5.5l7-1V11H4z', 'M13 4.2l7-1V11h-7z', 'M4 13h7v6.5l-7-1z', 'M13 13h7v7.8l-7-1z'],
        linux: ['M4 5h16v14H4z', 'M7.5 9.5l3 2.5-3 2.5', 'M12.5 15h4'],
        activity: ['M3 12h4l3-8 4 16 3-8h4'],
        chart: ['M4 4v16h16', 'M8 15l3-4 3 2 5-6'],
        grid: ['M4 4h7v7H4z', 'M13 4h7v7h-7z', 'M4 13h7v7H4z', 'M13 13h7v7h-7z'],
        logs: ['M5 3.5h14v17H5z', 'M8.5 8h7', 'M8.5 12h7', 'M8.5 16h4'],
        layers: ['M12 3 3 8l9 5 9-5-9-5z', 'M3 13l9 5 9-5'],
        bolt: ['M13 3L5 14h6l-1 7 8-11h-6z'],
        pin: ['M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11z', 'M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z'],
        tag: ['M3 12V4h8l10 10-8 8z', 'M7.5 8.5h.01'],
        lock: ['M6 11h12v9H6z', 'M8.5 11V8a3.5 3.5 0 0 1 7 0v3'],
        agent: ['M8 4h8v5H8z', 'M5 9h14v11H5z', 'M9 13h.01', 'M15 13h.01', 'M9.5 17h5'],
        settings: ['M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3.9a7 7 0 0 0-2.1-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2.1 1.2l-2.3-.9-2 3.4 2 1.5a7 7 0 0 0 0 2.4l-2 1.5 2 3.4 2.3-.9a7 7 0 0 0 2.1 1.2L10 21h4l.5-2.6a7 7 0 0 0 2.1-1.2l2.3.9 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z'],
        rows: ['M4 5h16', 'M4 10h16', 'M4 15h16', 'M4 20h16'],
        sort: ['M8 4v16', 'M4.5 7.5 8 4l3.5 3.5', 'M16 20V4', 'M12.5 16.5 16 20l3.5-3.5'],
        'chevron-up': ['M6 14.5l6-6 6 6'],
        'chevron-down': ['M6 9.5l6 6 6-6'],
    };

    function icon(name, className) {
        var node = svg('svg', { viewBox: '0 0 24 24', class: 'ico' + (className ? ' ' + className : ''), 'aria-hidden': 'true' });
        (ICONS[name] || ICONS.monitor).forEach(function (d) {
            node.appendChild(svg('path', { d: d }));
        });
        return node;
    }

    function chip(text, tone, iconName, title) {
        var node = el('span', 'chip' + (tone ? ' ' + tone : ''));
        if (iconName) node.appendChild(icon(iconName));
        node.appendChild(el('span', '', text));
        if (title) node.title = title;
        return node;
    }

    var GROUP_ICON = { running: 'play', paused: 'pause', migrating: 'forward', changing: 'clock', stopped: 'stop', failing: 'alert' };

    function stateChip(machine) {
        var text = machine.stuck ? machine.status + ' (stuck)' : machine.status;
        return chip(text, machine.tone, GROUP_ICON[machine.group], machine.reason || '');
    }

    function button(text, className, iconName, onClick) {
        var node = el('button', className || '');
        node.type = 'button';
        if (iconName) node.appendChild(icon(iconName));
        if (text) node.appendChild(el('span', '', text));
        if (onClick) node.addEventListener('click', onClick);
        return node;
    }

    function link(text, onClick, title) {
        var node = el('button', 'link', text);
        node.type = 'button';
        if (title) node.title = title;
        node.addEventListener('click', onClick);
        return node;
    }

    function ago(t) {
        if (!t) return '';
        var seconds = Math.max(0, (Date.now() - t) / 1000);
        if (seconds < 10) return 'just now';
        if (seconds < 90) return Math.round(seconds) + 's ago';
        if (seconds < 5400) return Math.round(seconds / 60) + 'm ago';
        if (seconds < 172800) return Math.round(seconds / 3600) + 'h ago';
        return Math.round(seconds / 86400) + 'd ago';
    }

    function span(t) {
        if (!t) return '';
        var seconds = Math.max(0, (Date.now() - t) / 1000);
        if (seconds < 90) return Math.round(seconds) + 's';
        if (seconds < 5400) return Math.round(seconds / 60) + 'm';
        if (seconds < 172800) return Math.round(seconds / 3600) + 'h';
        return Math.round(seconds / 86400) + 'd';
    }

    // The badge a machine is drawn with: a small screen tinted by its state,
    // showing what it runs.
    function screen(machine, size) {
        var node = el('span', 'screen ' + machine.tone + (size ? ' ' + size : '') + (machine.group === 'changing' ? ' busy' : '') + (machine.group === 'migrating' ? ' moving' : ''));
        node.appendChild(icon(machine.os.family === 'windows' ? 'windows' : machine.os.family === 'linux' ? 'linux' : 'monitor'));
        return node;
    }

    // A stacked bar of counts, each segment labelled underneath.
    // segments: [{ label, count, tone, id }]
    function stackBar(segments, onPick) {
        var total = segments.reduce(function (s, x) {
            return s + x.count;
        }, 0);
        var wrap = el('div', 'stack');
        var bar = el('div', 'stack-bar');
        var keys = el('div', 'stack-keys');
        segments.forEach(function (seg) {
            if (!seg.count) return;
            var part = el('i', 'seg ' + seg.tone);
            part.style.flexGrow = String(seg.count);
            part.title = seg.label + ': ' + seg.count;
            bar.appendChild(part);
            var key = onPick
                ? button('', 'stack-key', null, function () {
                      onPick(seg);
                  })
                : el('span', 'stack-key');
            add(key, el('i', 'dot ' + seg.tone), el('span', '', seg.label), el('strong', '', String(seg.count)));
            keys.appendChild(key);
        });
        if (!total) bar.appendChild(el('i', 'seg muted empty'));
        add(wrap, bar, keys);
        return wrap;
    }

    function fillTone(fraction) {
        if (fraction >= 0.95) return 'error';
        if (fraction >= 0.8) return 'warn';
        return 'ok';
    }

    // A thin bar filled to a fraction, tinted by how full it is.
    function meter(fraction, tone) {
        var node = el('span', 'meter ' + (tone || fillTone(fraction)));
        var fill = el('i');
        fill.style.width = fraction > 0 ? Math.min(100, Math.max(2, fraction * 100)) + '%' : '0';
        node.appendChild(fill);
        return node;
    }

    function percent(fraction) {
        if (!isFinite(fraction) || fraction <= 0) return '0%';
        if (fraction < 0.01) return '<1%';
        return Math.round(fraction * 100) + '%';
    }

    // ----- the honeycomb -----------------------------------------------------

    // Every machine as a hexagon, worst first: filled by its state, hollow
    // when it is stopped, a moving rim while it migrates. Sized to fit, so a
    // cluster with four hundred machines gets smaller cells, not a scrollbar.
    // opts: { width, maxHeight, onPick(key) }
    function honeycomb(machines, opts) {
        var width = Math.max(180, opts.width || 400);
        var n = Math.max(1, machines.length);
        var r = 18;
        var cols;
        for (;;) {
            var w0 = Math.sqrt(3) * r;
            cols = Math.max(1, Math.floor((width - w0 / 2) / (w0 + 3)));
            var rows = Math.ceil(n / cols);
            if (rows * (r * 1.5 + 3) < (opts.maxHeight || 230) || r <= 7) break;
            r -= 1;
        }
        // A handful of machines is a short row, not a wide one; and the rows
        // are evened out, so sixteen cells are two rows of eight rather than
        // fifteen and one left over.
        cols = Math.min(cols, n);
        cols = Math.ceil(n / Math.ceil(n / cols));
        var w = Math.sqrt(3) * r;
        var stepX = w + 3;
        var stepY = r * 1.5 + 3;
        var rowsUsed = Math.ceil(machines.length / cols);
        var H = rowsUsed * stepY + r * 0.5 + 6;
        var W = cols * stepX + (rowsUsed > 1 ? stepX / 2 : 0) + 4;

        var node = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'hive', role: 'img' });
        node.setAttribute('aria-label', M.plural(machines.length, 'virtual machine'));
        node.style.maxWidth = W + 'px';

        function hexPath(cx, cy, rr) {
            var pts = [];
            for (var i = 0; i < 6; i++) {
                var a = (Math.PI / 180) * (60 * i - 90);
                pts.push((cx + rr * Math.cos(a)).toFixed(1) + ',' + (cy + rr * Math.sin(a)).toFixed(1));
            }
            return pts.join(' ');
        }

        machines.forEach(function (m, i) {
            var row = Math.floor(i / cols);
            var col = i % cols;
            var cx = col * stepX + w / 2 + 2 + (row % 2 ? stepX / 2 : 0);
            var cy = row * stepY + r + 3;
            var cell = svg('polygon', {
                points: hexPath(cx, cy, r - (m.group === 'stopped' ? 1 : 0)),
                class: 'cell ' + m.tone + ' g-' + m.group + (m.stuck ? ' stuck' : ''),
                tabindex: '0',
                role: 'button',
            });
            cell.setAttribute('aria-label', m.name + ', ' + m.status);
            cell.dataset.key = m.key;
            node.appendChild(cell);
        });

        node.addEventListener('click', function (event) {
            var cell = event.target.closest && event.target.closest('.cell');
            if (cell && opts.onPick) opts.onPick(cell.dataset.key);
        });
        node.addEventListener('keydown', function (event) {
            if ((event.key === 'Enter' || event.key === ' ') && event.target.classList.contains('cell') && opts.onPick) {
                event.preventDefault();
                opts.onPick(event.target.dataset.key);
            }
        });
        return node;
    }

    // ----- the tooltip -------------------------------------------------------

    // One floating tip for a root, filled by `describe` for whatever element
    // matching `selector` is under the pointer.
    function tooltip(root, selector, describe) {
        var tip = el('div', 'tip');
        tip.hidden = true;
        tip.setAttribute('role', 'tooltip');
        document.body.appendChild(tip);

        function place(event) {
            var pad = 14;
            var x = event.clientX + pad;
            var y = event.clientY + pad;
            if (x + tip.offsetWidth > window.innerWidth - 8) x = event.clientX - tip.offsetWidth - pad;
            if (y + tip.offsetHeight > window.innerHeight - 8) y = event.clientY - tip.offsetHeight - pad;
            tip.style.left = Math.max(8, x) + 'px';
            tip.style.top = Math.max(8, y) + 'px';
        }

        root.addEventListener('pointerover', function (event) {
            var target = event.target.closest && event.target.closest(selector);
            if (!target) return;
            tip.textContent = '';
            if (!describe(target, tip)) {
                tip.hidden = true;
                return;
            }
            tip.hidden = false;
            place(event);
        });
        root.addEventListener('pointermove', function (event) {
            if (!tip.hidden) place(event);
        });
        root.addEventListener('pointerout', function (event) {
            var target = event.target.closest && event.target.closest(selector);
            if (target && !target.contains(event.relatedTarget)) tip.hidden = true;
        });
        return tip;
    }

    function specLine(m) {
        return [m.cpu.text, m.memory.text].filter(Boolean).join(' · ');
    }

    function describeMachine(m, into) {
        var head = el('div', 'tip-head');
        add(head, screen(m, 'small'), el('strong', 'tip-title', m.name));
        into.appendChild(head);
        into.appendChild(el('div', 'tip-sub', m.namespace + (m.node ? ' · on ' + m.node : '')));
        var chips = el('div', 'tip-chips');
        chips.appendChild(stateChip(m));
        if (m.os.pretty) chips.appendChild(chip(m.os.pretty, 'muted'));
        into.appendChild(chips);
        var spec = specLine(m);
        if (spec) into.appendChild(el('div', 'tip-sub', spec));
        if (m.ips.length) into.appendChild(el('div', 'tip-sub mono', m.ips.slice(0, 3).join(', ')));
        if (m.moving) into.appendChild(el('div', 'tip-sub', 'Migrating ' + (m.moving.source || '?') + ' → ' + (m.moving.target || '…')));
        if (m.reason && m.group !== 'running') into.appendChild(el('div', 'tip-note', m.reason));
        return true;
    }

    // ----- a migration in flight ---------------------------------------------

    // Source node, a track with a guest moving along it, and the target.
    function flight(migration, onNode) {
        var row = el('div', 'flight' + (migration.failed ? ' failed' : migration.inFlight ? ' live' : ' done'));
        function end(name, cls) {
            var box = el('span', 'flight-node ' + cls);
            box.appendChild(icon('node'));
            if (name && onNode) {
                box.appendChild(
                    link(name, function () {
                        onNode(name);
                    }),
                );
            } else {
                box.appendChild(el('span', 'faint', name || (cls === 'to' ? 'choosing…' : '?')));
            }
            return box;
        }
        var track = el('span', 'flight-track');
        track.appendChild(el('i', 'flight-guest'));
        add(row, end(migration.source, 'from'), track, end(migration.target, 'to'));
        return row;
    }

    // ----- charts ------------------------------------------------------------

    function formatValue(v, unit) {
        if (!isFinite(v)) return '—';
        switch (unit) {
            case 'count':
                return String(Math.round(v));
            case 'cores':
                return v >= 10 ? String(Math.round(v)) : v >= 1 ? v.toFixed(2).replace(/0$/, '') : Math.round(v * 1000) + 'm';
            case 'bytes':
                return M.bytes(v);
            case 'bytes/s':
                return M.bytes(v) + '/s';
            case 'ops/s':
                return (v >= 100 ? Math.round(v) : Math.round(v * 10) / 10) + '/s';
            case 'seconds':
                return v >= 1 ? (Math.round(v * 10) / 10) + 's' : Math.round(v * 1000) + 'ms';
            case 'percent':
                return Math.round(v * 100) + '%';
        }
        return Math.abs(v) >= 100 ? String(Math.round(v)) : String(Math.round(v * 100) / 100);
    }

    function chartColour(i) {
        return 'var(--chart-' + Math.min(i + 1, 8) + ', ' + FALLBACK[Math.min(i, 7)] + ')';
    }

    // One chart as an area per series: y from zero, a gap where Prometheus had
    // no sample, and each series' latest value in the legend.
    // colour(name, i) picks each series' colour.
    function sparkChart(chart, colour) {
        colour = colour || function (name, i) {
            return chartColour(i);
        };
        var card = el('article', 'chart');
        var head = el('div', 'chart-head');
        head.appendChild(el('h3', '', chart.label));
        if (chart.description) head.title = chart.description;
        card.appendChild(head);

        var series = (chart.series || []).filter(function (s) {
            return s.points && s.points.length > 0;
        });
        if (chart.error || series.length === 0) {
            card.classList.add('empty');
            card.appendChild(el('p', 'quiet', chart.error || 'No data for this window.'));
            return card;
        }
        var minT = Infinity;
        var maxT = -Infinity;
        var maxV = 0;
        series.forEach(function (s) {
            s.points.forEach(function (p) {
                minT = Math.min(minT, p.t);
                maxT = Math.max(maxT, p.t);
                if (isFinite(p.v)) maxV = Math.max(maxV, p.v);
            });
        });
        if (maxT === minT) maxT = minT + 1;
        var top = maxV > 0 ? maxV * 1.15 : 1;
        var W = 600;
        var H = 120;
        var x = function (t) {
            return ((t - minT) / (maxT - minT)) * W;
        };
        var y = function (v) {
            return H - (v / top) * H;
        };
        var step = (maxT - minT) / 60;

        var plot = el('div', 'chart-plot');
        var node = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, preserveAspectRatio: 'none', class: 'spark' });
        [0.25, 0.5, 0.75].forEach(function (f) {
            node.appendChild(svg('line', { x1: 0, x2: W, y1: H * f, y2: H * f, class: 'gridline' }));
        });
        series.forEach(function (s, i) {
            var runs = [];
            var run = [];
            s.points.forEach(function (p, j) {
                var gapHere = j > 0 && p.t - s.points[j - 1].t > step * 3;
                if (!isFinite(p.v) || gapHere) {
                    if (run.length) runs.push(run);
                    run = [];
                    if (!isFinite(p.v)) return;
                }
                run.push(p);
            });
            if (run.length) runs.push(run);
            var c = colour(s.name, i);
            runs.forEach(function (r) {
                var line = r
                    .map(function (p, j) {
                        return (j ? 'L' : 'M') + x(p.t).toFixed(1) + ' ' + y(p.v).toFixed(1);
                    })
                    .join(' ');
                var area = svg('path', { d: line + ' L' + x(r[r.length - 1].t).toFixed(1) + ' ' + H + ' L' + x(r[0].t).toFixed(1) + ' ' + H + ' Z', class: 'area' });
                area.style.fill = c;
                node.appendChild(area);
                var stroke = svg('path', { d: line, class: 'line' });
                stroke.style.stroke = c;
                node.appendChild(stroke);
            });
        });
        plot.appendChild(node);
        plot.appendChild(el('span', 'chart-max', formatValue(maxV, chart.unit)));
        card.appendChild(plot);

        var legend = el('div', 'chart-legend');
        series.forEach(function (s, i) {
            var last = s.points[s.points.length - 1];
            var key = el('span', 'key');
            var dot = el('i', 'dot');
            dot.style.background = colour(s.name, i);
            add(key, dot, el('span', 'key-name', s.name || chart.label), el('strong', '', formatValue(last.v, chart.unit)));
            legend.appendChild(key);
        });
        card.appendChild(legend);
        return card;
    }

    // ----- events --------------------------------------------------------------

    var EVENT_ICON = { VirtualMachine: 'monitor', VirtualMachineInstance: 'cpu', VirtualMachineInstanceMigration: 'forward', DataVolume: 'disk', KubeVirt: 'settings' };

    // A timeline of events. onOpen(event) opens what one is about.
    function eventList(events, onOpen, opts) {
        opts = opts || {};
        var list = el('ol', 'timeline' + (opts.compact ? ' compact' : ''));
        events.forEach(function (ev) {
            var item = el('li', 'tl' + (ev.type === 'Warning' ? ' warn' : ''));
            var mark = el('span', 'tl-mark');
            mark.appendChild(icon(ev.type === 'Warning' ? 'alert' : EVENT_ICON[ev.kind] || 'activity'));
            item.appendChild(mark);
            var body = el('div', 'tl-body');
            var line = el('div', 'tl-line');
            if (!opts.hideName && ev.name) {
                line.appendChild(
                    onOpen
                        ? link(ev.name, function () {
                              onOpen(ev);
                          })
                        : el('strong', '', ev.name),
                );
                line.appendChild(document.createTextNode(' '));
            }
            line.appendChild(el('span', '', M.eventText(ev)));
            body.appendChild(line);
            var meta = [ago(ev.when)];
            if (ev.count > 1) meta.push(ev.count + '×');
            if (ev.kind) meta.push(ev.kind.replace(/^VirtualMachine/, 'VM').replace(/^VMInstanceMigration$/, 'Migration').replace(/^VMInstance$/, 'Instance'));
            if (!opts.hideName && ev.namespace) meta.push(ev.namespace);
            if (ev.reason) meta.push(ev.reason);
            body.appendChild(el('div', 'tl-meta', meta.filter(Boolean).join(' · ')));
            item.appendChild(body);
            list.appendChild(item);
        });
        return list;
    }

    // ----- running an action -------------------------------------------------

    // Asks the app to run one of this plugin's actions on a machine. The app
    // asks the user first, every time; a "no" is not an error worth showing.
    function run(sdk, actionId, machine) {
        return sdk.run(actionId, { namespace: machine.namespace, name: machine.name }).then(
            function (res) {
                return { done: true, created: (res && res.created) || '' };
            },
            function (err) {
                if (/declined/.test((err && err.message) || '')) return { done: false, created: '' };
                throw err;
            },
        );
    }

    function actionButton(action, className, onClick) {
        var b = button(action.label, (className || '') + (action.tone === 'danger' ? ' danger' : '') + (action.id === 'start' || action.id === 'unpause' || action.id === 'instance-unpause' ? ' primary' : ''), action.icon, onClick);
        b.dataset.action = action.id;
        return b;
    }

    function machineRef(m) {
        return { kind: m.kind, namespace: m.namespace, name: m.name };
    }

    // ----- not under the pointer ---------------------------------------------

    function busyIn(region) {
        try {
            if (region.matches(':hover')) return true;
            var active = document.activeElement;
            if (!active || active === document.body || !region.contains(active)) return false;
            if (/^(INPUT|SELECT|TEXTAREA)$/.test(active.tagName)) return true;
            return active.matches(':focus-visible');
        } catch (e) {
            return false;
        }
    }

    // Redraws a region with `draw` now, unless the user is pointing at it or
    // typing in it -- then once they have left it. A poll must not pull a
    // button out from under a click, or a row out from under a tooltip.
    function calm(region, draw) {
        if (!region || !busyIn(region)) {
            if (region) region._later = null;
            draw();
            return true;
        }
        region._later = draw;
        if (!region._calmHooked) {
            region._calmHooked = true;
            var retry = function () {
                setTimeout(function () {
                    var later = region._later;
                    if (later && !busyIn(region)) {
                        region._later = null;
                        later();
                    }
                }, 80);
            };
            region.addEventListener('pointerleave', retry);
            region.addEventListener('focusout', retry);
        }
        return false;
    }

    // ----- the grip ----------------------------------------------------------

    // A grab strip on the inner edge of a panel on the right: drag it, or
    // focus it and use the arrow keys, to make the panel wider or narrower; a
    // double-click puts it back. The width is a custom property on the root,
    // so the panel and whatever makes room for it read the one value -- unset,
    // the stylesheet's own width stands. The page places the strip, and keeps
    // the width wherever it keeps the rest of its state.
    // opts: { panel, prop, min, room, initial, label, className, onResize(px, done) }
    //   room      what the panel always leaves of the window
    //   onResize  px is 0 once the panel is back to the stylesheet's width;
    //             done is false while a drag goes on, true when it ends
    function grip(opts) {
        var root = document.documentElement;
        var node = el('div', 'grip' + (opts.className ? ' ' + opts.className : ''));
        node.tabIndex = 0;
        node.title = 'Drag to resize · double-click to reset';
        node.setAttribute('role', 'separator');
        node.setAttribute('aria-orientation', 'vertical');
        node.setAttribute('aria-label', opts.label || 'Resize the panel');
        var wanted = opts.initial > 0 ? opts.initial : 0;
        var drag = null;
        var frame = 0;

        function fit(px) {
            return Math.round(Math.max(opts.min, Math.min(px, window.innerWidth - opts.room)));
        }

        // The width asked for is kept as asked: a smaller window takes what it
        // must from the panel and gives it back when it grows again.
        function apply() {
            if (wanted) root.style.setProperty(opts.prop, fit(wanted) + 'px');
            else root.style.removeProperty(opts.prop);
        }

        // While a drag goes on the page hears of it once a frame at most.
        function tell(done) {
            if (!opts.onResize) return;
            cancelAnimationFrame(frame);
            frame = 0;
            if (done) opts.onResize(wanted, true);
            else
                frame = requestAnimationFrame(function () {
                    frame = 0;
                    opts.onResize(wanted, false);
                });
        }

        function resize(px, done) {
            wanted = px ? fit(px) : 0;
            apply();
            tell(done);
        }

        function release(event) {
            if (!drag) return;
            drag = null;
            document.body.classList.remove('gripping');
            if (node.hasPointerCapture(event.pointerId)) node.releasePointerCapture(event.pointerId);
            tell(true);
        }

        node.addEventListener('pointerdown', function (event) {
            if (event.button !== 0) return;
            event.preventDefault();
            node.setPointerCapture(event.pointerId);
            drag = { x: event.clientX, from: opts.panel.getBoundingClientRect().width };
            document.body.classList.add('gripping');
        });
        node.addEventListener('pointermove', function (event) {
            // The panel is on the right: it grows as the pointer goes left.
            if (drag) resize(drag.from + drag.x - event.clientX, false);
        });
        node.addEventListener('pointerup', release);
        node.addEventListener('pointercancel', release);
        node.addEventListener('dblclick', function () {
            resize(0, true);
        });
        node.addEventListener('keydown', function (event) {
            var step = event.shiftKey ? 48 : 16;
            var now = wanted || opts.panel.getBoundingClientRect().width;
            if (event.key === 'ArrowLeft') resize(now + step, true);
            else if (event.key === 'ArrowRight') resize(now - step, true);
            else return;
            event.preventDefault();
        });
        window.addEventListener('resize', function () {
            if (!wanted) return;
            apply();
            tell(false);
        });
        apply();
        return node;
    }

    // ----- remembering --------------------------------------------------------

    // The app's per-plugin, per-cluster storage (0.0.19 and newer), with every
    // failure swallowed: a page must work without it, keeping state in the hash.
    var store = {
        get: function (key) {
            var bridge = window.k8sdockside;
            if (!bridge || !bridge.storage) return Promise.resolve(null);
            return Promise.resolve()
                .then(function () {
                    return bridge.storage.get(key);
                })
                .catch(function () {
                    return null;
                });
        },
        set: function (key, value) {
            var bridge = window.k8sdockside;
            if (!bridge || !bridge.storage) return Promise.resolve();
            return Promise.resolve()
                .then(function () {
                    return bridge.storage.set(key, value);
                })
                .catch(function () {
                    // Kept in the hash only.
                });
        },
        remove: function (key) {
            var bridge = window.k8sdockside;
            if (!bridge || !bridge.storage) return Promise.resolve();
            return Promise.resolve()
                .then(function () {
                    return bridge.storage.remove(key);
                })
                .catch(function () {
                    // Nothing to do.
                });
        },
    };

    // What the user picked -- a sort, a filter, a search, an open row -- is
    // kept in the frame's hash, so a reload of the frame keeps it. Switching
    // tabs or clusters does not: the app loads the page afresh, without a
    // hash, so the hash is also remembered in the app's storage (per plugin
    // and per cluster) and put back by restoreView.
    function readHash() {
        var out = {};
        (location.hash || '')
            .replace(/^#/, '')
            .split('&')
            .forEach(function (pair) {
                var cut = pair.indexOf('=');
                if (cut <= 0) return;
                try {
                    out[pair.slice(0, cut)] = decodeURIComponent(pair.slice(cut + 1));
                } catch (e) {
                    // A mangled value is left out.
                }
            });
        return out;
    }

    // values: { key: text }; an empty, false or missing value is left out.
    function writeHash(values) {
        var kept = Object.keys(values)
            .filter(function (k) {
                return typeof values[k] === 'string' && values[k] !== '';
            })
            .map(function (k) {
                return [k, values[k]];
            });
        remember(kept);
        var text = kept
            .map(function (kv) {
                return kv[0] + '=' + encodeURIComponent(kv[1]);
            })
            .join('&');
        var hash = text ? '#' + text : '';
        if (hash === location.hash || (!hash && !location.hash)) return;
        try {
            history.replaceState(null, '', hash || location.pathname + location.search);
        } catch (e) {
            // A sandboxed frame may refuse; the page still works.
            try {
                location.hash = text;
            } catch (e2) {
                // Kept in memory only.
            }
        }
    }

    // Keys that point at one object -- the machine whose drawer is open -- are
    // not remembered: coming back to a tab should bring back the search and
    // the filters, not reopen whatever was last looked at, which may be gone
    // by then.
    var FORGOTTEN = ['selected'];
    // How long typing may pause before what was typed is written to storage.
    var REMEMBER_AFTER_MS = 400;

    var viewKey = '';
    var rememberTimer = null;

    function remember(entries) {
        if (!viewKey) return;
        var key = viewKey;
        var value = {};
        entries.forEach(function (kv) {
            if (FORGOTTEN.indexOf(kv[0]) < 0) value[kv[0]] = kv[1];
        });
        clearTimeout(rememberTimer);
        rememberTimer = setTimeout(function () {
            if (Object.keys(value).length) store.set(key, value);
            else store.remove(key);
        }, REMEMBER_AFTER_MS);
    }

    // Puts back what the user last picked on this view, when the page was
    // opened without a hash of its own; a hash that is there -- a reload --
    // wins over what was remembered. From here on, every writeHash is
    // remembered under this view. Call it once sdk.ready() has answered, and
    // read the hash after it settles.
    function restoreView(view) {
        viewKey = 'view:' + view;
        if (location.hash.replace(/^#/, '')) return Promise.resolve();
        return store.get(viewKey).then(function (saved) {
            if (!saved || typeof saved !== 'object') return;
            var values = {};
            Object.keys(saved).forEach(function (k) {
                if (typeof saved[k] === 'string' && FORGOTTEN.indexOf(k) < 0) values[k] = saved[k];
            });
            writeHash(values);
        });
    }

    // Redraws a region, putting keyboard focus back on the element that had
    // it -- found again by its data-focus key -- with the caret where it was,
    // so typing in a filter that redraws its own table goes on uninterrupted.
    // Scroll positions inside the region that carry data-scroll are kept too.
    function keepFocus(region, redraw) {
        var active = document.activeElement;
        var key = active && region.contains(active) && active.dataset ? active.dataset.focus : '';
        var caret = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA') ? { start: active.selectionStart, end: active.selectionEnd } : null;
        var scrolls = {};
        region.querySelectorAll('[data-scroll]').forEach(function (n) {
            scrolls[n.dataset.scroll] = [n.scrollLeft, n.scrollTop];
        });
        redraw();
        region.querySelectorAll('[data-scroll]').forEach(function (n) {
            var at = scrolls[n.dataset.scroll];
            if (!at) return;
            n.scrollLeft = at[0];
            n.scrollTop = at[1];
        });
        if (!key) return;
        var again = Array.prototype.find.call(region.querySelectorAll('[data-focus]'), function (n) {
            return n.dataset.focus === key;
        });
        if (!again) return;
        again.focus({ preventScroll: true });
        if (caret && caret.start !== null && (again.tagName === 'INPUT' || again.tagName === 'TEXTAREA')) {
            try {
                again.setSelectionRange(caret.start, caret.end === null ? caret.start : caret.end);
            } catch (e) {
                // A field without a caret; focus is enough.
            }
        }
    }

    // ----- the table -----------------------------------------------------------

    // One table for a list: any column sorts, any column filters -- a text box
    // under its header, or a pick list for a column with a handful of values --
    // and a row can open in place. The page keeps the table's state in its
    // hash, which restoreView remembers, so coming back to a tab brings the
    // table back as it was left.
    //
    // A column: { id, label, className, title, sort(row), filter(row), pick, cell(row) }
    //   sort    what the column sorts by: numbers as numbers, text as a
    //           person reads it; left out, it does not sort
    //   filter  the text its filter matches; left out, the column has no filter
    //   pick    filter by picking one of the column's values rather than typing
    //   cell    a node, a string, or an array of them
    //
    // Table state: { sort, desc, filters: { columnId: text } }

    // The table's state from the hash: sort, desc, and f.<column> per filter.
    // prefix keeps two tables' keys apart; the defaults fill what is not there.
    function readTable(hash, prefix, sort, desc) {
        prefix = prefix || '';
        var filters = {};
        Object.keys(hash).forEach(function (k) {
            if (k.indexOf(prefix + 'f.') === 0 && hash[k]) filters[k.slice(prefix.length + 2)] = hash[k];
        });
        var d = hash[prefix + 'desc'];
        return { sort: hash[prefix + 'sort'] || sort, desc: d ? d === '1' : desc, filters: filters };
    }

    // The table's state for the hash, leaving out what is the default.
    function tableHash(state, prefix, sort, desc) {
        prefix = prefix || '';
        var out = {};
        out[prefix + 'sort'] = state.sort === sort ? '' : state.sort;
        out[prefix + 'desc'] = state.desc === desc ? '' : state.desc ? '1' : '0';
        Object.keys(state.filters).forEach(function (k) {
            if (state.filters[k]) out[prefix + 'f.' + k] = state.filters[k];
        });
        return out;
    }

    function filtering(state) {
        return Object.keys(state.filters).some(function (k) {
            return !!state.filters[k];
        });
    }

    // Empty last whichever way round, numbers as numbers, text with its
    // numbers in order.
    function compareKeys(a, b) {
        var blankA = a === null || a === undefined || a === '';
        var blankB = b === null || b === undefined || b === '';
        if (blankA || blankB) return blankA === blankB ? 0 : blankA ? 1 : -1;
        if (typeof a === 'number' && typeof b === 'number') return a - b;
        return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
    }

    // The rows every column filter lets through: a pick matches exactly, text
    // anywhere, every word.
    function filterRows(rows, columns, state) {
        var active = columns.filter(function (c) {
            return c.filter && state.filters[c.id];
        });
        if (!active.length) return rows.slice();
        return rows.filter(function (row) {
            return active.every(function (c) {
                var want = state.filters[c.id];
                var have = c.filter(row);
                if (c.pick) return have === want;
                var text = String(have || '').toLowerCase();
                return want
                    .toLowerCase()
                    .split(/\s+/)
                    .filter(Boolean)
                    .every(function (w) {
                        return text.indexOf(w) >= 0;
                    });
            });
        });
    }

    // The rows in the column's order; tie decides between equals, always
    // ascending.
    function sortRows(rows, columns, state, tie) {
        tie =
            tie ||
            function () {
                return 0;
            };
        var col = columns.find(function (c) {
            return c.id === state.sort && c.sort;
        });
        if (!col) return rows.sort(tie);
        return rows.sort(function (a, b) {
            var r = compareKeys(col.sort(a), col.sort(b));
            return (state.desc ? -r : r) || tie(a, b);
        });
    }

    function cellContent(td, content) {
        (Array.isArray(content) ? content : [content]).forEach(function (c) {
            add(td, c);
        });
        return td;
    }

    // opts: { columns, all, rows, key(row), state, onChange(), onOpen(row),
    //         opened(id) -> bool, detail(row), rowClass(row), className, empty }
    //   all       every row: the pick lists are made from these
    //   rows      the rows to draw, already filtered and sorted
    //   onChange  called after the user sorts or filters; the page saves and redraws
    function dataTable(opts) {
        var columns = opts.columns;
        var state = opts.state;
        var table = el('table', 'tbl dtable' + (opts.className ? ' ' + opts.className : ''));

        var head = el('tr');
        columns.forEach(function (col) {
            var th = el('th', col.className || '');
            if (col.title) th.title = col.title;
            if (col.sort) {
                var on = state.sort === col.id;
                var b = el('button', 'th-sort' + (on ? ' on' : ''));
                b.type = 'button';
                b.dataset.focus = 'sort:' + col.id;
                add(b, el('span', '', col.label), icon(on ? (state.desc ? 'chevron-down' : 'chevron-up') : 'sort', 'th-dir'));
                b.setAttribute('aria-label', 'Sort by ' + col.label);
                th.setAttribute('aria-sort', on ? (state.desc ? 'descending' : 'ascending') : 'none');
                b.addEventListener('click', function () {
                    if (state.sort === col.id) state.desc = !state.desc;
                    else {
                        state.sort = col.id;
                        state.desc = false;
                    }
                    opts.onChange();
                });
                th.appendChild(b);
            } else th.textContent = col.label;
            head.appendChild(th);
        });

        var filters = el('tr', 'tbl-filters');
        columns.forEach(function (col) {
            var th = el('th', col.className || '');
            if (col.filter) th.appendChild(filterControl(col, opts));
            filters.appendChild(th);
        });

        var thead = el('thead');
        add(thead, head, filters);
        var tbody = el('tbody');
        opts.rows.forEach(function (row) {
            var id = opts.key(row);
            var open = opts.opened ? opts.opened(id) : false;
            var tr = el('tr', [opts.rowClass ? opts.rowClass(row) : '', opts.onOpen ? 'clickable' : '', open ? 'open' : ''].filter(Boolean).join(' '));
            if (opts.onOpen) {
                tr.tabIndex = 0;
                tr.dataset.focus = 'row:' + id;
                tr.addEventListener('click', function (event) {
                    // A button or link in the row does its own thing.
                    if (event.target.closest('button, a, input, select')) return;
                    opts.onOpen(row);
                });
                tr.addEventListener('keydown', function (event) {
                    if (event.target !== tr) return;
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        opts.onOpen(row);
                    }
                });
                if (opts.opened) tr.setAttribute('aria-expanded', open ? 'true' : 'false');
            }
            columns.forEach(function (col) {
                tr.appendChild(cellContent(el('td', col.className || ''), col.cell(row)));
            });
            tbody.appendChild(tr);
            if (open && opts.detail) {
                var dr = el('tr', 'tbl-detail');
                var td = el('td');
                td.colSpan = columns.length;
                add(td, opts.detail(row));
                dr.appendChild(td);
                tbody.appendChild(dr);
            }
        });
        if (!opts.rows.length) {
            var none = el('tr', 'tbl-none');
            var td = el('td', 'faint', opts.empty || 'Nothing matches these filters.');
            td.colSpan = columns.length;
            none.appendChild(td);
            tbody.appendChild(none);
        }
        add(table, thead, tbody);
        var wrap = el('div', 'tbl-wrap');
        wrap.dataset.scroll = 'table';
        wrap.appendChild(table);
        return wrap;
    }

    function filterControl(col, opts) {
        var value = opts.state.filters[col.id] || '';
        function set(v) {
            if (v) opts.state.filters[col.id] = v;
            else delete opts.state.filters[col.id];
            opts.onChange();
        }
        if (col.pick) {
            var seen = {};
            var values = [];
            opts.all.forEach(function (r) {
                var v = col.filter(r);
                if (v && !seen[v]) {
                    seen[v] = true;
                    values.push(v);
                }
            });
            values.sort(compareKeys);
            if (value && values.indexOf(value) < 0) values.unshift(value);
            var s = el('select', 'tf-select' + (value ? ' on' : ''));
            s.dataset.focus = 'tf:' + col.id;
            s.setAttribute('aria-label', 'Filter ' + col.label);
            var any = el('option', '', 'any');
            any.value = '';
            s.appendChild(any);
            values.forEach(function (v) {
                var o = el('option', '', v);
                o.value = v;
                o.selected = v === value;
                s.appendChild(o);
            });
            s.addEventListener('change', function () {
                set(s.value);
            });
            return s;
        }
        var input = el('input', 'tf-input' + (value ? ' on' : ''));
        input.type = 'search';
        input.value = value;
        input.placeholder = 'filter';
        input.autocomplete = 'off';
        input.spellcheck = false;
        input.dataset.focus = 'tf:' + col.id;
        input.setAttribute('aria-label', 'Filter ' + col.label);
        input.addEventListener('input', function () {
            set(input.value);
        });
        return input;
    }

    // "Clear column filters", for a page's toolbar, when any is set.
    function clearFilters(state, onChange) {
        if (!filtering(state)) return null;
        var b = button('Clear column filters', 'ghost small', 'close', function () {
            state.filters = {};
            onChange();
        });
        b.dataset.focus = 'tf-clear';
        return b;
    }

    // The two-button switch between cards and a table.
    function layoutSwitch(current, onPick) {
        var group = el('div', 'segmented layout-switch');
        group.setAttribute('role', 'group');
        group.setAttribute('aria-label', 'Show as');
        [
            ['cards', 'Cards', 'grid'],
            ['table', 'Table', 'rows'],
        ].forEach(function (it) {
            var b = button(it[1], current === it[0] ? 'on' : '', it[2], function () {
                if (current !== it[0]) onPick(it[0]);
            });
            b.dataset.focus = 'layout:' + it[0];
            b.setAttribute('aria-pressed', current === it[0] ? 'true' : 'false');
            b.title = 'Show as ' + it[1].toLowerCase();
            group.appendChild(b);
        });
        return group;
    }

    window.KubeVirtKit = {
        el: el,
        add: add,
        svg: svg,
        icon: icon,
        chip: chip,
        stateChip: stateChip,
        GROUP_ICON: GROUP_ICON,
        button: button,
        link: link,
        ago: ago,
        span: span,
        screen: screen,
        specLine: specLine,
        stackBar: stackBar,
        meter: meter,
        fillTone: fillTone,
        percent: percent,
        honeycomb: honeycomb,
        tooltip: tooltip,
        describeMachine: describeMachine,
        flight: flight,
        formatValue: formatValue,
        chartColour: chartColour,
        sparkChart: sparkChart,
        eventList: eventList,
        run: run,
        actionButton: actionButton,
        machineRef: machineRef,
        calm: calm,
        grip: grip,
        store: store,
        readHash: readHash,
        writeHash: writeHash,
        restoreView: restoreView,
        keepFocus: keepFocus,
        readTable: readTable,
        tableHash: tableHash,
        filtering: filtering,
        compareKeys: compareKeys,
        filterRows: filterRows,
        sortRows: sortRows,
        dataTable: dataTable,
        clearFilters: clearFilters,
        layoutSwitch: layoutSwitch,
    };
})();
