#include "config.h"
#include "overwatch.h"

overwatch_client* ow;

const char* ssl_cert = \
"-----BEGIN CERTIFICATE-----\n" \
"MIIDnTCCAoWgAwIBAgIUQRNVoApw0MMKqioWbcGZmqecTi8wDQYJKoZIhvcNAQEL\n" \
"BQAwXjELMAkGA1UEBhMCVUsxEDAOBgNVBAgMB0VuZ2xhbmQxEDAOBgNVBAcMB0Jy\n" \
"aXN0b2wxFDASBgNVBAoMC1BhcmtTeXN0ZW1zMRUwEwYDVQQDDAwxOTIuMTY4LjAu\n" \
"MzMwHhcNMjQwNjIzMTY0NTMzWhcNMjUwNjIzMTY0NTMzWjBeMQswCQYDVQQGEwJV\n" \
"SzEQMA4GA1UECAwHRW5nbGFuZDEQMA4GA1UEBwwHQnJpc3RvbDEUMBIGA1UECgwL\n" \
"UGFya1N5c3RlbXMxFTATBgNVBAMMDDE5Mi4xNjguMC4zMzCCASIwDQYJKoZIhvcN\n" \
"AQEBBQADggEPADCCAQoCggEBAOUf5lfo5be7JMWEFUI+W7jWC36/w8C1NnLnq/eF\n" \
"Nz4KgJBKdijyRlVVTMqK/PJw1fNgoKub0dt9O+P9++Dw1tEcYDwBirNvSUdMkp+Z\n" \
"Qd9mAfcVDZlg+WImaxhIfZywaOOedu52oJNeT4F6rSh9JmbiwncOyt1SKjy9hfUZ\n" \
"fgJ8AVnyNe5iLdt2e+3YtDJRlqamnI4f9/o2daK/1gZdfim138Ief1LpoY8uldNq\n" \
"zvbfxKAHXyekuCwUJmfff4eJrqIPrLIOEuGwhIgLe+g8og1SyweG3z5+flahmZiv\n" \
"Nsh8NG2tD/iYm5aZKbV1eMdq89KY0hAme9tyoC22NhMzaQUCAwEAAaNTMFEwHQYD\n" \
"VR0OBBYEFGyAe+JWHIgtzwrxe9vRTch9JuqlMB8GA1UdIwQYMBaAFGyAe+JWHIgt\n" \
"zwrxe9vRTch9JuqlMA8GA1UdEwEB/wQFMAMBAf8wDQYJKoZIhvcNAQELBQADggEB\n" \
"AGmR6KzOgMEaBJpXbyTLxAo7kVCq3XmVWZFna643pnmvmpPwaduRCis22xP/DjAG\n" \
"ZdmV9uWGYIEdij4r2RJqSJXv0Xe3+vXhbsM+9QUvEfuGPoxUQcwoE5lEaYe6STA3\n" \
"l4L2WTP4kyXeRF5yOOMTO6Ky0Io0YpzN/jsF6OnqwPalues6l6s2klL9BCHlN+rx\n" \
"8K8nqHsng/CMIwOC6rUgUrNERMRm0jPtIKprid2KBWU35yYCiJ2YyDOFhE+wThcA\n" \
"dSD2CL3uHwZerjIMem8XIh/GXClu1kD6MKdzNJqk93svwfcSzoXnzLZtump3m9fh\n" \
"aEqihDDYtp50Kb4qompczNk=\n" \
"-----END CERTIFICATE-----\n";

void setup() {
  
  Serial.begin(115200);

  ow = new overwatch_client("Parks", "gzryvrBLq7qh", "192.168.0.33", ssl_cert);

}

void loop() {

  ow->overwatch_loop();
  
}

