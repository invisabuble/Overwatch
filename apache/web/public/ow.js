// Author : Luke Park

var screens = {}

var analog_measurement_limit = 4095;

var red = "rgb(255, 59, 48)";
var orange = "rgb(255, 149, 0)";
var yellow = "rgb(255, 204, 0)";
var green = "rgb(52, 199, 89)";

var warning_svg = '<svg height="90%" width="90%" viewBox="0 0 20 20"><defs></defs><g transform="matrix(0.040238, 0, 0, 0.040238, -0.059513, -0.0)" style=""><path d="M 203.711 78.56 Q 249.507 -0.921 295.488 78.56 L 470.854 381.699 Q 516.834 461.18 425.057 461.18 L 75.025 461.18 Q -16.752 461.18 29.045 381.699 Z" style="paint-order: fill; stroke: rgba(0, 0, 0, 0); fill: rgb(255, 59, 48);" bx:shape="triangle -16.752 -0.921 533.586 462.101 0.499 0.172 1@cf120883"></path><rect x="218.835" y="165.491" width="62.33" height="153.038" style="stroke: rgba(4, 4, 4, 0); fill: rgb(255, 255, 255);" rx="31.165" ry="31.165"></rect><rect x="218.835" y="356.287" width="62.33" height="58.421" style="stroke: rgba(202, 38, 38, 0); fill: rgb(255, 255, 255);" rx="31.165" ry="31.165"></rect></g></svg>';

var colours = [red,orange,yellow,green];

function ping_network () {
    
    var ping_network = JSON.stringify({ 'ping_network': 'ping_network' });
    ws.send(ping_network);
    
}

function update_connected_devices () {
    var number_connected = Object.keys(screens).length;
    var device_count = document.getElementById("device_count");
    device_count.innerHTML = number_connected;
}

class create_screen {
    
    constructor (CONFIG, UUID, IP) {
        
        //var UUID = "C8:C9:A3:CE:91:A8";
        //var IP = "192.168.0.24";
        //var CONFIG = JSON.parse("{\"name\":\"TestDevice\",\"digital_inputs\":[19,0,27,14],\"digital_measurements\":{\"12\":{\"name\":\"status_led\",\"type\":\"output\"},\"17\":{\"name\":\"status_led\",\"type\":\"switch\"}},\"analog_measurements\":{\"33\":{\"name\":\"temp\",\"max\":\"100\",\"min\":\"-20\",\"unit\":\"C\",\"type\":\"pie\"},\"35\":{\"name\":\"temp2\",\"max\":\"120\",\"min\":\"-10\",\"unit\":\"m/s\",\"type\":\"bar-graph\"}},\"readings\":[\"program_output\"]}");
        
        //var CONFIG = JSON.parse("{\"name\":\"Bars\",\"digital_inputs\":[19,0,27,14],\"digital_measurements\":{\"12\":{\"name\":\"status_led1\",\"type\":\"switch\"},\"13\":{\"name\":\"status_led2\",\"type\":\"switch\"},\"14\":{\"name\":\"status_led3\",\"type\":\"switch\"},\"15\":{\"name\":\"status_led4\",\"type\":\"switch\"},\"16\":{\"name\":\"status_led5\",\"type\":\"switch\"},\"17\":{\"name\":\"status_led6\",\"type\":\"switch\"}},\"analog_measurements\":{\"35\":{\"name\":\"Temp\",\"max\":\"120\",\"min\":\"-10\",\"unit\":\"C\",\"type\":\"bar-graph\"}},\"readings\":[\"program_output\"]}");
        
        console.log(CONFIG);
        
        this.nickname = CONFIG["name"];
        this.uuid = UUID;
        this.ip = IP;
        
        this.digital_measurements = CONFIG["digital_measurements"];
        this.analog_measurements = CONFIG["analog_measurements"];
        
        this.digital_switches = {};
        this.digital_outputs = {};
        this.analog_bars = {};
        this.analog_pies = {};
        this.analog_bar_graphs = {};
        
        // Create main screen
        this.screen = document.createElement("screen");
        this.screen.setAttribute("id", this.uuid);
        
        // Create banner
        this.banner = document.createElement("banner");
        this.banner.setAttribute("id", this.uuid + "-banner");
        
        // Create nickname
        this.name = document.createElement("nickname");
        this.name.setAttribute("class", "banner_object noselect");
        this.name.textContent = this.nickname
        
        // Create ip
        this.screen_ip = document.createElement("ip");
        this.screen_ip.setAttribute("class", "banner_object noselect");
        this.screen_ip.textContent = this.ip;
        
        // Create status
        this.status = document.createElement("status");
        
        // Create screen content
        this.screen_content = document.createElement("screen_content");
        
        this.banner.appendChild(this.name);
        this.banner.appendChild(this.screen_ip);
        this.banner.appendChild(this.status);
        this.screen.appendChild(this.banner);
        this.screen.appendChild(this.screen_content);
        
        // Sort digital arrays
        if (Object.keys(this.digital_measurements).length > 0) {
            
            for (let [key, value] of Object.entries(this.digital_measurements)) {
                
                switch (value["type"]) {
                        
                    case "switch":
                        this.digital_switches[key] = value;
                        break;
                    case "output":
                        this.digital_outputs[key] = value;
                        break;
                    default:
                        console.log("UNRECOGNISED DIGITAL TYPE : " + value["type"]);
                        
                }
                
            }

        }
        
        // Sort analog arrays
        if (Object.keys(this.analog_measurements).length > 0) {
            
            for (let [key, value] of Object.entries(this.analog_measurements)) {
                
                switch (value["type"]) {
                        
                    case "bar":
                        this.analog_bars[key] = value;
                        break;
                    case "pie":
                        this.analog_pies[key] = value;
                        break;
                    case "bar-graph":
                        this.analog_bar_graphs[key] = value;
                        break;
                    default:
                        console.log("UNRECOGNISED ANALOG TYPE : " + value["type"]);
                        
                }
                
            }
            
        }
        
        // ========== ARRAY CREATION ========== //
        
        // Create switch array
        if (Object.keys(this.digital_switches).length > 0) {
            
            this.switch_panel = document.createElement("switch_panel");
            this.switch_panel.setAttribute("class", "panel");
            
            for (let [key, value] of Object.entries(this.digital_switches)) {
                var io = key;
                var name = value["name"];
                var id = this.uuid + "-" + io;
                
                var switch_element = '<switch_container><switch_label class="label" contenteditable="true">' + name + '</switch_label><switch id="' + id + '-switch" onclick="screens[&quot;' + this.uuid + '&quot;].toggle_switch(&quot;' + io + '&quot;)"><switch_toggler id="' + id + '-switch-toggle"></switch_toggler></switch></switch_container>'
                
                this.switch_panel.insertAdjacentHTML("beforeend", switch_element)
                
            }
            
            this.screen_content.appendChild(this.switch_panel);
            
        }
        
        // Create output array
        if (Object.keys(this.digital_outputs).length > 0) {
            
            this.output_panel = document.createElement("output_panel");
            this.output_panel.setAttribute("class", "panel");
            
            for (let [key, value] of Object.entries(this.digital_outputs)) {
                var io = key;
                var name = value["name"];
                var id = this.uuid + "-" + io;
                
                var output_element = '<output_container><output_label class="label" contenteditable="true">' + name + '</output_label><output id="' + id + '"></output></output_container>'
                
                this.output_panel.insertAdjacentHTML("beforeend", output_element);
                
            }
            
            this.screen_content.appendChild(this.output_panel);
            
        }
        
        // Create bar array
        if (Object.keys(this.analog_bars).length > 0) {
            
            this.analog_bar_panel = document.createElement("analog_bar_panel");
            this.analog_bar_panel.setAttribute("class", "panel");
            
            for (let [key, value] of Object.entries(this.analog_bars)) {
                var io = key;
                var name = value["name"];
                var unit = value["unit"];
                var id = this.uuid + "-" + io;
                
                var analog_bar_element = '<analog_container><analog_label class="label" contenteditable="true">' + name + ' [' + unit + ']</analog_label><bar_container><bar id="' + id + '-bar"><bar_value id="' + id + '-bar-value" class="noselect">0</bar_value></bar></bar_container></analog_container>';
                
                this.analog_bar_panel.insertAdjacentHTML("beforeend", analog_bar_element);
                
            }
            
            this.screen_content.appendChild(this.analog_bar_panel);
            
        }
        
        // Create pie array
        if (Object.keys(this.analog_pies).length > 0) {
            
            this.pie_panel = document.createElement("pie_panel");
            
            for (let [key, value] of Object.entries(this.analog_pies)) {
                var io = key;
                var name = value["name"];
                var unit = value["unit"];
                var id = this.uuid + "-" + io;
                
                var pie_element = '<pie_chart id="' + id + '-pie"><svg height="200px" width="200px" viewBox="0 0 20 20"><circle r="10" cx="10" cy="10" fill="#404E4D"/><circle id="' + id + '-wedge" r="5" cx="10" cy="10" fill="#404E4D" stroke="tomato" stroke-width="10" stroke-dasharray="0 31.42" transform="rotate(-90) translate(-20)"/><circle r="2" cx="10" cy="10" fill="white"/><text id="' + id + '-pie-percentage" x="10" y="10.8" text-anchor="middle" font-size="2" font-family="poppins" fill="black">0</text></svg><pie_label class="label">' + name + ' [' + unit + ']</pie_label></pie_chart>';
                
                this.pie_panel.insertAdjacentHTML("beforeend", pie_element);
                
            }
            
            this.screen_content.appendChild(this.pie_panel);
            
        }
        
        //Create bar graph array
        if (Object.keys(this.analog_bar_graphs).length > 0) {
            
            this.graph_container = document.createElement("graph_container");
            this.graph_container.setAttribute("class", "panel");
            
            for (let [key, value] of Object.entries(this.analog_bar_graphs)) {
                var io = key;
                var name = value["name"];
                var unit = value["unit"];
                var id = this.uuid + "-" + io;
                this.analog_bar_graphs[key].values = [0,0,0,0,0,0,0,0,0,0];
                
                var bar_graph_element = '<bar_graph_container id="' + id + '-bar_graph"><graph_label class="bar_label" contenteditable="true">' + name + ' [' + unit + ']</graph_label><bar_graph>'
                
                for (var bar = 0; bar < 10; bar++) {
                    
                    var bar_element = '<bar_graph_bar id="' + id + '-graph_bar-' + bar + '"><bar_graph_value id="' + id + '-graph_bar_value-' + bar + '">0</bar_graph_value></bar_graph_bar>';
                    
                    bar_graph_element = bar_graph_element + bar_element;
                }
                
                bar_graph_element = bar_graph_element + '</bar_graph></bar_graph_container>';
                
                this.graph_container.insertAdjacentHTML("beforeend", bar_graph_element);
                
            }
            
            this.screen_content.appendChild(this.graph_container);
            
        }
        
        // ==================================== //
        
        document.getElementById("dashboard").appendChild(this.screen);
        
    }
    
    toggle_switch (gpio) {
        
        var gpio = gpio.substring(3);
        
        var message = JSON.stringify({"gpio":gpio,"target":this.uuid});
        ws.send(message);
        
    }
    
    set_switch (gpio, state) {
        
        var switch_body = document.getElementById(this.uuid + '-' + gpio + '-switch');
        var switch_toggler = document.getElementById(this.uuid + '-' + gpio + '-switch-toggle');

        if (state == 0) {
            switch_body.style.background = red;
            switch_toggler.style.marginLeft = '1px';
        } else {
            switch_body.style.background = green;
            switch_toggler.style.marginLeft = '41px';
        }
        
    }
    
    set_output (gpio, value) {
        var output_body = document.getElementById(this.uuid + "-" + gpio);
        
        if (value == 0) {
            output_body.style.background = red;
        } else {
            output_body.style.background = green;
        }
    }
    
    calculate_analog_properties (gpio, value) {
        
        var properties = this.analog_measurements[gpio];
        
        var percentage = Math.floor(value * 100/analog_measurement_limit);
        var colour = colours[Math.floor(percentage/25)];
        var min = parseInt(properties["min"]);
        var max = parseInt(properties["max"]);
        
        var grad = (min - max)/(-analog_measurement_limit);
        var adjusted_value = (grad * value) + min;
        
        return { percentage, adjusted_value, colour };
        
    }
    
    set_analog (gpio, value) {
        
        var analog_bar = document.getElementById(this.uuid + '-' + gpio + '-bar');
        var analog_value = document.getElementById(this.uuid + '-' + gpio + '-bar-value');
        
        var { percentage, adjusted_value, colour } = this.calculate_analog_properties(gpio, value);
       
        analog_bar.style.width = percentage + "%";
        analog_value.innerHTML = Math.floor(adjusted_value);
        analog_bar.style.background = colour;
        
        var offset;
        
        if (percentage <= 17) {
            offset = (-(25/8.5) * percentage) + 42;
        } else {
            offset = -8;
        }
        
        analog_value.style.left = offset + "px";
        
    }
    
    set_pie (gpio, value) {
        
        var analog_pie_wedge = document.getElementById(this.uuid + '-' + gpio + '-wedge');
        var analog_pie_text = document.getElementById(this.uuid + '-' + gpio + '-pie-percentage');
        
        var { percentage, adjusted_value, colour } = this.calculate_analog_properties(gpio, value);
        
        analog_pie_wedge.style.strokeDasharray = (percentage * 0.3142) + " 31.42";
        analog_pie_text.innerHTML = Math.floor(adjusted_value);
        analog_pie_wedge.style.stroke = colour;
        
    }
    
    add_bar_graph_value (gpio, value) {
        
        var id = this.uuid + '-' + gpio;
        
        this.analog_bar_graphs[gpio]["values"].shift();
        this.analog_bar_graphs[gpio]["values"].push(value);
        
        var properties = this.analog_measurements[gpio];

        var min = parseInt(properties["min"]);
        var max = parseInt(properties["max"]);        
        var grad = (min - max)/(-analog_measurement_limit);
        
        var maximum = Math.max(...this.analog_bar_graphs[gpio]["values"]);     
        if (maximum == 0) {
            scale = 0;
        } else {
            var scale = 100/maximum;
        }
        var scaled_values = this.analog_bar_graphs[gpio]["values"].map(num => num * scale);
        var display_values = this.analog_bar_graphs[gpio]["values"].map(num => Math.floor((grad * num) + min));
        
        for (var bar = 0; bar < scaled_values.length; bar++) {
            
            var graph_bar = document.getElementById(id + '-graph_bar-' + bar);
            var colour = colours[Math.floor(scaled_values[bar]/25.1)];
            
            graph_bar.style.height = Math.abs(scaled_values[bar]) + "%";
            graph_bar.style.background = colour;
            graph_bar.style.border = "2px solid " + colour;

            var offset = (0.49 * Math.abs(scaled_values[bar])) - 44;

            var bar_graph_value = document.getElementById(id + '-graph_bar_value-' + bar);
            bar_graph_value.style.marginTop = offset + "px";
            bar_graph_value.innerHTML = display_values[bar];
            
        }
        
    }
    
    disconnected () {
        this.status.style.animation = "status_disconnected 0.3s infinite";
    }
    
    connected () {
        this.status.style.animation = "status_connected 1s infinite";
    }
    
}















