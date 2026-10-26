// The Nodes page: every node that carries guests or could, in full -- not the
// first twelve the overview has room for. Each one with whether it is well,
// what it runs (kubelet, OS, kernel, CPU model), how much of it the guests'
// launcher pods have asked for, and every guest on it, which a row opens into
// by name. As cards, or as a table that sorts and filters by any column.
(function () {
    'use strict';

    var sdk = window.k8sdockside;
    var M = window.KubeVirt;
    var K = window.KubeVirtKit;
    var el = K.el;
    var add = K.add;
    var POLL = 5000;

    var SORTS = [
        { id: 'guests', label: 'Guests' },
        { id: 'cpu', label: 'CPU' },
        { id: 'memory', label: 'Memory' },
        { id: 'name', label: 'Name' },
    ];

    var FILTERS = [
        { id: '', label: 'All' },
        { id: 'look', label: 'Needs a look', tone: 'warn' },
        { id: 'cordoned', label: 'Cordoned' },
        { id: 'idle', label: 'No guests' },
    ];

    // The table's own order, when the user has not picked one.
    var TABLE_SORT = 'name';

    var state = {
        ctx: null,
        model: null,
        sig: '',
        query: '',
        sort: 'guests',
        filter: '',
        open: '',
        // 'cards' or 'table'.
        layout: 'cards',
        table: { sort: TABLE_SORT, desc: false, filters: {} },
    };

    var $ = function (id) {
        return document.getElementById(id);
    };

    function fail(err) {
        $('error').textContent = (err && err.message) || String(err);
        $('error').hidden = false;
    }

    function open(ref) {
        sdk.open(ref).catch(fail);
    }

    function openNode(name) {
        open({ kind: M.KINDS.nodes, namespace: '', name: name });
    }

    // The search, the sort, the filter, which rows are open, cards or table
    // and the table's own sort and column filters live in the frame's hash,
    // which the kit also remembers for this plugin and cluster -- so
    // switching tabs or clusters away and back comes back to them.
    function saveHash() {
        var values = {
            q: state.query,
            sort: state.sort === 'guests' ? '' : state.sort,
            filter: state.filter,
            open: state.open,
            view: state.layout === 'table' ? 'table' : '',
        };
        var table = K.tableHash(state.table, 't', TABLE_SORT, false);
        Object.keys(table).forEach(function (k) {
            values[k] = table[k];
        });
        K.writeHash(values);
    }

    function loadHash() {
        var hash = K.readHash();
        state.query = hash.q || '';
        state.sort = hash.sort || 'guests';
        state.filter = hash.filter || '';
        state.open = hash.open || '';
        state.layout = hash.view === 'table' ? 'table' : 'cards';
        state.table = K.readTable(hash, 't', TABLE_SORT, false);
        if (!SORTS.some(function (s) {
            return s.id === state.sort;
        })) state.sort = 'guests';
        if (!FILTERS.some(function (f) {
            return f.id === state.filter;
        })) state.filter = '';
        if (!COLUMNS.some(function (c) {
            return c.id === state.table.sort;
        })) state.table.sort = TABLE_SORT;
        $('query').value = state.query;
    }

    function openSet() {
        return state.open ? state.open.split(',') : [];
    }

    function isOpen(name) {
        return state.open === '*' || openSet().indexOf(name) >= 0;
    }

    function toggle(name) {
        var names = state.open === '*' ? shown(state.model).map(function (n) {
            return n.name;
        }) : openSet();
        var at = names.indexOf(name);
        if (at >= 0) names.splice(at, 1);
        else names.push(name);
        state.open = names.join(',');
        saveHash();
        draw();
    }

    // ----- what is wrong with a node ---------------------------------------------

    // Worst first, each with a tone: what the row's badges say, and what puts
    // a node under "Needs a look".
    function problems(n) {
        var out = [];
        if (!n.ready) out.push({ tone: 'error', text: 'not ready', icon: 'alert', title: n.readyWhy || 'The kubelet is not reporting Ready' });
        if (n.handler === 'missing') out.push({ tone: 'error', text: 'no virt-handler', icon: 'alert', title: 'No virt-handler pod runs here, so no guest can start on this node' });
        if (n.handler === 'not ready') out.push({ tone: 'error', text: 'virt-handler not ready', icon: 'alert', title: 'virt-handler is not ready here: no guest can start on this node until it is' });
        n.pressure.forEach(function (p) {
            out.push({ tone: 'warn', text: p.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase(), icon: 'alert', title: 'The node reports ' + p });
        });
        if (n.cordoned) out.push({ tone: 'warn', text: 'cordoned', icon: 'lock', title: 'No new guest will be placed here' });
        if (n.known && n.cpu && n.cpuFraction >= 0.8) out.push({ tone: K.fillTone(n.cpuFraction), text: 'CPU ' + K.percent(n.cpuFraction), icon: 'cpu', title: 'Guests have asked for ' + M.cores(n.requested.cpu) + ' of ' + M.cores(n.cpu) + ' cores' });
        if (n.known && n.memory && n.memoryFraction >= 0.8) out.push({ tone: K.fillTone(n.memoryFraction), text: 'memory ' + K.percent(n.memoryFraction), icon: 'memory', title: 'Guests have asked for ' + M.bytes(n.requested.memory) + ' of ' + M.bytes(n.memory) });
        if (n.known && !n.kvm) out.push({ tone: 'muted', text: 'no KVM', icon: 'bolt', title: 'Guests here run under software emulation, which is slow' });
        if (n.known && !n.schedulable && n.guests.length) out.push({ tone: 'muted', text: 'not schedulable', icon: null, title: 'virt-handler does not mark this node kubevirt.io/schedulable' });
        if (n.guests.some(function (m) {
            return m.group === 'failing';
        })) out.push({ tone: 'error', text: 'failing guests', icon: 'alert', title: 'A guest on this node is failing' });
        return out;
    }

    function needsLook(n) {
        return problems(n).some(function (p) {
            return p.tone === 'error' || p.tone === 'warn';
        });
    }

    function matchesFilter(n, filter) {
        if (filter === 'look') return needsLook(n);
        if (filter === 'cordoned') return n.cordoned;
        if (filter === 'idle') return !n.guests.length;
        return true;
    }

    function matchesQuery(n) {
        var q = state.query.trim().toLowerCase();
        if (!q) return true;
        var words = [n.name, n.kubelet, n.os, n.kernel, n.arch, n.runtime, n.cpuModel, n.zone]
            .concat(n.roles, n.taints)
            .concat(
                problems(n).map(function (p) {
                    return p.text;
                }),
            )
            .concat(
                n.guests.map(function (m) {
                    return m.namespace + '/' + m.name;
                }),
            );
        return words.some(function (v) {
            return String(v || '').toLowerCase().indexOf(q) >= 0;
        });
    }

    function sorted(nodes) {
        var by = {
            guests: function (a, b) {
                return b.guests.length - a.guests.length;
            },
            cpu: function (a, b) {
                return b.cpuFraction - a.cpuFraction;
            },
            memory: function (a, b) {
                return b.memoryFraction - a.memoryFraction;
            },
            name: function () {
                return 0;
            },
        }[state.sort];
        return nodes.slice().sort(function (a, b) {
            return by(a, b) || a.name.localeCompare(b.name, undefined, { numeric: true });
        });
    }

    function shown(model) {
        if (!model) return [];
        return sorted(
            model.nodes.filter(function (n) {
                return matchesFilter(n, state.filter) && matchesQuery(n);
            }),
        );
    }

    // ----- the strip -------------------------------------------------------------

    function drawStrip(model) {
        var box = $('nstrip');
        box.textContent = '';
        var nodes = model.nodes;
        var ready = nodes.filter(function (n) {
            return n.ready;
        }).length;
        var look = nodes.filter(needsLook).length;
        var hosting = nodes.filter(function (n) {
            return n.guests.length && !needsLook(n);
        }).length;
        var cordoned = nodes.filter(function (n) {
            return n.cordoned;
        }).length;

        var b = el('div', 'bar-block');
        add(
            b,
            el('div', 'bar-title', 'Nodes by state'),
            K.stackBar(
                [
                    { id: 'ok', label: 'Hosting guests', count: hosting, tone: 'ok' },
                    { id: 'look', label: 'Needs a look', count: look, tone: 'warn' },
                    { id: 'idle', label: 'No guests', count: nodes.length - hosting - look, tone: 'muted' },
                ],
                function (seg) {
                    state.filter = seg.id === 'ok' ? '' : seg.id;
                    saveHash();
                    draw();
                },
            ),
        );
        box.appendChild(b);

        var total = { cpu: 0, memory: 0, reqCpu: 0, reqMemory: 0 };
        nodes.forEach(function (n) {
            if (!n.known) return;
            total.cpu += n.cpu;
            total.memory += n.memory;
            total.reqCpu += n.requested.cpu;
            total.reqMemory += n.requested.memory;
        });
        var facts = el('div', 'facts');
        function fact(iconName, big, small, title) {
            var f = el('div', 'fact');
            add(f, K.icon(iconName), el('strong', '', big), el('span', '', small));
            if (title) f.title = title;
            return f;
        }
        add(
            facts,
            fact('node', ready + ' / ' + nodes.length, 'nodes ready'),
            fact('lock', String(cordoned), 'cordoned'),
            fact('cpu', total.cpu ? K.percent(total.reqCpu / total.cpu) : '—', 'CPU asked for', M.cores(total.reqCpu) + ' of ' + M.cores(total.cpu) + ' cores, by the guests’ launcher pods'),
            fact('memory', total.memory ? K.percent(total.reqMemory / total.memory) : '—', 'memory asked for', M.bytes(total.reqMemory) + ' of ' + M.bytes(total.memory) + ', by the guests’ launcher pods'),
        );
        box.appendChild(facts);
    }

    // ----- the controls ----------------------------------------------------------

    function drawSort() {
        var box = $('sort');
        box.textContent = '';
        box.appendChild(el('span', 'seg-label', 'Sort by'));
        SORTS.forEach(function (s) {
            var b = K.button(s.label, state.sort === s.id ? 'on' : '', null, function () {
                state.sort = s.id;
                saveHash();
                drawSort();
                draw();
            });
            b.setAttribute('aria-pressed', state.sort === s.id ? 'true' : 'false');
            box.appendChild(b);
        });
    }

    function drawFilter(model) {
        var box = $('filter');
        box.textContent = '';
        FILTERS.forEach(function (f) {
            var count = model.nodes.filter(function (n) {
                return matchesFilter(n, f.id);
            }).length;
            var b = K.button('', state.filter === f.id ? 'on' : '', null, function () {
                state.filter = f.id;
                saveHash();
                draw();
            });
            if (f.tone && count) b.appendChild(el('i', 'dot ' + f.tone));
            add(b, el('span', '', f.label), el('span', 'seg-count', String(count)));
            b.setAttribute('aria-pressed', state.filter === f.id ? 'true' : 'false');
            box.appendChild(b);
        });
        var all = $('expand-all');
        all.textContent = '';
        var everyOpen = state.open === '*';
        add(all, K.icon(everyOpen ? 'close' : 'grid'), el('span', '', everyOpen ? 'Collapse all' : 'Expand all'));
    }

    // Cards or a table, and -- with the table -- the button that clears its
    // column filters.
    function drawTools() {
        var table = state.layout === 'table';
        $('sort').hidden = table;
        var clear = $('tclear');
        clear.textContent = '';
        if (table) {
            add(
                clear,
                K.clearFilters(state.table, function () {
                    saveHash();
                    drawTools();
                    draw();
                }),
            );
        }
        var box = $('layout');
        K.keepFocus(box, function () {
            box.textContent = '';
            box.appendChild(
                K.layoutSwitch(state.layout, function (layout) {
                    state.layout = layout;
                    saveHash();
                    drawTools();
                    draw();
                }),
            );
        });
    }

    // ----- one node --------------------------------------------------------------

    function spec(n) {
        var parts = [];
        if (n.roles.length) parts.push(n.roles.join(', '));
        if (n.kubelet) parts.push('kubelet ' + n.kubelet);
        if (n.arch) parts.push(n.arch);
        if (n.zone) parts.push(n.zone);
        if (n.created) parts.push('up ' + K.span(n.created));
        return parts.join(' · ');
    }

    function meters(n) {
        var box = el('div', 'host-meters');
        if (!(n.known && n.cpu)) {
            box.appendChild(el('span', 'faint small', 'capacity unknown'));
            return box;
        }
        [
            ['CPU', n.cpuFraction, M.cores(n.requested.cpu) + ' / ' + M.cores(n.cpu), M.cores(n.requested.cpu) + ' of ' + M.cores(n.cpu) + ' cores asked for by guests'],
            ['Memory', n.memoryFraction, M.bytes(n.requested.memory) + ' / ' + M.bytes(n.memory), M.bytes(n.requested.memory) + ' of ' + M.bytes(n.memory) + ' asked for by guests'],
        ].forEach(function (r) {
            var row = el('div', 'meter-row wide');
            row.title = r[3];
            add(row, el('span', 'meter-label', r[0]), K.meter(r[1]), el('span', 'meter-num ' + K.fillTone(r[1]), K.percent(r[1])), el('span', 'meter-abs faint', r[2]));
            box.appendChild(row);
        });
        return box;
    }

    function guestCells(n) {
        var guests = el('div', 'host-guests');
        if (!n.guests.length) guests.appendChild(el('span', 'faint small', 'no guests'));
        n.guests.forEach(function (m) {
            var g = K.button('', 'guest ' + m.tone + ' g-' + m.group, null, function () {
                open(K.machineRef(m));
            });
            g.dataset.key = m.key;
            g.setAttribute('aria-label', m.name + ', ' + m.status);
            guests.appendChild(g);
        });
        if (n.guests.length) guests.appendChild(el('span', 'host-count', M.plural(n.guests.length, 'guest') + ' · ' + M.plural(n.vcpus, 'vCPU') + ' · ' + M.bytes(n.guestMemory)));
        return guests;
    }

    function facts(n) {
        var rows = [
            ['OS', n.os],
            ['Kernel', n.kernel],
            ['Runtime', n.runtime],
            ['CPU model', n.cpuModel],
            ['Allocatable', n.cpu ? M.cores(n.cpu) + ' cores · ' + M.bytes(n.memory) + (n.pods ? ' · ' + n.pods + ' pods' : '') : ''],
            ['virt-handler', n.handler],
            ['Launcher pods', n.launchers ? String(n.launchers) : ''],
            ['Taints', n.taints.join('\n')],
        ].filter(function (r) {
            return r[1];
        });
        var dl = el('dl', 'nfacts');
        rows.forEach(function (r) {
            add(dl, el('dt', '', r[0]), el('dd', r[0] === 'Taints' ? 'mono pre' : '', r[1]));
        });
        return dl;
    }

    function guestTable(n) {
        if (!n.guests.length) return el('p', 'faint small', 'No guest runs on this node.');
        var table = el('table', 'ntable');
        var head = el('tr');
        ['Guest', 'Namespace', 'State', 'vCPUs', 'Memory', 'Address', ''].forEach(function (h) {
            head.appendChild(el('th', '', h));
        });
        add(table, add(el('thead'), head));
        var body = el('tbody');
        n.guests.forEach(function (m) {
            var tr = el('tr');
            var name = el('td', 'ntable-name');
            add(
                name,
                K.screen(m),
                K.link(m.name, function () {
                    open(K.machineRef(m));
                }),
            );
            var st = el('td');
            st.appendChild(K.stateChip(m));
            add(
                tr,
                name,
                el('td', 'faint', m.namespace),
                st,
                el('td', 'num', String(m.cpu.vcpus)),
                el('td', 'num', m.memory.text || '—'),
                el('td', 'mono faint', m.ips[0] || ''),
                el('td', 'faint small', m.uptimeSince ? 'up ' + K.span(m.uptimeSince) : ''),
            );
            body.appendChild(tr);
        });
        table.appendChild(body);
        return table;
    }

    function row(n) {
        var expanded = isOpen(n.name);
        var issues = problems(n);
        var worst = worstTone(n);
        var li = el('li', 'ncard' + (worst ? ' ' + worst : '') + (n.guests.length ? '' : ' idle') + (expanded ? ' open' : ''));
        li.dataset.node = n.name;

        var host = el('div', 'host');
        var name = el('div', 'host-name');
        var toggleBtn = K.button('', 'icon-button ntoggle', 'arrow', function () {
            toggle(n.name);
        });
        toggleBtn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        toggleBtn.setAttribute('aria-label', (expanded ? 'Hide ' : 'Show ') + n.name + ' in full');
        var words = el('div', 'nname');
        add(
            words,
            K.link(n.name, function () {
                openNode(n.name);
            }, 'Open ' + n.name + ' in the app'),
            el('div', 'faint small', spec(n)),
        );
        add(name, toggleBtn, words);
        if (issues.length) {
            var badges = el('div', 'host-badges');
            issues.forEach(function (p) {
                badges.appendChild(K.chip(p.text, p.tone, p.icon, p.title));
            });
            name.appendChild(badges);
        }
        add(host, name, guestCells(n), meters(n));
        li.appendChild(host);

        if (expanded) {
            var more = el('div', 'nmore');
            add(more, facts(n), guestTable(n));
            li.appendChild(more);
        }
        return li;
    }

    // ----- the table -------------------------------------------------------------

    var HANDLER_TONE = { ready: 'ok', 'not ready': 'error', missing: 'error' };

    function handlerText(n) {
        return n.handler || 'unknown';
    }

    function kvmText(n) {
        return n.known ? (n.kvm ? 'yes' : 'no') : 'unknown';
    }

    function pressureText(n) {
        return n.pressure
            .map(function (p) {
                return p.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
            })
            .join(', ');
    }

    // How much of a node its guests have asked for, as a short meter with the
    // share and the amounts.
    function askedCell(n, fraction, used, of) {
        if (!(n.known && n.cpu)) return el('span', 'faint small', 'unknown');
        var box = el('span', 'tmeter');
        box.title = used + ' of ' + of + ' asked for by guests';
        add(box, K.meter(fraction), el('span', 'meter-num ' + K.fillTone(fraction), K.percent(fraction)), el('span', 'meter-abs faint', used + ' / ' + of));
        return box;
    }

    function guestNames(n) {
        if (!n.guests.length) return el('span', 'faint small', 'none');
        var box = el('span', 'tguests');
        n.guests.forEach(function (m) {
            var one = el('span', 'tguest');
            var g = K.button('', 'guest ' + m.tone + ' g-' + m.group, null, function () {
                open(K.machineRef(m));
            });
            g.dataset.key = m.key;
            g.setAttribute('aria-label', m.name + ', ' + m.status);
            var name = K.link(m.name, function () {
                open(K.machineRef(m));
            }, m.namespace + '/' + m.name + ' · ' + m.status);
            add(one, g, name);
            box.appendChild(one);
        });
        return box;
    }

    function capacityKnown(n) {
        return n.known && n.cpu ? 1 : 0;
    }

    var COLUMNS = [
        {
            id: 'name',
            label: 'Node',
            className: 'nowrap',
            sort: function (n) {
                return n.name;
            },
            filter: function (n) {
                return n.name;
            },
            cell: function (n) {
                return K.link(n.name, function () {
                    openNode(n.name);
                }, 'Open ' + n.name + ' in the app');
            },
        },
        {
            id: 'roles',
            label: 'Roles',
            sort: function (n) {
                return n.roles.join(', ');
            },
            filter: function (n) {
                return n.roles.join(', ');
            },
            cell: function (n) {
                return el('span', 'faint', n.roles.join(', '));
            },
        },
        {
            id: 'ready',
            label: 'Ready',
            title: 'Whether the kubelet reports Ready',
            pick: true,
            sort: function (n) {
                return n.ready ? 1 : 0;
            },
            filter: function (n) {
                return n.ready ? 'ready' : 'not ready';
            },
            cell: function (n) {
                return n.ready ? K.chip('ready', 'ok', 'check') : K.chip('not ready', 'error', 'alert', n.readyWhy || 'The kubelet is not reporting Ready');
            },
        },
        {
            id: 'cordoned',
            label: 'Scheduling',
            title: 'Cordoned: no new guest will be placed here',
            pick: true,
            sort: function (n) {
                return n.cordoned ? 0 : 1;
            },
            filter: function (n) {
                return n.cordoned ? 'cordoned' : 'schedulable';
            },
            cell: function (n) {
                return n.cordoned ? K.chip('cordoned', 'warn', 'lock', 'No new guest will be placed here') : el('span', 'faint', 'schedulable');
            },
        },
        {
            id: 'pressure',
            label: 'Pressure',
            title: 'Memory, disk or PID pressure the node reports',
            sort: pressureText,
            filter: pressureText,
            cell: function (n) {
                if (!n.pressure.length) return el('span', 'faint', '—');
                var box = el('span', 'cell-chips');
                n.pressure.forEach(function (p) {
                    box.appendChild(K.chip(p.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase(), 'warn', 'alert', 'The node reports ' + p));
                });
                return box;
            },
        },
        {
            id: 'handler',
            label: 'virt-handler',
            title: 'Whether a virt-handler pod runs here and is ready: no guest can start on a node without one',
            pick: true,
            sort: handlerText,
            filter: handlerText,
            cell: function (n) {
                return n.handler ? K.chip(n.handler, HANDLER_TONE[n.handler] || 'muted', n.handler === 'ready' ? 'check' : 'alert') : el('span', 'faint', 'unknown');
            },
        },
        {
            id: 'kvm',
            label: 'KVM',
            title: 'Whether the node offers /dev/kvm; without it guests run under software emulation',
            pick: true,
            sort: kvmText,
            filter: kvmText,
            cell: function (n) {
                if (!n.known) return el('span', 'faint', 'unknown');
                return n.kvm ? el('span', '', 'yes') : K.chip('no', 'muted', 'bolt', 'Guests here run under software emulation, which is slow');
            },
        },
        {
            id: 'guests',
            label: 'Guests',
            className: 'num',
            sort: function (n) {
                return n.guests.length;
            },
            filter: function (n) {
                return String(n.guests.length);
            },
            cell: function (n) {
                return String(n.guests.length);
            },
        },
        {
            id: 'names',
            label: 'Guests by name',
            sort: function (n) {
                return n.guests
                    .map(function (m) {
                        return m.name;
                    })
                    .sort()
                    .join(',');
            },
            filter: function (n) {
                return n.guests
                    .map(function (m) {
                        return m.namespace + '/' + m.name + ' ' + m.status;
                    })
                    .join(' ');
            },
            cell: guestNames,
        },
        {
            id: 'vcpus',
            label: 'vCPUs',
            className: 'num',
            title: 'The vCPUs of the guests on this node',
            sort: function (n) {
                return n.vcpus;
            },
            filter: function (n) {
                return String(n.vcpus);
            },
            cell: function (n) {
                return String(n.vcpus);
            },
        },
        {
            id: 'gmemory',
            label: 'Guest memory',
            className: 'num nowrap',
            title: 'The memory of the guests on this node',
            sort: function (n) {
                return n.guestMemory;
            },
            filter: function (n) {
                return n.guestMemory ? M.bytes(n.guestMemory) : '';
            },
            cell: function (n) {
                return n.guestMemory ? M.bytes(n.guestMemory) : '—';
            },
        },
        {
            id: 'cpu',
            label: 'CPU asked for',
            className: 'nowrap',
            title: 'Cores the guests’ launcher pods have asked for, of what the node can allocate',
            sort: function (n) {
                return capacityKnown(n) ? n.cpuFraction : null;
            },
            filter: function (n) {
                return capacityKnown(n) ? K.percent(n.cpuFraction) + ' ' + M.cores(n.requested.cpu) + ' / ' + M.cores(n.cpu) : 'unknown';
            },
            cell: function (n) {
                return askedCell(n, n.cpuFraction, M.cores(n.requested.cpu), M.cores(n.cpu));
            },
        },
        {
            id: 'memory',
            label: 'Memory asked for',
            className: 'nowrap',
            title: 'Memory the guests’ launcher pods have asked for, of what the node can allocate',
            sort: function (n) {
                return capacityKnown(n) ? n.memoryFraction : null;
            },
            filter: function (n) {
                return capacityKnown(n) ? K.percent(n.memoryFraction) + ' ' + M.bytes(n.requested.memory) + ' / ' + M.bytes(n.memory) : 'unknown';
            },
            cell: function (n) {
                return askedCell(n, n.memoryFraction, M.bytes(n.requested.memory), M.bytes(n.memory));
            },
        },
        {
            id: 'kubelet',
            label: 'Kubelet',
            className: 'nowrap',
            pick: true,
            sort: function (n) {
                return n.kubelet;
            },
            filter: function (n) {
                return n.kubelet;
            },
            cell: function (n) {
                return el('span', 'faint', n.kubelet);
            },
        },
        {
            id: 'age',
            label: 'Age',
            className: 'nowrap',
            // Youngest first when ascending, as the ages read.
            sort: function (n) {
                return n.created ? -n.created : null;
            },
            filter: function (n) {
                return n.created ? K.span(n.created) : '';
            },
            cell: function (n) {
                return el('span', 'faint', n.created ? K.span(n.created) : '');
            },
        },
    ];

    function worstTone(n) {
        var issues = problems(n);
        if (issues.some(function (p) {
            return p.tone === 'error';
        })) return 'error';
        if (issues.some(function (p) {
            return p.tone === 'warn';
        })) return 'warn';
        return '';
    }

    function drawTable(model, nodes) {
        var box = $('ntable');
        K.keepFocus(box, function () {
            box.textContent = '';
            var rows = K.sortRows(K.filterRows(nodes, COLUMNS, state.table), COLUMNS, state.table, function (a, b) {
                return a.name.localeCompare(b.name, undefined, { numeric: true });
            });
            box.appendChild(
                K.dataTable({
                    columns: COLUMNS,
                    all: model.nodes,
                    rows: rows,
                    key: function (n) {
                        return n.name;
                    },
                    state: state.table,
                    onChange: function () {
                        saveHash();
                        drawTools();
                        draw();
                    },
                    onOpen: function (n) {
                        toggle(n.name);
                    },
                    opened: isOpen,
                    detail: function (n) {
                        var more = el('div', 'nmore');
                        add(more, facts(n), guestTable(n));
                        return more;
                    },
                    rowClass: worstTone,
                    className: 'nodes-table',
                    empty: nodes.length ? 'No node matches these column filters.' : 'No node matches.',
                }),
            );
        });
    }

    // ----- putting it together ---------------------------------------------------

    function draw() {
        var model = state.model;
        if (!model || !model.installed) return;
        drawFilter(model);
        var table = state.layout === 'table' && model.nodes.length > 0;
        var list = $('nlist');
        list.hidden = table;
        $('ntable').hidden = !table;
        var nodes = shown(model);
        if (table) {
            list.textContent = '';
            drawTable(model, nodes);
            return;
        }
        $('ntable').textContent = '';
        list.textContent = '';
        if (!model.nodes.length) {
            list.appendChild(el('li', 'quiet', model.nodesKnown ? 'No node is marked kubevirt.io/schedulable and no guest is running. virt-handler labels the nodes it can run guests on.' : 'Nodes could not be read, and no guest is running.'));
            return;
        }
        if (!nodes.length) {
            list.appendChild(el('li', 'quiet', 'No node matches.'));
            return;
        }
        nodes.forEach(function (n) {
            list.appendChild(row(n));
        });
    }

    function drawEmpty(model) {
        var box = $('empty');
        box.textContent = '';
        box.hidden = false;
        var art = el('div', 'empty-art');
        art.appendChild(K.icon('logo'));
        add(box, art, el('h2', '', 'KubeVirt is not installed in ' + state.ctx.contextName), el('p', 'faint', 'This cluster does not serve VirtualMachines, so no node runs guests.'));
        if (model.missing) box.appendChild(el('p', 'faint small', model.missing));
    }

    function render(first) {
        var model = state.model;
        if (!model) return;
        var where = state.ctx.contextName;
        if (model.system.version) where += ' · KubeVirt ' + model.system.version;
        where += ' · ' + M.plural(model.nodes.length, 'node') + ' · ' + M.plural(model.totals.running, 'guest') + ' running';
        $('where').textContent = where;
        if (!model.installed) {
            $('content').hidden = true;
            drawEmpty(model);
            return;
        }
        $('empty').hidden = true;
        $('content').hidden = false;
        if (first) {
            drawStrip(model);
            draw();
            return;
        }
        K.calm($('nstrip'), function () {
            drawStrip(state.model);
        });
        // Held while the user points at or types in whichever is shown.
        K.calm(state.layout === 'table' ? $('ntable') : $('nlist'), draw);
    }

    var timer = null;
    function tick() {
        if (timer) clearTimeout(timer);
        timer = null;
        M.load(sdk)
            .then(function (model) {
                $('error').hidden = true;
                // Ages move even when nothing else does.
                var sig = model.sig + '|' + Math.floor(Date.now() / 60000);
                if (sig === state.sig) return;
                var first = !state.model;
                state.model = model;
                state.sig = sig;
                render(first);
            })
            .catch(fail)
            .then(function () {
                timer = setTimeout(tick, POLL);
            });
    }

    $('logo').appendChild(K.icon('logo'));
    $('search-icon').appendChild(K.icon('search'));
    $('query').addEventListener('input', function (event) {
        state.query = event.target.value;
        saveHash();
        draw();
    });
    $('expand-all').addEventListener('click', function () {
        state.open = state.open === '*' ? '' : '*';
        saveHash();
        draw();
    });
    document.addEventListener('keydown', function (event) {
        if (event.key === '/' && document.activeElement === document.body) {
            event.preventDefault();
            $('query').focus();
        }
    });
    function describeGuest(g, into) {
        var m = state.model && state.model.machines.find(function (x) {
            return x.key === g.dataset.key;
        });
        return m ? K.describeMachine(m, into) : false;
    }
    K.tooltip($('nlist'), '.guest', describeGuest);
    K.tooltip($('ntable'), '.guest', describeGuest);

    sdk.ready()
        .then(function (context) {
            state.ctx = context;
            $('where').textContent = context.contextName;
            // What the user last picked here, on this cluster, before the
            // first draw.
            return K.restoreView('nodes');
        })
        .then(function () {
            loadHash();
            drawSort();
            drawTools();
            tick();
        })
        .catch(fail);
})();
