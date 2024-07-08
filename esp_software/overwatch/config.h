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

    "io-33": {
      "name": "Pressure",
      "max": "12",
      "min": "-10",
      "unit": "Atm",
      "type": "bar_graph"
    },

    "io-35": {
      "name": "temp2",
      "max": "120",
      "min": "-10",
      "unit": "m/s",
      "type": "bar"
    },

    "io-32": {
      "name": "temp",
      "max": "100",
      "min": "-20",
      "unit": "C",
      "type": "line_graph"
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


String ssl_certificate = R"(
-----BEGIN CERTIFICATE-----
MIIDnTCCAoWgAwIBAgIUQRNVoApw0MMKqioWbcGZmqecTi8wDQYJKoZIhvcNAQEL
BQAwXjELMAkGA1UEBhMCVUsxEDAOBgNVBAgMB0VuZ2xhbmQxEDAOBgNVBAcMB0Jy
aXN0b2wxFDASBgNVBAoMC1BhcmtTeXN0ZW1zMRUwEwYDVQQDDAwxOTIuMTY4LjAu
MzMwHhcNMjQwNjIzMTY0NTMzWhcNMjUwNjIzMTY0NTMzWjBeMQswCQYDVQQGEwJV
SzEQMA4GA1UECAwHRW5nbGFuZDEQMA4GA1UEBwwHQnJpc3RvbDEUMBIGA1UECgwL
UGFya1N5c3RlbXMxFTATBgNVBAMMDDE5Mi4xNjguMC4zMzCCASIwDQYJKoZIhvcN
AQEBBQADggEPADCCAQoCggEBAOUf5lfo5be7JMWEFUI+W7jWC36/w8C1NnLnq/eF
Nz4KgJBKdijyRlVVTMqK/PJw1fNgoKub0dt9O+P9++Dw1tEcYDwBirNvSUdMkp+Z
Qd9mAfcVDZlg+WImaxhIfZywaOOedu52oJNeT4F6rSh9JmbiwncOyt1SKjy9hfUZ
fgJ8AVnyNe5iLdt2e+3YtDJRlqamnI4f9/o2daK/1gZdfim138Ief1LpoY8uldNq
zvbfxKAHXyekuCwUJmfff4eJrqIPrLIOEuGwhIgLe+g8og1SyweG3z5+flahmZiv
Nsh8NG2tD/iYm5aZKbV1eMdq89KY0hAme9tyoC22NhMzaQUCAwEAAaNTMFEwHQYD
VR0OBBYEFGyAe+JWHIgtzwrxe9vRTch9JuqlMB8GA1UdIwQYMBaAFGyAe+JWHIgt
zwrxe9vRTch9JuqlMA8GA1UdEwEB/wQFMAMBAf8wDQYJKoZIhvcNAQELBQADggEB
AGmR6KzOgMEaBJpXbyTLxAo7kVCq3XmVWZFna643pnmvmpPwaduRCis22xP/DjAG
ZdmV9uWGYIEdij4r2RJqSJXv0Xe3+vXhbsM+9QUvEfuGPoxUQcwoE5lEaYe6STA3
l4L2WTP4kyXeRF5yOOMTO6Ky0Io0YpzN/jsF6OnqwPalues6l6s2klL9BCHlN+rx
8K8nqHsng/CMIwOC6rUgUrNERMRm0jPtIKprid2KBWU35yYCiJ2YyDOFhE+wThcA
dSD2CL3uHwZerjIMem8XIh/GXClu1kD6MKdzNJqk93svwfcSzoXnzLZtump3m9fh
aEqihDDYtp50Kb4qompczNk=
-----END CERTIFICATE-----
)";

const char* ssid = "ssid";
const char* pswd = "pswd";
const char* host = "pi-host";
const char* port = "8765";
int analog_threshold = 200;


String configuration = R"(
{

  "name": "ESP-32",

  "digital_inputs": [],

  "digital_measurements": {

  },

  "analog_measurements": {

  },

  "readings": [

  ]

}
)";


#endif
