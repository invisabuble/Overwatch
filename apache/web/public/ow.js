// Author : Luke Park

var screens = {}

var analog_measurement_limit = 4095;
var default_array_length = 10;

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

function get_ssl_cert () {
    var ssl_cert = JSON.stringify({ 'ssl_cert' : 'ssl_cert' });
    ws.send(ssl_cert);
}

function update_connected_devices () {
    var screen_keys = Object.keys(screens);
    var number_connected = screen_keys.length;
    var device_count = document.getElementById("device_count");
    device_count.innerHTML = number_connected;
    
    var connection_str = "";

    screen_keys.forEach( key => {

        var screen = screens[key];

        var name = screen.config.name;
        var ip = screen.ip;

        connection_str = connection_str + '"' + name + '"@' + ip + "  &#8594  " + key + "<br/>"

    });

    document.getElementById('server_config_connected_devices').innerHTML = connection_str;
}

class create_screen {
    
    constructor (CONFIG, UUID, IP) {
        
        //var UUID = "C8:C9:A3:CE:91:A8";
        //var IP = "192.168.0.24";
        
        //var CONFIG = JSON.parse("{\"name\":\"TestDevice\",\"digital_inputs\":[19,0,27,14],\"digital_measurements\":{},\"analog_measurements\":{\"33\":{\"name\":\"temp\",\"max\":\"100\",\"min\":\"-20\",\"unit\":\"C\",\"type\":\"line_graph\"},\"35\":{\"name\":\"temp2\",\"max\":\"120\",\"min\":\"-10\",\"unit\":\"m/s\",\"type\":\"line_graph\"}},\"readings\":[\"program_output\"]}");
        
        //var CONFIG = JSON.parse("{\"name\":\"TestDevice\",\"digital_inputs\":[19,0,27,14],\"digital_measurements\":{\"12\":{\"name\":\"status_led\",\"type\":\"output\"},\"17\":{\"name\":\"status_led\",\"type\":\"switch\"},\"18\":{\"name\":\"status_led2\",\"type\":\"switch\"}},\"analog_measurements\":{\"33\":{\"name\":\"temp\",\"max\":\"100\",\"min\":\"-20\",\"unit\":\"C\",\"type\":\"pie\"},\"35\":{\"name\":\"temp2\",\"max\":\"120\",\"min\":\"-10\",\"unit\":\"m/s\",\"type\":\"bar_graph\"}},\"readings\":[\"program_output\"]}");
        
        //var CONFIG = JSON.parse("{\"name\":\"Bars\",\"digital_inputs\":[19,0,27,14],\"digital_measurements\":{\"12\":{\"name\":\"status_led1\",\"type\":\"switch\"},\"13\":{\"name\":\"status_led2\",\"type\":\"switch\"},\"14\":{\"name\":\"status_led3\",\"type\":\"switch\"},\"15\":{\"name\":\"status_led4\",\"type\":\"switch\"},\"16\":{\"name\":\"status_led5\",\"type\":\"switch\"},\"17\":{\"name\":\"status_led6\",\"type\":\"switch\"}},\"analog_measurements\":{\"35\":{\"name\":\"Temp\",\"max\":\"120\",\"min\":\"-10\",\"unit\":\"C\",\"type\":\"bar-graph\"}},\"readings\":[\"program_output\"]}");
        
        console.log(CONFIG);
        
        this.config = CONFIG
        this.uuid = UUID;
        this.ip = IP;
        
        // Create main screen
        this.screen = document.createElement("screen");
        this.screen.setAttribute("id", this.uuid);
        
        // Create banner
        this.banner = document.createElement("banner");
        this.banner.setAttribute("id", this.uuid + "-banner");
        
        // Create nickname
        this.name = document.createElement("nickname");
        this.name.setAttribute("class", "banner_object noselect");
        this.name.textContent = this.config["name"];
        
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
        
        // Dictionary that holds all the panels
        this.panels = {
            switch : null,
            output : null,
            bar_graph : null,
            bar : null,
            pie : null,
            line_graph : null
        };
        
        this.special = {
            line_graph : {}
        }
        
        // ========== DISPLAY CREATION ========== //
        
        // Join analog and digital measurements together so they can be itterated through in one go
        var joint_dict = {...this.config["analog_measurements"], ...this.config["digital_measurements"]}
        
        Object.keys(joint_dict).forEach(key => {
            
            // Get the sub dict info for each gpio
            var measure = joint_dict[key];
            
            // Get the info about the gpio
            var io = key;
            var name = measure["name"];
            var type = measure["type"];
            var id = this.uuid + "-" + io;
            
            // If the gpio is in the analog measurements array, calculate grad and get the units.
            if (key in this.config["analog_measurements"]) {
                var unit = measure["unit"];
                var grad = (parseFloat(measure["min"]) - parseFloat(measure["max"])) / (-analog_measurement_limit);
                this.config["analog_measurements"][key]["grad"] = grad;
            }
            
            // If the type is a bar_graph add a 10 digita array to graph_values key
            if (type == "bar_graph") {
                this.config["analog_measurements"][key]["graph_values"] = new Array(default_array_length).fill(0);
            }
            
            // If the panel type doesnt exist then create it
            if (!this.panels[type]) {
                this.panels[type] = document.createElement(type + "_measurement_panel");
                this.panels[type].setAttribute("class", "panel");
            }
            
            // Start with an empty panel element string, go through the switch case
            // statement and add strings to this.
            var panel_element = null;
            
            switch (type) {
                    
                case "switch" :
                    //console.log("DEBUG : switch", type);
                    panel_element = '<switch_container><switch_label class="label" contenteditable="true">' + name + '</switch_label><switch id="' + id + '-switch" onclick="screens[&quot;' + this.uuid + '&quot;].toggle_switch(&quot;' + io + '&quot;)"><switch_toggler id="' + id + '-switch-toggle"></switch_toggler></switch></switch_container>';
                    break;
                    
                case "output" :
                    //console.log("DEBUG : output", type);
                    panel_element = '<output_container><output_label class="label" contenteditable="true">' + name + '</output_label><output id="' + id + '-output"></output></output_container>';
                    break;
                    
                case "pie" :
                    //console.log("DEBUG : pie", type);
                    panel_element = '<pie_chart id="' + id + '-pie"><svg height="200px" width="200px" viewBox="0 0 20 20"><circle r="10" cx="10" cy="10" fill="#404E4D"/><circle id="' + id + '-wedge" r="5" cx="10" cy="10" fill="#404E4D" stroke="tomato" stroke-width="10" stroke-dasharray="0 31.42" transform="rotate(-90) translate(-20)"/><circle r="2" cx="10" cy="10" fill="white"/><text id="' + id + '-pie-percentage" x="10" y="10.8" text-anchor="middle" font-size="2" font-family="poppins" fill="black">0</text></svg><pie_label class="label">' + name + ' [' + unit + ']</pie_label></pie_chart>';
                    break;
                    
                case "bar" :
                    //console.log("DEBUG : bar", type);
                    panel_element = '<analog_container><analog_label class="label" contenteditable="true">' + name + ' [' + unit + ']</analog_label><bar_container><bar id="' + id + '-bar"><bar_value id="' + id + '-bar-value" class="noselect">0</bar_value></bar></bar_container></analog_container>';
                    break;
                    
                case "bar_graph" :
                    //console.log("DEBUG : bar_graph",type);
                    panel_element = '<analog_graph_container id="' + id + '-bar_graph"><graph_label class="graph_label" contenteditable="true">' + name + ' [' + unit + ']</graph_label><graph>';
                    
                    for (var bar = 0; bar < 10; bar++) {
                        var bar_element = '<bar_graph_bar id="' + id + '-graph_bar-' + bar + '"><bar_graph_value id="' + id + '-graph_bar_value-' + bar + '">0</bar_graph_value></bar_graph_bar>';
                        panel_element = panel_element + bar_element;
                    }

                    panel_element = panel_element + '</graph></analog_graph_container>';
                    break;
                    
                case "line_graph" :
                    //console.log("DEBUG : line_graph", type);
                    this.special["line_graph"][key] = null;
                    panel_element = '<analog_graph_container id="' + id + '-line_graph"><graph_label class="graph_label" contenteditable="true">' + name + ' [' + unit + ']</graph_label><graph id="' + id + '-line_graph-svg-container"></graph></analog_graph_container>'
                    break;
                    
                default :
                    console.log("unrecognised");
                    
            }
            
            // Add panel element string to the panel of its type.
            this.panels[type].insertAdjacentHTML("beforeend", panel_element);
            
        });
        
        // ========== ADD PANELS TO SCREEN ========== //
        
        Object.keys(this.panels).forEach(key => {
           
            if (this.panels[key]) {
                this.screen_content.appendChild(this.panels[key]);
            }
            
        });
        
        // ==================================== //
        
        document.getElementById("dashboard").appendChild(this.screen);

        // ========== CREATION OF LINE GRAPH SVG ========== //
        
        Object.keys(this.special["line_graph"]).forEach(key => {

            // Must be done after the html elements are present.
            var conf = this.config["analog_measurements"][key];
            var id = CSS.escape(this.uuid + "-" + key + "-line_graph-svg-container");
            this.special["line_graph"][key] = new line_graph(`#${id}`, "lg-" + key, conf);
            
        });
        
    }
    
    
    panel_query_selector (type, identification) {
        // Go through the panel type specified and find an element.
        return this.panels[type].querySelector(`#${CSS.escape(this.uuid + "-" + identification)}`);
    }
    
    
    calculate_analog_values (gpio, value) {
        // Get and calculate values for analog gpios
        if (this.config["analog_measurements"][gpio]) {
            
            var parameters = this.config["analog_measurements"][gpio];
            
            var percentage = Math.round(value * 100 / analog_measurement_limit);
            var colour = colours[Math.floor(percentage / 25)];
            var grad = parseFloat(parameters["grad"]);
            var adjusted_value = Math.round((grad * value) + parseFloat(parameters["min"]));
            
            return { percentage, adjusted_value, colour};
            
        }
    }
    
    
    toggle_switch (gpio) {
        // Send toggle message for gpio switch
        var gpio = gpio.substring(3);
        var message = JSON.stringify({"gpio":gpio,"target":this.uuid});
        ws.send(message);
    }
    
    
    digital_switch (gpio, state) {
        // Compute state of sent switch information
        var switch_element = this.panel_query_selector("switch", gpio + "-switch");
        var switch_toggler = this.panel_query_selector("switch", gpio + "-switch-toggle");
        
        if (!state) {
            switch_element.style.background = red;
            switch_toggler.style.marginLeft = '1px';
        } else {
            switch_element.style.background = green;
            switch_toggler.style.marginLeft = '41px';
        }
    }
    
    
    digital_output (gpio, state) {
        // Compute state of sent output information
        var output_element = this.panel_query_selector("output", gpio + "-output");
        
        if (!state) {
            output_element.style.background = red;
        } else {
            output_element.style.background = green;
        }
    }
    
    
    analog_bar (gpio, value) {
        // Compute analog bar size and colour
        var bar_element = this.panel_query_selector("bar", gpio + "-bar");
        var bar_value_element = this.panel_query_selector("bar", gpio + "-bar-value");
        
        var { percentage, adjusted_value, colour } = this.calculate_analog_values(gpio, value);
        
        bar_element.style.width = percentage + "%";
        bar_element.style.background = colour;
        bar_value_element.innerHTML = adjusted_value;
        
        var offset;
        
        if (percentage <= 17) {
            offset = (-25 * percentage / 8.5) + 42;
        } else {
            offset = -8;
        }
        
        bar_value_element.style.left = offset + "px";
        
    }
    
    
    analog_pie (gpio, value) {
        // Compute analog pie percentage and colour
        var { percentage, adjusted_value, colour } = this.calculate_analog_values(gpio, value);
        var pie_wedge = this.panel_query_selector("pie", gpio + "-wedge");
        var pie_value = this.panel_query_selector("pie", gpio + "-pie-percentage");
        
        pie_wedge.style.strokeDasharray = (percentage * 0.3142) + " 31.42";
        pie_wedge.style.stroke = colour;
        pie_value.innerHTML = adjusted_value;
        
    }
    
    
    analog_bar_graph (gpio, value) {
        
        value = Math.abs(value)
        
        var graph_info = this.config["analog_measurements"][gpio]
        
        graph_info["graph_values"].shift();
        graph_info["graph_values"].push(value);
        
        var maximum = Math.max(...graph_info["graph_values"]);
        if (maximum == 0) {
            var scale = 0;
        } else {
            var scale = 100 / maximum;
        }
        
        var grad = graph_info["grad"];
        var min = parseFloat(graph_info["min"]);
        
        var scaled_values = graph_info["graph_values"].map(val => Math.abs(val * scale));
        var display_values = graph_info["graph_values"].map(val => Math.floor(grad * val + min));
        
        for (var bar = 0; bar < scaled_values.length; bar++) {
            
            var graph_bar = this.panel_query_selector("bar_graph", gpio + "-graph_bar-" + bar);
            var colour = colours[Math.floor(scaled_values[bar]/25.1)];
            
            graph_bar.style.background = colour;
            graph_bar.style.height = scaled_values[bar] + "%";
            graph_bar.style.border = "2px solid " + colour;
            
            var offset = (0.49 * scaled_values[bar]) - 44;
            
            var graph_bar_value = this.panel_query_selector("bar_graph", gpio + "-graph_bar_value-" + bar);
            graph_bar_value.style.marginTop = offset + "px";
            graph_bar_value.innerHTML = display_values[bar];
            
        }
        
    }


    analog_line_graph (gpio, value) {
        this.special["line_graph"][gpio].updateData(value);
    }
    
    
    disconnected () {
        this.status.style.animation = "status_disconnected 0.3s infinite";
    }
    
    
    connected () {
        this.status.style.animation = "status_connected 1s infinite";
    }
    
}


class line_graph {
    
    constructor (container, id, config, width = 500, height = 300) {

        this.max = parseFloat(config["max"]);
        this.min = parseFloat(config["min"]);
        this.grad = config["grad"];
        
        this.width = width;
        this.height = height;
        this.margin = { top: 10, right: 10, bottom: 10, left: 40 }
        this.data = Array(10).fill(0);
        
        this.svg = d3.select(container).append("svg").attr("id", id).attr("width", this.width).attr("height", this.height);
        this.g = this.svg.append("g").attr("transform", `translate(${this.margin.left},${this.margin.top})`);
        
        this.x = d3.scaleLinear().domain([0, 9]).range([0, this.width - this.margin.left - this.margin.right]);
        this.y = d3.scaleLinear().domain([-100, 100]).range([this.height - this.margin.top - this.margin.bottom, 0]);
        
        this.line = d3.line().curve(d3.curveMonotoneX).x((d, i) => this.x(i)).y(d => this.y(d));
        this.yAxis = this.g.append("g").attr("class", "axis").call(d3.axisLeft(this.y));
        this.path = this.g.append("path").datum(this.data).attr("class", "line").attr("d", this.line);
        
        this.circleGroup = this.g.append("g");
        this.circles = this.circleGroup.selectAll(".circle").data(this.data).enter().append("circle").attr("class", "circle").attr("r", 4).attr("cx", (d, i) => this.x(i)).attr("cy", d => this.y(d)).style("opacity", 1);
        
    }
    
     updateCircles(data) {
        this.circles.data(data)
          .transition()
          .duration(300)
          .attr("cx", (d, i) => this.x(i))
          .attr("cy", d => this.y(d));

        this.circles.exit().remove();
      }

      updateData(value) {

        var value = (this.grad * value) + this.min;

        this.data.shift(); // Remove the first element
        this.data.push(value); // Add the new value at the end

        // Update the y scale domain based on the new data range
        const yExtent = d3.extent(this.data);
        this.y = d3.scaleLinear().domain([yExtent[0] - 10, yExtent[1] + 10]).range([this.height - this.margin.top - this.margin.bottom, 0]); // Update y scale

        // Update the y-axis with transition
        this.yAxis.transition().duration(300).call(d3.axisLeft(this.y));

        // Update the line path with the new data
        this.path.datum(this.data)
          .transition()
          .duration(300)
          .attr("d", this.line);

        // Update the circles with the new data
        this.updateCircles(this.data);
      }
    
}



