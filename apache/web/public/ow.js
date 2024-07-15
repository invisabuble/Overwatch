// Author : Luke Park

var screens = {}

var analog_measurement_limit = 4095;
var default_bar_graph_length = 10;
var default_line_graph_length = 20;

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


function set_attributes (parent_element, properties) {

    for (var prop_arr = 0; prop_arr < properties.length; prop_arr++) {

        var property = properties[prop_arr];
        parent_element.setAttribute(property[0], property[1]);

    }
}


class create_screen {
    
    constructor (CONFIG, UUID, IP) {

        //var UUID = "C8:C9:A3:CE:91:A8";
        //var IP = "192.168.0.24";
        
        /*var CONFIG = {
            "name": "ESP-32",

            "digital_inputs": [],

            "digital_measurements": {

            },
            "analog_measurements": {
                "io-32": {
                    "name": "temp",
                    "max": "100",
                    "min": "-20",
                    "unit": "C",
                    "type": "bar_graph"
                },
                "io-33": {
                    "name": "temp2",
                    "max": "100",
                    "min": "-20",
                    "unit": "C",
                    "type": "pie"
                }
            }

        };*/
     
        this.config = CONFIG;
        this.uuid = UUID;
        this.ip = IP;

        // Create main screen.
        this.screen = document.createElement("screen");
        this.screen.setAttribute("id", this.uuid);

        // Create banner.
        this.banner = document.createElement("banner");
        this.banner.setAttribute("id", this.uuid + "-banner");

        // Create nickname.
        this.name = document.createElement("nickname");
        this.name.setAttribute("class", "banner_object noselect");
        this.name.setAttribute("onclick", "screens['" + this.uuid + "'].toggle_device_config()");
        this.name.textContent = this.config["name"];

        // Create ip.
        this.screen_ip = document.createElement("ip");
        this.screen_ip.setAttribute("class", "banner_object noselect");
        this.screen_ip.textContent = this.ip;

        // Create status.
        this.status = document.createElement("status");

        // Create device config.
        this.device_config = document.createElement("device_config");
        this.device_config.setAttribute("id", this.uuid + "-device_config");
        this.device_config_pre = document.createElement("pre");
        this.device_config_pre.setAttribute("contenteditable", "true");

        this.device_config_pre.addEventListener('paste', function(e) {
            // Prevent the default paste behavior, format clipboard as plain text then add it into the text box.
            e.preventDefault();
            const text = (e.clipboardData || window.clipboardData).getData('text');
            document.execCommand('insertText', false, text);
        });

        this.device_config_send = document.createElement("device_config_send");
        this.device_config_send.setAttribute("class", "noselect")
        this.device_config_send.setAttribute("onclick", "screens['" + this.uuid + "'].send_device_config()");
        this.device_config_send.innerHTML = "Send to device";
        this.dev_conf_open = false;

        // Create screen content.
        this.screen_content = document.createElement("screen_content");

        // Append everything together.
        this.banner.appendChild(this.name);
        this.banner.appendChild(this.screen_ip);
        this.banner.appendChild(this.status);
        this.screen.appendChild(this.banner);
        this.device_config.appendChild(this.device_config_pre);
        this.device_config.appendChild(this.device_config_send);
        this.screen.appendChild(this.device_config);
        this.screen.appendChild(this.screen_content);

        // Define the panel array.
        this.panels = {
            switch : null,
            output : null,
            bar : null,
            bar_graph : null,
            pie : null,
            line_graph : null
        }

        // ===== PANEL CREATION ===== //

        var joint_dict = {...this.config["analog_measurements"], ...this.config["digital_measurements"]}

        Object.keys(joint_dict).forEach(key => {

            // Get the sub dictionary for each measure.
            var measure = joint_dict[key];

            // Get the info about the measure.
            var io = key;
            var name = measure["name"];
            var type = measure["type"];
            var id = this.uuid + "-" + io;

            // If the panel doesnt exist, create it.
            if (!this.panels[type]) {
                this.panels[type] = document.createElement(this.uuid + "_" + type + "_measurement_panel");
                this.panels[type].setAttribute("class", "panel");
            }

            // If the gpio is in the analog measurements array, calculate grad and get the units.
            if (key in this.config["analog_measurements"]) {
                var unit = measure["unit"];
                var max = parseFloat(measure["max"]);
                var min = parseFloat(measure["min"]);
                var grad = (min - max) / (-analog_measurement_limit);
            }
            
            // Go through the measurements and create the elements.
            switch (type) {

                case "switch" :
                    console.log("Creating switch element.");
                    this.panels["switch"][io] = new create_switch(this.panels["switch"], this.uuid, io, name);
                    break;

                case "output" :
                    console.log("Creating output element");
                    this.panels["output"][io] = new create_output(this.panels["output"], this.uuid, io, name);
                    break;

                case "pie" :
                    console.log("Creating pie element");
                    this.panels["pie"][io] = new create_pie(this.panels["pie"], this.uuid, io, name, unit, max, min, grad);
                    break;

                case "bar" :
                    console.log("Creating bar element");
                    this.panels["bar"][io] = new create_bar(this.panels["bar"], this.uuid, io, name, unit, max, min, grad);
                    break;

                case "bar_graph" :
                    console.log("Creating bar_graph element");
                    this.panels["bar_graph"][io] = new create_bar_graph(this.panels["bar_graph"], this.uuid, io, name, unit, max, min, grad);
                    break;

                case "line_graph" :
                    console.log("Creating line_graph element");
                    this.panels["line_graph"][io] = new create_line_graph(this.panels["line_graph"], this.uuid, io, name, unit, max, min, grad);
                    break;

                default :
                    console.log("Unrecognised element : " + type);

            }

        });

        // ========== ADD PANELS TO SCREEN ========== //
        
        Object.keys(this.panels).forEach(key => {
           
            if (this.panels[key]) {
                this.screen_content.appendChild(this.panels[key]);
            }
            
        });

        // ==================================== //

        this.device_config_pre.textContent = JSON.stringify(this.config, null, 1);
        document.getElementById("dashboard").appendChild(this.screen);

    }


    send_device_config () {
        // Send the parsed json device config to the device.

        var config = this.device_config_pre.innerText;

        try {

            var config_to_send = JSON.parse(config);

            if (JSON.stringify(config_to_send) === JSON.stringify(this.config)) {
                // If the json can be parsed but nothings changed then do nothing.
                this.device_config_send.innerText = "No Change in JSON";
            } else {

                // If the json can be parsed and it is new, send it to the device
                this.device_config_send.innerText = "Sending...";

                this.screen.style.animation = "screen_deletion 0.3s forwards";

                var new_config = JSON.stringify({

                    'set_config' : config_to_send,
                    'UUID' : this.uuid,
                    'IP' : this.ip,
    
                });

                setTimeout(() => {

                    this.screen.remove();
                    ws.send(new_config);
                    delete screens[this.uuid];

                }, 310);

                console.log(new_config);
            }

        } catch (error) {
            // Do this when theres an error in the json.

            console.log("Couldnt parse json for device :", this.config["name"], "\n\nHeres the error encountered : \n", error);

            this.device_config_send.innerText = "Error in config";
            this.device_config_pre.style.animation = "device_config_error 1s forwards";

        }

        setTimeout(() => {this.device_config_pre.style.animation = "none"}, 1000);

    }


    toggle_device_config () {
        // Open or close the device config panel
        if (this.dev_conf_open) {
            this.device_config.style.height = "0px";
            this.device_config.style.width = "0px";

            this.dev_conf_open = false;

        } else {
            this.device_config.style.height = (this.device_config.scrollHeight) + "px";
            this.device_config.style.width = "100%";

            this.dev_conf_open = true;

        }

    }


    disconnected () {
        this.status.style.animation = "status_disconnected 0.3s infinite";
    }
    
    
    connected () {
        this.status.style.animation = "status_connected 1s infinite";
    }
}


class create_element_parameters {

    constructor (parent_container, uuid, gpio, name) {

        this.parent_object = parent_container;
        this.uuid = uuid;
        this.io = gpio;
        this.name = name;

        this.id = uuid + "-" + gpio;

    }

}


class create_analog_element_parameters extends create_element_parameters {

    constructor (parent_object, uuid, gpio, name, unit, max, min, grad) {
        super(parent_object, uuid, gpio, name);

        this.unit = unit;
        this.max = max;
        this.min = min;
        this.grad = grad;

    }


    calculate_analog_values (value, grad, min) {

        var percentage;

        if ( value <= analog_measurement_limit ) {
            percentage = Math.abs(Math.round(value * 100 / analog_measurement_limit));
        } else {
            percentage = 100;
        }

        var colour = colours[Math.floor(percentage / 25)];
        var adjusted = Math.round((grad * value) + min);

        return { percentage, colour, adjusted };

    }

}


class create_switch extends create_element_parameters {

    constructor (parent_container, uuid, gpio, name) {
        super(parent_container, uuid, gpio, name);

        // Create switch container.
        this.switch_container = document.createElement("switch_container");
        
        // Create switch label.
        this.switch_label = document.createElement("switch_label");
        this.switch_label.setAttribute("class", "label")
        this.switch_label.innerText = this.name;
        
        // Create switch body.
        this.switch = document.createElement("switch");
        this.switch.setAttribute("onclick", "screens['" + this.uuid + "'].panels['switch']['" + this.io + "'].toggle_switch()");

        // Create switch toggler.
        this.switch_toggler = document.createElement("switch_toggler");

        this.switch_container.appendChild(this.switch_label);
        this.switch.appendChild(this.switch_toggler);
        this.switch_container.appendChild(this.switch);
        this.parent_object.appendChild(this.switch_container);

    }


    toggle_switch () {
        // Send toggle message for gpio switch.
        var gpio = this.io.substring(3);
        var message = JSON.stringify({"gpio":gpio,"target":this.uuid});
        ws.send(message);
    }
    

    colour_switch (state) {
        // Change colour of switch and move toggler.
        if (!state) {
            this.switch.style.background = red;
            this.switch_toggler.style.marginLeft = '1px';
        } else {
            this.switch.style.background = green;
            this.switch_toggler.style.marginLeft = '41px';
        }
    }

}


class create_output extends create_element_parameters {

    constructor (parent_container, uuid, gpio, name) {
        super(parent_container, uuid, gpio, name);

        // Create ouput container.
        this.output_container = document.createElement("output_container");

        //Create output label.
        this.output_label = document.createElement("output_label")
        this.output_label.setAttribute("class", "label");
        this.output_label.innerText = this.name;

        //Create output.
        this.output = document.createElement("output");

        this.output_container.appendChild(this.output_label);
        this.output_container.appendChild(this.output);
        this.parent_object.appendChild(this.output_container);

    }


    colour_output (state) {
        // Compute state of sent output information.
        if (!state) {
            this.output.style.background = red;
        } else {
            this.output.style.background = green;
        }
    }

}


class create_pie extends create_analog_element_parameters {

    constructor (parent_object, uuid, gpio, name, unit, max, min, grad) {
        super(parent_object, uuid, gpio, name, unit, max, min, grad);

        this.pie_width = "200px";
        this.pie_rad = "10"
            
        // Create pie chart container.
        this.pie_chart = document.createElement("pie_chart");
        this.pie_chart.setAttribute("id", this.id + "-pie");

        // Create pie svg.
        this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        var svg_properties = [
            ["height", this.pie_width],
            ["width", this.pie_width],
            ["viewBox", "0 0 20 20"]
        ];
        set_attributes(this.svg, svg_properties);

        // Create circle background.
        this.circle_bg = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        var circle_bg_properties = [
            ["r", this.pie_rad],
            ["cx", this.pie_rad],
            ["cy", this.pie_rad],
            ["fill", "#404E4D"]
        ];
        set_attributes(this.circle_bg, circle_bg_properties);

        // Create wedge.
        this.wedge = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        var wedge_properties = [
            ["r", "5"],
            ["cx", this.pie_rad],
            ["cy", this.pie_rad],
            ["fill", "#404E4D"],
            ["stroke", "tomato"],
            ["stroke-width", this.pie_rad],
            ["stroke-dasharray", "0 31.42"],
            ["transform", "rotate(-90) translate(-20)"]
        ];
        set_attributes(this.wedge, wedge_properties)

        // Create svg text circle.
        this.text_circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        var text_circle_properties = [
            ["r", "2"],
            ["cx", this.pie_rad],
            ["cy", this.pie_rad],
            ["fill", "white"]
        ];
        set_attributes(this.text_circle, text_circle_properties);

        // Create svg text.
        this.svg_text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        var svg_text_properties = [
            ["x", "10"],
            ["y", "10.8"],
            ["text-anchor", "middle"],
            ["font-size", "2"],
            ["font-family", "poppins"],
            ["fill", "black"]
        ];
        set_attributes(this.svg_text, svg_text_properties);
        this.svg_text.innerHTML = this.min;

        // Create pie label.
        this.pie_label = document.createElement("pie_label");
        this.pie_label.setAttribute("class", "label");
        this.pie_label.innerText = this.name + "[" + this.unit + "]";

        // Append childs to svg
        this.svg.appendChild(this.circle_bg);
        this.svg.appendChild(this.wedge);
        this.svg.appendChild(this.text_circle);
        this.svg.appendChild(this.svg_text);

        // Append childs to pie_chart
        this.pie_chart.appendChild(this.svg);
        this.pie_chart.appendChild(this.pie_label);

        // Append pie_chart to parent_object
        this.parent_object.appendChild(this.pie_chart);

    }


    update_pie (value) {
        // Update analog pie percentage and colour.
        var { percentage, adjusted, colour } = this.calculate_analog_values(value, this.grad, this.min);
        
        this.wedge.style.strokeDasharray = (percentage * 0.3142) + " 31.42";
        this.wedge.style.stroke = colour;
        this.svg_text.innerHTML = adjusted;
        
    }

}


class create_bar extends create_analog_element_parameters {

    constructor (parent_object, uuid, gpio, name, unit, max, min, grad) {
        super(parent_object, uuid, gpio, name, unit, max, min, grad);

        // Create analog container.
        this.analog_container = document.createElement("analog_container");

        // Create bar label
        this.label = document.createElement("analog_label");
        this.label.setAttribute("class", "label");
        this.label.innerHTML = this.name + "[" + this.unit + "]";

        // Create bar container.
        this.bar_container = document.createElement("bar_container");

        // Create bar.
        this.bar = document.createElement("bar");

        // Create bar value.
        this.bar_value = document.createElement("bar_value");
        this.bar_value.innerHTML = this.min;

        // Append childs to analog container.
        this.bar.appendChild(this.bar_value);
        this.bar_container.appendChild(this.bar);
        this.analog_container.appendChild(this.bar_container);
        this.analog_container.appendChild(this.label);

        // Append analog_contaienr to parent_object.
        this.parent_object.appendChild(this.analog_container);

    }


    update_bar (value) {
        // Update analog bar percentage and colour.
        var { percentage, adjusted, colour } = this.calculate_analog_values(value, this.grad, this.min);
        
        this.bar.style.width = percentage + "%";
        this.bar.style.background = colour;
        this.bar_value.innerHTML = adjusted;
        
        var offset;
        
        if (percentage <= 17) {
            offset = (-25 * percentage / 8.5) + 42;
        } else {
            offset = -8;
        }
        
        this.bar_value.style.left = offset + "px";
        
    }

}


class create_bar_graph extends create_analog_element_parameters {

    constructor (parent_object, uuid, gpio, name, unit, max, min, grad) {
        super(parent_object, uuid, gpio, name, unit, max, min, grad);

        // Create analog_graph_container.
        this.analog_graph_container = document.createElement("analog_graph_container");

        // Create graph_label.
        this.graph_label = document.createElement("graph_label");
        this.graph_label.setAttribute("class", "graph_label");
        this.graph_label.innerHTML = this.name + "[" + this.unit + "]";

        // Create graph.
        this.graph = document.createElement("graph");

        // Create array to append html bar object and bar label too.
        this.bar_array = [];

        // Create array to store measurement values
        this.data = new Array(default_bar_graph_length).fill(0);

        // Create bars and append them to the graph and the bar_array.
        for ( var bar_num = 0; bar_num < default_bar_graph_length; bar_num++ ) {
            var bar = document.createElement("bar_graph_bar");
            var bar_label = document.createElement("bar_graph_value");
            bar_label.innerHTML = this.min;

            bar.appendChild(bar_label);

            this.bar_array.push([bar, bar_label]);
            this.graph.appendChild(bar);
        }

        // Append childs to the analog graph container.
        this.analog_graph_container.appendChild(this.graph_label);
        this.analog_graph_container.appendChild(this.graph);

        // Append childs to the parent_object.
        this.parent_object.appendChild(this.analog_graph_container);
        
    }


    update_bar_graph (value) {
        
        this.data.shift();
        this.data.push(value);
        
        for (var bar = 0; bar < this.data.length; bar++) {
            
            var bar_element = this.bar_array[bar][0];
            var bar_label = this.bar_array[bar][1];
            var bar_measurement = this.data[bar];

            var { percentage, adjusted, colour } = this.calculate_analog_values(bar_measurement, this.grad, this.min);

            // Update bar element.
            bar_element.style.height = percentage + "%";
            bar_element.style.background = colour;
            bar_element.style.border = "2px solid " + colour;

            // Update bar label element.
            var offset = (0.49 * percentage) - 44;
            bar_label.style.marginTop = offset + "px";
            bar_label.innerHTML = adjusted;
            
        }
        
    }

}


class create_line_graph extends create_analog_element_parameters {

    constructor (parent_object, uuid, gpio, name, unit, max, min, grad) {
        super(parent_object, uuid, gpio, name, unit, max, min, grad);

        // Create analog graph container.
        this.analog_graph_container = document.createElement("analog_graph_container");

        // Create graph label.
        this.graph_label = document.createElement("graph_label");
        this.graph_label.setAttribute("class", "graph_label");
        this.graph_label.innerHTML = this.name + "[" + this.unit + "]";

        // Create element that holds svg graph.
        this.graph = document.createElement("graph");

        // Append childs to analog_graph_container.
        this.analog_graph_container.appendChild(this.graph_label);
        this.analog_graph_container.appendChild(this.graph);

        this.width = 500;
        this.height = 250;
        this.margin = { top: 4, right: 6, bottom: 4, left: 40 };
        this.data = Array(default_line_graph_length).fill(0);

        // Create svg graph and add it to the graph element
        this.svg = d3.select(this.graph).append("svg").attr("width", this.width).attr("height", this.height);
        this.g = this.svg.append("g").attr("transform", `translate(${this.margin.left},${this.margin.top})`);

        this.x = d3.scaleLinear().domain([0, (this.data.length - 1)]).range([0, this.width - this.margin.left - this.margin.right]);
        this.y = d3.scaleLinear().domain([-100, 100]).range([this.height - this.margin.top - this.margin.bottom, 0]);

        this.line = d3.line().curve(d3.curveMonotoneX).x((d, i) => this.x(i)).y(d => this.y(d));
        this.yAxis = this.g.append("g").attr("class", "axis").call(d3.axisLeft(this.y));
        this.path = this.g.append("path").datum(this.data).attr("class", "line").attr("d", this.line);

        this.circleGroup = this.g.append("g");
        this.circles = this.circleGroup.selectAll(".circle").data(this.data).enter().append("circle").attr("class", "circle").attr("r", 4).attr("cx", (d, i) => this.x(i)).attr("cy", d => this.y(d)).style("opacity", 1);

        this.parent_object.appendChild(this.analog_graph_container);

        // Create tooltip for showing values on hover.
        this.tooltip = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("opacity", 0);
    }

    update_line_graph(value) {
        var adjusted = (this.grad * value) + this.min;

        this.data.shift();
        this.data.push(adjusted);

        // Update the y scale based on the new data range.
        const yExtent = d3.extent(this.data);
        this.y.domain([yExtent[0] - 10, yExtent[1] + 10]);

        // Update the y-axis with transition.
        this.yAxis.transition().duration(300).call(d3.axisLeft(this.y));

        // Update the line path with the new data.
        this.path.datum(this.data)
            .transition()
            .duration(300)
            .attr("d", this.line);

        // Update the circles with the new data.
        this.circles = this.circleGroup.selectAll(".circle").data(this.data);

        // Exit any old circles.
        this.circles.exit().remove();

        // Enter and update existing circles.
        this.circles.enter().append("circle")
            .attr("class", "circle")
            .attr("r", 4)
            .merge(this.circles)
            .on("mouseover", (event, d) => {
                // Scale up the circle
                d3.select(event.currentTarget)
                    .transition()
                    .duration(200)
                    .attr("r", 5.5);

                // Get the position of the circle.
                const cx = +d3.select(event.currentTarget).attr("cx");
                const cy = +d3.select(event.currentTarget).attr("cy");

                // Get the bounding box of the SVG element.
                const svgBBox = this.svg.node().getBoundingClientRect();

                // Round the data value to zero decimal places.
                const formattedValue = Math.round(d);

                // Update the tooltip content.
                this.tooltip.html(formattedValue);

                // Temporarily make the tooltip visible to measure its dimensions.
                this.tooltip.style("opacity", .9);

                // Measure the width of the tooltip.
                const tooltipWidth = this.tooltip.node().offsetWidth;
                const tooltipHeight = this.tooltip.node().offsetHeight;

                // Calculate the position of the tooltip.
                let tooltipLeft = svgBBox.left + this.margin.left + cx - tooltipWidth / 2;
                const tooltipTop = svgBBox.top + this.margin.top + cy - tooltipHeight - 10; // Adjust the -10 to position above the circle

                // Ensure the tooltip doesn't go out of the viewport.
                const viewportWidth = window.innerWidth;
                if (tooltipLeft < 0) {
                    tooltipLeft = 0;
                } else if (tooltipLeft + tooltipWidth > viewportWidth) {
                    tooltipLeft = viewportWidth - tooltipWidth;
                }

                // Set the final position of the tooltip.
                this.tooltip
                    .style("left", `${tooltipLeft}px`)
                    .style("top", `${tooltipTop}px`);
            })
            .on("mouseout", (event, d) => {
                // Scale down the circle.
                d3.select(event.currentTarget)
                    .transition()
                    .duration(200)
                    .attr("r", 4);

                // Hide the tooltip.
                this.tooltip.transition()
                    .duration(50)
                    .style("opacity", 0);
            })
            .transition()
            .duration(300)
            .attr("cx", (d, i) => this.x(i))
            .attr("cy", d => this.y(d));



    
    }
}


