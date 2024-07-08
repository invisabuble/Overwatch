#include "config.h"
#include "overwatch.h"

overwatch_client* ow;

void setup() {
  
  Serial.begin(115200);

  ow = new overwatch_client();

}

void loop() {

  ow->overwatch_loop();

}
