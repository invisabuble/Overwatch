#include "config.h"
#include "overwatch.h"

overwatch_client* ow;

void setup() {
  
  Serial.begin(115200);

  ow = new overwatch_client("Parks", "gzryvrBLq7qh", "192.168.0.33", ssl_cert);

}

void loop() {

  ow->overwatch_loop();
  
}

