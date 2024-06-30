// config.h

// Author : Luke Park

// Only certain pins can have digital outputs. They are as follows:
//
//   [0, 2, 4, 5, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 25, 26, 27, 32, 33]
//
// There are a few pins that have digital input ability only, they are:
//
//   [34, 35, 36, 39]
//
// The ESP32 has a built in ADC with 12 bit resolution.
// not all pins are capable of analog-to-digital conversion (ADC). Here's a breakdown:
// The following pins can be used for analog input:
//
//   [0,2,4,12,13,14,15,25,26,27,32,33,34,35,36,37,38,39]
//
// Note:
// GPIOs 34-39 are input-only and do not have internal pull-up or pull-down resistors.
// ADC2 pins (GPIO 4, 0, 2, 15, 13, 12, 14, 27, 25, 26) are used by Wi-Fi and Bluetooth
// and may cause interference if used when Wi-Fi or Bluetooth is enabled. Avoid using 
// these pins if you are using Wi-Fi or Bluetooth functionalities.
// ADC1 pins (other than 34-39) can be used independently of Wi-Fi and Bluetooth.
//
// Taking away pins that are used for wifi/bluetooth leaves the following pins that are
// freely available.
//
//   [32,33,34,35,36,37,38,39]
// 

// Here is an example config string:

/*

String configuration = R"(
{

  "name": "Test Device",

  "digital_inputs": [19, 0, 27, 14],

  "digital_measurements": {

    "io-5": {
      "name": "RELAY 1",
      "type": "switch"
    },

    "io-12": {
      "name": "status",
      "type": "output"
    }

  },

  "analog_measurements": {

     "io-32": {
      "name": "temp",
      "max": "100",
      "min": "-20",
      "unit": "C",
      "type": "pie"
    },

    "io-35": {
      "name": "temp2",
      "max": "120",
      "min": "-10",
      "unit": "m/s",
      "type": "bar"
    }

  },

  "readings": [

    "program_output"

  ]
}
)";

*/

#ifndef CONFIG_H
#define CONFIG_H

String configuration = R"(
{

  "name": "Test Device",

  "digital_inputs": [19, 0, 27, 14],

  "digital_measurements": {

    "io-5": {
      "name": "RELAY 1",
      "type": "switch"
    },

    "io-17": {
      "name": "THERM",
      "type": "switch"
    },

    "io-16": {
      "name": "LIGHT-L",
      "type": "switch"
    },

    "io-4": {
      "name": "LIGHT-R",
      "type": "switch"
    }

  },

  "analog_measurements": {

  },

  "readings": [

    "program_output"

  ]
}
)";

#endif
